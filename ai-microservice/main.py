# AI Microservice for Trademark Clearance
#
# This microservice exposes endpoints for:
# - Text embeddings (Hugging Face Sentence Transformers)  ->  768 dims (all-mpnet-base-v2)
# - Logo/image embeddings (CLIP)                         ->  512 dims (ViT-B/32 via open_clip)
# - LLM completions (OpenAI gpt-4o-mini, falls back to template)
#
# Requirements:
# - Python 3.10+
# - FastAPI, Uvicorn
# - sentence-transformers
# - open_clip_torch
# - Pillow, cairosvg
# - torch
# - openai  (pip install openai)
#
# To install requirements:
#   pip install -r requirements.txt

import os
import io
import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Lazy model singletons ---
_text_model = None
_clip_model = None
_clip_preprocess = None

TEXT_MODEL_NAME = os.environ.get("TEXT_MODEL", "sentence-transformers/all-mpnet-base-v2")
CLIP_MODEL_NAME = os.environ.get("CLIP_MODEL", "ViT-B-32")
CLIP_PRETRAINED = os.environ.get("CLIP_PRETRAINED", "openai")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")


def get_text_model():
    global _text_model
    if _text_model is None:
        logger.info("Loading text model: %s", TEXT_MODEL_NAME)
        from sentence_transformers import SentenceTransformer
        _text_model = SentenceTransformer(TEXT_MODEL_NAME)
    return _text_model


def get_clip():
    global _clip_model, _clip_preprocess
    if _clip_model is None:
        logger.info("Loading CLIP: %s / %s", CLIP_MODEL_NAME, CLIP_PRETRAINED)
        import open_clip
        _clip_model, _, _clip_preprocess = open_clip.create_model_and_transforms(
            CLIP_MODEL_NAME, pretrained=CLIP_PRETRAINED
        )
        _clip_model.eval()
    return _clip_model, _clip_preprocess


@asynccontextmanager
async def lifespan(app_instance):
    logger.info("AI microservice starting – preloading text model...")
    try:
        get_text_model()
        logger.info("Text model ready (768 dims)")
    except Exception as e:
        logger.warning("Text model preload failed: %s", e)
    yield
    logger.info("AI microservice shutting down")


app = FastAPI(title="Trademark AI Microservice", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EmbeddingRequest(BaseModel):
    texts: List[str]


class LLMRequest(BaseModel):
    prompt: str
    max_tokens: Optional[int] = 256


@app.get("/health")
def health():
    return {"status": "ok", "service": "trademark-ai"}


@app.post('/embed/text')
def embed_text(req: EmbeddingRequest):
    if not req.texts:
        raise HTTPException(status_code=400, detail="texts required")

    def clean(s: str) -> str:
        if not s or not str(s).strip():
            return " "
        return str(s).strip()[:512]

    texts = [clean(t) for t in req.texts]
    try:
        model = get_text_model()
        embeddings = model.encode(texts, convert_to_numpy=True)
        out = [[float(x) for x in row] for row in embeddings.tolist()]
        return {"embeddings": out}
    except Exception as e:
        logger.exception("Text embedding failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/embed/image')
async def embed_image(file: UploadFile = File(...)):
    import cairosvg
    data = await file.read()
    # Try raster first, fall back to SVG
    try:
        from PIL import Image
        image = Image.open(io.BytesIO(data)).convert('RGB')
    except Exception:
        try:
            png_bytes = cairosvg.svg2png(bytestring=data)
            from PIL import Image
            image = Image.open(io.BytesIO(png_bytes)).convert('RGB')
        except Exception as svg_exc:
            logger.exception("Image decode failed")
            raise HTTPException(status_code=400, detail=f"Failed to process image: {svg_exc}")
    try:
        import torch
        model, preprocess = get_clip()
        image_tensor = preprocess(image).unsqueeze(0)
        with torch.no_grad():
            image_features = model.encode_image(image_tensor)
            embedding = [float(x) for x in image_features[0].tolist()]
        return {"embedding": embedding}
    except Exception as e:
        logger.exception("CLIP embedding failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/llm/completion')
def llm_completion(req: LLMRequest):
    # Use OpenAI if key is configured, otherwise return a helpful template
    if OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a trademark clearance assistant. Summarize conflicts, assess risk, and suggest next steps. Be concise and note this is not legal advice."},
                    {"role": "user", "content": req.prompt},
                ],
                max_tokens=req.max_tokens or 256,
                temperature=0.3,
            )
            return {"completion": response.choices[0].message.content}
        except Exception as e:
            logger.warning("OpenAI LLM call failed: %s – returning template", e)

    # Fallback structured template
    completion = (
        "Trademark clearance summary:\n\n"
        "Evidence was retrieved from the USPTO vector database. "
        "Review each similar mark and logo listed above, paying close attention to "
        "marks in the same Nice classes and with high similarity scores. "
        "This is not legal advice; consult a trademark attorney for final clearance."
    )
    return {"completion": completion}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
