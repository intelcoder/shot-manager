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
  renameCapture: (id: number, newFilename: string) => Promise<{ success: boolean; error?: string; capture?: CaptureFile }>;
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

  renameCapture: async (id, newFilename) => {
    try {
      const result = await window.electronAPI.renameFile(id, newFilename);
      if (result.success && result.capture) {
        set((state) => ({
          captures: state.captures.map((c) =>
            c.id === id ? { ...c, filename: result.capture!.filename, filepath: result.capture!.filepath } : c
          ),
        }));
      }
      return result;
    } catch (error) {
      console.error('Failed to rename capture:', error);
      return { success: false, error: 'Failed to rename file' };
    }
  },

  addTagToCapture: async (captureId, tagId) => {
    try {
      // Optimistic update: immediately add tag to local state
      const tagToAdd = get().tags.find((t) => t.id === tagId);
      if (tagToAdd) {
        set((state) => ({
          captures: state.captures.map((c) =>
            c.id === captureId
              ? { ...c, tags: [...c.tags, tagToAdd] }
              : c
          ),
        }));
      }
      await window.electronAPI.addTagToCapture(captureId, tagId);
    } catch (error) {
      console.error('Failed to add tag:', error);
      get().loadCaptures(); // Rollback on error
    }
  },

  removeTagFromCapture: async (captureId, tagId) => {
    try {
      // Optimistic update: immediately remove tag from local state
      set((state) => ({
        captures: state.captures.map((c) =>
          c.id === captureId
            ? { ...c, tags: c.tags.filter((t) => t.id !== tagId) }
            : c
        ),
      }));
      await window.electronAPI.removeTagFromCapture(captureId, tagId);
    } catch (error) {
      console.error('Failed to remove tag:', error);
      get().loadCaptures(); // Rollback on error
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
