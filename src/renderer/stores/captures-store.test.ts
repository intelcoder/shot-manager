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
});
