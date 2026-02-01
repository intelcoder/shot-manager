import React from 'react';
import type { PermissionState } from '../../../shared/types/electron.d';

interface ScreenPermissionStepProps {
  permissionStatus: PermissionState;
  onCheckAgain: () => void;
  onOpenSettings: () => void;
  onSkip: () => void;
  onNext: () => void;
  isLoading: boolean;
}

function ScreenPermissionStep({
  permissionStatus,
  onCheckAgain,
  onOpenSettings,
  onSkip,
  onNext,
  isLoading,
}: ScreenPermissionStepProps) {
  const isGranted = permissionStatus === 'granted';

  return (
    <div className="flex flex-col items-center text-center">
      <PermissionStatusIcon status={permissionStatus} />

      <h2 className="text-2xl font-bold text-content-primary mb-2">
        Screen Recording Permission
      </h2>
      <p className="text-content-secondary mb-6 max-w-md">
        Shot Manager needs permission to capture your screen for screenshots and video recording.
      </p>

      {!isGranted && (
        <div className="bg-surface-secondary rounded-lg p-4 mb-6 text-left max-w-md">
          <h3 className="font-medium text-content-primary mb-2">How to enable:</h3>
          <ol className="space-y-2 text-sm text-content-secondary">
            <li className="flex gap-2">
              <span className="font-medium text-content-primary">1.</span>
              Click "Open System Preferences" below
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-content-primary">2.</span>
              Find "Shot Manager" in the list
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-content-primary">3.</span>
              Check the box next to it to enable
            </li>
            <li className="flex gap-2">
              <span className="font-medium text-content-primary">4.</span>
              Come back and click "Check Again"
            </li>
          </ol>
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded">
            Note: You may need to restart Shot Manager after granting permission for it to take effect.
          </p>
        </div>
      )}

      {isGranted && (
        <div className="bg-green-500/10 rounded-lg p-4 mb-6 text-left max-w-md">
          <p className="text-green-600 dark:text-green-400 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Screen recording permission is enabled. You're all set!
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {isGranted ? (
          <button
            onClick={onNext}
            className="px-6 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors"
          >
            Continue
          </button>
        ) : (
          <>
            <button
              onClick={onOpenSettings}
              className="px-6 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors"
            >
              Open System Preferences
            </button>
            <button
              onClick={onCheckAgain}
              disabled={isLoading}
              className="px-6 py-2.5 border border-border text-content-secondary font-medium rounded-lg hover:bg-surface-secondary transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Checking...' : 'Check Again'}
            </button>
          </>
        )}
        {!isGranted && (
          <button
            onClick={onSkip}
            className="px-6 py-2 text-content-tertiary text-sm hover:text-content-secondary transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

interface PermissionStatusIconProps {
  status: PermissionState;
}

function PermissionStatusIcon({ status }: PermissionStatusIconProps) {
  switch (status) {
    case 'granted':
      return (
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    case 'denied':
      return (
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      );
  }
}

export default ScreenPermissionStep;
