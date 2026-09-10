import React from 'react';
import { Camera, Eye, Target, Ruler, ArrowRight } from 'lucide-react';

export const HowItWorksFlow: React.FC = () => {
  const steps = [
    {
      id: 'camera',
      title: 'Camera',
      desc: 'Live video intake',
      icon: Camera,
    },
    {
      id: 'detect',
      title: 'Detect',
      desc: 'Object identification',
      icon: Eye,
    },
    {
      id: 'track',
      title: 'Track',
      desc: 'Motion persistence',
      icon: Target,
    },
    {
      id: 'distance',
      title: 'Distance',
      desc: 'Metric estimation (~m)',
      icon: Ruler,
    },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 font-sans">
          How It Works
        </h2>
        <span className="text-[11px] font-semibold text-[#9A7B3E]">
          AI Vision Pipeline
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="relative flex items-center">
              <div className="flex w-full items-center gap-3 rounded-xl border border-amber-200/60 bg-[#FAF8F5]/80 p-3 transition-all hover:bg-amber-50/50 hover:border-amber-300">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#9A7B3E] shadow-sm border border-amber-200/80">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#C5A059] font-mono">0{idx + 1}</span>
                    <h3 className="text-xs font-extrabold text-stone-900 truncate">{step.title}</h3>
                  </div>
                  <p className="text-[11px] text-stone-500 truncate font-sans">{step.desc}</p>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-2 z-10 text-amber-400">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
