# VISION-X — Production Cloud Deployment Guide

## Overview

VISION-X is a real-time computer vision system built with FastAPI (Python 3.10), PyTorch, YOLOv8n, ByteTrack, FastSAM, MiDaS, and React (TypeScript + Vite).

---

## 1. System Requirements & Architecture

- **Backend Container**: Docker (Python 3.10-slim), Uvicorn server, PyTorch CPU/CUDA execution.
- **Frontend Container**: Nginx Alpine serving static production Vite bundle.
- **Memory Recommendation**: 2 GB RAM minimum (4 GB RAM recommended for multi-client concurrency).
- **CPU Recommendation**: 2 vCPUs minimum.

---

## 2. Local Production Build Verification

### Backend Verification
```bash
# Run backend test suite
python -m unittest discover -s backend/tests

# Start production API server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

### Frontend Verification
```bash
# Build production frontend bundle
cd frontend
npm run build

# Preview static distribution
npm run preview
```

---

## 3. Docker Containerization Setup

### Backend Dockerfile (`backend/Dockerfile`)
```dockerfile
FROM python:3.10-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt-get/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Docker Compose (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - CONFIDENCE_THRESHOLD=0.25
      - INFERENCE_SIZE=640
      - MAX_CONCURRENT_INFERENCE=2
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 15s
      timeout: 5s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

---

## 4. Cloud Deployment Options

### Option A: Railway / Render / Fly.io (One-Click)
1. Connect GitHub repository to Railway or Render.
2. Select Dockerfile for backend service on port `8000`.
3. Set environment variable `VITE_API_URL=https://<your-backend-domain>` for frontend build.
4. Deploy frontend static site.

### Option B: AWS ECS / DigitalOcean App Platform
1. Push backend Docker image to Amazon ECR / Docker Hub:
   ```bash
   docker build -t vision-x-backend ./backend
   docker tag vision-x-backend:latest <registry-url>/vision-x-backend:latest
   docker push <registry-url>/vision-x-backend:latest
   ```
2. Deploy backend service container with port 8000 exposed.
3. Deploy frontend Nginx container or AWS S3 + CloudFront static distribution.

---

## 5. Production Health Probes

- **Liveness Probe**: `GET /health` (Returns HTTP 200 `healthy` status and model load states)
- **Readiness Probe**: `GET /ready` (Returns HTTP 200 `ready` status when all 4 models are loaded)

---

## 6. Codebase Freeze & Release Tag

```bash
git tag -a v1.0.0-production -m "VISION-X Final Production Release"
git push origin v1.0.0-production
```
