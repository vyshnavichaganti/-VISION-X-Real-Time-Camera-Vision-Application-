import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Eye, Target, Layers, Cpu, Ruler } from 'lucide-react';

export const HowAiSees: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const steps = [
    {
      title: '1. Object Detection (YOLOv8)',
      icon: Eye,
      desc: 'Identifies COCO object classes in real-time camera frames and outputs bounding box coordinates with confidence scores.',
    },
    {
      title: '2. Object Tracking (ByteTrack)',
      icon: Target,
      desc: 'Assigns persistent numerical tracking IDs (#1, #2...) across video frames using Kalman filter motion estimation.',
    },
    {
      title: '3. Instance Segmentation (FastSAM)',
      icon: Layers,
      desc: 'Generates pixel-accurate polygon contour masks to isolate detected target object shapes.',
    },
    {
      title: '4. Depth Estimation (MiDaS)',
      icon: Cpu,
      desc: 'Predicts relative spatial scene depth per pixel directly from 2D camera images.',
    },
    {
      title: '5. Calibrated Distance (~m)',
      icon: Ruler,
      desc: 'Maps relative depth values to metric distance in meters using inverse calibration curve Z = a / (d + b).',
    },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between text-left transition-colors hover:text-stone-900 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-[#9A7B3E] border border-amber-200">
            <HelpCircle className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
            Architecture Guide & AI Overview
          </h2>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-stone-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-stone-500" />
        )}
      </button>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-3 border-t border-stone-100">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#C5A059] shrink-0" />
                  <span className="font-bold text-stone-900">{step.title}</span>
                </div>
                <p className="text-xs leading-relaxed text-stone-600 font-sans">{step.desc}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
