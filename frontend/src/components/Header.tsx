import React from 'react';
import { Camera, Eye, SlidersHorizontal } from 'lucide-react';
import type { ViewMode } from '../types/vision';

interface HeaderProps {
  isStreaming: boolean;
  modelName?: string;
  viewMode: ViewMode;
  onToggleViewMode: (mode: ViewMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isStreaming,
  viewMode,
  onToggleViewMode,
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-[#FAF8F5]/90 px-4 sm:px-8 py-3.5 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand & App Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/80 border border-amber-300/60 text-[#9A7B3E] shadow-sm">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-stone-900 font-sans">
                VISION-X
              </h1>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-[#9A7B3E] border border-amber-200">
                PRO
              </span>
            </div>
            <p className="text-xs font-medium text-stone-500">
              Real-Time AI Camera Vision
            </p>
          </div>
        </div>

        {/* View Mode Navigation Toggle */}
        <div className="flex items-center rounded-xl border border-stone-200 bg-white p-1 shadow-sm" role="tablist" aria-label="View Mode Toggle">
          <button
            role="tab"
            aria-selected={viewMode === 'demo'}
            onClick={() => onToggleViewMode('demo')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all focus:outline-none ${
              viewMode === 'demo'
                ? 'bg-[#C5A059] text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Eye className="h-4 w-4" />
            DEMO
          </button>
          <button
            role="tab"
            aria-selected={viewMode === 'technical'}
            onClick={() => onToggleViewMode('technical')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all focus:outline-none ${
              viewMode === 'technical'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            TECHNICAL
          </button>
        </div>

        {/* Connection & Live Streaming Status */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold tracking-wider border shadow-sm ${
              isStreaming
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-stone-200 bg-white text-stone-600'
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
              }`}
            />
            <span className="font-mono text-xs">{isStreaming ? 'LIVE' : 'STANDBY'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
