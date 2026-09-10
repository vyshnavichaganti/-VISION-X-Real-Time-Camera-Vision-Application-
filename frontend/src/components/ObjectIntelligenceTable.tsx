import React from 'react';
import { Layers } from 'lucide-react';
import type { DetectedObject } from '../types/vision';

interface ObjectIntelligenceTableProps {
  detections: DetectedObject[];
  isStreaming: boolean;
}

export const ObjectIntelligenceTable: React.FC<ObjectIntelligenceTableProps> = ({
  detections,
  isStreaming,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-[#9A7B3E] border border-amber-200">
            <Layers className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
            Detected Objects
          </h2>
        </div>
        <span className="font-mono text-xs font-bold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-md">
          {isStreaming && detections ? `${detections.length} Detected` : '0 Objects'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-stone-200 text-xs font-bold uppercase tracking-wider text-stone-500 bg-stone-50/70">
              <th className="py-3 px-4">Object</th>
              <th className="py-3 px-4">Confidence</th>
              <th className="py-3 px-4">Distance</th>
              <th className="py-3 px-4 text-right">Track ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 font-sans">
            {!isStreaming || !detections || detections.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-stone-400 text-sm font-medium">
                  No objects currently detected. Point camera towards a person or object.
                </td>
              </tr>
            ) : (
              detections.map((obj, idx) => {
                const labelCap = obj.label.charAt(0).toUpperCase() + obj.label.slice(1);
                const confPercent = `${Math.round(obj.confidence * 100)}%`;
                
                let distValue = '--';
                if (obj.distance?.meters) {
                  distValue = `≈ ${obj.distance.meters.toFixed(1)} m`;
                }

                const trackIdStr = obj.id !== undefined && obj.id !== null ? `#${obj.id}` : '--';

                return (
                  <tr
                    key={obj.id !== undefined && obj.id !== null ? `track_${obj.id}` : `obj_${idx}`}
                    className="hover:bg-amber-50/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-stone-900 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#C5A059]" />
                        {labelCap}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-700 font-semibold font-mono text-sm">
                      {confPercent}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-[#9A7B3E] font-mono text-base">
                      {distValue}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-600 text-sm">
                      {trackIdStr}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
