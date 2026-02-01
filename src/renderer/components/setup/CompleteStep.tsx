import React from 'react';
import type { PermissionStatus } from '../../../shared/types/electron.d';

interface CompleteStepProps {
  permissions: PermissionStatus | null;
  onComplete: () => void;
  isLoading: boolean;
}

function CompleteStep({ permissions, onComplete, isLoading }: CompleteStepProps) {
  const screenGranted = permissions?.screen === 'granted' || permissions?.screen === 'not-applicable';
  const micGranted = permissions?.microphone === 'granted';
  const micSkipped = permissions?.microphone === 'denied' || permissions?.microphone === 'not-determined';

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-content-primary mb-2">
        You're All Set!
      </h2>
      <p className="text-content-secondary mb-8 max-w-md">
        Shot Manager is ready to use. Here's a summary of your setup:
      </p>

      <div className="bg-surface-secondary rounded-lg p-4 mb-8 w-full max-w-sm">
        <h3 className="font-medium text-content-primary mb-3 text-left">Permissions</h3>
        <div className="space-y-2">
          <PermissionRow
            label="Screen Recording"
            status={screenGranted ? 'enabled' : 'skipped'}
            isMac={permissions?.platform === 'darwin'}
          />
          {permissions?.microphone !== 'not-applicable' && (
            <PermissionRow
              label="Microphone"
              status={micGranted ? 'enabled' : 'skipped'}
            />
          )}
        </div>
      </div>

      <div className="bg-accent-subtle rounded-lg p-4 mb-8 text-left max-w-sm">
        <h3 className="font-medium text-accent mb-2">Quick Start</h3>
        <ul className="space-y-1 text-sm text-accent">
          <li>• Press <kbd className="px-1.5 py-0.5 bg-accent/20 rounded text-xs font-mono">Cmd+Shift+3</kbd> for full screen screenshot</li>
          <li>• Press <kbd className="px-1.5 py-0.5 bg-accent/20 rounded text-xs font-mono">Cmd+Shift+4</kbd> to select an area</li>
          <li>• Press <kbd className="px-1.5 py-0.5 bg-accent/20 rounded text-xs font-mono">Cmd+Shift+5</kbd> to start recording</li>
        </ul>
      </div>

      <button
        onClick={onComplete}
        disabled={isLoading}
        className="px-8 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Starting...' : 'Start Using Shot Manager'}
      </button>
    </div>
  );
}

interface PermissionRowProps {
  label: string;
  status: 'enabled' | 'skipped';
  isMac?: boolean;
}

function PermissionRow({ label, status, isMac }: PermissionRowProps) {
  const isEnabled = status === 'enabled';

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-content-secondary">{label}</span>
      <span className={`flex items-center gap-1 ${isEnabled ? 'text-green-600 dark:text-green-400' : 'text-content-tertiary'}`}>
        {isEnabled ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Enabled
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            Skipped
          </>
        )}
      </span>
    </div>
  );
}

export default CompleteStep;
