# VISION-X — Frontend UX & UI Comprehensive Audit

This audit evaluates the current frontend state of the **AI Real-Time Camera Vision Application** and establishes the UX architecture for transforming it into **VISION-X: Real-Time AI Vision Intelligence**, a premium computer-vision monitoring console.

---

## 1. Current UI Structure

- **Header Bar (`Header.tsx`):** Application title, engine status badge, streaming indicator.
- **Vision Mode Bar (`VisionModeSelector.tsx`):** Filter buttons (`Normal`, `Detection`, `Segmentation`, `Depth`, `Distance`, `AI Composite`).
- **Main Workspace (`App.tsx`):**
  - Left Column (8 cols): Camera Feed (`CameraFeed.tsx`), Scene Intelligence (`SceneIntelligence.tsx`), Live Object Table (`ObjectIntelligenceTable.tsx`).
  - Right Column (4 cols): Camera Controls (`ControlPanel.tsx`), Roadmap Progress Panel.
- **Full Width Bottom Sections:**
  - Pipeline Topology (`PipelineVisualization.tsx`).
  - Telemetry HUD (`DebugHUD.tsx`) + Live AI Events Stream (`EventStream.tsx`).
  - Educational Guide (`HowAiSees.tsx`).

---

## 2. Existing Functionality

