import React from 'react';
import type { PermissionState } from '../../../shared/types/electron.d';

interface MicrophonePermissionStepProps {
  permissionStatus: PermissionState;
  onRequestPermission: () => void;
  onCheckAgain: () => void;
  onOpenSettings: () => void;
  onSkip: () => void;
  onNext: () => void;
  isLoading: boolean;
}

function MicrophonePermissionStep({
  permissionStatus,
  onRequestPermission,
  onCheckAgain,
  onOpenSettings,
  onSkip,
  onNext,
  isLoading,
}: MicrophonePermissionStepProps) {
  const isGranted = permissionStatus === 'granted';
  const isDenied = permissionStatus === 'denied';

  return (
    <div className="flex flex-col items-center text-center">
      <PermissionStatusIcon status={permissionStatus} />

      <h2 className="text-2xl font-bold text-content-primary mb-2">
        Microphone Permission
      </h2>
      <p className="text-content-secondary mb-2 max-w-md">
        Allow microphone access to record audio with your screen recordings.
      </p>
      <p className="text-sm text-content-tertiary mb-6 max-w-md">
        This is optional - you can still record screen without audio.
      </p>

      {isGranted && (
        <div className="bg-green-500/10 rounded-lg p-4 mb-6 text-left max-w-md">
          <p className="text-green-600 dark:text-green-400 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Microphone access is enabled. You can record audio!
          </p>
        </div>
      )}

      {isDenied && (
        <div className="bg-surface-secondary rounded-lg p-4 mb-6 text-left max-w-md">
          <h3 className="font-medium text-content-primary mb-2">Permission was denied</h3>
          <p className="text-sm text-content-secondary mb-2">
            You can enable microphone access in System Preferences if you change your mind.
          </p>
          <button
            onClick={onOpenSettings}
            className="text-sm text-accent hover:text-accent-hover"
          >
            Open System Preferences
          </button>
        </div>
      )}

      {permissionStatus === 'not-determined' && (
        <div className="bg-accent-subtle rounded-lg p-4 mb-6 text-left max-w-md">
          <p className="text-accent text-sm">
            Click the button below to allow microphone access. You'll see a system prompt asking for permission.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {isGranted || isDenied ? (
          <button
            onClick={onNext}
            className="px-6 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors"
          >
            Continue
          </button>
        ) : (
          <>
            <button
              onClick={onRequestPermission}
              disabled={isLoading}
              className="px-6 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Requesting...' : 'Allow Microphone Access'}
            </button>
            <button
              onClick={onCheckAgain}
              disabled={isLoading}
              className="px-6 py-2.5 border border-border text-content-secondary font-medium rounded-lg hover:bg-surface-secondary transition-colors disabled:opacity-50"
            >
              Check Again
            </button>
          </>
        )}
        <button
          onClick={onSkip}
          className="px-6 py-2 text-content-tertiary text-sm hover:text-content-secondary transition-colors"
        >
          {isGranted || isDenied ? 'Skip audio recording' : 'Skip for now'}
        </button>
      </div>
    </div>
  );
}

interface PermissionStatusIconProps {
  status: PermissionState;
}

function PermissionStatusIcon({ status }: PermissionStatusIconProps) {
  const iconBase = (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );

  switch (status) {
    case 'granted':
      return (
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
          {iconBase}
        </div>
      );
    case 'denied':
      return (
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 text-red-600 dark:text-red-400">
          {iconBase}
        </div>
      );
    default:
      return (
        <div className="w-16 h-16 rounded-full bg-accent-subtle flex items-center justify-center mb-6 text-accent">
          {iconBase}
        </div>
      );
  }
}

export default MicrophonePermissionStep;
