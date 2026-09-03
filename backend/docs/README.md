# Backend Architecture & AI Module Specifications

## Architecture Overview
The backend is structured into clean modular layers:
- `backend/app/api/`: REST & WebSocket route handlers.
- `backend/app/core/`: Configuration, logging, and PyTorch device setup (CUDA/CPU).
- `backend/app/schemas/`: Pydantic input/output schemas.
- `backend/app/services/`: Vision orchestration service.
- `backend/ai/`: Modular PyTorch models:
  - `detection/`: Object detectors (BaseDetector -> YOLOv8).
  - `segmentation/`: Interactive segmentors (BaseSegmentor -> MobileSAM).
  - `tracking/`: Object trackers (BaseTracker -> ByteTrack/SORT).
  - `depth/`: Monocular depth estimators (BaseDepth -> MiDaS) + Distance Scale Calibrator.

## Milestone Status
- [x] **Milestone 1**: Project structure & webcam frontend.
- [ ] **Milestone 2**: Phase 1 Object Detection (`POST /detect`).
- [ ] **Milestone 3**: Telemetry HUD & Real-time optimization.
- [ ] **Milestone 4**: Persistent Object Tracking.
- [ ] **Milestone 5**: Depth Estimation (`POST /depth`).
- [ ] **Milestone 6**: Depth-to-Object association.
- [ ] **Milestone 7**: Distance Calibration Layer.
- [ ] **Milestone 8**: UI Polish & WebSocket streaming (`/ws/vision`).
