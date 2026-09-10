import { useCamera } from './hooks/useCamera';
import { useVisionStream } from './hooks/useVisionStream';
import { Header } from './components/Header';
import { CameraFeed } from './components/CameraFeed';
import { ControlPanel } from './components/ControlPanel';
import { ErrorNotice } from './components/ErrorNotice';
import { SceneIntelligence } from './components/SceneIntelligence';
import { ObjectIntelligenceTable } from './components/ObjectIntelligenceTable';
import { HowItWorksFlow } from './components/HowItWorksFlow';

export function App() {
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
    visionMode: 'composite',
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans selection:bg-amber-200 selection:text-stone-900">
      {/* 1. HEADER */}
      <Header
        isStreaming={isStreaming}
        modelName={telemetry.modelName}
      />

      {/* Main Content Container - Single Page Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Error Alert Display */}
        {error && (
          <ErrorNotice
            error={error}
            onRetry={() => startCamera(activeDeviceId, resolution)}
            onDismiss={clearError}
          />
        )}

        {/* Main Grid: Hero Live Camera & Sidebar Controls */}
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
              visionMode="composite"
              onStartCamera={() => startCamera()}
            />

            {/* SUMMARY CARDS (Objects Detected, People, Scene Status, Tracking Status) */}
            <SceneIntelligence
              telemetry={telemetry}
              detections={lastDetections}
              isStreaming={isStreaming}
            />

            {/* DETECTED OBJECTS TABLE (Object, Confidence, Distance) */}
            <ObjectIntelligenceTable
              detections={lastDetections}
              isStreaming={isStreaming}
            />

            {/* HOW IT WORKS (Camera -> Detect -> Track -> Distance) */}
            <HowItWorksFlow />
          </div>

          {/* Sidebar Column: CAMERA CONTROLS */}
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
      </main>
    </div>
  );
}

export default App;
