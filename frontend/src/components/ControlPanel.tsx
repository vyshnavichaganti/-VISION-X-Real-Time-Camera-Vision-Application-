import React, { useState } from 'react';
import { Play, Square, Video, Sliders, Eye, Ruler, Activity, Cpu, ChevronDown, ChevronUp, Sparkles, RotateCcw } from 'lucide-react';
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
  demoMode,
  onStartCamera,
  onStopCamera,
  onResetTracking,
  onDeviceChange,
  onResolutionChange,
  onToggleDetection,
  onConfidenceChange,
  onInferenceSizeChange,
  onToggleDemoMode,
}) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
      {/* Header & Status Indicator */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-cyan-400" />
          <h2 className="text-xs font-extrabold tracking-wider text-slate-200 uppercase">
            Camera & Vision Controls
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono font-semibold">
          <Activity
            className={`h-3.5 w-3.5 ${backendOnline ? 'text-emerald-400' : 'text-rose-500'}`}
          />
          <span className={backendOnline ? 'text-emerald-400' : 'text-rose-400'}>
            {backendOnline ? 'AI CONNECTED' : 'AI OFFLINE'}
          </span>
        </div>
      </div>

      {/* Main Action Buttons Grid: Start Camera | Stop Camera | Reset Tracking */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <button
          onClick={onStartCamera}
          disabled={isStreaming || isLoading}
          aria-label="Start Camera"
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
            isStreaming || isLoading
              ? 'cursor-not-allowed border border-slate-800 bg-slate-900/40 text-slate-600'
              : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95'
          }`}
        >
          <Play className="h-4 w-4 fill-current shrink-0" />
          <span>Start Camera</span>
        </button>

        <button
          onClick={onStopCamera}
          disabled={!isStreaming || isLoading}
          aria-label="Stop Camera"
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
            !isStreaming || isLoading
              ? 'cursor-not-allowed border border-slate-800 bg-slate-900/40 text-slate-600'
              : 'border border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:scale-95'
          }`}
        >
          <Square className="h-4 w-4 fill-current shrink-0" />
          <span>Stop Camera</span>
        </button>

        <button
          onClick={onResetTracking}
          disabled={!isStreaming || isLoading}
          aria-label="Reset ByteTrack Tracking"
          className={`flex items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            !isStreaming || isLoading
              ? 'cursor-not-allowed border border-slate-800 bg-slate-900/40 text-slate-600'
              : 'border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 active:scale-95'
          }`}
        >
          <RotateCcw className="h-4 w-4 shrink-0" />
          <span>Reset Tracking</span>
        </button>
      </div>

      {/* Selectors: Device & Resolution */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Device Selection */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Video className="h-3.5 w-3.5 text-slate-400" />
            Input Camera Device
          </label>
          <select
            value={activeDeviceId}
            onChange={(e) => onDeviceChange(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
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
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Sliders className="h-3.5 w-3.5 text-slate-400" />
            Frame Resolution
          </label>
          <select
            value={resolution}
            onChange={(e) => onResolutionChange(e.target.value as Resolution)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="480p">480p (640 × 480) • Fast</option>
            <option value="720p">720p (1280 × 720) • Balanced</option>
            <option value="1080p">1080p (1920 × 1080) • HD</option>
          </select>
        </div>
      </div>

      {/* Demo Mode Presentation Toggle */}
      <button
        onClick={onToggleDemoMode}
        className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
          demoMode
            ? 'border-purple-500/60 bg-purple-950/30 text-purple-200 shadow-md shadow-purple-500/10'
            : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className={`h-4 w-4 ${demoMode ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`} />
          <div className="text-left">
            <p className="text-xs font-semibold">Demo Presentation Mode</p>
            <p className="text-[10px] text-slate-400">Cinematic HUD layout for project presentations</p>
          </div>
        </div>
        <div
          className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
            demoMode ? 'bg-purple-500' : 'bg-slate-800'
          }`}
        >
          <div
            className={`h-4 w-4 rounded-full bg-slate-950 transition-transform ${
              demoMode ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </div>
      </button>

      {/* Advanced Controls Collapsible Drawer */}
      <div className="border-t border-slate-800/80 pt-3">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between py-1 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span>Advanced AI Settings</span>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showAdvanced && (
          <div className="flex flex-col gap-3 pt-3">
            {/* Object Detection Toggle */}
            <button
              onClick={onToggleDetection}
              className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                detectionEnabled
                  ? 'border-cyan-500/60 bg-cyan-950/30 text-cyan-200'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Eye className={`h-4 w-4 ${detectionEnabled ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                <div className="text-left">
                  <p className="text-xs font-semibold">Object Detection</p>
                  <p className="text-[10px] text-slate-400">YOLOv8 PyTorch Engine</p>
                </div>
              </div>
              <div
                className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
                  detectionEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full bg-slate-950 transition-transform ${
                    detectionEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* Model Inference Size & Confidence Threshold */}
            {detectionEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 rounded-xl border border-slate-800/60 bg-slate-950/50 p-2.5">
                  <label className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Cpu className="h-3 w-3 text-cyan-400" />
                    Inference Size
                  </label>
                  <select
                    value={inferenceSize}
                    onChange={(e) => onInferenceSizeChange(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs font-medium text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value={320}>320 × 320 (Ultra Fast)</option>
                    <option value={640}>640 × 640 (Standard)</option>
                  </select>
                </div>

                <div className="space-y-1 rounded-xl border border-slate-800/60 bg-slate-950/50 p-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Confidence:</span>
                    <span className="font-mono font-bold text-cyan-300">
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
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Calibrated Distance Status Indicator */}
            <div className="flex items-center justify-between rounded-xl border border-cyan-500/60 bg-cyan-950/30 p-3 text-cyan-200">
              <div className="flex items-center gap-2.5">
                <Ruler className="h-4 w-4 text-cyan-400" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-slate-200">Calibrated Monocular Distance (~m)</p>
                  <p className="text-[10px] text-slate-400">FastSAM Mask + MiDaS Depth Calibrated</p>
                </div>
              </div>
              <span className="rounded bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                ACTIVE
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
