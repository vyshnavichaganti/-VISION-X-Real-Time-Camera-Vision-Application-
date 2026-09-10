import React from 'react';
import { Camera } from 'lucide-react';

interface HeaderProps {
  isStreaming: boolean;
  modelName?: string;
}

export const Header: React.FC<HeaderProps> = ({ isStreaming }) => {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-[#FAF8F5]/90 px-4 sm:px-8 py-3.5 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & App Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/80 border border-amber-300/60 text-[#9A7B3E] shadow-sm">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-stone-900 font-sans">
              VISION-X
            </h1>
            <p className="text-xs font-medium text-stone-500">
              Real-Time AI Camera Vision
            </p>
          </div>
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
