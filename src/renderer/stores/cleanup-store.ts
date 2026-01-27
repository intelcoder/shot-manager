import { create } from 'zustand';
import type {
  CleanupRule,
  CreateCleanupRuleInput,
  UpdateCleanupRuleInput,
  CleanupPreview,
  CleanupResult,
  CleanupHistoryEntry,
} from '../../shared/types/cleanup';

interface CleanupState {
  rules: CleanupRule[];
  history: CleanupHistoryEntry[];
  isLoading: boolean;
  error: string | null;

  // Preview state
  previewData: CleanupPreview | null;
  isPreviewLoading: boolean;

  // Execution state
  isExecuting: boolean;
  lastResult: CleanupResult | null;

  // Actions
  loadRules: () => Promise<void>;
  loadHistory: () => Promise<void>;
  createRule: (input: CreateCleanupRuleInput) => Promise<CleanupRule>;
  updateRule: (id: number, input: UpdateCleanupRuleInput) => Promise<CleanupRule | null>;
  deleteRule: (id: number) => Promise<void>;
  previewRule: (ruleId: number) => Promise<CleanupPreview>;
  executeRule: (ruleId: number) => Promise<CleanupResult>;
  clearPreview: () => void;
  clearLastResult: () => void;
}

export const useCleanupStore = create<CleanupState>((set, get) => ({
  rules: [],
  history: [],
  isLoading: false,
  error: null,
  previewData: null,
  isPreviewLoading: false,
  isExecuting: false,
  lastResult: null,

  loadRules: async () => {
    set({ isLoading: true, error: null });
    try {
      const rules = await window.electronAPI.getAllCleanupRules();
      set({ rules, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadHistory: async () => {
    try {
      const history = await window.electronAPI.getCleanupHistory();
      set({ history });
    } catch (error) {
      console.error('Failed to load cleanup history:', error);
    }
  },

  createRule: async (input) => {
    const rule = await window.electronAPI.createCleanupRule(input);
    set((state) => ({ rules: [rule, ...state.rules] }));
    return rule;
  },

  updateRule: async (id, input) => {
    const rule = await window.electronAPI.updateCleanupRule(id, input);
    if (rule) {
      set((state) => ({
        rules: state.rules.map((r) => (r.id === id ? rule : r)),
      }));
    }
    return rule;
  },

  deleteRule: async (id) => {
    await window.electronAPI.deleteCleanupRule(id);
    set((state) => ({
      rules: state.rules.filter((r) => r.id !== id),
    }));
  },

  previewRule: async (ruleId) => {
    set({ isPreviewLoading: true, previewData: null });
    try {
      const preview = await window.electronAPI.previewCleanup(ruleId);
      set({ previewData: preview, isPreviewLoading: false });
      return preview;
    } catch (error) {
      set({ isPreviewLoading: false });
      throw error;
    }
  },

  executeRule: async (ruleId) => {
    set({ isExecuting: true, lastResult: null });
    try {
      const result = await window.electronAPI.executeCleanup(ruleId);
      set({ lastResult: result, isExecuting: false });
      // Refresh rules and history after execution
      get().loadRules();
      get().loadHistory();
      return result;
    } catch (error) {
      set({ isExecuting: false });
      throw error;
    }
  },

  clearPreview: () => {
    set({ previewData: null });
  },

  clearLastResult: () => {
    set({ lastResult: null });
  },
}));
