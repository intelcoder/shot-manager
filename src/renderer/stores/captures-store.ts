import { create } from 'zustand';
import type { CaptureFile, Tag } from '../../shared/types/capture';
import type { FileQueryOptions } from '../../shared/types/electron.d';

type SelectionMode = 'single' | 'toggle' | 'range';

interface CapturesState {
  captures: CaptureFile[];
  tags: Tag[];
  isLoading: boolean;
  error: string | null;
  filters: FileQueryOptions;

  // Selection state
  selectedIds: Set<number>;
  lastSelectedId: number | null;

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

  // Selection actions
  selectCapture: (id: number, mode: SelectionMode) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isSelected: (id: number) => boolean;

  // Star actions
  toggleStar: (captureId: number) => Promise<void>;
  starSelected: (starred: boolean) => Promise<void>;

  // Batch actions
  moveSelectedToFolder: (folderId: number | null, captureIds?: number[]) => Promise<void>;
  deleteSelected: () => Promise<void>;
  addTagToSelected: (tagId: number) => Promise<void>;
  removeTagFromSelected: (tagId: number) => Promise<void>;
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
  selectedIds: new Set(),
  lastSelectedId: null,

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
      selectedIds: new Set(), // Clear selection on filter change
      lastSelectedId: null,
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

  // Selection actions
  selectCapture: (id, mode) => {
    const { captures, selectedIds, lastSelectedId } = get();

    if (mode === 'single') {
      // Single click: clear selection and select only this item
      set({
        selectedIds: new Set([id]),
        lastSelectedId: id,
      });
    } else if (mode === 'toggle') {
      // Ctrl+click: toggle selection
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      set({
        selectedIds: newSelected,
        lastSelectedId: id,
      });
    } else if (mode === 'range') {
      // Shift+click: select range
      if (lastSelectedId === null) {
        set({
          selectedIds: new Set([id]),
          lastSelectedId: id,
        });
        return;
      }

      const captureIds = captures.map((c) => c.id);
      const startIdx = captureIds.indexOf(lastSelectedId);
      const endIdx = captureIds.indexOf(id);

      if (startIdx === -1 || endIdx === -1) {
        set({
          selectedIds: new Set([id]),
          lastSelectedId: id,
        });
        return;
      }

      const minIdx = Math.min(startIdx, endIdx);
      const maxIdx = Math.max(startIdx, endIdx);
      const rangeIds = captureIds.slice(minIdx, maxIdx + 1);

      // Merge with existing selection
      const newSelected = new Set(selectedIds);
      rangeIds.forEach((captureId) => newSelected.add(captureId));
      set({
        selectedIds: newSelected,
        lastSelectedId: id,
      });
    }
  },

  selectAll: () => {
    const allIds = new Set(get().captures.map((c) => c.id));
    set({ selectedIds: allIds });
  },

  clearSelection: () => {
    set({
      selectedIds: new Set(),
      lastSelectedId: null,
    });
  },

  isSelected: (id) => {
    return get().selectedIds.has(id);
  },

  // Star actions
  toggleStar: async (captureId) => {
    try {
      const newStarred = await window.electronAPI.toggleCaptureStar(captureId);
      set((state) => ({
        captures: state.captures.map((c) =>
          c.id === captureId ? { ...c, isStarred: newStarred, is_starred: newStarred } : c
        ),
      }));
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  },

  starSelected: async (starred) => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return;

    try {
      const captureIds = Array.from(selectedIds);

      // Optimistic update
      set((state) => ({
        captures: state.captures.map((c) =>
          selectedIds.has(c.id) ? { ...c, isStarred: starred, is_starred: starred } : c
        ),
      }));

      await window.electronAPI.starCapturesBatch(captureIds, starred);
    } catch (error) {
      console.error('Failed to star captures:', error);
      get().loadCaptures(); // Rollback on error
    }
  },

  // Batch actions
  moveSelectedToFolder: async (folderId, explicitIds) => {
    const idsToMove = explicitIds ?? Array.from(get().selectedIds);
    if (idsToMove.length === 0) return;

    try {
      const idsSet = new Set(idsToMove);
      await window.electronAPI.moveCapturesTo(idsToMove, folderId);

      // Update local state
      set((state) => ({
        captures: state.captures.map((c) =>
          idsSet.has(c.id) ? { ...c, folderId, folder_id: folderId } : c
        ),
        // Only clear selection if we were using selection (no explicit IDs)
        selectedIds: explicitIds ? state.selectedIds : new Set(),
        lastSelectedId: explicitIds ? state.lastSelectedId : null,
      }));
    } catch (error) {
      console.error('Failed to move captures:', error);
      get().loadCaptures(); // Rollback on error
    }
  },

  deleteSelected: async () => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return;

    try {
      const captureIds = Array.from(selectedIds);
      await window.electronAPI.deleteCapturesBatch(captureIds);

      // Update local state
      set((state) => ({
        captures: state.captures.filter((c) => !selectedIds.has(c.id)),
        selectedIds: new Set(),
        lastSelectedId: null,
      }));
    } catch (error) {
      console.error('Failed to delete captures:', error);
      get().loadCaptures(); // Rollback on error
    }
  },

  addTagToSelected: async (tagId) => {
    const { selectedIds, tags } = get();
    if (selectedIds.size === 0) return;

    try {
      const captureIds = Array.from(selectedIds);
      const tagToAdd = tags.find((t) => t.id === tagId);

      // Optimistic update
      if (tagToAdd) {
        set((state) => ({
          captures: state.captures.map((c) =>
            selectedIds.has(c.id) && !c.tags.some((t) => t.id === tagId)
              ? { ...c, tags: [...c.tags, tagToAdd] }
              : c
          ),
        }));
      }

      await window.electronAPI.tagCapturesBatch(captureIds, tagId, 'add');
    } catch (error) {
      console.error('Failed to add tag to captures:', error);
      get().loadCaptures(); // Rollback on error
    }
  },

  removeTagFromSelected: async (tagId) => {
    const { selectedIds } = get();
    if (selectedIds.size === 0) return;

    try {
      const captureIds = Array.from(selectedIds);

      // Optimistic update
      set((state) => ({
        captures: state.captures.map((c) =>
          selectedIds.has(c.id)
            ? { ...c, tags: c.tags.filter((t) => t.id !== tagId) }
            : c
        ),
      }));

      await window.electronAPI.tagCapturesBatch(captureIds, tagId, 'remove');
    } catch (error) {
      console.error('Failed to remove tag from captures:', error);
      get().loadCaptures(); // Rollback on error
    }
  },
}));
