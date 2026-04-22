# AI Microservice README

## Overview
This microservice provides local, free endpoints for:
- Text embeddings (Hugging Face Sentence Transformers)
- Image/logo embeddings (CLIP)
- LLM completions (Ollama/local LLM integration)

## Setup
1. Install Python 3.10+
2. Install dependencies:
   pip install -r requirements.txt
3. Run the server:
   uvicorn main:app --host 0.0.0.0 --port 8000

## Endpoints
- POST /embed/text
  - Body: { "texts": ["string", ...] }
  - Returns: { "embeddings": [[...], ...] }

- POST /embed/image
  - Form-data: file (image)
  - Returns: { "embedding": [...] }

- POST /llm/completion
  - Body: { "prompt": "string", "max_tokens": 256 }
  - Returns: { "completion": "..." }

## Notes
- LLM endpoint is a placeholder; integrate with Ollama or local LLM as needed.
- All models are free, open-source, and run locally.
