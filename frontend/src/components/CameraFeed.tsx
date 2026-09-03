import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Camera, Loader2, Maximize2, Minimize2, Eye, Activity } from 'lucide-react';
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
  visionMode = 'composite',
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
      className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/90 ring-1 ring-cyan-500/20 shadow-2xl shadow-cyan-950/40 group hover:ring-cyan-500/40 transition-all duration-300"
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/95 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-950/50 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/10">
            <Camera className="h-8 w-8 text-cyan-400" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-base font-semibold text-slate-100 tracking-wide">AI REAL-TIME VISION • HERO VIEWPORT</h3>
            <p className="text-xs text-slate-400">
              YOLOv8 Detection • ByteTrack Tracking • FastSAM Segmentation • MiDaS Depth • Metric Distance (~m)
            </p>
          </div>
          <button
            onClick={onStartCamera}
            className="mt-2 flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 transition-all hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 active:scale-95"
            aria-label="Start Camera Stream"
          >
            <Camera className="h-4 w-4" />
            START CAMERA STREAM
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/85 backdrop-blur-md">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
          <p className="text-xs font-semibold tracking-wide text-cyan-300 uppercase font-mono">
            INITIALIZING CAMERA STREAM & VISION PIPELINE...
          </p>
        </div>
      )}

      {/* Live Stream Status Badges & Fullscreen Controls */}
      {isStreaming && (
        <>
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold text-emerald-400 backdrop-blur-md ring-1 ring-emerald-500/30">
              <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
              LIVE
            </div>
            {fps !== undefined && (
              <div className="flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-mono font-bold text-cyan-300 backdrop-blur-md ring-1 ring-slate-800">
                <Activity className="h-3.5 w-3.5 text-cyan-400" />
                {fps} FPS
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-mono font-bold text-purple-300 backdrop-blur-md ring-1 ring-slate-800 uppercase">
              <Eye className="h-3.5 w-3.5 text-purple-400" />
              {visionMode}
            </div>
          </div>

          <div className="absolute right-4 top-4 opacity-90 group-hover:opacity-100 transition-opacity">
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Vision'}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Vision'}
              className="flex items-center justify-center rounded-xl bg-slate-950/80 p-2 text-slate-200 backdrop-blur-md ring-1 ring-slate-800 hover:bg-slate-900 hover:text-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
