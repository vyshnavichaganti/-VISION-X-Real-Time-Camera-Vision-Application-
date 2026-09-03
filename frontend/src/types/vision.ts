/**
 * Types and interfaces for Camera, Vision API, Telemetry, and UI Command Center
 */

export type Resolution = '480p' | '720p' | '1080p';

export type ViewMode = 'demo' | 'technical';

export type VisionMode =
  | 'normal'
  | 'detection'
  | 'segmentation'
  | 'depth'
  | 'distance'
  | 'composite';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export type CameraErrorType =
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_FOUND'
  | 'HARDWARE_IN_USE'
  | 'OVERCONSTRAINED'
  | 'UNKNOWN_ERROR';

export interface CameraError {
  type: CameraErrorType;
  message: string;
  technicalDetails?: string;
}

export interface DetectionBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SegmentationMask {
  format: 'polygon' | 'rle';
  points: number[][];
}

export interface DepthSummary {
  available: boolean;
  min: number;
  max: number;
}

export interface ObjectDistance {
  meters: number;
  quality: 'good' | 'moderate' | 'low';
  calibrated: boolean;
}

export interface DetectedObject {
  id?: string | number | null;
  label: string;
  confidence: number;
  bbox: DetectionBBox;
  mask?: SegmentationMask | null;
  relative_depth?: number | null;
  distance?: ObjectDistance | null;
}

export interface DetectionResponse {
  objects: DetectedObject[];
  depth_summary?: DepthSummary | null;
  inference_time_ms: number;
  tracking_time_ms?: number;
  segmentation_time_ms?: number;
  depth_time_ms?: number;
  distance_time_ms?: number;
  total_processing_time_ms?: number;
  image_width: number;
  image_height: number;
  model: string;
}

export interface VisionTelemetry {
  cameraFps: number;
  aiFps: number;
  latencyMs: number;
  trackingLatencyMs: number;
  segmentationLatencyMs: number;
  depthLatencyMs: number;
  distanceLatencyMs: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  objectCount: number;
  activeTrackCount: number;
  activeMaskCount: number;
  activeDepthCount: number;
  activeDistanceCount: number;
  modelName: string;
  device: string;
  frameProcessingRate: number;
  backendOnline: boolean;
  depthAvailable: boolean;
  distanceCalibrated: boolean;
}

export interface VisionConfig {
  detectionEnabled: boolean;
  distanceEnabled: boolean;
  confidenceThreshold: number;
  targetDetectionFps: number;
  inferenceSize: number;
}

export interface AIEvent {
  id: string;
  timestamp: string;
  message: string;
  type: 'detection' | 'tracking' | 'distance' | 'system';
}

export interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}
