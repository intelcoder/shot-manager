import React, { useState, useRef, useEffect } from 'react';
import { X, ExternalLink, FolderOpen, Trash2 } from 'lucide-react';
import TagEditor from './TagEditor';
import { useCapturesStore } from '../../stores/captures-store';
import type { CaptureFile } from '../../../shared/types/capture';
import { toFileUrl } from '../../utils/file-url';

interface DetailModalProps {
  item: CaptureFile;
  onClose: () => void;
  onDelete: (item: CaptureFile) => void;
  onOpenFile: (item: CaptureFile) => void;
  onShowInFolder: (item: CaptureFile) => void;
  onItemUpdate?: (item: CaptureFile) => void;
  onAnnotate: (item: CaptureFile) => void;
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

function DetailModal({ item, onClose, onDelete, onOpenFile, onShowInFolder, onItemUpdate, onAnnotate }: DetailModalProps) {
  const [imageError, setImageError] = useState(false);
  const [isEditingFilename, setIsEditingFilename] = useState(false);
  const [editedFilename, setEditedFilename] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const filenameInputRef = useRef<HTMLInputElement>(null);
  const renameCapture = useCapturesStore((state) => state.renameCapture);

  // Subscribe to store to get live capture data (for immediate tag updates)
  const currentItem = useCapturesStore(
    (state) => state.captures.find((c) => c.id === item.id) ?? item
  );

  // Get filename without extension for editing
  const getFilenameWithoutExt = (filename: string) => {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(0, lastDot) : filename;
  };

  const getExtension = (filename: string) => {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot) : '';
  };

  const handleFilenameClick = () => {
    setEditedFilename(getFilenameWithoutExt(currentItem.filename));
    setIsEditingFilename(true);
    setRenameError(null);
  };

  useEffect(() => {
    if (isEditingFilename && filenameInputRef.current) {
      filenameInputRef.current.focus();
      filenameInputRef.current.select();
    }
  }, [isEditingFilename]);

  const handleRename = async () => {
    if (!editedFilename.trim()) {
      setRenameError('Filename cannot be empty');
      return;
    }

    const newFilename = editedFilename.trim() + getExtension(currentItem.filename);
    if (newFilename === currentItem.filename) {
      setIsEditingFilename(false);
      return;
    }

    setIsRenaming(true);
    setRenameError(null);

    const result = await renameCapture(item.id, newFilename);

    setIsRenaming(false);

    if (result.success && result.capture) {
      setIsEditingFilename(false);
      onItemUpdate?.(result.capture);
    } else {
      setRenameError(result.error || 'Failed to rename file');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingFilename(false);
      setRenameError(null);
    }
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setEditedFilename(e.target.value);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-surface-primary rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col m-4 shadow-macos-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <div className="flex-1 min-w-0 mr-4">
            {isEditingFilename ? (
              <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <input
                    ref={filenameInputRef}
                    type="text"
                    value={editedFilename}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    onKeyDown={handleKeyDown}
                    onBlur={handleRename}
                    disabled={isRenaming}
                    autoComplete="off"
                    className="flex-1 font-semibold text-content-primary px-2 py-1 border border-accent rounded bg-surface-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <span className="text-content-tertiary text-sm">{getExtension(currentItem.filename)}</span>
                </div>
                {renameError && (
                  <span className="text-red-500 dark:text-red-400 text-xs">{renameError}</span>
                )}
              </div>
            ) : (
              <h2
                className="font-semibold text-content-primary truncate cursor-pointer hover:text-accent transition-colors"
                title={`${currentItem.filename} (click to rename)`}
                onClick={handleFilenameClick}
              >
                {currentItem.filename}
              </h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-tertiary rounded-full transition-colors flex-shrink-0 text-content-secondary hover:text-content-primary"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-surface-secondary">
          {currentItem.type === 'video' ? (
            <video
              src={toFileUrl(currentItem.filepath)}
              controls
              className="w-full max-h-[60vh] bg-black rounded-lg"
            />
          ) : !imageError ? (
            <img
              src={toFileUrl(currentItem.filepath)}
              alt={currentItem.filename}
              className="w-full max-h-[60vh] object-contain rounded-lg"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-content-tertiary">
              Failed to load image
            </div>
          )}
        </div>

        {/* Info & Actions */}
        <div className="p-4 border-t border-border">
          {/* Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
            <div>
              <span className="text-content-tertiary">Size:</span>{' '}
              <span className="font-medium text-content-primary">{formatSize(currentItem.size)}</span>
            </div>
            <div>
              <span className="text-content-tertiary">Date:</span>{' '}
              <span className="font-medium text-content-primary">{formatDate(currentItem.created_at)}</span>
            </div>
            {currentItem.width && currentItem.height && (
              <div>
                <span className="text-content-tertiary">Dimensions:</span>{' '}
                <span className="font-medium text-content-primary">{currentItem.width} × {currentItem.height}</span>
              </div>
            )}
            {currentItem.type === 'video' && currentItem.duration && (
              <div>
                <span className="text-content-tertiary">Duration:</span>{' '}
                <span className="font-medium text-content-primary">{formatDuration(currentItem.duration)}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="mb-4">
            <TagEditor capture={currentItem} />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onOpenFile(item)}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors flex items-center gap-2"
            >
              <ExternalLink size={16} strokeWidth={1.5} />
              Open
            </button>
            <button
              onClick={() => onShowInFolder(item)}
              className="px-4 py-2 bg-surface-tertiary text-content-primary rounded-lg hover:bg-surface-secondary transition-colors flex items-center gap-2"
            >
              <FolderOpen size={16} strokeWidth={1.5} />
              Show in Folder
            </button>
            {currentItem.type === 'screenshot' && (
              <button
                onClick={() => {
                  onClose();
                  onAnnotate(currentItem);
                }}
                className="px-3 py-1.5 text-sm rounded bg-primary-500 text-white hover:bg-primary-600"
              >
                Annotate
              </button>
            )}
            <button
              onClick={() => onDelete(item)}
              className="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors ml-auto flex items-center gap-2"
            >
              <Trash2 size={16} strokeWidth={1.5} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DetailModal;
