import { useState } from 'react';
import { useCamera } from './hooks/useCamera';
import { useVisionStream } from './hooks/useVisionStream';
import { Header } from './components/Header';
import { CameraFeed } from './components/CameraFeed';
import { ControlPanel } from './components/ControlPanel';
import { DebugHUD } from './components/DebugHUD';
import { ErrorNotice } from './components/ErrorNotice';
import { VisionModeSelector } from './components/VisionModeSelector';
import { SceneIntelligence } from './components/SceneIntelligence';
import { ObjectIntelligenceTable } from './components/ObjectIntelligenceTable';
import { PipelineVisualization } from './components/PipelineVisualization';
import { EventStream } from './components/EventStream';
import { HowAiSees } from './components/HowAiSees';
import type { VisionMode, ViewMode } from './types/vision';

export function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('demo');
  const [visionMode, setVisionMode] = useState<VisionMode>('composite');

  const {
    videoRef,
    canvasRef,
    isStreaming,
    isLoading,
    error,
    devices,
    activeDeviceId,
    resolution,
    startCamera,
    stopCamera,
    changeDevice,
    changeResolution,
    clearError,
  } = useCamera();

  const {
    detectionEnabled,
    confidenceThreshold,
    inferenceSize,
    telemetry,
    lastDetections,
    events,
    demoMode,
    setDemoMode,
    toggleDetection,
    changeConfidenceThreshold,
    changeInferenceSize,
    resetTracking,
  } = useVisionStream({
    videoRef,
    canvasRef,
    isStreaming,
    visionMode,
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans selection:bg-amber-200 selection:text-stone-900">
      {/* 1. HEADER */}
      <Header
        isStreaming={isStreaming}
        modelName={telemetry.modelName}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Error Alert Display */}
        {error && (
          <ErrorNotice
            error={error}
            onRetry={() => startCamera(activeDeviceId, resolution)}
            onDismiss={clearError}
          />
        )}

        {/* ================================================== */}
        {/* DEMO VIEW (DEFAULT VIEW)                           */}
        {/* ================================================== */}
        {viewMode === 'demo' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Column: Hero Camera Feed & Object Intelligence */}
            <div className="lg:col-span-8 flex flex-col gap-6 w-full min-w-0">
              {/* LIVE CAMERA HERO */}
              <CameraFeed
                videoRef={videoRef}
                canvasRef={canvasRef}
                isStreaming={isStreaming}
                isLoading={isLoading}
                fps={telemetry.cameraFps}
                visionMode={visionMode}
                onStartCamera={() => startCamera()}
              />

              {/* SUMMARY CARD (4 Metrics: Objects, People, Scene Status, Tracking Status) */}
              <SceneIntelligence
                telemetry={telemetry}
                detections={lastDetections}
                isStreaming={isStreaming}
              />

              {/* DETECTED OBJECTS TABLE */}
              <ObjectIntelligenceTable
                detections={lastDetections}
                isStreaming={isStreaming}
              />
            </div>

            {/* Sidebar Column: CONTROLS */}
            <div className="lg:col-span-4 flex flex-col gap-6 w-full">
              <ControlPanel
                isStreaming={isStreaming}
                isLoading={isLoading}
                devices={devices}
                activeDeviceId={activeDeviceId}
                resolution={resolution}
                detectionEnabled={detectionEnabled}
                confidenceThreshold={confidenceThreshold}
                inferenceSize={inferenceSize}
                backendOnline={telemetry.backendOnline}
                demoMode={demoMode}
                onStartCamera={() => startCamera()}
                onStopCamera={stopCamera}
                onResetTracking={resetTracking}
                onDeviceChange={changeDevice}
                onResolutionChange={changeResolution}
                onToggleDetection={toggleDetection}
                onConfidenceChange={changeConfidenceThreshold}
                onInferenceSizeChange={changeInferenceSize}
                onToggleDemoMode={() => setDemoMode(!demoMode)}
              />
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* TECHNICAL VIEW (Engineering Console)               */}
        {/* ================================================== */}
        {viewMode === 'technical' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#C5A059] animate-pulse" />
              <h2 className="text-xs font-extrabold tracking-wider text-stone-700 uppercase font-sans">
                ENGINEERING DIAGNOSTICS & TELEMETRY CONSOLE
              </h2>
            </div>

            {/* Vision Mode Filter Tabs */}
            <VisionModeSelector currentMode={visionMode} onSelectMode={setVisionMode} />

            {/* Pipeline Architecture Cards */}
            <PipelineVisualization
              telemetry={telemetry}
              isStreaming={isStreaming}
              isTechnicalView={true}
            />

            {/* Telemetry Debug HUD & Event Stream */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DebugHUD telemetry={telemetry} isStreaming={isStreaming} />
              <EventStream events={events} defaultExpanded={true} />
            </div>

            {/* Educational Model Details */}
            <HowAiSees />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
