# Production System Architecture & Failover Blueprint

## System Data Flow & Architecture

```
                                  +-----------------------+
                                  |    Web Client / User  |
                                  |   (React 19 + Vite)   |
                                  +-----------+-----------+
                                              |
                                              | HTTPS / REST (Multipart / JSON)
                                              v
                                  +-----------+-----------+
                                  |     Reverse Proxy     |
                                  |   (Nginx / ALB SSL)   |
                                  +-----------+-----------+
                                              |
                                              | Forward HTTP Request
                                              v
                                  +-----------+-----------+
                                  |    FastAPI Backend    |
                                  | (Uvicorn / Gunicorn)  |
                                  +-----------+-----------+
                                              |
                                              | Ingest Frame & Validate
                                              v
                                  +-----------+-----------+
                                  | Bounded Concurrency   |
                                  |    Lock / Semaphore   |
                                  +-----------+-----------+
                                              |
                                              | Session State Dispatcher (session_id)
                                              v
      +-----------------------------------------------------------------------------------+
      |                             AI Inference Pipeline                                |
      |                                                                                   |
      |   1. YOLOv8 Object Detection ------> Raw Detections                               |
      |   2. ByteTrack Tracking       ------> Tracklet Assignment (per session_id)        |
      |   3. FastSAM Segmentation     ------> Polygon Contour Masks                       |
      |   4. MiDaS Depth Estimation   ------> Relative Depth & Spatial Stats             |
      |   5. Distance Calibration     ------> Metric Distance in Meters                   |
      +---------------------------------------+-------------------------------------------+
                                              |
                                              | Aggregated Response (JSON)
                                              v
                                  +-----------+-----------+
                                  |     React HUD Overlay |
                                  |  HTML5 Canvas Render  |
                                  +-----------------------+
```

---

## Component Topology

| Layer | Component | Technology | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Frontend** | Camera UI & HUD | React 19, TypeScript, HTML5 Canvas | Camera capture, canvas HUD rendering, FPS measurement, adaptive rate controlling, AbortController timeout handling. |
| **Gateway** | Web Server / Proxy | Nginx / Docker Container | TLS termination, static asset serving, CORS header enforcement, client rate limiting. |
| **Backend API**| FastAPI Server | FastAPI, Uvicorn, Pydantic v2 | Endpoint routing, request validation, session management, error sanitization, readiness probes. |
| **Concurrency**| Inference Guard | Python `asyncio.Lock` / `Semaphore` | Prevents concurrent PyTorch model executions, guards against GPU memory spikes and race conditions. |
| **Session Isolation**| Session Registry | In-Memory TTL Session Store | Maps `session_id` to isolated tracker instances and EMA depth/distance smoothing caches. |
| **AI Pipeline** | AI Orchestrator | `VisionService`, PyTorch, OpenCV | Single-pass sequential model execution with graceful component fallback. |

---

## Environment Configuration

| Variable Name | Type | Default (Dev) | Production Target | Description |
| :--- | :--- | :--- | :--- | :--- |
| `PROJECT_NAME` | string | `AI Real-Time Camera Vision API` | `AI Real-Time Camera Vision API` | Service name identifier. |
| `VERSION` | string | `0.3.0` | `0.3.0` | Production version tag. |
| `CORS_ORIGINS` | string/list | `["http://localhost:5173", "*"]` | `["https://vision.yourdomain.com"]` | Strict allowed origins list. |
| `MODEL_PATH` | string | `yolov8n.pt` | `yolov8n.pt` / Mounted Volume | Path to object detection weights. |
| `SEGMENTATION_MODEL` | string | `FastSAM-s.pt` | `FastSAM-s.pt` / Mounted Volume | Path to FastSAM weights. |
| `DEPTH_MODEL` | string | `MiDaS_small` | `MiDaS_small` | PyTorch Hub depth model identifier. |
| `TARGET_DEVICE` | string | `auto` | `cuda` or `cpu` | PyTorch execution target (`auto`, `cuda`, `cpu`). |
| `MAX_CONCURRENT_INFERENCE` | int | `1` | `1` (CPU) / `2` (GPU) | Maximum parallel model executions. |
| `SESSION_TTL_SECONDS` | int | `600` | `600` | Session idle timeout for tracker cleanup (10 min). |
| `MAX_PAYLOAD_MB` | float | `10.0` | `10.0` | Maximum HTTP request upload payload size. |
| `LOG_LEVEL` | string | `INFO` | `INFO` or `WARNING` | Application logging detail level. |

---

## Health & Readiness Observability

### 1. `/health` (Liveness Probe)
* **Purpose:** Lightweight check for load balancers and container orchestrators to verify the process is alive.
* **Response:** `HTTP 200 OK`
  ```json
  {
    "status": "healthy",
    "service": "AI Real-Time Camera Vision API",
    "version": "0.3.0"
  }
  ```

### 2. `/ready` (Readiness Probe)
* **Purpose:** Verifies that required AI model components are loaded and ready to serve inference requests.
* **Response:** `HTTP 200 OK` (or `HTTP 503` if core detector unavailable)
  ```json
  {
    "status": "ready",
    "detector": "ready",
    "tracker": "ready",
    "segmentor": "ready",
    "depth": "ready",
    "distance": "ready"
  }
  ```

---

## Graceful Degradation & Error Fallback Matrix

| Component | Failure Condition | Impact | Degradation Behavior |
| :--- | :--- | :--- | :--- |
| **Camera Feed** | Device permissions denied or stream disconnected | Video feed unavailable | Displays explicit HUD camera error message; stops frame loop gracefully. |
| **YOLOv8 Detector**| Weight load failure or inference crash | Detection pipeline unavailable | API returns HTTP 503; `/ready` probe fails; frontend displays backend offline HUD alert. |
| **ByteTrack Tracker**| Tracker initialization or tracking error | Tracking IDs unavailable | Detection continues; objects returned without `id` tracking tags. |
| **FastSAM Segmentor**| Weight load failure or segmentation exception | Polygon masks unavailable | Detection & tracking continue; mask rendering bypassed cleanly; logged as WARNING. |
| **MiDaS Depth** | PyTorch hub load failure or depth exception | Relative depth unavailable | Detection, tracking & segmentation continue; relative depth fields omitted cleanly. |
| **Distance Estimator**| Calibration missing or math error | Metric distance unavailable | Relative depth shown; metric distance tags omitted; logged as WARNING. |
| **Backend Network** | API offline or server unreachable | Backend unavailable | Camera feed continues running smoothly; HUD shows "Backend Offline" indicator. |

---

## Model Weight Management & Acquisition Strategy

1. **Storage Strategy:** Model weights (`yolov8n.pt`, `FastSAM-s.pt`) are stored in a dedicated `./models` volume or downloaded automatically on container startup if missing.
2. **Build-Time / Startup Download:**
   - YOLOv8 weights auto-download via `ultralytics` on first invocation if absent.
   - FastSAM weights auto-download from official GitHub releases if absent.
   - MiDaS weights auto-download via PyTorch Hub on startup.
3. **Volume Mount:** In production Docker environments, model weights are mounted from a host volume (`/var/app/models`) or persistent storage bucket to avoid re-downloading on container restarts.
