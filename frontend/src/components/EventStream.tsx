import React from 'react';
import { ScrollText, Radio } from 'lucide-react';
import type { AIEvent } from '../types/vision';

interface EventStreamProps {
  events: AIEvent[];
  defaultExpanded?: boolean;
}

export const EventStream: React.FC<EventStreamProps> = ({ events }) => {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-800 border border-stone-200">
            <ScrollText className="h-4 w-4 text-[#C5A059]" />
          </div>
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
            Real-Time Vision Event Log
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-700">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          <span>{events.length} EVENTS</span>
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 font-mono text-xs pr-1">
        {events.length === 0 ? (
          <div className="py-8 text-center text-stone-400 font-sans text-xs font-medium">
            No pipeline events recorded yet.
          </div>
        ) : (
          events.slice(-15).reverse().map((evt) => {
            const timeStr = new Date(evt.timestamp).toLocaleTimeString();
            return (
              <div
                key={evt.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-stone-100 bg-stone-50/80 p-2.5 transition-colors hover:bg-stone-100/60"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-[#9A7B3E] uppercase border border-amber-200">
                    {evt.type}
                  </span>
                  <span className="font-bold text-stone-800 font-sans text-xs">{evt.message}</span>
                </div>
                <span className="text-[11px] text-stone-400 shrink-0 font-mono">{timeStr}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
