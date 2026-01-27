import { create } from 'zustand';
import type { Folder, FolderTree, CreateFolderInput, UpdateFolderInput } from '../../shared/types/folder';

interface FoldersState {
  folders: Folder[];
  folderTree: FolderTree[];
  expandedFolderIds: Set<number>;
  currentFolderId: number | null | 'all' | 'uncategorized';
  uncategorizedCount: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadFolders: () => Promise<void>;
  loadFolderTree: () => Promise<void>;
  createFolder: (input: CreateFolderInput) => Promise<Folder>;
  updateFolder: (id: number, input: UpdateFolderInput) => Promise<Folder | null>;
  deleteFolder: (id: number) => Promise<void>;
  setCurrentFolder: (folderId: number | null | 'all' | 'uncategorized') => void;
  toggleExpanded: (folderId: number) => void;
  refresh: () => Promise<void>;
}

export const useFoldersStore = create<FoldersState>((set, get) => ({
  folders: [],
  folderTree: [],
  expandedFolderIds: new Set(),
  currentFolderId: 'all',
  uncategorizedCount: 0,
  totalCount: 0,
  isLoading: false,
  error: null,

  loadFolders: async () => {
    try {
      const folders = await window.electronAPI.getAllFolders();
      set({ folders });
    } catch (error) {
      console.error('Failed to load folders:', error);
      set({ error: (error as Error).message });
    }
  },

  loadFolderTree: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await window.electronAPI.getFolderTree();
      set({
        folderTree: response.folders,
        uncategorizedCount: response.uncategorizedCount,
        totalCount: response.totalCount,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load folder tree:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createFolder: async (input) => {
    try {
      const folder = await window.electronAPI.createFolder(input);
      // Reload tree to get updated structure and counts
      await get().loadFolderTree();
      return folder;
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  },

  updateFolder: async (id, input) => {
    try {
      const folder = await window.electronAPI.updateFolder(id, input);
      if (folder) {
        // Reload tree to get updated structure
        await get().loadFolderTree();
      }
      return folder;
    } catch (error) {
      console.error('Failed to update folder:', error);
      throw error;
    }
  },

  deleteFolder: async (id) => {
    try {
      await window.electronAPI.deleteFolder(id);
      // If current folder was deleted, switch to all
      if (get().currentFolderId === id) {
        set({ currentFolderId: 'all' });
      }
      // Remove from expanded set
      const newExpanded = new Set(get().expandedFolderIds);
      newExpanded.delete(id);
      set({ expandedFolderIds: newExpanded });
      // Reload tree
      await get().loadFolderTree();
    } catch (error) {
      console.error('Failed to delete folder:', error);
      throw error;
    }
  },

  setCurrentFolder: (folderId) => {
    set({ currentFolderId: folderId });
  },

  toggleExpanded: (folderId) => {
    const newExpanded = new Set(get().expandedFolderIds);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    set({ expandedFolderIds: newExpanded });
  },

  refresh: async () => {
    await get().loadFolderTree();
  },
}));
