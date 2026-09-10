import React, { useState } from 'react';
import { Play, Square, Video, Sliders, Eye, ChevronDown, ChevronUp, RotateCcw, Cpu } from 'lucide-react';
import type { CameraDevice, Resolution } from '../types/vision';

interface ControlPanelProps {
  isStreaming: boolean;
  isLoading: boolean;
  devices: CameraDevice[];
  activeDeviceId: string;
  resolution: Resolution;
  detectionEnabled: boolean;
  confidenceThreshold: number;
  inferenceSize: number;
  backendOnline: boolean;
  demoMode: boolean;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onResetTracking: () => void;
  onDeviceChange: (deviceId: string) => void;
  onResolutionChange: (res: Resolution) => void;
  onToggleDetection: () => void;
  onConfidenceChange: (val: number) => void;
  onInferenceSizeChange: (val: number) => void;
  onToggleDemoMode: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isStreaming,
  isLoading,
  devices,
  activeDeviceId,
  resolution,
  detectionEnabled,
  confidenceThreshold,
  inferenceSize,
  backendOnline,
  onStartCamera,
  onStopCamera,
  onResetTracking,
  onDeviceChange,
  onResolutionChange,
  onToggleDetection,
  onConfidenceChange,
  onInferenceSizeChange,
}) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      {/* Header & Status Indicator */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-[#9A7B3E] border border-amber-200">
            <Sliders className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
            Camera Controls
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono font-semibold">
          <span
            className={`h-2 w-2 rounded-full ${
              backendOnline ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
          <span className={backendOnline ? 'text-emerald-700' : 'text-rose-600'}>
            {backendOnline ? 'AI Connected' : 'AI Offline'}
          </span>
        </div>
      </div>

      {/* Main Action Buttons Grid: Start Camera | Stop Camera */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={onStartCamera}
          disabled={isStreaming || isLoading}
          aria-label="Start Camera"
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-bold transition-all focus:outline-none cursor-pointer ${
            isStreaming || isLoading
              ? 'cursor-not-allowed border border-stone-200 bg-stone-100 text-stone-400'
              : 'bg-[#C5A059] text-white hover:bg-[#B38F48] shadow-sm active:scale-95'
          }`}
        >
          <Play className="h-4 w-4 fill-current shrink-0" />
          <span>Start Camera</span>
        </button>

        <button
          onClick={onStopCamera}
          disabled={!isStreaming || isLoading}
          aria-label="Stop Camera"
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-bold transition-all focus:outline-none cursor-pointer ${
            !isStreaming || isLoading
              ? 'cursor-not-allowed border border-stone-200 bg-stone-100 text-stone-400'
              : 'border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 active:scale-95'
          }`}
        >
          <Square className="h-4 w-4 fill-current shrink-0" />
          <span>Stop Camera</span>
        </button>
      </div>

      {/* Reset Tracking Button */}
      <button
        onClick={onResetTracking}
        disabled={!isStreaming || isLoading}
        aria-label="Reset Tracking"
        className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition-all border ${
          !isStreaming || isLoading
            ? 'cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400'
            : 'border-amber-300 bg-amber-50 text-[#9A7B3E] hover:bg-amber-100 active:scale-95 cursor-pointer'
        }`}
      >
        <RotateCcw className="h-3.5 w-3.5 shrink-0" />
        <span>Reset Tracking</span>
      </button>

      {/* Selectors: Device & Resolution */}
      <div className="grid grid-cols-1 gap-4">
        {/* Device Selection */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-stone-600">
            <Video className="h-3.5 w-3.5 text-[#C5A059]" />
            Input Camera Device
          </label>
          <select
            value={activeDeviceId}
            onChange={(e) => onDeviceChange(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 transition-colors focus:border-[#C5A059] focus:outline-none focus:bg-white"
          >
            {devices.length === 0 ? (
              <option value="">Default Web Camera</option>
            ) : (
              devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Resolution Selection */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-stone-600">
            <Sliders className="h-3.5 w-3.5 text-[#C5A059]" />
            Frame Resolution
          </label>
          <select
            value={resolution}
            onChange={(e) => onResolutionChange(e.target.value as Resolution)}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 transition-colors focus:border-[#C5A059] focus:outline-none focus:bg-white"
          >
            <option value="480p">480p (640 × 480) • Fast</option>
            <option value="720p">720p (1280 × 720) • Balanced</option>
            <option value="1080p">1080p (1920 × 1080) • High Quality</option>
          </select>
        </div>
      </div>

      {/* Advanced Settings Collapsible Drawer */}
      <div className="border-t border-stone-100 pt-3">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between py-1 text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
        >
          <span>Advanced AI Settings</span>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showAdvanced && (
          <div className="flex flex-col gap-3 pt-3">
            {/* Object Detection Toggle */}
            <button
              onClick={onToggleDetection}
              className={`flex items-center justify-between rounded-xl border p-3 transition-all cursor-pointer ${
                detectionEnabled
                  ? 'border-amber-300 bg-amber-50/60 text-stone-900'
                  : 'border-stone-200 bg-stone-50 text-stone-500'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Eye className={`h-4 w-4 ${detectionEnabled ? 'text-[#C5A059]' : 'text-stone-400'}`} />
                <div className="text-left">
                  <p className="text-xs font-bold">Object Detection</p>
                  <p className="text-[10px] text-stone-500">YOLOv8 PyTorch Engine</p>
                </div>
              </div>
              <div
                className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
                  detectionEnabled ? 'bg-[#C5A059]' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full bg-white transition-transform ${
                    detectionEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* Model Inference Size & Confidence Threshold */}
            {detectionEnabled && (
              <div className="flex flex-col gap-3">
                <div className="space-y-1 rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <label className="flex items-center gap-1 text-xs font-bold text-stone-600">
                    <Cpu className="h-3.5 w-3.5 text-[#C5A059]" />
                    Inference Size
                  </label>
                  <select
                    value={inferenceSize}
                    onChange={(e) => onInferenceSizeChange(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs font-medium text-stone-800 focus:border-[#C5A059] focus:outline-none"
                  >
                    <option value={320}>320 × 320 (Ultra Fast)</option>
                    <option value={640}>640 × 640 (Standard)</option>
                  </select>
                </div>

                <div className="space-y-1 rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-600">
                    <span>Confidence Threshold:</span>
                    <span className="font-mono text-[#9A7B3E]">
                      {Math.round(confidenceThreshold * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.90"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
                    className="w-full accent-[#C5A059] cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
