import { create } from 'zustand';
import type { AppSettings, ShortcutConfig } from '../../shared/types/settings';

interface SettingsState {
  settings: AppSettings | null;
  shortcuts: ShortcutConfig | null;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  loadShortcuts: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  updateShortcut: (actionId: string, accelerator: string) => Promise<{ success: boolean; error?: string }>;
  selectSavePath: () => Promise<{ success: boolean; path?: string }>;
  resetShortcuts: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  shortcuts: null,
  isLoading: true,

  loadSettings: async () => {
    try {
      const settings = await window.electronAPI.getSettings();
      set({ settings, isLoading: false });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  loadShortcuts: async () => {
    try {
      const shortcuts = await window.electronAPI.getShortcuts();
      set({ shortcuts });
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
    }
  },

  updateSetting: async (key, value) => {
    try {
      await window.electronAPI.setSetting(key, value);
      set((state) => ({
        settings: state.settings ? { ...state.settings, [key]: value } : null,
      }));
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  },

  updateShortcut: async (actionId, accelerator) => {
    const result = await window.electronAPI.updateShortcut(actionId, accelerator);
    if (result.success) {
      set((state) => ({
        shortcuts: state.shortcuts ? { ...state.shortcuts, [actionId]: accelerator } : null,
      }));
    }
    return result;
  },

  selectSavePath: async () => {
    const result = await window.electronAPI.selectSavePath();
    if (result.success && result.path) {
      set((state) => ({
        settings: state.settings ? { ...state.settings, savePath: result.path! } : null,
      }));
    }
    return result;
  },

  resetShortcuts: async () => {
    await window.electronAPI.resetShortcuts();
    get().loadShortcuts();
  },
}));
