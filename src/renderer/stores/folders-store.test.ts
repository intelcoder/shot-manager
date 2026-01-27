import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFoldersStore } from './folders-store';
import type { Folder, FolderTree } from '../../shared/types/folder';

const createMockFolder = (overrides: Partial<Folder> = {}): Folder => ({
  id: 1,
  name: 'Test Folder',
  parentId: null,
  color: null,
  icon: null,
  sortOrder: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createMockFolderTree = (overrides: Partial<FolderTree> = {}): FolderTree => ({
  id: 1,
  name: 'Test Folder',
  parentId: null,
  color: null,
  icon: null,
  sortOrder: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  children: [],
  captureCount: 0,
  ...overrides,
});

describe('folders-store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useFoldersStore.setState({
      folders: [],
      folderTree: [],
      expandedFolderIds: new Set(),
      currentFolderId: 'all',
      uncategorizedCount: 0,
      totalCount: 0,
      isLoading: false,
      error: null,
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadFolderTree', () => {
    it('fetches and stores folder tree', async () => {
      const mockFolderTree = [
        createMockFolderTree({ id: 1, name: 'Folder 1', captureCount: 5 }),
        createMockFolderTree({ id: 2, name: 'Folder 2', captureCount: 3 }),
      ];

      vi.mocked(window.electronAPI.getFolderTree).mockResolvedValue({
        folders: mockFolderTree,
        uncategorizedCount: 10,
        totalCount: 18,
      });

      await useFoldersStore.getState().loadFolderTree();

      const state = useFoldersStore.getState();
      expect(state.folderTree).toEqual(mockFolderTree);
      expect(state.uncategorizedCount).toBe(10);
      expect(state.totalCount).toBe(18);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets loading state while fetching', async () => {
      let resolveApi: (value: { folders: FolderTree[]; uncategorizedCount: number; totalCount: number }) => void;
      const apiPromise = new Promise<{ folders: FolderTree[]; uncategorizedCount: number; totalCount: number }>((resolve) => {
        resolveApi = resolve;
      });
      vi.mocked(window.electronAPI.getFolderTree).mockReturnValue(apiPromise);

      const loadPromise = useFoldersStore.getState().loadFolderTree();

      // Should be loading immediately
      expect(useFoldersStore.getState().isLoading).toBe(true);

      resolveApi!({ folders: [], uncategorizedCount: 0, totalCount: 0 });
      await loadPromise;

      // Should not be loading after completion
      expect(useFoldersStore.getState().isLoading).toBe(false);
    });

    it('sets error state on API failure', async () => {
      vi.mocked(window.electronAPI.getFolderTree).mockRejectedValue(
        new Error('Network error')
      );

      vi.spyOn(console, 'error').mockImplementation(() => {});

      await useFoldersStore.getState().loadFolderTree();

      const state = useFoldersStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('createFolder', () => {
    it('calls API and reloads tree', async () => {
      const newFolder = createMockFolder({ id: 5, name: 'New Folder' });

      vi.mocked(window.electronAPI.createFolder).mockResolvedValue(newFolder);
      vi.mocked(window.electronAPI.getFolderTree).mockResolvedValue({
        folders: [createMockFolderTree({ id: 5, name: 'New Folder' })],
        uncategorizedCount: 0,
        totalCount: 0,
      });

      const result = await useFoldersStore.getState().createFolder({ name: 'New Folder' });

      expect(result).toEqual(newFolder);
      expect(window.electronAPI.createFolder).toHaveBeenCalledWith({ name: 'New Folder' });
      expect(window.electronAPI.getFolderTree).toHaveBeenCalled();
    });

    it('throws error on API failure', async () => {
      vi.mocked(window.electronAPI.createFolder).mockRejectedValue(
        new Error('Failed to create')
      );

      vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        useFoldersStore.getState().createFolder({ name: 'Test' })
      ).rejects.toThrow('Failed to create');
    });
  });

  describe('deleteFolder', () => {
    it('deletes folder and reloads tree', async () => {
      vi.mocked(window.electronAPI.deleteFolder).mockResolvedValue(undefined);
      vi.mocked(window.electronAPI.getFolderTree).mockResolvedValue({
        folders: [],
        uncategorizedCount: 5,
        totalCount: 5,
      });

      await useFoldersStore.getState().deleteFolder(1);

      expect(window.electronAPI.deleteFolder).toHaveBeenCalledWith(1);
      expect(window.electronAPI.getFolderTree).toHaveBeenCalled();
    });

    it('switches to all if current folder was deleted', async () => {
      useFoldersStore.setState({ currentFolderId: 5 });

      vi.mocked(window.electronAPI.deleteFolder).mockResolvedValue(undefined);
      vi.mocked(window.electronAPI.getFolderTree).mockResolvedValue({
        folders: [],
        uncategorizedCount: 0,
        totalCount: 0,
      });

      await useFoldersStore.getState().deleteFolder(5);

      expect(useFoldersStore.getState().currentFolderId).toBe('all');
    });

    it('does not change current folder if different folder was deleted', async () => {
      useFoldersStore.setState({ currentFolderId: 3 });

      vi.mocked(window.electronAPI.deleteFolder).mockResolvedValue(undefined);
      vi.mocked(window.electronAPI.getFolderTree).mockResolvedValue({
        folders: [],
        uncategorizedCount: 0,
        totalCount: 0,
      });

      await useFoldersStore.getState().deleteFolder(5);

      expect(useFoldersStore.getState().currentFolderId).toBe(3);
    });

    it('removes deleted folder from expanded set', async () => {
      useFoldersStore.setState({ expandedFolderIds: new Set([1, 5, 10]) });

      vi.mocked(window.electronAPI.deleteFolder).mockResolvedValue(undefined);
      vi.mocked(window.electronAPI.getFolderTree).mockResolvedValue({
        folders: [],
        uncategorizedCount: 0,
        totalCount: 0,
      });

      await useFoldersStore.getState().deleteFolder(5);

      const expandedIds = useFoldersStore.getState().expandedFolderIds;
      expect(expandedIds.has(5)).toBe(false);
      expect(expandedIds.has(1)).toBe(true);
      expect(expandedIds.has(10)).toBe(true);
    });
  });

  describe('setCurrentFolder', () => {
    it('updates current folder state to numeric ID', () => {
      useFoldersStore.getState().setCurrentFolder(5);

      expect(useFoldersStore.getState().currentFolderId).toBe(5);
    });

    it('updates current folder state to all', () => {
      useFoldersStore.setState({ currentFolderId: 5 });

      useFoldersStore.getState().setCurrentFolder('all');

      expect(useFoldersStore.getState().currentFolderId).toBe('all');
    });

    it('updates current folder state to uncategorized', () => {
      useFoldersStore.getState().setCurrentFolder('uncategorized');

      expect(useFoldersStore.getState().currentFolderId).toBe('uncategorized');
    });
  });

  describe('toggleExpanded', () => {
    it('adds folder to expanded set when not expanded', () => {
      useFoldersStore.setState({ expandedFolderIds: new Set() });

      useFoldersStore.getState().toggleExpanded(5);

      expect(useFoldersStore.getState().expandedFolderIds.has(5)).toBe(true);
    });

    it('removes folder from expanded set when expanded', () => {
      useFoldersStore.setState({ expandedFolderIds: new Set([5]) });

      useFoldersStore.getState().toggleExpanded(5);

      expect(useFoldersStore.getState().expandedFolderIds.has(5)).toBe(false);
    });

    it('preserves other expanded folders', () => {
      useFoldersStore.setState({ expandedFolderIds: new Set([1, 3, 5]) });

      useFoldersStore.getState().toggleExpanded(3);

      const expandedIds = useFoldersStore.getState().expandedFolderIds;
      expect(expandedIds.has(1)).toBe(true);
      expect(expandedIds.has(3)).toBe(false);
      expect(expandedIds.has(5)).toBe(true);
    });
  });

  describe('updateFolder', () => {
    it('calls API with correct parameters and reloads tree', async () => {
      const updatedFolder = createMockFolder({ id: 1, name: 'Updated Name' });

      vi.mocked(window.electronAPI.updateFolder).mockResolvedValue(updatedFolder);
      vi.mocked(window.electronAPI.getFolderTree).mockResolvedValue({
        folders: [createMockFolderTree({ id: 1, name: 'Updated Name' })],
        uncategorizedCount: 0,
        totalCount: 0,
      });

      const result = await useFoldersStore.getState().updateFolder(1, { name: 'Updated Name' });

      expect(result).toEqual(updatedFolder);
      expect(window.electronAPI.updateFolder).toHaveBeenCalledWith(1, { name: 'Updated Name' });
      expect(window.electronAPI.getFolderTree).toHaveBeenCalled();
    });

    it('does not reload tree if update returns null', async () => {
      vi.mocked(window.electronAPI.updateFolder).mockResolvedValue(null);

      const result = await useFoldersStore.getState().updateFolder(999, { name: 'Test' });

      expect(result).toBeNull();
      expect(window.electronAPI.getFolderTree).not.toHaveBeenCalled();
    });
  });

  describe('loadFolders', () => {
    it('loads folders from API', async () => {
      const mockFolders = [
        createMockFolder({ id: 1, name: 'Folder 1' }),
        createMockFolder({ id: 2, name: 'Folder 2' }),
      ];

      vi.mocked(window.electronAPI.getAllFolders).mockResolvedValue(mockFolders);

      await useFoldersStore.getState().loadFolders();

      expect(useFoldersStore.getState().folders).toEqual(mockFolders);
    });

    it('sets error on failure', async () => {
      vi.mocked(window.electronAPI.getAllFolders).mockRejectedValue(
        new Error('Load failed')
      );

      vi.spyOn(console, 'error').mockImplementation(() => {});

      await useFoldersStore.getState().loadFolders();

      expect(useFoldersStore.getState().error).toBe('Load failed');
    });
  });

  describe('refresh', () => {
    it('calls loadFolderTree', async () => {
      vi.mocked(window.electronAPI.getFolderTree).mockResolvedValue({
        folders: [],
        uncategorizedCount: 0,
        totalCount: 0,
      });

      await useFoldersStore.getState().refresh();

      expect(window.electronAPI.getFolderTree).toHaveBeenCalled();
    });
  });

  describe('race conditions', () => {
    it('handles concurrent loadFolderTree calls - last call wins', async () => {
      const firstResponse = {
        folders: [createMockFolderTree({ id: 1, name: 'First' })],
        uncategorizedCount: 5,
        totalCount: 5,
      };
      const secondResponse = {
        folders: [createMockFolderTree({ id: 2, name: 'Second' })],
        uncategorizedCount: 10,
        totalCount: 10,
      };

      let resolveFirst: (value: typeof firstResponse) => void;
      let resolveSecond: (value: typeof secondResponse) => void;

      const firstPromise = new Promise<typeof firstResponse>((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<typeof secondResponse>((resolve) => {
        resolveSecond = resolve;
      });

      // First call returns slowly
      vi.mocked(window.electronAPI.getFolderTree)
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      // Start both loads
      const load1 = useFoldersStore.getState().loadFolderTree();
      const load2 = useFoldersStore.getState().loadFolderTree();

      // Resolve second first (simulates faster response)
      resolveSecond!(secondResponse);
      await load2;

      // Then resolve first (simulates slow response arriving late)
      resolveFirst!(firstResponse);
      await load1;

      // In current implementation, last to complete overwrites
      // This test documents the current behavior
      const state = useFoldersStore.getState();
      expect(state.totalCount).toBe(5); // First response overwrote second
    });
  });

  describe('edge cases', () => {
    it('createFolder throws error on API failure', async () => {
      vi.mocked(window.electronAPI.createFolder).mockRejectedValue(
        new Error('Create failed')
      );

      vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        useFoldersStore.getState().createFolder({ name: 'Test' })
      ).rejects.toThrow('Create failed');
    });

    it('deleteFolder throws error on API failure', async () => {
      vi.mocked(window.electronAPI.deleteFolder).mockRejectedValue(
        new Error('Delete failed')
      );

      vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        useFoldersStore.getState().deleteFolder(1)
      ).rejects.toThrow('Delete failed');
    });

    it('updateFolder throws error on API failure', async () => {
      vi.mocked(window.electronAPI.updateFolder).mockRejectedValue(
        new Error('Update failed')
      );

      vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        useFoldersStore.getState().updateFolder(1, { name: 'New' })
      ).rejects.toThrow('Update failed');
    });
  });
});
