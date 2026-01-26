import { create } from 'zustand';
import type { CaptureFile, Tag } from '../../shared/types/capture';
import type { FileQueryOptions } from '../../shared/types/electron.d';

interface CapturesState {
  captures: CaptureFile[];
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
  filters: FileQueryOptions;

  // Actions
  loadCaptures: () => Promise<void>;
  loadTags: () => Promise<void>;
  setFilters: (filters: Partial<FileQueryOptions>) => void;
  deleteCapture: (id: number) => Promise<void>;
  addTagToCapture: (captureId: number, tagId: number) => Promise<void>;
  removeTagFromCapture: (captureId: number, tagId: number) => Promise<void>;
  createTag: (name: string) => Promise<Tag>;
  refresh: () => Promise<void>;
}

export const useCapturesStore = create<CapturesState>((set, get) => ({
  captures: [],
  tags: [],
  isLoading: false,
  error: null,
  filters: {
    type: 'all',
    dateRange: 'all',
  },

  loadCaptures: async () => {
    set({ isLoading: true, error: null });
    try {
      const captures = await window.electronAPI.getAllFiles(get().filters);
      set({ captures, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadTags: async () => {
    try {
      const tags = await window.electronAPI.getAllTags();
      set({ tags });
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
    get().loadCaptures();
  },

  deleteCapture: async (id) => {
    try {
      await window.electronAPI.deleteFile(id);
      set((state) => ({
        captures: state.captures.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete capture:', error);
    }
  },

  addTagToCapture: async (captureId, tagId) => {
    try {
      await window.electronAPI.addTagToCapture(captureId, tagId);
      // Refresh captures to get updated tags
      get().loadCaptures();
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  },

  removeTagFromCapture: async (captureId, tagId) => {
    try {
      await window.electronAPI.removeTagFromCapture(captureId, tagId);
      // Refresh captures to get updated tags
      get().loadCaptures();
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  },

  createTag: async (name) => {
    const tag = await window.electronAPI.createTag(name);
    set((state) => ({
      tags: [...state.tags, tag],
    }));
    return tag;
  },

  refresh: async () => {
    await Promise.all([get().loadCaptures(), get().loadTags()]);
  },
}));
