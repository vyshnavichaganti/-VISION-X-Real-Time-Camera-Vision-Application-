import React from 'react';
import { Eye, Users, ShieldCheck, Crosshair } from 'lucide-react';
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
  const totalObjects = isStreaming && detections ? detections.length : 0;
  const personCount = isStreaming && detections
    ? detections.filter((obj) => obj.label.toLowerCase() === 'person').length
    : 0;

  let sceneStatus = 'Standby';
  if (isStreaming) {
    if (totalObjects === 0) {
      sceneStatus = 'Clear';
    } else if (totalObjects > 5) {
      sceneStatus = 'Dense Scene';
    } else {
      sceneStatus = 'Active Scan';
    }
  }

  let trackingStatus = 'Inactive';
  if (isStreaming) {
    const trackedCount = telemetry.activeTrackCount || 0;
    trackingStatus = trackedCount > 0 ? `Active (${trackedCount} tracked)` : 'Ready';
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {/* Metric 1: OBJECTS DETECTED */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:border-amber-300">
        <div className="flex items-center gap-2 text-stone-500 mb-1">
          <Eye className="h-4 w-4 text-[#C5A059]" />
          <span className="text-xs font-bold uppercase tracking-wider">Objects Detected</span>
        </div>
        <p className="font-mono text-3xl font-extrabold text-stone-900">
          {totalObjects}
        </p>
      </div>

      {/* Metric 2: PEOPLE */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:border-amber-300">
        <div className="flex items-center gap-2 text-stone-500 mb-1">
          <Users className="h-4 w-4 text-[#C5A059]" />
          <span className="text-xs font-bold uppercase tracking-wider">People</span>
        </div>
        <p className="font-mono text-3xl font-extrabold text-stone-900">
          {personCount}
        </p>
      </div>

      {/* Metric 3: SCENE STATUS */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:border-amber-300">
        <div className="flex items-center gap-2 text-stone-500 mb-1">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-bold uppercase tracking-wider">Scene Status</span>
        </div>
        <p className="text-base font-extrabold text-stone-900 truncate mt-1">
          {sceneStatus}
        </p>
      </div>

      {/* Metric 4: TRACKING STATUS */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:border-amber-300">
        <div className="flex items-center gap-2 text-stone-500 mb-1">
          <Crosshair className="h-4 w-4 text-[#C5A059]" />
          <span className="text-xs font-bold uppercase tracking-wider">Tracking Status</span>
        </div>
        <p className="text-base font-extrabold text-stone-900 truncate mt-1">
          {trackingStatus}
        </p>
      </div>
    </div>
  );
};
