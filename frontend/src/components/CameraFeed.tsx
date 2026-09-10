import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Camera, Loader2, Maximize2, Minimize2, Activity } from 'lucide-react';
import { syncCanvasSize, drawTargetReticle, clearCanvas } from '../utils/canvas';
import type { VisionMode } from '../types/vision';

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isStreaming: boolean;
  isLoading: boolean;
  fps?: number;
  visionMode?: VisionMode;
  onStartCamera: () => void;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  videoRef,
  canvasRef,
  isStreaming,
  isLoading,
  fps,
  onStartCamera,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      syncCanvasSize(videoRef.current, canvasRef.current);
      drawTargetReticle(canvasRef.current);
    }
  }, [videoRef, canvasRef]);

  useEffect(() => {
    const handleResize = () => {
      if (videoRef.current && canvasRef.current && isStreaming) {
        syncCanvasSize(videoRef.current, canvasRef.current);
        drawTargetReticle(canvasRef.current);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [videoRef, canvasRef, isStreaming]);

  useEffect(() => {
    if (!isStreaming && canvasRef.current) {
      clearCanvas(canvasRef.current);
    }
  }, [isStreaming, canvasRef]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-2xl border border-amber-200/80 bg-stone-900 shadow-md group transition-all duration-300"
    >
      {/* HTML5 Video Layer */}
      <video
        ref={videoRef}
        playsInline
        muted
        onLoadedMetadata={handleLoadedMetadata}
        className={`h-full w-full object-cover transition-opacity duration-500 ${
          isStreaming ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* HTML5 Canvas Overlay Layer */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      {/* Idle / Off Placeholder */}
      {!isStreaming && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-stone-900/95 p-6 text-center text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-800 border border-amber-500/40 shadow-lg text-[#C5A059]">
            <Camera className="h-8 w-8" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-base font-bold tracking-wide text-white">REAL-TIME CAMERA PREVIEW</h3>
            <p className="text-xs text-stone-300">
              Point your camera to detect objects, track motion, segment boundaries, and estimate distance in real time.
            </p>
          </div>
          <button
            onClick={onStartCamera}
            className="mt-2 flex items-center gap-2 rounded-xl bg-[#C5A059] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#B38F48] shadow-md active:scale-95 cursor-pointer"
            aria-label="Start Camera Stream"
          >
            <Camera className="h-4 w-4" />
            START CAMERA
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-900/90 backdrop-blur-sm text-white">
          <Loader2 className="h-10 w-10 animate-spin text-[#C5A059]" />
          <p className="text-xs font-semibold tracking-wider text-amber-200 uppercase font-sans">
            Initializing camera stream & vision pipeline...
          </p>
        </div>
      )}

      {/* Live Stream Badges & Fullscreen Controls */}
      {isStreaming && (
        <>
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-stone-900/80 px-3 py-1 text-xs font-bold text-emerald-400 backdrop-blur-md border border-emerald-500/30">
              <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
              LIVE
            </div>
            {fps !== undefined && (
              <div className="flex items-center gap-1.5 rounded-full bg-stone-900/80 px-3 py-1 text-xs font-mono font-bold text-amber-300 backdrop-blur-md border border-amber-500/30">
                <Activity className="h-3.5 w-3.5 text-[#C5A059]" />
                {fps} FPS
              </div>
            )}
          </div>

          <div className="absolute right-4 top-4">
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="flex items-center justify-center rounded-xl bg-stone-900/80 p-2 text-white backdrop-blur-md border border-stone-700 hover:bg-stone-800 hover:text-amber-300 focus:outline-none transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
