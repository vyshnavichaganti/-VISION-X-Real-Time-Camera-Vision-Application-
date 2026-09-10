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
    <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 border border-rose-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-900">
              Camera Access Notice ({error.type})
            </h3>
            <p className="mt-1 text-xs text-rose-800 font-sans">{error.message}</p>
            {error.technicalDetails && (
              <p className="mt-1 font-mono text-[11px] text-rose-700">
                Details: {error.technicalDetails}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
          title="Dismiss Error"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>

      {/* Recommended User Actions */}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-rose-200 pt-3 text-xs text-rose-800">
        <span>
          {error.type === 'PERMISSION_DENIED' && 'Tip: Click lock icon in browser address bar -> Allow Camera Permission.'}
          {error.type === 'HARDWARE_IN_USE' && 'Tip: Close other apps using webcam (Zoom, Teams, Skype).'}
          {error.type === 'DEVICE_NOT_FOUND' && 'Tip: Ensure USB camera is plugged in.'}
          {error.type === 'OVERCONSTRAINED' && 'Tip: Try selecting a lower resolution (e.g. 480p).'}
        </span>

        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Camera
        </button>
      </div>
    </div>
  );
};
