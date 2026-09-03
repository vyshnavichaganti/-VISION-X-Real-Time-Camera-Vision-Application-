import React from 'react';
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import type { CameraError } from '../types/vision';

interface ErrorNoticeProps {
  error: CameraError;
  onRetry: () => void;
  onDismiss: () => void;
}

export const ErrorNotice: React.FC<ErrorNoticeProps> = ({ error, onRetry, onDismiss }) => {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-rose-200">
              Camera Access Error ({error.type})
            </h3>
            <p className="mt-1 text-xs text-rose-300/90">{error.message}</p>
            {error.technicalDetails && (
              <p className="mt-1 font-mono text-[11px] text-rose-400/70">
                Details: {error.technicalDetails}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-rose-400/60 hover:text-rose-300 transition-colors"
          title="Dismiss Error"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>

      {/* Recommended User Actions */}
      <div className="mt-1 flex items-center justify-between border-t border-rose-500/20 pt-3">
        <span className="text-[11px] text-rose-300/70">
          {error.type === 'PERMISSION_DENIED' && 'Tip: Click lock icon in address bar -> Reset Camera Permission.'}
          {error.type === 'HARDWARE_IN_USE' && 'Tip: Close Zoom, Teams, Skype, or other active webcam tabs.'}
          {error.type === 'DEVICE_NOT_FOUND' && 'Tip: Ensure USB webcam is connected and recognized.'}
          {error.type === 'OVERCONSTRAINED' && 'Tip: Try selecting a lower resolution (e.g. 480p).'}
        </span>

        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-200 ring-1 ring-rose-500/40 hover:bg-rose-500/30 transition-all active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Connection
        </button>
      </div>
    </div>
  );
};
