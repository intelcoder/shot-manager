import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

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
  },
  writable: true,
});
