import React from 'react';
import { Gauge, Clock, Target, Cpu, Activity, Wifi, WifiOff, BarChart2 } from 'lucide-react';
import type { VisionTelemetry } from '../types/vision';

interface DebugHUDProps {
  telemetry: VisionTelemetry;
  isStreaming: boolean;
}

const formatMs = (val?: number): string => {
  if (val === undefined || val === null) return '--';
  if (val > 0 && val < 1) return '<1';
  if (val <= 0) return '<1';
  return `${Math.round(val)}`;
};

export const DebugHUD: React.FC<DebugHUDProps> = ({ telemetry, isStreaming }) => {
  const p50 = telemetry.avgLatencyMs || 0;
  const p95 = telemetry.p95LatencyMs || 0;
  const healthStatus = !telemetry.backendOnline
    ? 'OFFLINE'
    : p95 > 300
    ? 'DEGRADED'
    : p95 > 150
    ? 'STABLE'
    : 'REAL-TIME';

  const healthColor =
    healthStatus === 'REAL-TIME'
      ? 'text-emerald-400 bg-emerald-950/80 ring-emerald-500/30'
      : healthStatus === 'STABLE'
      ? 'text-cyan-400 bg-cyan-950/80 ring-cyan-500/30'
      : healthStatus === 'DEGRADED'
      ? 'text-amber-400 bg-amber-950/80 ring-amber-500/30'
      : 'text-rose-400 bg-rose-950/80 ring-rose-500/30';

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4.5 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-extrabold tracking-wider text-slate-200 uppercase">
            Technical Telemetry & Latency Console
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className={`rounded px-2.5 py-0.5 font-mono text-xs font-extrabold ring-1 ${healthColor}`}>
            {healthStatus}
          </span>
          {telemetry.backendOnline ? (
            <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <Wifi className="h-3.5 w-3.5" />
              API Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-semibold text-rose-400">
              <WifiOff className="h-3.5 w-3.5" />
              API Offline
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Metric 1: Camera FPS */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3 transition-colors hover:border-cyan-500/30" title="Real-Time HTML5 Camera Capture Frame Rate (fps)">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-300">Camera FPS</span>
          </div>
          <p className="mt-1.5 font-mono text-xl font-black text-slate-100">
            {isStreaming ? telemetry.cameraFps : '--'}
          </p>
        </div>

        {/* Metric 2: AI FPS */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3 transition-colors hover:border-cyan-500/30" title="Measured Backend Neural Model Execution Rate (fps)">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Gauge className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-300">AI FPS</span>
          </div>
          <p className="mt-1.5 font-mono text-xl font-black text-cyan-300">
            {isStreaming && telemetry.backendOnline ? telemetry.aiFps : '--'}
          </p>
        </div>

        {/* Metric 3: Pipeline Breakdown */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3 transition-colors hover:border-cyan-500/30" title="Sequential Stage Latencies: Detection / Tracking / Segmentation / Depth / Distance (ms)">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-300">Stage Latencies</span>
          </div>
          <p className="mt-1.5 font-mono text-xs font-black text-slate-100 truncate">
            {isStreaming && telemetry.backendOnline
              ? `${formatMs(telemetry.latencyMs)}/${formatMs(telemetry.trackingLatencyMs)}/${formatMs(telemetry.segmentationLatencyMs)}/${formatMs(telemetry.depthLatencyMs)}/${formatMs(telemetry.distanceLatencyMs)} ms`
              : 'N/A'}
          </p>
        </div>

        {/* Metric 4: P50 / P95 Percentiles */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3 transition-colors hover:border-cyan-500/30" title="Statistical End-to-End Latency Percentiles (P50 average / P95 tail latency)">
          <div className="flex items-center gap-1.5 text-slate-400">
            <BarChart2 className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-300">P50 / P95</span>
          </div>
          <p className="mt-1.5 font-mono text-xs font-black text-slate-100 truncate">
            {isStreaming && telemetry.backendOnline ? `${p50} ms / ${p95} ms` : '--'}
          </p>
        </div>

        {/* Metric 5: Active Targets Breakdown */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3 transition-colors hover:border-cyan-500/30" title="Active Detections Breakdown: (Tracked / Segmented / Depth / Distance)">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Target className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-300">Active Targets</span>
          </div>
          <p className="mt-1.5 font-mono text-xs font-black text-slate-100 truncate">
            {isStreaming && telemetry.backendOnline
              ? `${telemetry.objectCount} (${telemetry.activeTrackCount}/${telemetry.activeMaskCount}/${telemetry.activeDepthCount}/${telemetry.activeDistanceCount})`
              : 0}
          </p>
        </div>

        {/* Metric 6: Hardware Engine */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3 transition-colors hover:border-cyan-500/30" title="Active PyTorch Execution Hardware Engine & Model Name">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-300">Hardware Engine</span>
          </div>
          <p className="mt-1.5 font-mono text-xs font-black text-slate-200 truncate">
            {telemetry.modelName} ({telemetry.device.toUpperCase()})
          </p>
        </div>
      </div>

      {/* Developer Distance Validation Panel */}
      <div className="mt-1 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-extrabold text-cyan-300 uppercase tracking-wider">
            <Gauge className="h-4 w-4 text-cyan-400" />
            <span>Developer Distance Measurement Validation</span>
          </div>
          <span className="rounded bg-cyan-950/80 px-2 py-0.5 text-[10px] font-bold text-cyan-400 ring-1 ring-cyan-500/30">
            CALIBRATION ACTIVE
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-400 leading-relaxed font-sans">
          Raw monocular distance metrics estimated from MiDaS relative depth and FastSAM mask features using inverse calibration curve <code className="font-mono text-cyan-300 text-[11px]">Z = a / (d + b)</code>. Values are strictly preserved without automatic modification.
        </p>
      </div>
    </div>
  );
};
