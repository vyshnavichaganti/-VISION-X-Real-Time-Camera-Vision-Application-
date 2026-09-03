import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Eye, Target, Layers, Cpu, Ruler } from 'lucide-react';

export const HowAiSees: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const steps = [
    {
      title: '1. Object Detection (YOLOv8)',
      icon: Eye,
      color: 'text-cyan-400',
      desc: 'Identifies 80 COCO object classes in real-time camera frames and outputs bounding box coordinates with confidence scores.',
    },
    {
      title: '2. Persistent Object Tracking (ByteTrack)',
      icon: Target,
      color: 'text-purple-400',
      desc: 'Assigns persistent numerical tracking IDs (#1, #2...) across sequential video frames using Kalman filter motion estimation and Hungarian IoU matching.',
    },
    {
      title: '3. Instance Segmentation (FastSAM)',
      icon: Layers,
      color: 'text-indigo-400',
      desc: 'Generates pixel-accurate polygon contour masks to isolate detected target object shapes from scene backgrounds.',
    },
    {
      title: '4. Monocular Depth Estimation (MiDaS)',
      icon: Cpu,
      color: 'text-amber-400',
      desc: 'Predicts relative spatial scene depth per pixel directly from 2D camera images using deep convolutional features.',
    },
    {
      title: '5. Calibrated Metric Distance (~m)',
      icon: Ruler,
      color: 'text-emerald-400',
      desc: 'Maps relative depth values to approximate metric distance in meters using an inverse reference calibration curve Z = a / (d + b).',
    },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between text-left transition-colors hover:text-slate-200"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
            How AI Sees (Educational Pipeline Guide)
          </h2>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-3 border-t border-slate-800">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex flex-col gap-1.5 rounded-xl border border-slate-800/60 bg-slate-950/60 p-3 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-4 w-4 ${step.color} shrink-0`} />
                  <span className="font-semibold text-slate-200">{step.title}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">{step.desc}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
