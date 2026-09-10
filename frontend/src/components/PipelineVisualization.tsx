import React from 'react';
import { Cpu, CheckCircle2 } from 'lucide-react';
import type { VisionTelemetry } from '../types/vision';

interface PipelineVisualizationProps {
  telemetry: VisionTelemetry;
  isStreaming: boolean;
  isTechnicalView?: boolean;
}

export const PipelineVisualization: React.FC<PipelineVisualizationProps> = ({
  telemetry,
  isStreaming,
}) => {
  const formatMs = (val?: number): string => {
    if (val === undefined || val === null) return '--';
    if (val > 0 && val < 1) return '<1 ms';
    if (val <= 0) return '<1 ms';
    return `${Math.round(val)} ms`;
  };

  const techStages = [
    { name: 'Camera', model: 'Browser WebRTC', type: 'Input', latency: isStreaming ? `${telemetry.cameraFps} FPS` : '--', status: isStreaming ? 'ACTIVE' : 'READY' },
    { name: 'YOLOv8', model: telemetry.modelName || 'YOLOv8n-COCO', type: 'Detection', latency: isStreaming ? formatMs(telemetry.latencyMs) : '--', status: isStreaming ? 'ACTIVE' : 'READY' },
    { name: 'ByteTrack', model: 'Kalman + IoU', type: 'Tracking', latency: isStreaming ? formatMs(telemetry.trackingLatencyMs) : '--', status: isStreaming ? 'ACTIVE' : 'READY' },
    { name: 'FastSAM', model: 'FastSAM-s.pt', type: 'Segmentation', latency: isStreaming ? formatMs(telemetry.segmentationLatencyMs) : '--', status: isStreaming ? 'ACTIVE' : 'READY' },
    { name: 'MiDaS', model: 'MiDaS_small', type: 'Depth', latency: isStreaming ? formatMs(telemetry.depthLatencyMs) : '--', status: isStreaming ? 'ACTIVE' : 'READY' },
    { name: 'Distance', model: 'Calibrated Curve', type: 'Distance', latency: isStreaming ? formatMs(telemetry.distanceLatencyMs) : '--', status: isStreaming ? 'ACTIVE' : 'READY' },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-800 border border-stone-200">
            <Cpu className="h-4 w-4 text-[#C5A059]" />
          </div>
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
            AI Vision Pipeline Architecture
          </h2>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
          {isStreaming ? 'ACTIVE PIPELINE PASS' : 'PIPELINE STANDBY'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-1">
        {techStages.map((stage) => (
          <div key={stage.name} className="flex flex-col justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 transition-all hover:border-amber-300 hover:bg-white hover:shadow-sm">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{stage.type}</span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 font-mono">
                  <CheckCircle2 className="h-3 w-3" />
                  {stage.status}
                </span>
              </div>
              <p className="font-extrabold text-base text-stone-900">{stage.name}</p>
              <p className="text-xs font-mono text-stone-500 truncate">{stage.model}</p>
            </div>
            <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-stone-400">LATENCY</span>
              <span className="font-mono text-xs font-black text-[#9A7B3E]">{stage.latency}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
