import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DetailModal from './DetailModal';
import type { CaptureFile } from '../../../shared/types/capture';

/**
 * DetailModal Component Tests
 *
 * These tests verify the filename editing functionality in the detail modal.
 * Run with: bun run test
 */

// Get the mocked electronAPI from the global setup
const mockElectronAPI = window.electronAPI as {
  openFile: ReturnType<typeof vi.fn>;
  deleteFile: ReturnType<typeof vi.fn>;
  renameFile: ReturnType<typeof vi.fn>;
};

const mockScreenshotData: CaptureFile = {
  id: 123,
  type: 'screenshot',
  filepath: 'C:/path/to/screenshot.png',
  filename: 'screenshot.png',
  width: 1920,
  height: 1080,
  size: 1024000,
  duration: null,
  thumbnail_path: null,
  created_at: new Date().toISOString(),
  tags: [],
};

const mockVideoData: CaptureFile = {
  id: 456,
  type: 'video',
  filepath: 'C:/path/to/video.mp4',
  filename: 'video.mp4',
  width: 1920,
  height: 1080,
  size: 5120000,
  duration: 10,
  thumbnail_path: null,
  created_at: new Date().toISOString(),
  tags: [],
};

describe('DetailModal', () => {
  const mockOnClose = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnOpenFile = vi.fn();
  const mockOnShowInFolder = vi.fn();
  const mockOnItemUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockElectronAPI.renameFile.mockResolvedValue({ success: true, capture: mockScreenshotData });
  });

  describe('Filename Display', () => {
    it('should display the filename in the header', () => {
      render(
        <DetailModal
          item={mockScreenshotData}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onOpenFile={mockOnOpenFile}
          onShowInFolder={mockOnShowInFolder}
        />
      );

      expect(screen.getByText('screenshot.png')).toBeInTheDocument();
    });

    it('should show click to rename hint in title', () => {
      render(
        <DetailModal
          item={mockScreenshotData}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onOpenFile={mockOnOpenFile}
          onShowInFolder={mockOnShowInFolder}
        />
      );

      const filenameElement = screen.getByText('screenshot.png');
      expect(filenameElement).toHaveAttribute('title', 'screenshot.png (click to rename)');
    });
  });

  describe('Filename Editing', () => {
    it('should enter edit mode when filename is clicked', async () => {
      render(
        <DetailModal
          item={mockScreenshotData}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onOpenFile={mockOnOpenFile}
          onShowInFolder={mockOnShowInFolder}
        />
      );

      const filenameElement = screen.getByText('screenshot.png');
      fireEvent.click(filenameElement);

      // Should show input field with filename without extension
      // Use displayValue to find the input with the filename value
      const input = screen.getByDisplayValue('screenshot');
      expect(input).toBeInTheDocument();
    });

    it('should show file extension separately when in edit mode', async () => {
      render(
        <DetailModal
          item={mockScreenshotData}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onOpenFile={mockOnOpenFile}
          onShowInFolder={mockOnShowInFolder}
        />
      );

      const filenameElement = screen.getByText('screenshot.png');
      fireEvent.click(filenameElement);

      // Extension should be shown separately
      expect(screen.getByText('.png')).toBeInTheDocument();
    });

    it('should allow typing in the input field', async () => {
      render(
        <DetailModal
          item={mockScreenshotData}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onOpenFile={mockOnOpenFile}
          onShowInFolder={mockOnShowInFolder}
        />
      );

      const filenameElement = screen.getByText('screenshot.png');
      fireEvent.click(filenameElement);

      const input = screen.getByDisplayValue('screenshot') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'new-filename' } });

      expect(input).toHaveValue('new-filename');
    });

    it('should cancel edit mode when Escape is pressed', async () => {
      render(
        <DetailModal
          item={mockScreenshotData}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onOpenFile={mockOnOpenFile}
          onShowInFolder={mockOnShowInFolder}
        />
      );

      const filenameElement = screen.getByText('screenshot.png');
      fireEvent.click(filenameElement);

      const input = screen.getByDisplayValue('screenshot');
      fireEvent.keyDown(input, { key: 'Escape' });

      // Should exit edit mode and show original filename
      expect(screen.queryByDisplayValue('screenshot')).not.toBeInTheDocument();
      expect(screen.getByText('screenshot.png')).toBeInTheDocument();
    });

    it('should call renameFile API when Enter is pressed', async () => {
      const updatedCapture = { ...mockScreenshotData, filename: 'new-name.png', filepath: 'C:/path/to/new-name.png' };
      mockElectronAPI.renameFile.mockResolvedValue({ success: true, capture: updatedCapture });

      render(
        <DetailModal
          item={mockScreenshotData}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onOpenFile={mockOnOpenFile}
          onShowInFolder={mockOnShowInFolder}
          onItemUpdate={mockOnItemUpdate}
        />
      );

      const filenameElement = screen.getByText('screenshot.png');
      fireEvent.click(filenameElement);

      const input = screen.getByDisplayValue('screenshot');
      fireEvent.change(input, { target: { value: 'new-name' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockElectronAPI.renameFile).toHaveBeenCalledWith(123, 'new-name.png');
      });
    });

    it('should call onItemUpdate with updated capture after successful rename', async () => {
      const updatedCapture = { ...mockScreenshotData, filename: 'new-name.png', filepath: 'C:/path/to/new-name.png' };
      mockElectronAPI.renameFile.mockResolvedValue({ success: true, capture: updatedCapture });

      render(
        <DetailModal
          item={mockScreenshotData}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onOpenFile={mockOnOpenFile}
          onShowInFolder={mockOnShowInFolder}
          onItemUpdate={mockOnItemUpdate}
        />
      );

      const filenameElement = screen.getByText('screenshot.png');
      fireEvent.click(filenameElement);

      const input = screen.getByDisplayValue('screenshot');
      fireEvent.change(input, { target: { value: 'new-name' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnItemUpdate).toHaveBeenCalledWith(updatedCapture);
      });
    });

    it('should show error message when rename fails', async () => {
      mockElectronAPI.renameFile.mockResolvedValue({ success: false, error: 'A file with this name already exists' });

      render(
        <DetailModal
          item={mockScreenshotData}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onOpenFile={mockOnOpenFile}
          onShowInFolder={mockOnShowInFolder}
        />
      );

      const filenameElement = screen.getByText('screenshot.png');
      fireEvent.click(filenameElement);

      const input = screen.getByDisplayValue('screenshot');
      fireEvent.change(input, { target: { value: 'existing-file' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('A file with this name already exists')).toBeInTheDocument();
      });
    });

    it('should not call renameFile if filename is unchanged', async () => {
      render(
        <DetailModal
          item={mockScreenshotData}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onOpenFile={mockOnOpenFile}
          onShowInFolder={mockOnShowInFolder}
        />
      );

      const filenameElement = screen.getByText('screenshot.png');
      fireEvent.click(filenameElement);

      const input = screen.getByDisplayValue('screenshot');
      // Don't change the value, just press Enter
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockElectronAPI.renameFile).not.toHaveBeenCalled();
      });
    });

    it('should show error for empty filename', async () => {
      render(
        <DetailModal
          item={mockScreenshotData}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onOpenFile={mockOnOpenFile}
          onShowInFolder={mockOnShowInFolder}
        />
      );

      const filenameElement = screen.getByText('screenshot.png');
      fireEvent.click(filenameElement);

      const input = screen.getByDisplayValue('screenshot');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('Filename cannot be empty')).toBeInTheDocument();
      });
      expect(mockElectronAPI.renameFile).not.toHaveBeenCalled();
    });
  });

  describe('Video Files', () => {
    it('should preserve video extension when renaming', async () => {
      const updatedCapture = { ...mockVideoData, filename: 'new-video.mp4', filepath: 'C:/path/to/new-video.mp4' };
      mockElectronAPI.renameFile.mockResolvedValue({ success: true, capture: updatedCapture });

      render(
        <DetailModal
          item={mockVideoData}
          onClose={mockOnClose}
          onDelete={mockOnDelete}
          onOpenFile={mockOnOpenFile}
          onShowInFolder={mockOnShowInFolder}
          onItemUpdate={mockOnItemUpdate}
        />
      );

      const filenameElement = screen.getByText('video.mp4');
      fireEvent.click(filenameElement);

      // Should show .mp4 extension
      expect(screen.getByText('.mp4')).toBeInTheDocument();

      const input = screen.getByDisplayValue('video');
      fireEvent.change(input, { target: { value: 'new-video' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockElectronAPI.renameFile).toHaveBeenCalledWith(456, 'new-video.mp4');
      });
    });
  });
});
