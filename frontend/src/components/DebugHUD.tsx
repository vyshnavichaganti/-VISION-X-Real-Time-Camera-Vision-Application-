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
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : healthStatus === 'STABLE'
      ? 'text-[#9A7B3E] bg-amber-50 border-amber-200'
      : healthStatus === 'DEGRADED'
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-rose-700 bg-rose-50 border-rose-200';

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-800 border border-stone-200">
            <Gauge className="h-4 w-4 text-[#C5A059]" />
          </div>
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
            Engineering Telemetry & Diagnostics
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold border ${healthColor}`}>
            {healthStatus}
          </span>
          {telemetry.backendOnline ? (
            <span className="flex items-center gap-1.5 font-bold text-emerald-700">
              <Wifi className="h-3.5 w-3.5" />
              API Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold text-rose-600">
              <WifiOff className="h-3.5 w-3.5" />
              API Offline
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {/* Metric 1: Camera FPS */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
          <div className="flex items-center gap-1.5 text-stone-500">
            <Activity className="h-4 w-4 text-[#C5A059]" />
            <span className="text-xs font-bold uppercase tracking-wider">Camera Capture</span>
          </div>
          <p className="mt-1.5 font-mono text-xl font-extrabold text-stone-900">
            {isStreaming ? `${telemetry.cameraFps} FPS` : '--'}
          </p>
        </div>

        {/* Metric 2: AI FPS */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
          <div className="flex items-center gap-1.5 text-stone-500">
            <Gauge className="h-4 w-4 text-[#C5A059]" />
            <span className="text-xs font-bold uppercase tracking-wider">AI Inference Rate</span>
          </div>
          <p className="mt-1.5 font-mono text-xl font-extrabold text-[#9A7B3E]">
            {isStreaming && telemetry.backendOnline ? `${telemetry.aiFps} FPS` : '--'}
          </p>
        </div>

        {/* Metric 3: Pipeline Breakdown */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
          <div className="flex items-center gap-1.5 text-stone-500">
            <Clock className="h-4 w-4 text-[#C5A059]" />
            <span className="text-xs font-bold uppercase tracking-wider">Stage Latencies</span>
          </div>
          <p className="mt-1.5 font-mono text-xs font-bold text-stone-900 truncate">
            {isStreaming && telemetry.backendOnline
              ? `${formatMs(telemetry.latencyMs)} / ${formatMs(telemetry.trackingLatencyMs)} / ${formatMs(telemetry.segmentationLatencyMs)} / ${formatMs(telemetry.depthLatencyMs)} / ${formatMs(telemetry.distanceLatencyMs)} ms`
              : 'N/A'}
          </p>
        </div>

        {/* Metric 4: P50 / P95 Percentiles */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
          <div className="flex items-center gap-1.5 text-stone-500">
            <BarChart2 className="h-4 w-4 text-[#C5A059]" />
            <span className="text-xs font-bold uppercase tracking-wider">P50 / P95 Latency</span>
          </div>
          <p className="mt-1.5 font-mono text-sm font-bold text-stone-900 truncate">
            {isStreaming && telemetry.backendOnline ? `${p50} ms / ${p95} ms` : '--'}
          </p>
        </div>

        {/* Metric 5: Active Targets Breakdown */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
          <div className="flex items-center gap-1.5 text-stone-500">
            <Target className="h-4 w-4 text-[#C5A059]" />
            <span className="text-xs font-bold uppercase tracking-wider">Active Targets</span>
          </div>
          <p className="mt-1.5 font-mono text-sm font-bold text-stone-900 truncate">
            {isStreaming && telemetry.backendOnline
              ? `${telemetry.objectCount} (${telemetry.activeTrackCount} tracked)`
              : 0}
          </p>
        </div>

        {/* Metric 6: Hardware Engine */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5">
          <div className="flex items-center gap-1.5 text-stone-500">
            <Cpu className="h-4 w-4 text-[#C5A059]" />
            <span className="text-xs font-bold uppercase tracking-wider">Hardware Target</span>
          </div>
          <p className="mt-1.5 font-mono text-xs font-bold text-stone-800 truncate">
            {telemetry.modelName} ({telemetry.device.toUpperCase()})
          </p>
        </div>
      </div>

      {/* Distance Calibration Curve Summary */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#9A7B3E] uppercase tracking-wider">
            Monocular Distance Calibration Equation
          </span>
          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-[#9A7B3E] border border-amber-200">
            Z = a / (depth + b)
          </span>
        </div>
        <p className="mt-1.5 text-xs text-stone-600 font-sans">
          Calibrated using reference depth values and FastSAM bounding metrics for accurate non-intrusive distance estimation.
        </p>
      </div>
    </div>
  );
};
