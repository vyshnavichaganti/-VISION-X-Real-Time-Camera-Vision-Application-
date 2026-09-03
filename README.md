# AI Real-Time Camera Vision Application

Production-ready, full-stack real-time camera vision application powered by **React 18 + TypeScript + Vite** on the frontend and **Python 3.10 + FastAPI + PyTorch (YOLOv8 + ByteTrack)** on the backend.

---

## 🌟 Architecture Overview

```
                                  +---------------------------------------+
                                  |            BROWSER FRONTEND           |
                                  |    React + TypeScript + Vite UI       |
                                  |  +---------------------------------+  |
                                  |  | MediaDevices API (Camera Stream)|  |
                                  |  +----------------+----------------+  |
                                  |                   | Compressed JPEG Blob
                                  |                   v
                                  |  +---------------------------------+  |
                                  |  | Canvas Overlay & Tracking IDs   |  |
                                  |  +----------------▲----------------+  |
                                  +-------------------|-------------------+
                                                      | POST /api/v1/detect
                                                      v
+---------------------------------------------------------------------------------------------------+
|                                          FASTAPI BACKEND                                          |
|                                                                                                   |
|   +-------------------+       +--------------------+       +----------------------------------+   |
|   | Health Check      |       | POST /api/v1/detect| ----> | Vision Service Manager           |   |
|   | GET /health       |       | (Pydantic validation)      | (Single-Instance Model Cache)     |   |
|   +-------------------+       +--------------------+       +----------------+-----------------+   |
|                                                                             |                     |
|                                                                             v                     |
|                                                            +----------------------------------+   |
|                                                            | PyTorch YOLOv8 Object Detector   |   |
|                                                            +----------------+-----------------+   |
|                                                                             | Detections          |
|                                                                             v                     |
|                                                            +----------------------------------+   |
|                                                            | ByteTrack Multi-Object Tracker   |   |
|                                                            | (Hungarian IoU Matching)         |   |
|                                                            +----------------------------------+   |
+---------------------------------------------------------------------------------------------------+
```

---

## 🤖 AI Engines & Approximate Distance Calibration

| Component | Specification |
|---|---|
| **Detection Engine** | YOLOv8n-COCO (`yolov8n.pt`, 6.2 MB) |
| **Tracking Engine** | ByteTrack (Kalman Filter + Hungarian IoU Matching) |
| **Segmentation Engine** | FastSAM (`FastSAM-s.pt`, 22.7 MB) / YOLOv8-Seg |
| **Depth Engine** | MiDaS_small (`midas_v21_small_256.pt`, 81.8 MB, MIT Licensed) |
| **Distance Calibration**| Inverse Reference Curve $Z(d_{\text{rel}}) = \frac{a}{d_{\text{rel}} + b}$ ($a=0.9864, b=-0.0370$) |
| **Distance Quality** | `"good"`, `"moderate"`, `"low"` based on mask presence & range bounds |
| **Mask Format** | Token-efficient polygon vertex arrays (`format: "polygon"`) |
| **Tracking ID Format** | Persistent integer IDs (`#1`, `#2`, `#3`...) |
| **Framework** | PyTorch 2.x, NumPy, SciPy, Ultralytics, MiDaS |
| **Device Hardware** | Auto-detects CUDA GPU (`cuda:0`), falls back to CPU |

> [!IMPORTANT]
> **Monocular Distance Disclaimer**: This application estimates **Approximate Physical Distance in Meters** via calibrated inverse monocular depth mapping. It is NOT guaranteed metric LiDAR or stereo depth. Physical accuracy is affected by camera focal length, scene geometry, and lighting. The UI displays `≈ 2.4 m` to communicate approximation.

---

## 📡 API Specification

### 1. Healthcheck Endpoint
`GET /health`
```json
{
  "status": "healthy",
  "service": "AI Real-Time Camera Vision API",
  "version": "0.3.0",
  "model_loaded": true,
  "model": "YOLOv8n-COCO",
  "device": "cpu",
  "segmentor_loaded": true,
  "segmentor_model": "FastSAM-s",
  "depth_loaded": true,
  "depth_model": "MiDaS_small",
  "distance_estimator_loaded": true,
  "calibration_status": "calibrated",
  "calibration_method": "inverse_reference"
}
```

