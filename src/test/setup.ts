import '@testing-library/jest-dom/vitest';
import { vi, beforeEach, afterEach } from 'vitest';

// Mock Electron APIs globally - only mock the electronAPI property, not the whole window
Object.defineProperty(window, 'electronAPI', {
  value: {
    openFile: vi.fn(),
    deleteFile: vi.fn(),
    renameFile: vi.fn(),
    closePreview: vi.fn(),
    getAllFiles: vi.fn().mockResolvedValue([]),
    getAllTags: vi.fn().mockResolvedValue([]),
    addTagToCapture: vi.fn().mockResolvedValue(undefined),
    removeTagFromCapture: vi.fn().mockResolvedValue(undefined),
    createTag: vi.fn(),

    // Folder APIs
    createFolder: vi.fn().mockResolvedValue({ id: 1, name: 'Test Folder', parentId: null, color: null, icon: null, sortOrder: 0, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }),
    getAllFolders: vi.fn().mockResolvedValue([]),
    getFolderTree: vi.fn().mockResolvedValue({ folders: [], uncategorizedCount: 0, totalCount: 0 }),
    updateFolder: vi.fn().mockResolvedValue(null),
    deleteFolder: vi.fn().mockResolvedValue(undefined),

    // Batch APIs
    moveCapturesTo: vi.fn().mockResolvedValue(undefined),
    deleteCapturesBatch: vi.fn().mockResolvedValue(undefined),
    tagCapturesBatch: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

// Reset all mocks before each test to ensure clean state
beforeEach(() => {
  vi.clearAllMocks();

  // Reset mock implementations to defaults
  vi.mocked(window.electronAPI.getAllFiles).mockResolvedValue([]);
  vi.mocked(window.electronAPI.getAllTags).mockResolvedValue([]);
  vi.mocked(window.electronAPI.addTagToCapture).mockResolvedValue(undefined);
  vi.mocked(window.electronAPI.removeTagFromCapture).mockResolvedValue(undefined);
  vi.mocked(window.electronAPI.createFolder).mockResolvedValue({
    id: 1,
    name: 'Test Folder',
    parentId: null,
    color: null,
    icon: null,
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  });
  vi.mocked(window.electronAPI.getAllFolders).mockResolvedValue([]);
  vi.mocked(window.electronAPI.getFolderTree).mockResolvedValue({
    folders: [],
    uncategorizedCount: 0,
    totalCount: 0,
  });
  vi.mocked(window.electronAPI.updateFolder).mockResolvedValue(null);
  vi.mocked(window.electronAPI.deleteFolder).mockResolvedValue(undefined);
  vi.mocked(window.electronAPI.moveCapturesTo).mockResolvedValue(undefined);
  vi.mocked(window.electronAPI.deleteCapturesBatch).mockResolvedValue(undefined);
  vi.mocked(window.electronAPI.tagCapturesBatch).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});
