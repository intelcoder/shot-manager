import React, { useState } from 'react';
import TagEditor from './TagEditor';
import type { CaptureFile } from '../../../shared/types/capture';

interface DetailModalProps {
  item: CaptureFile;
  onClose: () => void;
  onDelete: (item: CaptureFile) => void;
  onOpenFile: (item: CaptureFile) => void;
  onShowInFolder: (item: CaptureFile) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function DetailModal({ item, onClose, onDelete, onOpenFile, onShowInFolder }: DetailModalProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-semibold text-gray-800 truncate" title={item.filename}>
            {item.filename}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {item.type === 'video' ? (
            <video
              src={`file://${item.filepath}`}
              controls
              className="w-full max-h-[60vh] bg-black rounded"
            />
          ) : !imageError ? (
            <img
              src={`file://${item.filepath}`}
              alt={item.filename}
              className="w-full max-h-[60vh] object-contain rounded"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Failed to load image
            </div>
          )}
        </div>

        {/* Info & Actions */}
        <div className="p-4 border-t">
          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
            <div>
              <span className="text-gray-500">Size:</span>{' '}
              <span className="font-medium">{formatSize(item.size)}</span>
            </div>
            <div>
              <span className="text-gray-500">Date:</span>{' '}
              <span className="font-medium">{formatDate(item.created_at)}</span>
            </div>
            {item.width && item.height && (
              <div>
                <span className="text-gray-500">Dimensions:</span>{' '}
                <span className="font-medium">{item.width} × {item.height}</span>
              </div>
            )}
            {item.type === 'video' && item.duration && (
              <div>
                <span className="text-gray-500">Duration:</span>{' '}
                <span className="font-medium">{formatDuration(item.duration)}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="mb-4">
            <TagEditor capture={item} />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onOpenFile(item)}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Open
            </button>
            <button
              onClick={() => onShowInFolder(item)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Show in Folder
            </button>
            <button
              onClick={() => onDelete(item)}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors ml-auto"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DetailModal;
