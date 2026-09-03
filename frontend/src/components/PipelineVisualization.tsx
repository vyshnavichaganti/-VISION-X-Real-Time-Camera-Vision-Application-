import React from 'react';
import { Cpu, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { VisionTelemetry } from '../types/vision';

interface PipelineVisualizationProps {
  telemetry: VisionTelemetry;
  isStreaming: boolean;
  isTechnicalView?: boolean;
}

export const PipelineVisualization: React.FC<PipelineVisualizationProps> = ({
  telemetry,
  isStreaming,
  isTechnicalView = false,
}) => {
  const formatMs = (val?: number): string => {
    if (val === undefined || val === null) return '--';
    if (val > 0 && val < 1) return '<1 ms';
    if (val <= 0) return '<1 ms';
    return `${Math.round(val)} ms`;
  };

  const demoStages = [
    { name: 'Camera', desc: 'Live Video Feed' },
    { name: 'YOLOv8', desc: 'Object Detection' },
    { name: 'ByteTrack', desc: 'Object Tracking' },
    { name: 'FastSAM', desc: 'Object Segmentation' },
    { name: 'MiDaS', desc: 'Depth Estimation' },
    { name: 'Distance', desc: 'Approx. Distance' },
  ];

  const techStages = [
    { name: 'Camera', model: 'Browser WebRTC', type: 'Input', latency: isStreaming ? `${telemetry.cameraFps} FPS` : '--', status: isStreaming ? 'ACTIVE' : 'READY' },
    { name: 'YOLOv8', model: telemetry.modelName || 'YOLOv8n-COCO', type: 'Detection', latency: isStreaming ? formatMs(telemetry.latencyMs) : '--', status: isStreaming ? 'ACTIVE' : 'READY' },
    { name: 'ByteTrack', model: 'Kalman + IoU', type: 'Tracking', latency: isStreaming ? formatMs(telemetry.trackingLatencyMs) : '--', status: isStreaming ? 'ACTIVE' : 'READY' },
    { name: 'FastSAM', model: 'FastSAM-s.pt', type: 'Segmentation', latency: isStreaming ? formatMs(telemetry.segmentationLatencyMs) : '--', status: isStreaming ? 'ACTIVE' : 'READY' },
    { name: 'MiDaS', model: 'MiDaS_small', type: 'Depth', latency: isStreaming ? formatMs(telemetry.depthLatencyMs) : '--', status: isStreaming ? 'ACTIVE' : 'READY' },
    { name: 'Distance', model: 'Calibrated Curve', type: 'Calibration', latency: isStreaming ? formatMs(telemetry.distanceLatencyMs) : '--', status: isStreaming ? 'ACTIVE' : 'READY' },
  ];

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4.5 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-extrabold tracking-wider text-slate-200 uppercase">
            AI Pipeline Architecture
          </h2>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-400">
          {isStreaming ? 'ACTIVE SEQUENTIAL PASS' : 'PIPELINE STANDBY'}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 overflow-x-auto">
        {!isTechnicalView ? (
          demoStages.map((stage, idx) => (
            <React.Fragment key={stage.name}>
              <div className="flex flex-col gap-1 rounded-xl border border-slate-800/90 bg-slate-950/80 p-3.5 min-w-[130px] flex-1 text-center transition-all hover:border-cyan-500/40">
                <p className="font-extrabold text-sm text-cyan-300">{stage.name}</p>
                <p className="text-xs font-medium text-slate-300">{stage.desc}</p>
              </div>
              {idx < demoStages.length - 1 && (
                <div className="hidden sm:flex items-center justify-center px-1">
                  <ArrowRight className={`h-4 w-4 shrink-0 transition-colors ${isStreaming ? 'text-cyan-400 animate-pulse' : 'text-slate-700'}`} />
                </div>
              )}
            </React.Fragment>
          ))
        ) : (
          techStages.map((stage, idx) => (
            <React.Fragment key={stage.name}>
              <div className="flex flex-col gap-1.5 rounded-xl border border-slate-800/90 bg-slate-950/80 p-3.5 min-w-[130px] flex-1 transition-all hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-950/20">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stage.type}</span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 font-mono">
                    <CheckCircle2 className="h-3 w-3" />
                    {stage.status}
                  </span>
                </div>
                <p className="font-extrabold text-sm text-slate-100">{stage.name}</p>
                <p className="text-xs font-mono text-slate-400 truncate">{stage.model}</p>
                <p className="mt-0.5 font-mono text-xs font-black text-cyan-300">{stage.latency}</p>
              </div>
              {idx < techStages.length - 1 && (
                <div className="hidden sm:flex items-center justify-center px-1">
                  <ArrowRight className={`h-4 w-4 shrink-0 transition-colors ${isStreaming ? 'text-cyan-400 animate-pulse' : 'text-slate-700'}`} />
                </div>
              )}
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
};
