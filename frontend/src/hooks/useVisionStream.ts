import { useState, useEffect, useRef, useCallback } from 'react';
import type { VisionTelemetry, DetectedObject, VisionMode, AIEvent } from '../types/vision';
import { detectObjectsApi, fetchHealth, resetTrackingApi } from '../services/api';
import { drawDetections, clearCanvas, drawTargetReticle, clearTrackingTrails } from '../utils/canvas';

interface UseVisionStreamProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isStreaming: boolean;
  visionMode?: VisionMode;
}

export function useVisionStream({
  videoRef,
  canvasRef,
  isStreaming,
  visionMode = 'composite',
}: UseVisionStreamProps) {
  const [detectionEnabled, setDetectionEnabled] = useState<boolean>(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.25);
  const [inferenceSize, setInferenceSize] = useState<number>(640);
  const [maxTargetFps, setMaxTargetFps] = useState<number>(10);
  const [adaptiveFps, setAdaptiveFps] = useState<number>(10);
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [events, setEvents] = useState<AIEvent[]>([]);

  const [telemetry, setTelemetry] = useState<VisionTelemetry>({
    cameraFps: 0,
    aiFps: 0,
    latencyMs: 0,
    trackingLatencyMs: 0,
    segmentationLatencyMs: 0,
    depthLatencyMs: 0,
    distanceLatencyMs: 0,
    totalLatencyMs: 0,
    avgLatencyMs: 0,
    p95LatencyMs: 0,
    objectCount: 0,
    activeTrackCount: 0,
    activeMaskCount: 0,
    activeDepthCount: 0,
    activeDistanceCount: 0,
    modelName: 'YOLOv8n-COCO',
    device: 'cpu',
    frameProcessingRate: 0,
    backendOnline: false,
    depthAvailable: false,
    distanceCalibrated: true,
  });

  const [lastDetections, setLastDetections] = useState<DetectedObject[]>([]);

  const isProcessingRef = useRef<boolean>(false);
  const aiFrameCountRef = useRef<number>(0);
  const cameraFrameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const latencyHistoryRef = useRef<number[]>([]);
  const seenTrackIdsRef = useRef<Set<string | number>>(new Set());

  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `session_${Math.random().toString(36).substring(2, 11)}`
  );

  // Event logger helper (bounded at 50 events)
  const addEvent = useCallback((message: string, type: 'detection' | 'tracking' | 'distance' | 'system') => {
    const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newEv: AIEvent = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: timeStr,
      message,
      type,
    };
    setEvents((prev) => [newEv, ...prev].slice(0, 50));
  }, []);

  const prevBackendOnlineRef = useRef<boolean>(false);

  // Health check polling & backend status monitoring (fires transition events once)
  useEffect(() => {
    let isMounted = true;
    const checkBackendStatus = async () => {
      const status = await fetchHealth();
      if (isMounted) {
        if (!prevBackendOnlineRef.current && status.online) {
          addEvent('AI Backend connected and initialized', 'system');
        } else if (prevBackendOnlineRef.current && !status.online) {
          addEvent('AI Backend disconnected', 'system');
        }
        prevBackendOnlineRef.current = status.online;

        setTelemetry((prev) => ({
          ...prev,
          backendOnline: status.online,
          modelName: status.modelLoaded ? status.modelName : prev.modelName,
          device: status.device || prev.device,
        }));
      }
    };

    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [addEvent]);

  // Dedicated effect for Stream Start / Stop event logging
  useEffect(() => {
    if (isStreaming) {
      addEvent('Camera stream started', 'system');
      seenTrackIdsRef.current.clear();
      clearTrackingTrails();
      resetTrackingApi(sessionIdRef.current);
    } else {
      resetTrackingApi(sessionIdRef.current);
      seenTrackIdsRef.current.clear();
      clearTrackingTrails();
      setLastDetections([]);
      if (canvasRef.current) {
        clearCanvas(canvasRef.current);
      }
    }
  }, [isStreaming, addEvent, canvasRef]);

  // Frame Capture helper
  const captureFrameBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        resolve(null);
        return;
      }

      if (!hiddenCanvasRef.current) {
        hiddenCanvasRef.current = document.createElement('canvas');
      }

      const canvas = hiddenCanvasRef.current;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.80);
    });
  }, [videoRef]);

  // Main real-time frame loop with adaptive controller & cancellation
  useEffect(() => {
    let animId: number;
    let timerId: ReturnType<typeof setTimeout>;

    // Camera FPS counter
    const measureCameraFps = () => {
      if (isStreaming) {
        cameraFrameCountRef.current += 1;
        const now = performance.now();
        const delta = now - lastTimeRef.current;

        if (delta >= 1000) {
          const cFps = Math.round((cameraFrameCountRef.current * 1000) / delta);
          const aFps = Math.round((aiFrameCountRef.current * 1000) / delta);

          // Calculate P50 & P95 latency
          const history = [...latencyHistoryRef.current];
          let avgLat = 0;
          let p95Lat = 0;
          if (history.length > 0) {
            const sorted = history.sort((a, b) => a - b);
            avgLat = Math.round(sorted.reduce((acc, v) => acc + v, 0) / sorted.length);
            const p95Idx = Math.floor(sorted.length * 0.95);
            p95Lat = Math.round(sorted[p95Idx] || sorted[sorted.length - 1]);
          }

          // Bounded Adaptive Rate Controller
          if (avgLat > 250) {
            setAdaptiveFps((prev) => Math.max(2, prev - 1));
          } else if (avgLat < 100 && avgLat > 0) {
            setAdaptiveFps((prev) => Math.min(maxTargetFps, prev + 1));
          }

          setTelemetry((prev) => ({
            ...prev,
            cameraFps: cFps,
            aiFps: aFps,
            avgLatencyMs: avgLat,
            p95LatencyMs: p95Lat,
            frameProcessingRate: aFps,
          }));

          cameraFrameCountRef.current = 0;
          aiFrameCountRef.current = 0;
          lastTimeRef.current = now;
        }

        animId = requestAnimationFrame(measureCameraFps);
      }
    };

    // AI Inference tick execution
    const runInferenceTick = async () => {
      if (isStreaming && detectionEnabled && !isProcessingRef.current) {
        isProcessingRef.current = true;

        const controller = new AbortController();
        activeAbortControllerRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
          const blob = await captureFrameBlob();
          if (blob) {
            const result = await detectObjectsApi(
              blob,
              confidenceThreshold,
              inferenceSize,
              sessionIdRef.current,
              controller.signal
            );

            if (result && result.objects) {
              aiFrameCountRef.current += 1;
              const detLat = Math.round(result.inference_time_ms);
              const trackLat = Math.round(result.tracking_time_ms || 0);
              const segLat = Math.round(result.segmentation_time_ms || 0);
              const depthLat = Math.round(result.depth_time_ms || 0);
              const distLat = Math.round(result.distance_time_ms || 0);
              const totalLat = Math.round(result.total_processing_time_ms || detLat + trackLat + segLat + depthLat + distLat);
              
              const activeTrackCount = result.objects.filter(
                (obj) => obj.id !== null && obj.id !== undefined
              ).length;
              const activeMaskCount = result.objects.filter(
                (obj) => obj.mask && obj.mask.points && obj.mask.points.length > 0
              ).length;
              const activeDepthCount = result.objects.filter(
                (obj) => obj.relative_depth !== null && obj.relative_depth !== undefined
              ).length;
              const activeDistanceCount = result.objects.filter(
                (obj) => obj.distance !== null && obj.distance !== undefined
              ).length;

              // Log new tracklets to live AI Event stream
              result.objects.forEach((obj) => {
                if (obj.id !== undefined && obj.id !== null && !seenTrackIdsRef.current.has(obj.id)) {
                  seenTrackIdsRef.current.add(obj.id);
                  const labelCap = obj.label.charAt(0).toUpperCase() + obj.label.slice(1);
                  let msg = `${labelCap} #${obj.id} detected (${Math.round(obj.confidence * 100)}%)`;
                  if (obj.distance?.meters) {
                    msg += ` • ≈${obj.distance.meters.toFixed(1)}m`;
                  }
                  addEvent(msg, 'tracking');
                }
              });

              latencyHistoryRef.current.push(totalLat);
              if (latencyHistoryRef.current.length > 15) {
                latencyHistoryRef.current.shift();
              }

              setLastDetections(result.objects);
              setTelemetry((prev) => ({
                ...prev,
                latencyMs: detLat,
                trackingLatencyMs: trackLat,
                segmentationLatencyMs: segLat,
                depthLatencyMs: depthLat,
                distanceLatencyMs: distLat,
                totalLatencyMs: totalLat,
                objectCount: result.objects.length,
                activeTrackCount,
                activeMaskCount,
                activeDepthCount,
                activeDistanceCount,
                modelName: result.model || prev.modelName,
                backendOnline: true,
                depthAvailable: result.depth_summary?.available ?? false,
                distanceCalibrated: result.objects.some((o) => o.distance?.calibrated ?? false),
              }));

              if (canvasRef.current) {
                drawDetections(
                  canvasRef.current,
                  result.objects,
                  result.image_width,
                  result.image_height,
                  visionMode
                );
              }
            }
          }
        } catch (err) {
          console.warn('Inference execution caught exception:', err);
        } finally {
          clearTimeout(timeoutId);
          isProcessingRef.current = false;
          activeAbortControllerRef.current = null;
        }
      }
      if (isStreaming) {
        const currentTarget = Math.min(adaptiveFps, maxTargetFps);
        const intervalMs = Math.max(40, Math.round(1000 / currentTarget));
        timerId = setTimeout(runInferenceTick, intervalMs);
      }
    };

    if (isStreaming) {
      lastTimeRef.current = performance.now();
      cameraFrameCountRef.current = 0;
      aiFrameCountRef.current = 0;
      latencyHistoryRef.current = [];
      animId = requestAnimationFrame(measureCameraFps);
      runInferenceTick();
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (timerId) clearTimeout(timerId);
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
      isProcessingRef.current = false;
    };
  }, [
    isStreaming,
    detectionEnabled,
    confidenceThreshold,
    inferenceSize,
    maxTargetFps,
    adaptiveFps,
    visionMode,
    captureFrameBlob,
    canvasRef,
    addEvent,
  ]);

  // Redraw reticle when detection is toggled off
  useEffect(() => {
    if (isStreaming && !detectionEnabled && canvasRef.current) {
      clearCanvas(canvasRef.current);
      drawTargetReticle(canvasRef.current);
    }
  }, [isStreaming, detectionEnabled, canvasRef]);

  const toggleDetection = useCallback(() => {
    setDetectionEnabled((prev) => {
      addEvent(prev ? 'Object detection disabled' : 'Object detection enabled', 'system');
      return !prev;
    });
  }, [addEvent]);

  const changeConfidenceThreshold = useCallback((val: number) => {
    setConfidenceThreshold(val);
  }, []);

  const changeInferenceSize = useCallback((val: number) => {
    setInferenceSize(val);
    addEvent(`Inference resolution set to ${val}×${val}`, 'system');
  }, [addEvent]);

  const resetTracking = useCallback(async () => {
    seenTrackIdsRef.current.clear();
    clearTrackingTrails();
    await resetTrackingApi(sessionIdRef.current);
    addEvent('Tracking history reset', 'system');
  }, [addEvent]);

  return {
    detectionEnabled,
    confidenceThreshold,
    inferenceSize,
    maxTargetFps,
    telemetry,
    lastDetections,
    events,
    demoMode,
    setDemoMode,
    toggleDetection,
    changeConfidenceThreshold,
    changeInferenceSize,
    setMaxTargetFps,
    resetTracking,
  };
}
