import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PreviewPopup from './PreviewPopup';
import type { CaptureResult } from '../../../shared/types/capture';

/**
 * Preview Popup Component Tests
 *
 * These tests verify the UI interactions for the preview popup.
 * Run with: bun run test
 */

// Get the mocked electronAPI from the global setup
const mockElectronAPI = window.electronAPI as {
  openFile: ReturnType<typeof vi.fn>;
  deleteFile: ReturnType<typeof vi.fn>;
  closePreview: ReturnType<typeof vi.fn>;
};

const mockScreenshotData: CaptureResult = {
  id: 123,
  type: 'screenshot',
  filepath: '/path/to/screenshot.png',
  filename: 'screenshot.png',
  width: 1920,
  height: 1080,
  size: 1024000,
  createdAt: new Date(),
};

const mockVideoData: CaptureResult = {
  id: 456,
  type: 'video',
  filepath: '/path/to/video.mp4',
  filename: 'video.mp4',
  width: 1920,
  height: 1080,
  size: 5120000,
  duration: 10,
  createdAt: new Date(),
};

describe('PreviewPopup', () => {
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render nothing when data is null', () => {
      const { container } = render(
        <PreviewPopup data={null} onDismiss={mockOnDismiss} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render image for screenshot type', () => {
      render(<PreviewPopup data={mockScreenshotData} onDismiss={mockOnDismiss} />);
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('alt', mockScreenshotData.filename);
    });

    it('should NOT render Open button', () => {
      render(<PreviewPopup data={mockScreenshotData} onDismiss={mockOnDismiss} />);
      // Open button was removed per requirements - verify it doesn't exist
      expect(screen.queryByRole('button', { name: /open/i })).toBeNull();
    });

    it('should render Delete button for all types', () => {
      render(<PreviewPopup data={mockScreenshotData} onDismiss={mockOnDismiss} />);
      expect(screen.getByRole('button', { name: /🗑️/ })).toBeInTheDocument();
    });
  });

  describe('Click to Open', () => {
    it('should open file when image is clicked', () => {
      render(<PreviewPopup data={mockScreenshotData} onDismiss={mockOnDismiss} />);
      const img = screen.getByRole('img');

      fireEvent.click(img);

      expect(mockElectronAPI.openFile).toHaveBeenCalledWith(mockScreenshotData.filepath);
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  describe('Swipe to Dismiss', () => {
    it('should dismiss when swipe exceeds threshold', () => {
      const { container } = render(
        <PreviewPopup data={mockScreenshotData} onDismiss={mockOnDismiss} />
      );
      const popup = container.firstChild as HTMLElement;

      // Simulate touch swipe: start at 50, move to 200 (150px swipe > 100px threshold)
      fireEvent.touchStart(popup, { touches: [{ clientX: 50 }] });
      fireEvent.touchMove(popup, { touches: [{ clientX: 200 }] });
      fireEvent.touchEnd(popup);

      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('should reset position when swipe is under threshold', () => {
      const { container } = render(
        <PreviewPopup data={mockScreenshotData} onDismiss={mockOnDismiss} />
      );
      const popup = container.firstChild as HTMLElement;

      // Simulate touch swipe: start at 50, move to 100 (50px swipe < 100px threshold)
      fireEvent.touchStart(popup, { touches: [{ clientX: 50 }] });
      fireEvent.touchMove(popup, { touches: [{ clientX: 100 }] });
      fireEvent.touchEnd(popup);

      // Should NOT dismiss
      expect(mockOnDismiss).not.toHaveBeenCalled();
      // Position should reset (translateX back to 0)
      expect(popup.style.transform).toBe('translateX(0px)');
    });
  });

  describe('Button Actions', () => {
    it('should delete file and dismiss on Delete button click', async () => {
      render(<PreviewPopup data={mockScreenshotData} onDismiss={mockOnDismiss} />);
      const deleteButton = screen.getByRole('button', { name: /🗑️/ });

      fireEvent.click(deleteButton);

      // Wait for async handleDelete to complete
      await waitFor(() => {
        expect(mockElectronAPI.deleteFile).toHaveBeenCalledWith(mockScreenshotData.id);
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });
  });
});
