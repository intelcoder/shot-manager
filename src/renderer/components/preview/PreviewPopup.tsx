import React, { useState } from 'react';
import type { CaptureResult } from '../../../shared/types/capture';

interface PreviewPopupProps {
  data: CaptureResult | null;
  onDismiss: () => void;
}

function PreviewPopup({ data, onDismiss }: PreviewPopupProps) {
  const [imageError, setImageError] = useState(false);

  if (!data) {
    return null;
  }

  const handleOpen = () => {
    window.electronAPI?.openFile(data.filepath);
    onDismiss();
  };

  const handleCopy = () => {
    if (data.type === 'screenshot') {
      // Copy is already done automatically, but we could add visual feedback
      onDismiss();
    }
  };

  const handleDelete = async () => {
    await window.electronAPI?.deleteFile(data.id);
    onDismiss();
  };

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
      {/* Preview */}
      <div className="flex-1 bg-gray-100 relative">
        {data.type === 'video' ? (
          <video
            src={`file://${data.filepath}`}
            className="w-full h-full object-cover"
            muted
          />
        ) : !imageError ? (
          <img
            src={`file://${data.filepath}`}
            alt={data.filename}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            🖼️
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
        >
          ✕
        </button>

        {/* Type badge */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
          {data.type === 'screenshot' ? '📷 Screenshot' : '🎬 Video'} captured!
        </div>
      </div>

      {/* Info and actions */}
      <div className="p-3">
        <p className="text-xs text-gray-600 truncate mb-2" title={data.filename}>
          {data.filename}
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleOpen}
            className="flex-1 px-3 py-1.5 bg-primary-500 text-white text-sm rounded hover:bg-primary-600 transition-colors"
          >
            Open
          </button>
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
            className="px-3 py-1.5 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100 transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

export default PreviewPopup;