- Real-time HTML5 canvas rendering over live camera video feed.
- YOLOv8 object detection with configurable confidence threshold (0.10 - 0.90) and inference size (320x320 vs 640x640).
- ByteTrack persistent multi-object tracking IDs (#1, #2...).
- FastSAM polygon instance segmentation contour overlays.
- MiDaS relative monocular depth sampling (`0.00 - 1.00`).
- Inverse reference calibrated distance estimation (`≈ X.X m`).
- Fading ByteTrack motion trails on canvas.
- Bounded adaptive frame rate controller (2 - 10 FPS AI inference loop).
- Per-session multi-client isolation (`session_id`).
- Backend liveness (`GET /health`) and component readiness (`GET /ready`) monitoring.

---

## 3. Existing Telemetry

- **Camera FPS:** Real-time browser render loop speed.
- **AI FPS:** Measured API inference execution rate.
- **Pipeline Latencies:** Detailed breakdown of detection (`latencyMs`), tracking (`trackingLatencyMs`), segmentation (`segmentationLatencyMs`), depth (`depthLatencyMs`), distance (`distanceLatencyMs`), and total processing time.
- **Latency Percentiles:** Rolling P50 (average) and P95 latency calculations.
- **Component Active Counts:** Detected objects, active tracklets, segmentation masks, depth values, calibrated distances.

---

## 4. Existing User Flows

1. **Initialization:** User lands on application with camera stream offline and AI engine connecting via `/health` probe polling.
2. **Camera Launch:** User clicks "Start Camera", granting browser `getUserMedia` permission.
3. **Vision Stream:** Live camera frames are captured to an off-screen canvas at 80% JPEG compression and transmitted via HTTP POST to `/api/v1/detect`.
4. **Interactive Controls:** User toggles detection, switches vision mode filters, adjusts confidence thresholds, or toggles Demo Mode.
5. **Session Reset:** User stops camera or triggers tracking reset, issuing a POST request to `/api/v1/reset-tracking`.

---

## 5. Existing Visual Problems

- **Layout Clutter:** Telemetry HUD, roadmap progress, and educational panels create vertical page sprawl on smaller screens.
- **No Canvas Object Selection:** Users cannot click or tap an individual object on the camera canvas to open a detailed inspection inspector.
- **No View Modes (User vs. Technical):** Non-technical evaluators see raw engineering telemetry, while technical reviewers lack a dedicated deep-dive view.
- **No Image Snapshot Capture:** No built-in button to capture a high-resolution frame with all AI overlays intact.

---

## 6. UX Problems

- **Lack of Focused Hero Viewport:** Camera feed shares screen space with multiple secondary panels without clear visual priority.
- **No Clickable System Status Inspector:** `/ready` probe breakdown (detector, tracker, segmentor, depth, distance status) is not interactively inspectable.
- **Missing Object History Visualization:** Target objects lack a temporal distance history sparkline in the UI.

---

## 7. What Should Be Preserved

- 100% of working FastAPI backend endpoint integrations (`/health`, `/ready`, `/api/v1/detect`, `/api/v1/reset-tracking`).
- Zero fake data policy (all FPS, latency, confidence, distance, and track IDs remain real).
- Adaptive rate controller and off-screen canvas Blob extraction.
- Fading ByteTrack motion trails and SAM polygon contour canvas utilities.

---

## 8. What Should Be Redesigned

- **Brand Identity:** Rename application to **`VISION-X`** with subtitle **`Real-Time AI Vision Intelligence`**.
- **Hero Monitoring Console Layout:** Redesign screen layout around a prominent, high-resolution camera console.
- **Interactive Canvas Object Inspector:** Add click/tap selection on detected objects to open a side drawer showing confidence, distance, relative depth, tracking stability, and recent distance history.
- **View Level Toggle (`USER VIEW` vs `TECHNICAL VIEW`):**
  - **USER VIEW:** Clean focus on Camera Feed, Object Cards, Distance (~m), and System Status.
  - **TECHNICAL VIEW:** Exposes Pipeline Topology, Model Specs, Latency Breakdown, Depth map details, P50/P95 stats, and Event Logs.
- **Snapshot Capture Feature:** Add a "Capture Snapshot" action button in the camera dock that exports a JPEG image of the current frame with all active AI overlays (boxes, masks, tags, distance).
- **Interactive System Status Drawer:** Expandable `/ready` status node inspector showing live backend component status (`READY` / `DEGRADED`).
- **Compact Camera Control Dock:** Floating control bar with Start/Stop, Pause, Reset Tracking, Snapshot, Fullscreen, and View Toggle.

---

## 9. Proposed Final Screen Architecture

```
+-----------------------------------------------------------------------------------------+
|                                    TOP NAVIGATION                                       |
|  VISION-X: Real-Time AI Vision Intelligence  |  ● LIVE  |  [USER VIEW / TECH VIEW]     |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|  +---------------------------------------------------+  +----------------------------+  |
|  |                                                   |  |      OBJECT INSPECTOR      |  |
|  |                  HERO CAMERA FEED                 |  | (Click object on canvas)   |  |
|  |             (Real-Time AI Overlays)               |  | Target: Person #12         |  |
|  |                                                   |  | Conf: 94.2%                |  |
|  |  +---------------------------------------------+  |  | Distance: ≈ 2.4 m          |  |
|  |  |  CONTROL DOCK: Start|Stop|Pause|Reset|Snap|FS |  |  | Depth: 0.61 (relative)     |  |
|  |  +---------------------------------------------+  |  | Distance History Sparkline |  |
|  +---------------------------------------------------+  +----------------------------+  |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  |  COMPACT TELEMETRY BAR: FPS 21.8 | LATENCY 46ms | OBJECTS 3 | P95 48ms | 720p       |  |
|  +-----------------------------------------------------------------------------------+  |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  |  AI PIPELINE (Technical View): Camera -> YOLO -> ByteTrack -> SAM -> MiDaS        |  |
|  +-----------------------------------------------------------------------------------+  |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
```

---

## 10. Implementation Plan

1. **Types & State:** Add `ViewLevel = 'user' | 'technical'`, `SelectedObject` state, snapshot canvas export utility.
2. **Components:**
   - `TopNav.tsx`: `VISION-X` branding, Live indicator, User/Technical view toggle.
   - `ObjectInspector.tsx`: Clicked target deep-dive drawer with distance history.
   - `CameraControlDock.tsx`: Floating action bar with Start, Stop, Pause, Reset, Snapshot, Fullscreen.
   - `CompactTelemetryBar.tsx`: Clean telemetry status bar.
   - `SystemStatusDrawer.tsx`: `/ready` health breakdown modal.
3. **Canvas Interaction:** Add click event listener to canvas to select nearest object based on bbox hit-test.
4. **Snapshot Capture:** Render video + canvas overlay onto export canvas and trigger download.
5. **QA & Build:** Run `npm run build` and `python -m unittest discover backend/tests`.
