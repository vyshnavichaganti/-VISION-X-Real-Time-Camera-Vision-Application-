import React from 'react';
import { Eye, Layers, Box, Cpu, Ruler, Sparkles } from 'lucide-react';
import type { VisionMode } from '../types/vision';

interface VisionModeSelectorProps {
  currentMode: VisionMode;
  onSelectMode: (mode: VisionMode) => void;
}

export const VisionModeSelector: React.FC<VisionModeSelectorProps> = ({
  currentMode,
  onSelectMode,
}) => {
  const modes: { id: VisionMode; label: string; icon: React.FC<{ className?: string }>; desc: string }[] = [
    { id: 'normal', label: 'Normal', icon: Eye, desc: 'Clean camera feed' },
    { id: 'detection', label: 'Detection', icon: Box, desc: 'YOLOv8 bounding boxes' },
    { id: 'segmentation', label: 'Segmentation', icon: Layers, desc: 'FastSAM polygon masks' },
    { id: 'depth', label: 'Depth', icon: Cpu, desc: 'MiDaS relative depth' },
    { id: 'distance', label: 'Distance', icon: Ruler, desc: 'Calibrated meters (~m)' },
    { id: 'composite', label: 'AI Composite', icon: Sparkles, desc: 'Full multi-stage pipeline' },
  ];

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-md">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Vision Mode Filter
        </span>
        <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase">
          {currentMode}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              title={mode.desc}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-center transition-all ${
                isActive
                  ? 'border border-cyan-500/60 bg-cyan-950/60 text-cyan-200 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                  : 'border border-slate-800/60 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-[11px] font-semibold tracking-tight">{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
