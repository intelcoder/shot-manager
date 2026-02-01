import { create } from 'zustand';
import type { PermissionStatus, PermissionState } from '../../shared/types/electron.d';

export type SetupStep = 'welcome' | 'screen' | 'microphone' | 'complete';

interface SetupStore {
  currentStep: SetupStep;
  permissions: PermissionStatus | null;
  isLoading: boolean;
  error: string | null;

  // Navigation
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: SetupStep) => void;

  // Permissions
  loadPermissions: () => Promise<void>;
  requestMicrophonePermission: () => Promise<PermissionState>;

  // Setup completion
  completeSetup: (skipped?: boolean) => Promise<void>;
}

const STEP_ORDER: SetupStep[] = ['welcome', 'screen', 'microphone', 'complete'];

export const useSetupStore = create<SetupStore>((set, get) => ({
  currentStep: 'welcome',
  permissions: null,
  isLoading: false,
  error: null,

  nextStep: () => {
    const { currentStep, permissions } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);

    if (currentIndex < STEP_ORDER.length - 1) {
      let nextIndex = currentIndex + 1;

      // Skip screen permission step on non-macOS platforms
      if (STEP_ORDER[nextIndex] === 'screen' && permissions?.platform !== 'darwin') {
        nextIndex++;
      }

      // Skip microphone step if already granted or not applicable
      if (STEP_ORDER[nextIndex] === 'microphone' && permissions?.microphone === 'not-applicable') {
        nextIndex++;
      }

      if (nextIndex < STEP_ORDER.length) {
        set({ currentStep: STEP_ORDER[nextIndex] });
      }
    }
  },

  prevStep: () => {
    const { currentStep, permissions } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);

    if (currentIndex > 0) {
      let prevIndex = currentIndex - 1;

      // Skip microphone step if not applicable
      if (STEP_ORDER[prevIndex] === 'microphone' && permissions?.microphone === 'not-applicable') {
        prevIndex--;
      }

      // Skip screen permission step on non-macOS platforms
      if (STEP_ORDER[prevIndex] === 'screen' && permissions?.platform !== 'darwin') {
        prevIndex--;
      }

      if (prevIndex >= 0) {
        set({ currentStep: STEP_ORDER[prevIndex] });
      }
    }
  },

  goToStep: (step) => {
    set({ currentStep: step });
  },

  loadPermissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const permissions = await window.electronAPI.getPermissionStatus();
      set({ permissions, isLoading: false });
    } catch (error) {
      console.error('[SetupStore] Failed to load permissions:', error);
      set({
        error: 'Failed to check permissions',
        isLoading: false,
      });
    }
  },

  requestMicrophonePermission: async () => {
    const result = await window.electronAPI.requestMicrophonePermission();
    // Reload permissions to get updated status
    await get().loadPermissions();
    return result;
  },

  completeSetup: async (skipped = false) => {
    set({ isLoading: true });
    try {
      await window.electronAPI.setSetting('setupCompleted', true);
      if (skipped) {
        await window.electronAPI.setSetting('permissionsSkipped', true);
      }
      set({ isLoading: false });
    } catch (error) {
      console.error('[SetupStore] Failed to complete setup:', error);
      set({ isLoading: false, error: 'Failed to save setup state' });
    }
  },
}));
