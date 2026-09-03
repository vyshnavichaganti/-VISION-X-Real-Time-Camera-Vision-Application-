# Model Licenses & Commercial Compliance Audit

## Overview
This document audits the open-source licenses of all AI model weights, computer vision algorithms, and core framework dependencies utilized in the AI Real-Time Camera Vision Application.

---

## Model License Matrix

| Component | Model / Algorithm | Primary Repository / Source | License Type | Commercial Use Implications | Attribution Required | Replacement / Migration Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Object Detection** | YOLOv8n (`yolov8n.pt`) | [Ultralytics GitHub](https://github.com/ultralytics/ultralytics) | **AGPL-3.0** | Commercial deployment of closed-source applications requires an Enterprise License from Ultralytics. Open-source deployments under AGPL-3.0 are free. | Yes | Replace with YOLOv10 (Apache 2.0), RT-DETR (Apache 2.0), or custom ONNX export via `BaseDetector` interface. |
| **Object Tracking** | ByteTrack | [ByteTrack GitHub](https://github.com/ifzhang/ByteTrack) | **MIT License** | Fully permitted for commercial use without restrictions. | Yes (Include MIT License text) | None required. |
| **Segmentation** | FastSAM (`FastSAM-s.pt`) | [CASIA-IVA FastSAM](https://github.com/CASIA-IVA-Lab/FastSAM) | **Apache 2.0 / AGPL-3.0** | Code is Apache 2.0, but weights are trained on YOLOv8-seg (AGPL-3.0). Subject to AGPL-3.0 terms for commercial distribution. | Yes | Replace with MobileSAM (Apache 2.0) or SAM2 light export via `BaseSegmentor` interface. |
| **Depth Estimation** | MiDaS Small (`MiDaS_small`) | [Intel ISL MiDaS](https://github.com/isl-org/MiDaS) | **MIT License** | Fully permitted for commercial and enterprise applications. | Yes | None required. |
| **Distance Calibration** | Calibrated Distance Estimator | Internal Algorithmic Implementation | **MIT / Proprietary** | Fully custom inverse depth-distance calibration logic. No third-party restrictions. | No | None required. |

---

## Detailed Licensing & Compliance Analysis

### 1. YOLOv8 (Ultralytics AGPL-3.0)
* **License Details:** Ultralytics licenses YOLOv8 under the GNU Affero General Public License v3.0 (AGPL-3.0).
* **Key Implications:**
  - If your application is hosted as a cloud service (SaaS) or distributed as software, AGPL-3.0 requires making the full application source code available under AGPL-3.0.
  - To deploy in a closed-source commercial product, an Ultralytics Commercial License must be obtained.
* **Architectural Safety Isolation:**
  - The application uses `BaseDetector` abstraction layer in `backend/ai/detection/base_detector.py`.
  - Switching from YOLOv8 to an Apache 2.0 model (e.g. YOLOv10 or RT-DETR) requires modifying only `yolov8_detector.py` without altering downstream tracking, segmentation, depth, or API layers.

### 2. FastSAM (Apache 2.0 Code / AGPL-3.0 Model Backbone)
* **License Details:** The FastSAM repository code is published under Apache 2.0. However, because model training relies on Ultralytics YOLOv8 segment architecture, model weight usage carries AGPL-3.0 implications similar to YOLOv8.
* **Architectural Safety Isolation:**
  - Managed via `BaseSegmentor` abstraction layer in `backend/ai/segmentation/base_segmentor.py`.
  - Can be cleanly swapped with MobileSAM or Segment Anything 2 (SAM 2) Apache 2.0 checkpoints.

### 3. MiDaS (Intel ISL MIT License)
* **License Details:** Intel ISL distributes MiDaS under the permissive MIT License.
* **Key Implications:** Free for commercial use, modification, and private/commercial deployment.

### 4. ByteTrack (MIT License)
* **License Details:** ByteTrack tracking algorithm is licensed under the permissive MIT License.
* **Key Implications:** Free for commercial use with standard attribution.

---

## Action Items for Production Deployment

1. **Attribution File:** Maintain MIT license notices for MiDaS and ByteTrack in the production distribution package.
2. **Commercial License Strategy:** For commercial SaaS or enterprise deployment, either acquire an Ultralytics license or switch object detection to an Apache 2.0 model (such as YOLOv10 or RT-DETR).
3. **Abstraction Verification:** Verify that all AI components strictly interface through abstract base classes (`BaseDetector`, `BaseTracker`, `BaseSegmentor`, `BaseDepthModel`, `BaseDistanceEstimator`).
