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
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-extrabold tracking-wider text-slate-200 uppercase">
            LIVE DETECTED OBJECTS
          </h2>
        </div>
        <span className="font-mono text-xs font-bold text-cyan-300">
          {isStreaming ? `${detections.length} ACTIVE` : '0 OBJECTS'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm font-sans border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950/40">
              <th className="py-3 px-3.5">OBJECT</th>
              <th className="py-3 px-3.5">CONFIDENCE</th>
              <th className="py-3 px-3.5">DISTANCE</th>
              <th className="py-3 px-3.5 text-right">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {!isStreaming || !detections || detections.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500 font-sans text-sm font-medium">
                  No active targets in camera field of view
                </td>
              </tr>
            ) : (
              detections.map((obj, idx) => {
                const idTag = obj.id !== undefined && obj.id !== null ? `#${obj.id}` : ``;
                const labelCap = `${obj.label.charAt(0).toUpperCase() + obj.label.slice(1)} ${idTag}`.trim();
                const confPercent = `${Math.round(obj.confidence * 100)}%`;
                
                let distValue = '--';
                let qualityTag: 'good' | 'moderate' | 'low' = 'good';

                if (obj.distance?.meters) {
                  distValue = `≈ ${obj.distance.meters.toFixed(1)} m`;
                  if (obj.distance.quality) {
                    qualityTag = obj.distance.quality;
                  }
                }

                return (
                  <tr
                    key={obj.id !== undefined && obj.id !== null ? `track_${obj.id}` : `obj_${idx}`}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-3.5 font-bold text-slate-100 text-sm">{labelCap}</td>
                    <td className="py-3.5 px-3.5 text-slate-300 font-semibold text-sm">{confPercent}</td>
                    <td className="py-3.5 px-3.5 font-black text-cyan-300 text-base">
                      <div className="flex items-center gap-2">
                        <span>{distValue}</span>
                        {distValue !== '--' && qualityTag === 'moderate' && (
                          <span className="rounded bg-amber-950/80 px-2 py-0.5 text-[10px] font-bold text-amber-400 ring-1 ring-amber-500/30 uppercase font-sans">
                            MODERATE
                          </span>
                        )}
                        {distValue !== '--' && qualityTag === 'low' && (
                          <span className="rounded bg-rose-950/80 px-2 py-0.5 text-[10px] font-bold text-rose-400 ring-1 ring-rose-500/30 uppercase font-sans">
                            LOW CONFIDENCE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5 text-right">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-950/80 px-2.5 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30 font-sans">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        TRACKED
                      </span>
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
