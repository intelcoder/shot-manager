import React, { useEffect } from 'react';
import { useSetupStore, SetupStep } from '../../stores/setup-store';
import WelcomeStep from './WelcomeStep';
import ScreenPermissionStep from './ScreenPermissionStep';
import MicrophonePermissionStep from './MicrophonePermissionStep';
import CompleteStep from './CompleteStep';

interface SetupWizardProps {
  onComplete: (returnTo?: string) => void;
  returnTo?: string;
}

function SetupWizard({ onComplete, returnTo }: SetupWizardProps) {
  const {
    currentStep,
    permissions,
    isLoading,
    nextStep,
    prevStep,
    loadPermissions,
    requestMicrophonePermission,
    completeSetup,
  } = useSetupStore();

  // Load permissions on mount
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Handle setup completion
  const handleComplete = async () => {
    const hasSkippedPermissions =
      (permissions?.platform === 'darwin' && permissions?.screen !== 'granted') ||
      permissions?.microphone === 'not-determined';

    await completeSetup(hasSkippedPermissions);
    onComplete(returnTo);
  };

  // Handle skip (mark as skipped and continue)
  const handleSkip = () => {
    nextStep();
  };

  // Get visible steps for progress indicator
  const getVisibleSteps = (): SetupStep[] => {
    const steps: SetupStep[] = ['welcome'];

    if (permissions?.platform === 'darwin') {
      steps.push('screen');
    }

    if (permissions?.microphone !== 'not-applicable') {
      steps.push('microphone');
    }

    steps.push('complete');
    return steps;
  };

  const visibleSteps = getVisibleSteps();
  const currentStepIndex = visibleSteps.indexOf(currentStep);

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={nextStep} />;

      case 'screen':
        return (
          <ScreenPermissionStep
            permissionStatus={permissions?.screen || 'not-determined'}
            onCheckAgain={loadPermissions}
            onOpenSettings={() => window.electronAPI.openScreenRecordingSettings()}
            onSkip={handleSkip}
            onNext={nextStep}
            isLoading={isLoading}
          />
        );

      case 'microphone':
        return (
          <MicrophonePermissionStep
            permissionStatus={permissions?.microphone || 'not-determined'}
            onRequestPermission={requestMicrophonePermission}
            onCheckAgain={loadPermissions}
            onOpenSettings={() => window.electronAPI.openMicrophoneSettings()}
            onSkip={handleSkip}
            onNext={nextStep}
            isLoading={isLoading}
          />
        );

      case 'complete':
        return (
          <CompleteStep
            permissions={permissions}
            onComplete={handleComplete}
            isLoading={isLoading}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-surface-primary">
      {/* Header with progress */}
      <header className="border-b border-border bg-surface-secondary px-6 py-4 pl-20">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-semibold text-content-primary mb-4">Shot Manager Setup</h1>
          <ProgressIndicator
            steps={visibleSteps}
            currentStep={currentStepIndex}
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto px-6 py-8">
          {renderStep()}
        </div>
      </main>

      {/* Footer with back button (if not on first or last step) */}
      {currentStepIndex > 0 && currentStep !== 'complete' && (
        <footer className="border-t border-border bg-surface-secondary px-6 py-4">
          <div className="max-w-lg mx-auto">
            <button
              onClick={prevStep}
              className="flex items-center gap-1 text-content-secondary hover:text-content-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

interface ProgressIndicatorProps {
  steps: SetupStep[];
  currentStep: number;
}

function ProgressIndicator({ steps, currentStep }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              index < currentStep
                ? 'bg-accent'
                : index === currentStep
                ? 'bg-accent ring-4 ring-accent/20'
                : 'bg-surface-tertiary'
            }`}
          />
          {index < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 transition-colors ${
                index < currentStep ? 'bg-accent' : 'bg-surface-tertiary'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default SetupWizard;
