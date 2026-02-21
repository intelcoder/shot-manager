import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { SelectionArea } from '../../../shared/types/capture';

interface CaptureOverlayProps {
  mode: 'screenshot' | 'video';
  onClose: () => void;
  onComplete: () => void;
}

interface SelectionState {
  isSelecting: boolean;
  startPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
}

function CaptureOverlay({ mode, onClose, onComplete }: CaptureOverlayProps) {
  const [selection, setSelection] = useState<SelectionState>({
    isSelecting: false,
    startPoint: null,
    endPoint: null,
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Make body transparent so desktop shows through on macOS
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    return () => {
      document.body.style.backgroundColor = originalBg;
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  const getSelectionArea = useCallback((): SelectionArea | null => {
    if (!selection.startPoint || !selection.endPoint) return null;

    const x = Math.min(selection.startPoint.x, selection.endPoint.x);
    const y = Math.min(selection.startPoint.y, selection.endPoint.y);
    const width = Math.abs(selection.endPoint.x - selection.startPoint.x);
    const height = Math.abs(selection.endPoint.y - selection.startPoint.y);

    if (width < 10 || height < 10) return null;

    return { x, y, width, height };
  }, [selection.startPoint, selection.endPoint]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCapturing) return;

    setSelection({
      isSelecting: true,
      startPoint: { x: e.clientX, y: e.clientY },
      endPoint: { x: e.clientX, y: e.clientY },
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!selection.isSelecting) return;

    setSelection((prev) => ({
      ...prev,
      endPoint: { x: e.clientX, y: e.clientY },
    }));
  };

  const handleMouseUp = () => {
    if (!selection.isSelecting) return;

    setSelection((prev) => ({
      ...prev,
      isSelecting: false,
    }));

    // For screenshots, capture immediately on mouse up
    if (mode === 'screenshot') {
      const startPoint = selection.startPoint;
      const endPoint = selection.endPoint;
      if (!startPoint || !endPoint) return;

      const x = Math.min(startPoint.x, endPoint.x);
      const y = Math.min(startPoint.y, endPoint.y);
      const width = Math.abs(endPoint.x - startPoint.x);
      const height = Math.abs(endPoint.y - startPoint.y);

      if (width < 10 || height < 10) return;

      setIsCapturing(true);
      window.electronAPI.takeScreenshot({
        mode: 'area',
        area: { x, y, width, height },
      }).then(() => {
        onComplete();
      }).catch((error: unknown) => {
        console.error('Capture failed:', error);
        setIsCapturing(false);
      });
    }
  };

  const handleCapture = async () => {
    const area = getSelectionArea();
    if (!area) return;

    setIsCapturing(true);

    try {
      if (mode === 'screenshot') {
        await window.electronAPI.takeScreenshot({
          mode: 'area',
          area,
        });
      } else {
        await window.electronAPI.startRecording({
          mode: 'area',
          area,
          audio: { enabled: false },
        });
      }
      onComplete();
    } catch (error) {
      console.error('Capture failed:', error);
      setIsCapturing(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && mode === 'video') {
        handleCapture();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleCapture]);

  const area = getSelectionArea();

  return (
    <div
      ref={overlayRef}
      className="selection-overlay bg-black/30"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Selection box */}
      {selection.startPoint && selection.endPoint && (
        <div
          className="selection-box"
          style={{
            left: Math.min(selection.startPoint.x, selection.endPoint.x),
            top: Math.min(selection.startPoint.y, selection.endPoint.y),
            width: Math.abs(selection.endPoint.x - selection.startPoint.x),
            height: Math.abs(selection.endPoint.y - selection.startPoint.y),
          }}
        />
      )}

      {/* Dimensions display */}
      {area && !selection.isSelecting && mode === 'video' && (
        <div
          className="absolute bg-black/80 text-white text-sm px-3 py-1 rounded pointer-events-none"
          style={{
            left: area.x + area.width / 2,
            top: area.y - 30,
            transform: 'translateX(-50%)',
          }}
        >
          {area.width} × {area.height}
        </div>
      )}

      {/* Controls */}
      {area && !selection.isSelecting && mode === 'video' && (
        <div
          className="absolute flex gap-2 pointer-events-auto"
          style={{
            left: area.x + area.width / 2,
            top: area.y + area.height + 10,
            transform: 'translateX(-50%)',
          }}
        >
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleCapture}
            disabled={isCapturing}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isCapturing ? 'Starting...' : <>⏺️ Start Recording</>}
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-sm px-4 py-2 rounded">
        {selection.isSelecting ? (
          'Release to capture'
        ) : mode === 'video' && area ? (
          'Press Enter to start recording • Escape to cancel'
        ) : (
          mode === 'screenshot'
            ? 'Click and drag to capture area • Escape to cancel'
            : 'Click and drag to select area • Escape to cancel'
        )}
      </div>
    </div>
  );
}

export default CaptureOverlay;
