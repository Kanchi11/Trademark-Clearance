#!/usr/bin/env bash
# Run Chroma, ML service, backfill (limit 100), and Next.js dev.
set -e
cd "$(dirname "$0")/.."
ROOT="$PWD"

# Load env (optional)
if [ -f .env.local ]; then
  set -a
  source .env.local 2>/dev/null || true
  set +a
fi
export CHROMA_URL="${CHROMA_URL:-http://localhost:8001}"
export AI_MICROSERVICE_URL="${AI_MICROSERVICE_URL:-http://localhost:8000}"

echo "=== 1. Chroma (port 8001) ==="
if curl -s -o /dev/null -w "%{http_code}" "$CHROMA_URL/api/v1/heartbeat" 2>/dev/null | grep -qE '^[0-9]+'; then
  echo "Chroma already responding."
else
  echo "Starting Chroma..."
  (cd "$ROOT" && . chroma-venv/bin/activate 2>/dev/null && chroma run --host 0.0.0.0 --port 8001 --path ./chroma_data) &
  sleep 5
fi

echo "=== 2. ML service (port 8000) – loading model, may take 1–2 min ==="
pkill -f "python main.py" 2>/dev/null || true
sleep 2
(cd ml-service && .venv/bin/python main.py) &
ML_PID=$!
echo "ML service PID: $ML_PID"

echo "=== 3. Waiting for ML /embed/text to be ready (up to 120s) ==="
for i in $(seq 1 120); do
  if curl -s -o /dev/null -w "%{http_code}" -X POST "$AI_MICROSERVICE_URL/embed/text" \
    -H "Content-Type: application/json" -d '{"texts":["test"]}' 2>/dev/null | grep -q 200; then
    echo "ML embed ready after ${i}s."
    break
  fi
  sleep 1
  if [ "$i" -eq 120 ]; then
    echo "ML embed did not become ready in 120s. Continuing anyway."
  fi
done

echo "=== 4. Chroma text backfill (limit 100) ==="
npm run data:chroma-text:limit || true

echo "=== 5. Next.js dev server (background) ==="
npm run dev &
sleep 5
echo ""
echo "Done. Chroma: $CHROMA_URL | ML: $AI_MICROSERVICE_URL | App: http://localhost:3000 (or 3001)"
echo "To run full Chroma backfill later: npm run data:chroma-text"
wait
