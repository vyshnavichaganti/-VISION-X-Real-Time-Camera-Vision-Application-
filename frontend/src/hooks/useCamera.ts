import { useState, useEffect, useRef, useCallback } from 'react';
import type { CameraDevice, CameraError, Resolution } from '../types/vision';

const RESOLUTION_MAP: Record<Resolution, { width: number; height: number }> = {
  '480p': { width: 640, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
};

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<CameraError | null>(null);

  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');
  const [resolution, setResolution] = useState<Resolution>('720p');

  // Enumerate connected video input devices
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        return;
      }
      const deviceInfos = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = deviceInfos
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1} (${device.deviceId.slice(0, 5)}...)`,
        }));

      setDevices(videoInputs);
      if (videoInputs.length > 0 && !activeDeviceId) {
        setActiveDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Failed to enumerate media devices:', err);
    }
  }, [activeDeviceId]);

  // Stop active stream tracks safely
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
  }, [stream]);

  // Start camera stream using getUserMedia
  const startCamera = useCallback(
    async (deviceIdToUse?: string, resToUse?: Resolution) => {
      stopCamera();
      setIsLoading(true);
      setError(null);

      const targetDeviceId = deviceIdToUse || activeDeviceId;
      const targetRes = resToUse || resolution;
      const { width, height } = RESOLUTION_MAP[targetRes];

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError({
          type: 'UNKNOWN_ERROR',
          message: 'MediaDevices API is not supported in this browser environment.',
        });
        setIsLoading(false);
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          ...(targetDeviceId ? { deviceId: { exact: targetDeviceId } } : { facingMode: 'user' }),
        },
        audio: false,
      };

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
        }

        setIsStreaming(true);
        setIsLoading(false);

        // Refresh devices after permission is granted to get full device labels
        await refreshDevices();
      } catch (err: any) {
        setIsLoading(false);
        setIsStreaming(false);

        let cameraError: CameraError;
        const errName = err.name || err.constructor?.name;

        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          cameraError = {
            type: 'PERMISSION_DENIED',
            message: 'Camera permission denied. Please allow camera access in your browser site settings.',
            technicalDetails: err.message,
          };
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          cameraError = {
            type: 'DEVICE_NOT_FOUND',
            message: 'No video camera detected on your system. Please connect a webcam.',
            technicalDetails: err.message,
          };
        } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
          cameraError = {
            type: 'HARDWARE_IN_USE',
            message: 'Camera is currently in use by another application (e.g. Zoom, Teams, or another browser tab).',
            technicalDetails: err.message,
          };
        } else if (errName === 'OverconstrainedError') {
          cameraError = {
            type: 'OVERCONSTRAINED',
            message: `Selected resolution (${targetRes}) is not supported by your camera hardware.`,
            technicalDetails: err.message,
          };
        } else {
          cameraError = {
            type: 'UNKNOWN_ERROR',
            message: 'Failed to access camera feed.',
            technicalDetails: err.message || String(err),
          };
        }

        setError(cameraError);
      }
    },
    [activeDeviceId, resolution, stopCamera, refreshDevices]
  );

  const changeDevice = useCallback(
    (newDeviceId: string) => {
      setActiveDeviceId(newDeviceId);
      if (isStreaming) {
        startCamera(newDeviceId, resolution);
      }
    },
    [isStreaming, resolution, startCamera]
  );

  const changeResolution = useCallback(
    (newRes: Resolution) => {
      setResolution(newRes);
      if (isStreaming) {
        startCamera(activeDeviceId, newRes);
      }
    },
    [activeDeviceId, isStreaming, startCamera]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Handle device list on mount
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
    videoRef,
    canvasRef,
    isStreaming,
    isLoading,
    error,
    devices,
    activeDeviceId,
    resolution,
    startCamera,
    stopCamera,
    changeDevice,
    changeResolution,
    clearError,
  };
}
