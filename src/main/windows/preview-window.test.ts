import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Preview Window Timer Tests
 *
 * These tests verify the auto-close timer behavior for the preview popup.
 * The critical bug fixed: timer restarted at full duration instead of remaining time.
 *
 * Run with: bun run test
 */

// Store event handlers to simulate focus/blur
let focusHandler: (() => void) | null = null;
let blurHandler: (() => void) | null = null;
let closedHandler: (() => void) | null = null;

const mockClose = vi.fn();
const mockBrowserWindow = vi.fn();

// Mock Electron modules
vi.mock('electron', () => ({
  BrowserWindow: mockBrowserWindow,
  screen: {
    getPrimaryDisplay: () => ({
      workAreaSize: { width: 1920, height: 1080 },
    }),
  },
}));

// Mock path module
vi.mock('path', () => ({
  default: {
    join: (...args: string[]) => args.join('/'),
  },
}));

describe('Preview Window Auto-Close Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    focusHandler = null;
    blurHandler = null;
    closedHandler = null;
    // Re-apply BrowserWindow implementation after clearAllMocks resets it
    mockBrowserWindow.mockImplementation(() => ({
      loadURL: vi.fn(),
      close: mockClose,
      webContents: { on: vi.fn(), send: vi.fn() },
      on: vi.fn((event: string, handler: () => void) => {
        if (event === 'focus') focusHandler = handler;
        if (event === 'blur') blurHandler = handler;
        if (event === 'closed') closedHandler = handler;
      }),
    }));
    // Reset module state before each test
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Timer Resume on Blur (Critical Bug Fix)', () => {
    it('should resume with remaining time on blur, not full duration', async () => {
      // This is the critical fix - previously timer restarted at 5s instead of remaining time
      const { showPreviewPopup } = await import('./preview-window');

      const mockResult = {
        id: 1,
        type: 'screenshot' as const,
        filepath: '/test/path.png',
        filename: 'test.png',
        width: 1920,
        height: 1080,
        size: 1024,
        createdAt: new Date(),
      };

      // GIVEN: A preview popup is shown with 5000ms timer
      showPreviewPopup(mockResult, 5000);

      // WHEN: 2000ms pass
      vi.advanceTimersByTime(2000);

      // AND: User focuses the window (pauses timer)
      expect(focusHandler).not.toBeNull();
      focusHandler!();

      // AND: User blurs the window (resumes timer)
      expect(blurHandler).not.toBeNull();
      blurHandler!();

      // THEN: After 3000ms more (total 5000ms), window should close
      vi.advanceTimersByTime(2999);
      expect(mockClose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(mockClose).toHaveBeenCalled();
    });

    it('should handle multiple focus/blur cycles correctly', async () => {
      const { showPreviewPopup } = await import('./preview-window');

      const mockResult = {
        id: 2,
        type: 'screenshot' as const,
        filepath: '/test/path2.png',
        filename: 'test2.png',
        width: 1920,
        height: 1080,
        size: 1024,
        createdAt: new Date(),
      };

      // GIVEN: 5s timer started
      showPreviewPopup(mockResult, 5000);

      // Cycle 1: Focus at 1s, blur at 1s (4s remaining)
      vi.advanceTimersByTime(1000);
      focusHandler!();
      blurHandler!();

      // Cycle 2: Focus at 2s, blur at 2s (3s remaining)
      vi.advanceTimersByTime(1000);
      focusHandler!();
      blurHandler!();

      // Cycle 3: Focus at 3s, blur at 3s (2s remaining)
      vi.advanceTimersByTime(1000);
      focusHandler!();
      blurHandler!();

      // THEN: Should close at ~5s total after final blur
      // After 3 cycles of 1s each, we have 2s remaining
      vi.advanceTimersByTime(1999);
      expect(mockClose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
