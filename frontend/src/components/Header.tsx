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
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/90 px-6 py-3.5 backdrop-blur-md sticky top-0 z-50">
      {/* Brand & App Title */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/10">
          <Camera className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-100 font-mono">
            VISION-X
          </h1>
          <p className="text-xs text-slate-400">
            Real-Time AI Vision
          </p>
        </div>
      </div>

      {/* View Mode Toggle: DEMO VIEW | TECHNICAL VIEW */}
      <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 shadow-inner" role="tablist" aria-label="View Mode Toggle">
        <button
          role="tab"
          aria-selected={viewMode === 'demo'}
          onClick={() => onToggleViewMode('demo')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
            viewMode === 'demo'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="h-4 w-4" />
          DEMO VIEW
        </button>
        <button
          role="tab"
          aria-selected={viewMode === 'technical'}
          onClick={() => onToggleViewMode('technical')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
            viewMode === 'technical'
              ? 'bg-purple-600 text-slate-100 shadow-md shadow-purple-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          TECHNICAL VIEW
        </button>
      </div>

      {/* Connection & Streaming Status Badge */}
      <div className="flex items-center gap-2.5">
        <div
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-extrabold tracking-wider border ${
            isStreaming
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400'
              : 'border-slate-800 bg-slate-900/90 text-slate-400'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span>{isStreaming ? 'LIVE' : 'IDLE'}</span>
        </div>
      </div>
    </header>
  );
};
