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
    <div className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
          Vision Mode Filter
        </span>
        <span className="text-xs font-mono text-[#9A7B3E] font-bold uppercase">
          {currentMode}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              title={mode.desc}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 text-center transition-all cursor-pointer ${
                isActive
                  ? 'border border-amber-300 bg-amber-50 text-[#9A7B3E] font-bold shadow-sm'
                  : 'border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-[#C5A059]' : 'text-stone-400'}`} />
              <span className="text-xs tracking-tight">{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