### 2. Real-Time Object Detection, Tracking, Segmentation, Depth & Distance Endpoint
`POST /api/v1/detect?confidence=0.40&inference_size=640&track=true`

#### Response JSON:
```json
{
  "objects": [
    {
      "id": 12,
      "label": "person",
      "confidence": 0.8421,
      "bbox": {
        "x": 108.8,
        "y": 147.2,
        "width": 547.2,
        "height": 405.6
      },
      "mask": {
        "format": "polygon",
        "points": [
          [108.8, 147.2],
          [120.0, 150.0],
          [650.0, 550.0]
        ]
      },
      "relative_depth": 0.42,
      "distance": {
        "meters": 2.4,
        "quality": "good",
        "calibrated": true
      }
    }
  ],
  "depth_summary": {
    "available": true,
    "min": 0.0,
    "max": 1.0
  },
  "inference_time_ms": 46.07,
  "tracking_time_ms": 0.01,
  "segmentation_time_ms": 0.00,
  "depth_time_ms": 0.00,
  "distance_time_ms": 0.00,
  "total_processing_time_ms": 46.43,
  "image_width": 1280,
  "image_height": 720,
  "model": "YOLOv8n-COCO"
}
```

### 3. Tracking Session Reset Endpoint
`POST /api/v1/reset-tracking`

#### Response JSON:
```json
{
  "status": "ok",
  "message": "Tracking state reset successfully"
}
```

---

## 🔒 Multi-Client Session Architecture
In single-client local mode, tracking state is managed by the single `vision_service.tracker` instance. For multi-client production environments, tracking sessions are isolated via a `SessionTrackerManager` mapping client session tokens (`session_id`) to individual tracker instances with automatic 60-second idle expiration pruning.

## ⚙️ Configuration & Environment Variables

- `VITE_API_BASE_URL`: Frontend backend target (Default: `http://localhost:8000`)
- `MODEL_PATH`: `yolov8n.pt`
- `CONFIDENCE_THRESHOLD`: `0.40`
- `INFERENCE_SIZE`: `640` (or `320` for ultra-fast execution)
- `TARGET_DEVICE`: `auto` (`cuda` or `cpu`)
- `SEGMENTATION_ENABLED`: `true`
- `SEGMENTATION_MODEL`: `FastSAM-s.pt`
- `SEGMENTATION_TARGET_FPS`: `3`
- `SEGMENTATION_DEVICE`: `auto`
- `DEPTH_ENABLED`: `true`
- `DEPTH_MODEL`: `MiDaS_small`
- `DEPTH_TARGET_FPS`: `3`
- `DEPTH_INPUT_SIZE`: `256`
- `DEPTH_DEVICE`: `auto`
- `DEPTH_SMOOTHING_ALPHA`: `0.35`
- `DISTANCE_ESTIMATION_ENABLED`: `true`
- `CALIBRATION_METHOD`: `inverse_reference`
- `REFERENCE_DISTANCE_METERS`: `2.0`
- `REFERENCE_DEPTH_VALUE`: `0.55`
- `CALIBRATION_PARAM_A`: `0.9864`
- `CALIBRATION_PARAM_B`: `-0.0370`
- `DISTANCE_MIN_METERS`: `0.3`
- `DISTANCE_MAX_METERS`: `15.0`
- `DISTANCE_SMOOTHING_ALPHA`: `0.35`

---

## 🚀 Production Deployment & Containerization

For detailed step-by-step instructions on deploying this application to an Ubuntu cloud server using Docker Compose, Nginx, and Certbot SSL/TLS, see:

- 📄 **[DEPLOYMENT.md](file:///d:/AI%20Real-Time%20Camera%20Vision%20Application/DEPLOYMENT.md)** — Step-by-step cloud deployment guide.
- 📋 **[PRODUCTION_CHECKLIST.md](file:///d:/AI%20Real-Time%20Camera%20Vision%20Application/PRODUCTION_CHECKLIST.md)** — Pre-deployment and post-deployment checklist.
- 🛡️ **[SECURITY_CHECKLIST.md](file:///d:/AI%20Real-Time%20Camera%20Vision%20Application/SECURITY_CHECKLIST.md)** — Security verification controls.
- 📜 **[MODEL_LICENSES.md](file:///d:/AI%20Real-Time%20Camera%20Vision%20Application/MODEL_LICENSES.md)** — Model license audit.

