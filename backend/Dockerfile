FROM python:3.12-slim

WORKDIR /app/backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    poppler-utils \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY app /app/backend/app

# Expose data directory for persistent volumes (Chroma + BM25s)
VOLUME ["/app/backend/data"]

ENV CHROMA_PATH="/app/backend/data/chroma"
ENV UPLOAD_PATH="/app/backend/data/uploads"
ENV PYTHONPATH="/app/backend"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
