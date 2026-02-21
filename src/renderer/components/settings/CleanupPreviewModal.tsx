import React from 'react';
import type { CleanupPreview } from '../../../shared/types/cleanup';

interface CleanupPreviewModalProps {
  preview: CleanupPreview | null;
  isLoading: boolean;
  isExecuting: boolean;
  onExecute: () => void;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function CleanupPreviewModal({
  preview,
  isLoading,
  isExecuting,
  onExecute,
  onClose,
}: CleanupPreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-primary rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-border flex-shrink-0">
          <h3 className="text-lg font-semibold text-content-primary">Cleanup Preview</h3>
          <p className="text-sm text-content-tertiary mt-1">
            The following captures will be permanently deleted.
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin text-2xl mb-2">...</div>
              <p className="text-content-tertiary">Loading preview...</p>
            </div>
          ) : !preview ? (
            <div className="text-center py-12 text-content-tertiary">
              Failed to load preview
            </div>
          ) : preview.totalCount === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-12 h-12 mx-auto text-green-500 dark:text-green-400 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-content-secondary font-medium">No captures to delete</p>
              <p className="text-sm text-content-tertiary mt-1">
                All captures are either protected or don't match the rule criteria.
              </p>
            </div>
          ) : (
            <div>
              {/* Summary */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="font-medium">
                    {preview.totalCount} item{preview.totalCount !== 1 ? 's' : ''} will be deleted
                  </span>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  This will free up {formatBytes(preview.totalSizeBytes)} of disk space.
                </p>
              </div>

              {/* File list */}
              <div className="space-y-2">
                {preview.captures.slice(0, 50).map((capture) => (
                  <div
                    key={capture.id}
                    className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-content-secondary truncate">{capture.filename}</p>
                      <p className="text-xs text-content-tertiary">{formatDate(capture.createdAt)}</p>
                    </div>
                    <span className="text-xs text-content-tertiary ml-2">{formatBytes(capture.size)}</span>
                  </div>
                ))}
                {preview.totalCount > 50 && (
                  <p className="text-sm text-content-tertiary text-center py-2">
                    ...and {preview.totalCount - 50} more items
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border bg-surface-secondary flex justify-end gap-3 rounded-b-xl flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-content-secondary hover:text-content-primary transition-colors"
          >
            Cancel
          </button>
          {preview && preview.totalCount > 0 && (
            <button
              onClick={onExecute}
              disabled={isExecuting}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExecuting ? 'Deleting...' : `Delete ${preview.totalCount} Item${preview.totalCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CleanupPreviewModal;
