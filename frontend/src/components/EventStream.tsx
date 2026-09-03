import React, { useState, useEffect } from 'react';
import { Activity, Radio, Target, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import type { AIEvent } from '../types/vision';

interface EventStreamProps {
  events: AIEvent[];
  defaultExpanded?: boolean;
}

export const EventStream: React.FC<EventStreamProps> = ({ events, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between border-b border-slate-800 pb-2.5 text-left transition-colors hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
        aria-expanded={isExpanded}
        aria-label="Toggle Live AI Event Stream Log"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-extrabold tracking-wider text-slate-200 uppercase">
            Live AI Event Stream
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-400">
            {events.length} EVENTS
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
          {events.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500 font-sans">
              No event logs recorded. Start camera stream to log live detections.
            </p>
          ) : (
            events.map((ev) => {
              const Icon =
                ev.type === 'tracking'
                  ? Target
                  : ev.type === 'distance'
                  ? Radio
                  : ev.type === 'system'
                  ? ShieldCheck
                  : Activity;

              const iconColor =
                ev.type === 'tracking'
                  ? 'text-cyan-400'
                  : ev.type === 'distance'
                  ? 'text-emerald-400'
                  : ev.type === 'system'
                  ? 'text-amber-400'
                  : 'text-purple-400';

              return (
                <div
                  key={ev.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/70 px-3 py-2 text-xs transition-colors hover:bg-slate-900/60"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className={`h-3.5 w-3.5 ${iconColor} shrink-0`} />
                    <span className="font-sans font-medium text-slate-200 truncate">{ev.message}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0">
                    {ev.timestamp}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
