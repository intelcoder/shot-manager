import React, { useState, useRef, useCallback } from 'react';
import type { CaptureResult } from '../../../shared/types/capture';
import { toFileUrl } from '../../utils/file-url';

// Swipe gesture constants
const SWIPE = {
  DISMISS_THRESHOLD: 100,
  OPACITY_DISTANCE: 200,
} as const;

interface PreviewPopupProps {
  data: CaptureResult | null;
  onDismiss: () => void;
}

function PreviewPopup({ data, onDismiss }: PreviewPopupProps) {
  const [mediaError, setMediaError] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use refs for touch animation to avoid re-renders on every move
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const translateXRef = useRef(0);

  if (!data) {
    return null;
  }

  const handleOpen = () => {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return;
    }
    window.electronAPI.openFile(data.filepath);
    onDismiss();
  };

  const handleCopy = () => {
    if (data.type === 'screenshot') {
      // Copy is already done automatically during capture
      onDismiss();
    }
  };

  const handleDelete = async () => {
    if (!window.electronAPI) {
      setDeleteError('Electron API not available');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await window.electronAPI.deleteFile(data.id);
      onDismiss();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete file';
      setDeleteError(message);
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMediaError = () => {
    setMediaError(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || !containerRef.current) return;

    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    // Only allow swiping right (positive delta)
    if (deltaX > 0) {
      translateXRef.current = deltaX;
      // Update DOM directly to avoid re-renders
      containerRef.current.style.transform = `translateX(${deltaX}px)`;
      containerRef.current.style.opacity = String(
        Math.max(0, 1 - deltaX / SWIPE.OPACITY_DISTANCE)
      );
    }
  };

  const handleTouchEnd = () => {
    if (translateXRef.current > SWIPE.DISMISS_THRESHOLD) {
      // Swipe threshold exceeded - dismiss
      onDismiss();
    } else if (containerRef.current) {
      // Reset position
      containerRef.current.style.transform = 'translateX(0)';
      containerRef.current.style.opacity = '1';
    }
    touchStartXRef.current = null;
    translateXRef.current = 0;
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white rounded-lg shadow-xl overflow-hidden flex flex-col transition-transform"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Preview */}
      <div className="flex-1 bg-gray-100 relative">
        {mediaError ? (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span aria-label="Image unavailable">Media unavailable</span>
          </div>
        ) : data.type === 'video' ? (
          <video
            src={toFileUrl(data.filepath)}
            className="w-full h-full object-cover cursor-pointer"
            onClick={handleOpen}
            onError={handleMediaError}
            autoPlay
            loop
            muted
          />
        ) : (
          <img
            src={toFileUrl(data.filepath)}
            alt={data.filename}
            className="w-full h-full object-cover cursor-pointer"
            onClick={handleOpen}
            onError={handleMediaError}
          />
        )}

        {/* Close button */}
        <button
          onClick={onDismiss}
          aria-label="Close preview"
          className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
        >
          <span aria-hidden="true">✕</span>
        </button>

        {/* Type badge */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
          {data.type === 'screenshot' ? 'Screenshot' : 'Video'} captured!
        </div>
      </div>

      {/* Info and actions */}
      <div className="p-3">
        <p className="text-xs text-gray-600 truncate mb-2" title={data.filename}>
          {data.filename}
        </p>

        {deleteError && (
          <p className="text-xs text-red-600 mb-2">{deleteError}</p>
        )}

        <div className="flex gap-2">
          {data.type === 'screenshot' && (
            <button
              onClick={handleCopy}
              className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition-colors"
            >
              Copy
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Delete file"
            className="px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreviewPopup;
