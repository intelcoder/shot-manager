import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCapturesStore } from './captures-store';
import type { CaptureFile, Tag } from '../../shared/types/capture';

const createMockCapture = (overrides: Partial<CaptureFile> = {}): CaptureFile => ({
  id: 1,
  type: 'screenshot',
  filename: 'test.png',
  filepath: '/test/test.png',
  width: 1920,
  height: 1080,
  duration: null,
  size: 1000,
  thumbnail_path: null,
  folder_id: null,
  folderId: null,
  created_at: '2024-01-01T00:00:00Z',
  tags: [],
  ...overrides,
});

const createMockTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: 1,
  name: 'Test Tag',
  color: '#FF0000',
  ...overrides,
});

describe('captures-store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useCapturesStore.setState({
      captures: [],
      tags: [],
      isLoading: false,
      error: null,
      filters: { type: 'all', dateRange: 'all' },
      selectedIds: new Set(),
      lastSelectedId: null,
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addTagToCapture', () => {
    it('immediately updates local state before API call', async () => {
      const mockCapture = createMockCapture({ id: 1, tags: [] });
      const mockTag = createMockTag({ id: 10, name: 'Work' });

      useCapturesStore.setState({
        captures: [mockCapture],
        tags: [mockTag],
      });

      // Make API return a promise that we control
      let resolveApi: () => void;
      const apiPromise = new Promise<void>((resolve) => {
        resolveApi = resolve;
      });
      vi.mocked(window.electronAPI.addTagToCapture).mockReturnValue(apiPromise);

      // Start the action (don't await)
      const actionPromise = useCapturesStore.getState().addTagToCapture(1, 10);

      // State should be updated immediately (optimistic update)
      const stateAfterOptimistic = useCapturesStore.getState();
      expect(stateAfterOptimistic.captures[0].tags).toHaveLength(1);
      expect(stateAfterOptimistic.captures[0].tags[0].id).toBe(10);

      // Resolve the API call and wait for action to complete
      resolveApi!();
      await actionPromise;
    });

    it('calls the API with correct parameters', async () => {
      const mockCapture = createMockCapture({ id: 5, tags: [] });
      const mockTag = createMockTag({ id: 20, name: 'Important' });

      useCapturesStore.setState({
        captures: [mockCapture],
        tags: [mockTag],
      });

      vi.mocked(window.electronAPI.addTagToCapture).mockResolvedValue(undefined);

      await useCapturesStore.getState().addTagToCapture(5, 20);

      expect(window.electronAPI.addTagToCapture).toHaveBeenCalledWith(5, 20);
      expect(window.electronAPI.addTagToCapture).toHaveBeenCalledTimes(1);
    });

    it('rolls back on API error', async () => {
      const mockCapture = createMockCapture({ id: 1, tags: [] });
      const mockTag = createMockTag({ id: 10, name: 'Work' });
      const originalCaptures = [mockCapture];

      useCapturesStore.setState({
        captures: originalCaptures,
        tags: [mockTag],
      });

      // Mock API to reject
      vi.mocked(window.electronAPI.addTagToCapture).mockRejectedValue(
        new Error('Network error')
      );

      // Mock getAllFiles to return original state (simulating rollback)
      vi.mocked(window.electronAPI.getAllFiles).mockResolvedValue(originalCaptures);

      // Spy on console.error to suppress error output in test
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await useCapturesStore.getState().addTagToCapture(1, 10);

      // loadCaptures should have been called for rollback
      expect(window.electronAPI.getAllFiles).toHaveBeenCalled();
    });

    it('does not update state if tag is not found', async () => {
      const mockCapture = createMockCapture({ id: 1, tags: [] });

      useCapturesStore.setState({
        captures: [mockCapture],
        tags: [], // No tags available
      });

      vi.mocked(window.electronAPI.addTagToCapture).mockResolvedValue(undefined);

      await useCapturesStore.getState().addTagToCapture(1, 999);

      // Tags should remain empty since tag 999 wasn't found in the store
      expect(useCapturesStore.getState().captures[0].tags).toHaveLength(0);
    });
  });

  describe('removeTagFromCapture', () => {
    it('immediately removes tag from local state', async () => {
      const mockTag = createMockTag({ id: 10, name: 'Work' });
      const mockCapture = createMockCapture({ id: 1, tags: [mockTag] });

      useCapturesStore.setState({
        captures: [mockCapture],
        tags: [mockTag],
      });

      // Make API return a promise that we control
      let resolveApi: () => void;
      const apiPromise = new Promise<void>((resolve) => {
        resolveApi = resolve;
      });
      vi.mocked(window.electronAPI.removeTagFromCapture).mockReturnValue(apiPromise);

      // Start the action (don't await)
      const actionPromise = useCapturesStore.getState().removeTagFromCapture(1, 10);

      // State should be updated immediately (optimistic update)
      const stateAfterOptimistic = useCapturesStore.getState();
      expect(stateAfterOptimistic.captures[0].tags).toHaveLength(0);

      // Resolve the API call and wait for action to complete
      resolveApi!();
      await actionPromise;
    });

    it('calls the API with correct parameters', async () => {
      const mockTag = createMockTag({ id: 15, name: 'Personal' });
      const mockCapture = createMockCapture({ id: 3, tags: [mockTag] });

      useCapturesStore.setState({
        captures: [mockCapture],
        tags: [mockTag],
      });

      vi.mocked(window.electronAPI.removeTagFromCapture).mockResolvedValue(undefined);

      await useCapturesStore.getState().removeTagFromCapture(3, 15);

      expect(window.electronAPI.removeTagFromCapture).toHaveBeenCalledWith(3, 15);
      expect(window.electronAPI.removeTagFromCapture).toHaveBeenCalledTimes(1);
    });

    it('rolls back on API error', async () => {
      const mockTag = createMockTag({ id: 10, name: 'Work' });
      const mockCapture = createMockCapture({ id: 1, tags: [mockTag] });
      const originalCaptures = [mockCapture];

      useCapturesStore.setState({
        captures: originalCaptures,
        tags: [mockTag],
      });

      // Mock API to reject
      vi.mocked(window.electronAPI.removeTagFromCapture).mockRejectedValue(
        new Error('Network error')
      );

      // Mock getAllFiles to return original state (simulating rollback)
      vi.mocked(window.electronAPI.getAllFiles).mockResolvedValue(originalCaptures);

      // Spy on console.error to suppress error output in test
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await useCapturesStore.getState().removeTagFromCapture(1, 10);

      // loadCaptures should have been called for rollback
      expect(window.electronAPI.getAllFiles).toHaveBeenCalled();
    });
  });

  describe('createTag', () => {
    it('adds new tag to store and returns it', async () => {
      const newTag = createMockTag({ id: 100, name: 'New Tag' });

      useCapturesStore.setState({
        captures: [],
        tags: [],
      });

      vi.mocked(window.electronAPI.createTag).mockResolvedValue(newTag);

      const result = await useCapturesStore.getState().createTag('New Tag');

      expect(result).toEqual(newTag);
      expect(useCapturesStore.getState().tags).toContainEqual(newTag);
      expect(window.electronAPI.createTag).toHaveBeenCalledWith('New Tag');
    });

    it('appends tag to existing tags', async () => {
      const existingTag = createMockTag({ id: 1, name: 'Existing' });
      const newTag = createMockTag({ id: 2, name: 'New' });

      useCapturesStore.setState({
        captures: [],
        tags: [existingTag],
      });

      vi.mocked(window.electronAPI.createTag).mockResolvedValue(newTag);

      await useCapturesStore.getState().createTag('New');

      const tags = useCapturesStore.getState().tags;
      expect(tags).toHaveLength(2);
      expect(tags).toContainEqual(existingTag);
      expect(tags).toContainEqual(newTag);
    });
  });

  describe('loadTags', () => {
    it('loads tags from API', async () => {
      const mockTags = [
        createMockTag({ id: 1, name: 'Tag1' }),
        createMockTag({ id: 2, name: 'Tag2' }),
      ];

      vi.mocked(window.electronAPI.getAllTags).mockResolvedValue(mockTags);

      await useCapturesStore.getState().loadTags();

      expect(useCapturesStore.getState().tags).toEqual(mockTags);
    });

    it('handles errors gracefully', async () => {
      vi.mocked(window.electronAPI.getAllTags).mockRejectedValue(
        new Error('Failed to load')
      );

      vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      await useCapturesStore.getState().loadTags();

      // Tags remain empty
      expect(useCapturesStore.getState().tags).toEqual([]);
    });
  });

  describe('selectCapture', () => {
    it('single mode clears selection and selects only one item', () => {
      const captures = [
        createMockCapture({ id: 1 }),
        createMockCapture({ id: 2 }),
        createMockCapture({ id: 3 }),
      ];

      useCapturesStore.setState({
        captures,
        selectedIds: new Set([1, 2]),
        lastSelectedId: 2,
      });

      useCapturesStore.getState().selectCapture(3, 'single');

      const state = useCapturesStore.getState();
      expect(state.selectedIds.size).toBe(1);
      expect(state.selectedIds.has(3)).toBe(true);
      expect(state.lastSelectedId).toBe(3);
    });

    it('toggle mode adds item to selection when not selected', () => {
      const captures = [
        createMockCapture({ id: 1 }),
        createMockCapture({ id: 2 }),
      ];

      useCapturesStore.setState({
        captures,
        selectedIds: new Set([1]),
        lastSelectedId: 1,
      });

      useCapturesStore.getState().selectCapture(2, 'toggle');

      const state = useCapturesStore.getState();
      expect(state.selectedIds.size).toBe(2);
      expect(state.selectedIds.has(1)).toBe(true);
      expect(state.selectedIds.has(2)).toBe(true);
      expect(state.lastSelectedId).toBe(2);
    });

    it('toggle mode removes item from selection when already selected', () => {
      const captures = [
        createMockCapture({ id: 1 }),
        createMockCapture({ id: 2 }),
      ];

      useCapturesStore.setState({
        captures,
        selectedIds: new Set([1, 2]),
        lastSelectedId: 2,
      });

      useCapturesStore.getState().selectCapture(2, 'toggle');

      const state = useCapturesStore.getState();
      expect(state.selectedIds.size).toBe(1);
      expect(state.selectedIds.has(1)).toBe(true);
      expect(state.selectedIds.has(2)).toBe(false);
      expect(state.lastSelectedId).toBe(2);
    });

    it('range mode selects range from lastSelectedId', () => {
      const captures = [
        createMockCapture({ id: 1 }),
        createMockCapture({ id: 2 }),
        createMockCapture({ id: 3 }),
        createMockCapture({ id: 4 }),
        createMockCapture({ id: 5 }),
      ];

      useCapturesStore.setState({
        captures,
        selectedIds: new Set([2]),
        lastSelectedId: 2,
      });

      useCapturesStore.getState().selectCapture(4, 'range');

      const state = useCapturesStore.getState();
      expect(state.selectedIds.size).toBe(3);
      expect(state.selectedIds.has(2)).toBe(true);
      expect(state.selectedIds.has(3)).toBe(true);
      expect(state.selectedIds.has(4)).toBe(true);
      expect(state.lastSelectedId).toBe(4);
    });

    it('range mode selects only one item when no lastSelectedId', () => {
      const captures = [
        createMockCapture({ id: 1 }),
        createMockCapture({ id: 2 }),
      ];

      useCapturesStore.setState({
        captures,
        selectedIds: new Set(),
        lastSelectedId: null,
      });

      useCapturesStore.getState().selectCapture(2, 'range');

      const state = useCapturesStore.getState();
      expect(state.selectedIds.size).toBe(1);
      expect(state.selectedIds.has(2)).toBe(true);
      expect(state.lastSelectedId).toBe(2);
    });

    it('range mode merges with existing selection', () => {
      const captures = [
        createMockCapture({ id: 1 }),
        createMockCapture({ id: 2 }),
        createMockCapture({ id: 3 }),
        createMockCapture({ id: 4 }),
      ];

      useCapturesStore.setState({
        captures,
        selectedIds: new Set([1, 3]),
        lastSelectedId: 3,
      });

      useCapturesStore.getState().selectCapture(4, 'range');

      const state = useCapturesStore.getState();
      // Should have 1 (existing), 3 (start), 4 (end)
      expect(state.selectedIds.has(1)).toBe(true);
      expect(state.selectedIds.has(3)).toBe(true);
      expect(state.selectedIds.has(4)).toBe(true);
    });

    it('range mode selects range when clicking before lastSelectedId (reverse)', () => {
      const captures = [
        createMockCapture({ id: 1 }),
        createMockCapture({ id: 2 }),
        createMockCapture({ id: 3 }),
        createMockCapture({ id: 4 }),
        createMockCapture({ id: 5 }),
      ];

      useCapturesStore.setState({
        captures,
        selectedIds: new Set([4]),
        lastSelectedId: 4,
      });

      // Click item before lastSelectedId
      useCapturesStore.getState().selectCapture(2, 'range');

      const state = useCapturesStore.getState();
      expect(state.selectedIds.size).toBe(3);
      expect(state.selectedIds.has(2)).toBe(true);
      expect(state.selectedIds.has(3)).toBe(true);
      expect(state.selectedIds.has(4)).toBe(true);
      expect(state.lastSelectedId).toBe(2);
    });

    it('range mode handles lastSelectedId not in captures array', () => {
      const captures = [
        createMockCapture({ id: 10 }),
        createMockCapture({ id: 20 }),
      ];

      useCapturesStore.setState({
        captures,
        selectedIds: new Set([5]), // ID 5 doesn't exist in captures
        lastSelectedId: 5, // This ID doesn't exist in current captures
      });

      useCapturesStore.getState().selectCapture(20, 'range');

      const state = useCapturesStore.getState();
      // Should fall back to single selection behavior
      expect(state.selectedIds.size).toBe(1);
      expect(state.selectedIds.has(20)).toBe(true);
      expect(state.lastSelectedId).toBe(20);
    });
  });

  describe('selectAll', () => {
    it('adds all capture IDs to selection', () => {
      const captures = [
        createMockCapture({ id: 1 }),
        createMockCapture({ id: 2 }),
        createMockCapture({ id: 3 }),
      ];

      useCapturesStore.setState({
        captures,
        selectedIds: new Set(),
      });

      useCapturesStore.getState().selectAll();

      const state = useCapturesStore.getState();
      expect(state.selectedIds.size).toBe(3);
      expect(state.selectedIds.has(1)).toBe(true);
      expect(state.selectedIds.has(2)).toBe(true);
      expect(state.selectedIds.has(3)).toBe(true);
    });

    it('does not throw with empty captures array', () => {
      useCapturesStore.setState({
        captures: [],
        selectedIds: new Set(),
      });

      expect(() => useCapturesStore.getState().selectAll()).not.toThrow();
      expect(useCapturesStore.getState().selectedIds.size).toBe(0);
    });
  });

  describe('clearSelection', () => {
    it('empties selection set and clears lastSelectedId', () => {
      useCapturesStore.setState({
        selectedIds: new Set([1, 2, 3]),
        lastSelectedId: 3,
      });

      useCapturesStore.getState().clearSelection();

      const state = useCapturesStore.getState();
      expect(state.selectedIds.size).toBe(0);
      expect(state.lastSelectedId).toBeNull();
    });
  });

  describe('setFilters', () => {
    it('clears selection when filters change', () => {
      useCapturesStore.setState({
        selectedIds: new Set([1, 2]),
        lastSelectedId: 2,
        filters: { type: 'all', dateRange: 'all' },
      });

      vi.mocked(window.electronAPI.getAllFiles).mockResolvedValue([]);

      useCapturesStore.getState().setFilters({ type: 'screenshot' });

      const state = useCapturesStore.getState();
      expect(state.selectedIds.size).toBe(0);
      expect(state.lastSelectedId).toBeNull();
    });
  });

  describe('isSelected', () => {
    it('returns true when id is in selectedIds', () => {
      useCapturesStore.setState({
        selectedIds: new Set([1, 2, 3]),
      });

      expect(useCapturesStore.getState().isSelected(2)).toBe(true);
    });

    it('returns false when id is not in selectedIds', () => {
      useCapturesStore.setState({
        selectedIds: new Set([1, 2, 3]),
      });

      expect(useCapturesStore.getState().isSelected(5)).toBe(false);
    });
  });

  describe('moveSelectedToFolder', () => {
    it('calls API with selected IDs and folder ID', async () => {
      const captures = [
        createMockCapture({ id: 1 }),
        createMockCapture({ id: 2 }),
        createMockCapture({ id: 3 }),
      ];

      useCapturesStore.setState({
        captures,
        selectedIds: new Set([1, 2]),
      });

      vi.mocked(window.electronAPI.moveCapturesTo).mockResolvedValue(undefined);

      await useCapturesStore.getState().moveSelectedToFolder(5);

      expect(window.electronAPI.moveCapturesTo).toHaveBeenCalledWith([1, 2], 5);
    });

    it('updates captures folderId and clears selection', async () => {
      const captures = [
        createMockCapture({ id: 1 }),
        createMockCapture({ id: 2 }),
      ];

      useCapturesStore.setState({
        captures,
        selectedIds: new Set([1]),
        lastSelectedId: 1,
      });

      vi.mocked(window.electronAPI.moveCapturesTo).mockResolvedValue(undefined);

      await useCapturesStore.getState().moveSelectedToFolder(5);

      const state = useCapturesStore.getState();
      expect(state.captures[0].folderId).toBe(5);
      expect(state.captures[0].folder_id).toBe(5);
      expect(state.captures[1].folderId).toBeNull(); // Unselected capture keeps original folderId
      expect(state.selectedIds.size).toBe(0);
      expect(state.lastSelectedId).toBeNull();
    });

    it('does nothing when no selection', async () => {
      useCapturesStore.setState({
        captures: [createMockCapture({ id: 1 })],
        selectedIds: new Set(),
      });

      await useCapturesStore.getState().moveSelectedToFolder(5);

      expect(window.electronAPI.moveCapturesTo).not.toHaveBeenCalled();
    });

    it('rolls back on error', async () => {
      const captures = [createMockCapture({ id: 1 })];

      useCapturesStore.setState({
        captures,
        selectedIds: new Set([1]),
      });

      vi.mocked(window.electronAPI.moveCapturesTo).mockRejectedValue(
        new Error('Move failed')
      );
      vi.mocked(window.electronAPI.getAllFiles).mockResolvedValue(captures);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await useCapturesStore.getState().moveSelectedToFolder(5);

      expect(window.electronAPI.getAllFiles).toHaveBeenCalled();
    });
  });

  describe('deleteSelected', () => {
    it('calls batch delete API and removes captures from list', async () => {
      const captures = [
        createMockCapture({ id: 1 }),
        createMockCapture({ id: 2 }),
        createMockCapture({ id: 3 }),
      ];

      useCapturesStore.setState({
        captures,
        selectedIds: new Set([1, 3]),
        lastSelectedId: 3,
      });

      vi.mocked(window.electronAPI.deleteCapturesBatch).mockResolvedValue(undefined);

      await useCapturesStore.getState().deleteSelected();

      expect(window.electronAPI.deleteCapturesBatch).toHaveBeenCalledWith([1, 3]);

      const state = useCapturesStore.getState();
      expect(state.captures).toHaveLength(1);
      expect(state.captures[0].id).toBe(2);
      expect(state.selectedIds.size).toBe(0);
      expect(state.lastSelectedId).toBeNull();
    });

    it('does nothing when no selection', async () => {
      useCapturesStore.setState({
        captures: [createMockCapture({ id: 1 })],
        selectedIds: new Set(),
      });

      await useCapturesStore.getState().deleteSelected();

      expect(window.electronAPI.deleteCapturesBatch).not.toHaveBeenCalled();
    });

    it('rolls back on error', async () => {
      const captures = [createMockCapture({ id: 1 })];

      useCapturesStore.setState({
        captures,
        selectedIds: new Set([1]),
      });

      vi.mocked(window.electronAPI.deleteCapturesBatch).mockRejectedValue(
        new Error('Delete failed')
      );
      vi.mocked(window.electronAPI.getAllFiles).mockResolvedValue(captures);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await useCapturesStore.getState().deleteSelected();

      expect(window.electronAPI.getAllFiles).toHaveBeenCalled();
    });
  });

  describe('addTagToSelected', () => {
    it('performs optimistic update and calls batch API', async () => {
      const mockTag = createMockTag({ id: 10, name: 'Work' });
      const captures = [
        createMockCapture({ id: 1, tags: [] }),
        createMockCapture({ id: 2, tags: [] }),
        createMockCapture({ id: 3, tags: [] }),
      ];

      useCapturesStore.setState({
        captures,
        tags: [mockTag],
        selectedIds: new Set([1, 3]),
      });

      let resolveApi: () => void;
      const apiPromise = new Promise<void>((resolve) => {
        resolveApi = resolve;
      });
      vi.mocked(window.electronAPI.tagCapturesBatch).mockReturnValue(apiPromise);

      const actionPromise = useCapturesStore.getState().addTagToSelected(10);

      // Check optimistic update happened immediately
      const stateAfterOptimistic = useCapturesStore.getState();
      expect(stateAfterOptimistic.captures[0].tags).toContainEqual(mockTag);
      expect(stateAfterOptimistic.captures[1].tags).toHaveLength(0); // Not selected
      expect(stateAfterOptimistic.captures[2].tags).toContainEqual(mockTag);

      resolveApi!();
      await actionPromise;

      expect(window.electronAPI.tagCapturesBatch).toHaveBeenCalledWith([1, 3], 10, 'add');
    });

    it('does not add duplicate tags', async () => {
      const mockTag = createMockTag({ id: 10, name: 'Work' });
      const captures = [
        createMockCapture({ id: 1, tags: [mockTag] }), // Already has tag
      ];

      useCapturesStore.setState({
        captures,
        tags: [mockTag],
        selectedIds: new Set([1]),
      });

      vi.mocked(window.electronAPI.tagCapturesBatch).mockResolvedValue(undefined);

      await useCapturesStore.getState().addTagToSelected(10);

      // Should still only have one tag (no duplicate)
      expect(useCapturesStore.getState().captures[0].tags).toHaveLength(1);
    });

    it('does nothing when no selection', async () => {
      useCapturesStore.setState({
        captures: [createMockCapture({ id: 1 })],
        tags: [createMockTag({ id: 10 })],
        selectedIds: new Set(),
      });

      await useCapturesStore.getState().addTagToSelected(10);

      expect(window.electronAPI.tagCapturesBatch).not.toHaveBeenCalled();
    });
  });

  describe('removeTagFromSelected', () => {
    it('performs optimistic update and calls batch API', async () => {
      const mockTag = createMockTag({ id: 10, name: 'Work' });
      const captures = [
        createMockCapture({ id: 1, tags: [mockTag] }),
        createMockCapture({ id: 2, tags: [mockTag] }),
      ];

      useCapturesStore.setState({
        captures,
        tags: [mockTag],
        selectedIds: new Set([1, 2]),
      });

      vi.mocked(window.electronAPI.tagCapturesBatch).mockResolvedValue(undefined);

      await useCapturesStore.getState().removeTagFromSelected(10);

      expect(window.electronAPI.tagCapturesBatch).toHaveBeenCalledWith([1, 2], 10, 'remove');

      const state = useCapturesStore.getState();
      expect(state.captures[0].tags).toHaveLength(0);
      expect(state.captures[1].tags).toHaveLength(0);
    });
  });
});
