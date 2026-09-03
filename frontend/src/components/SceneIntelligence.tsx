import React from 'react';
import { Eye, Target, Activity } from 'lucide-react';
import type { DetectedObject, VisionTelemetry } from '../types/vision';

interface SceneIntelligenceProps {
  telemetry: VisionTelemetry;
  detections: DetectedObject[];
  isStreaming: boolean;
}

export const SceneIntelligence: React.FC<SceneIntelligenceProps> = ({
  telemetry,
  detections,
  isStreaming,
}) => {
  let nearestObj: DetectedObject | null = null;
  let minDistance = Infinity;

  if (isStreaming && detections && detections.length > 0) {
    for (const obj of detections) {
      if (obj.distance && typeof obj.distance.meters === 'number' && obj.distance.meters < minDistance) {
        minDistance = obj.distance.meters;
        nearestObj = obj;
      }
    }
  }

  const count = detections ? detections.length : 0;
  let nearestLabel = 'None';
  let nearestDistanceStr = '--';

  if (nearestObj) {
    const objLabel: string = (nearestObj as DetectedObject).label;
    const objId = (nearestObj as DetectedObject).id;
    const labelCap = objLabel.charAt(0).toUpperCase() + objLabel.slice(1);
    const idTag = objId !== undefined && objId !== null ? ` #${objId}` : '';
    nearestLabel = `${labelCap}${idTag}`;

    if ((nearestObj as DetectedObject).distance?.meters) {
      nearestDistanceStr = `≈ ${(nearestObj as DetectedObject).distance!.meters.toFixed(1)} m`;
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-extrabold tracking-wider text-slate-200 uppercase">
            Scene Intelligence
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <Activity className={`h-3.5 w-3.5 ${count > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          <span className={count > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
            {count > 0 ? 'ACTIVE SCAN' : 'IDLE'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Metric 1: OBJECTS */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3.5 transition-colors hover:border-cyan-500/30">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">OBJECTS</span>
          <p className="mt-1 font-mono text-2xl font-black text-slate-100">
            {isStreaming ? telemetry.objectCount : 0}
          </p>
        </div>

        {/* Metric 2: TRACKED */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3.5 transition-colors hover:border-cyan-500/30">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">TRACKED</span>
          <p className="mt-1 font-mono text-2xl font-black text-cyan-400">
            {isStreaming ? telemetry.activeTrackCount : 0}
          </p>
        </div>

        {/* Metric 3: NEAREST OBJECT */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3.5 transition-colors hover:border-cyan-500/30">
          <div className="flex items-center gap-1 text-slate-400">
            <Target className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">NEAREST OBJECT</span>
          </div>
          <p className="mt-1 font-mono text-base font-bold text-slate-100 truncate">
            {isStreaming ? nearestLabel : 'None'}
          </p>
        </div>

        {/* Metric 4: NEAREST DISTANCE */}
        <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-3.5 transition-colors hover:border-cyan-500/30">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">NEAREST DISTANCE</span>
          <p className="mt-1 font-mono text-xl font-black text-emerald-400">
            {isStreaming ? nearestDistanceStr : '--'}
          </p>
        </div>
      </div>
    </div>
  );
};
