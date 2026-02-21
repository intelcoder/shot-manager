import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Regression tests for saveVideo savePath fallback.
 *
 * Bug fixed: saveVideo had no fallback when savePath setting was empty,
 * causing videos to be saved to a relative path (unresolvable). The fix
 * mirrors the existing fallback in saveScreenshot.
 */

// vi.mock factories are hoisted before top-level const/let declarations, so variables
// referenced inside factories must be declared with vi.hoisted() to avoid TDZ errors.
const {
  mockGetSetting,
  mockInsertCapture,
  mockWriteFile,
  mockStat,
  mockExistsSync,
  mockMkdirSync,
  mockGetPath,
} = vi.hoisted(() => ({
  mockGetSetting: vi.fn(),
  mockInsertCapture: vi.fn(),
  mockWriteFile: vi.fn(),
  mockStat: vi.fn(),
  mockExistsSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockGetPath: vi.fn(),
}));

vi.mock('./settings', () => ({
  getSetting: mockGetSetting,
}));

vi.mock('./database', () => ({
  insertCapture: mockInsertCapture,
  deleteCapture: vi.fn(),
  getCaptureById: vi.fn(),
  updateCaptureFilename: vi.fn(),
}));

vi.mock('electron', () => ({
  shell: { openPath: vi.fn(), showItemInFolder: vi.fn() },
  nativeImage: { createFromPath: vi.fn() },
  clipboard: { writeImage: vi.fn() },
  dialog: { showOpenDialog: vi.fn() },
  app: { getPath: mockGetPath },
}));

vi.mock('fs', () => ({
  default: {
    promises: { writeFile: mockWriteFile, stat: mockStat, unlink: vi.fn(), rename: vi.fn() },
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
  },
  promises: { writeFile: mockWriteFile, stat: mockStat, unlink: vi.fn(), rename: vi.fn() },
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
}));

vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('2024-01-01'),
}));

import { saveVideo } from './file-manager';

describe('saveVideo', () => {
  const dummyBuffer = Buffer.from([0x1a, 0x45]);

  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ size: 2048 });
    // folder doesn't exist → mkdirSync; file doesn't exist → no counter suffix
    mockExistsSync.mockReturnValue(false);
    mockInsertCapture.mockReturnValue(42);
  });

  it('saves to the configured savePath when one is set', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'savePath') return 'C:/custom/save/path';
      if (key === 'filePrefix') return 'rec';
      if (key === 'videoFormat') return 'webm';
      if (key === 'organizationStyle') return 'flat';
      return '';
    });

    await saveVideo(dummyBuffer, 5, 1280, 720);

    expect(mockGetPath).not.toHaveBeenCalled();
    const savedPath: string = mockWriteFile.mock.calls[0][0];
    expect(savedPath).toContain('custom');
    expect(savedPath).not.toContain('Shot Manager');
  });

  it('falls back to {pictures}/Shot Manager when savePath setting is empty', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'savePath') return '';
      if (key === 'filePrefix') return 'shot';
      if (key === 'videoFormat') return 'webm';
      if (key === 'organizationStyle') return 'flat';
      return '';
    });
    mockGetPath.mockReturnValue('C:/Users/test/Pictures');

    await saveVideo(dummyBuffer, 5, 1280, 720);

    expect(mockGetPath).toHaveBeenCalledWith('pictures');
    const savedPath: string = mockWriteFile.mock.calls[0][0];
    expect(savedPath).toContain('Shot Manager');
  });

  it('returns the correct CaptureResult metadata', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'savePath') return 'C:/saves';
      if (key === 'filePrefix') return 'clip';
      if (key === 'videoFormat') return 'webm';
      if (key === 'organizationStyle') return 'flat';
      return '';
    });
    mockStat.mockResolvedValue({ size: 99999 });
    mockInsertCapture.mockReturnValue(7);

    const result = await saveVideo(dummyBuffer, 10, 1920, 1080);

    expect(result.id).toBe(7);
    expect(result.type).toBe('video');
    expect(result.duration).toBe(10);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.size).toBe(99999);
  });
});
