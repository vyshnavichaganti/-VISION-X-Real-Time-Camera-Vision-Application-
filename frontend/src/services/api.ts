import type { DetectionResponse } from '../types/vision';

// Respect VITE_API_URL or VITE_API_BASE_URL environment variable when deploying to cloud.
// Otherwise, default to local backend URL 'http://localhost:8000'.
const RAW_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = RAW_BASE_URL !== undefined && RAW_BASE_URL !== '' ? RAW_BASE_URL.replace(/\/+$/, '') : 'http://localhost:8000';

export async function fetchHealth(signal?: AbortSignal): Promise<{
  online: boolean;
  modelLoaded: boolean;
  modelName: string;
  device: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) {
      return { online: false, modelLoaded: false, modelName: 'Backend Offline', device: 'N/A' };
    }
    const data = await res.json();
    return {
      online: data.status === 'healthy' || data.status === 'ok',
      modelLoaded: Boolean(data.model_loaded),
      modelName: data.model || 'YOLOv8n-COCO',
      device: data.device || 'cpu',
    };
  } catch {
    return { online: false, modelLoaded: false, modelName: 'Backend Offline', device: 'N/A' };
  }
}

export async function fetchReadiness(signal?: AbortSignal): Promise<{
  ready: boolean;
  detector: string;
  tracker: string;
  segmentor: string;
  depth: string;
  distance: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/ready`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) {
      return {
        ready: false,
        detector: 'unavailable',
        tracker: 'unavailable',
        segmentor: 'unavailable',
        depth: 'unavailable',
        distance: 'unavailable',
      };
    }
    const data = await res.json();
    return {
      ready: data.status === 'ready',
      detector: data.detector || 'unavailable',
      tracker: data.tracker || 'unavailable',
      segmentor: data.segmentor || 'unavailable',
      depth: data.depth || 'unavailable',
      distance: data.distance || 'unavailable',
    };
  } catch {
    return {
      ready: false,
      detector: 'unavailable',
      tracker: 'unavailable',
      segmentor: 'unavailable',
      depth: 'unavailable',
      distance: 'unavailable',
    };
  }
}

export async function detectObjectsApi(
  imageBlob: Blob,
  confidenceThreshold: number = 0.40,
  inferenceSize: number = 640,
  sessionId?: string,
  signal?: AbortSignal
): Promise<DetectionResponse | null> {
  try {
    const formData = new FormData();
    formData.append('file', imageBlob, 'frame.jpg');

    let url = `${API_BASE_URL}/api/v1/detect?confidence=${confidenceThreshold}&inference_size=${inferenceSize}`;
    if (sessionId) {
      url += `&session_id=${encodeURIComponent(sessionId)}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!response.ok) {
      console.warn(`Detection API returned status ${response.status}`);
      return null;
    }

    const data: DetectionResponse = await response.json();
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // Intentionally aborted/cancelled request
      return null;
    }
    console.warn('Network error during object detection API call:', err);
    return null;
  }
}

export async function resetTrackingApi(sessionId?: string, signal?: AbortSignal): Promise<boolean> {
  try {
    let url = `${API_BASE_URL}/api/v1/reset-tracking`;
    if (sessionId) {
      url += `?session_id=${encodeURIComponent(sessionId)}`;
    }
    const res = await fetch(url, {
      method: 'POST',
      signal,
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to reset tracking state:', err);
    return false;
  }
}
