import React, { useState } from 'react';
import type { CaptureFile } from '../../../shared/types/capture';
import { useCapturesStore } from '../../stores/captures-store';

interface GalleryItemProps {
  item: CaptureFile;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onClick: () => void;
  onDelete: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function GalleryItem({ item, isSelected, onSelect, onClick, onDelete }: GalleryItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { selectedIds, toggleStar } = useCapturesStore();

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleStar(item.id);
  };

  const imageSrc = item.thumbnail_path
    ? `file://${item.thumbnail_path}`
    : item.type === 'screenshot'
    ? `file://${item.filepath}`
    : undefined;

  const handleClick = (e: React.MouseEvent) => {
    // Ctrl+click or Shift+click triggers selection
    if (e.ctrlKey || e.shiftKey || e.metaKey) {
      e.preventDefault();
      onSelect(e);
    } else {
      onClick();
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(e);
  };

  const handleDragStart = (e: React.DragEvent) => {
    // If this item is selected and there are other selected items, drag all selected items
    // Otherwise, drag just this item
    let captureIds: number[];
    if (isSelected && selectedIds.size > 1) {
      captureIds = Array.from(selectedIds);
    } else {
      captureIds = [item.id];
    }

    const data = JSON.stringify({ captureIds });
    // Set both MIME types for browser compatibility
    e.dataTransfer.setData('application/json', data);
    e.dataTransfer.setData('text/plain', data);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';

    // Create a custom drag image showing count
    if (captureIds.length > 1) {
      const dragImage = document.createElement('div');
      dragImage.className = 'bg-primary-500 text-white px-3 py-2 rounded-lg shadow-lg font-medium';
      dragImage.textContent = `${captureIds.length} items`;
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 40, 20);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
  };

  return (
    <div
      className={`relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 shadow-sm hover:shadow-md transition-all ${
        isSelected ? 'ring-2 ring-primary-500 ring-offset-2' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
    >
      {/* Selection checkbox */}
      {(isHovered || isSelected) && (
        <div
          className="absolute top-2 right-2 z-10"
          onClick={handleCheckboxClick}
        >
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white/80 border-gray-400 hover:border-primary-500'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Thumbnail */}
      <div className="aspect-video bg-gray-200 relative">
        {imageSrc && !imageError ? (
          <img
            src={imageSrc}
            alt={item.filename}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
            {item.type === 'video' ? '🎬' : '🖼️'}
          </div>
        )}

        {/* Star icon */}
        {(isHovered || item.isStarred) && (
          <button
            onClick={handleStarClick}
            className={`absolute top-2 left-2 z-10 p-1 rounded-full transition-all ${
              item.isStarred
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-white/70 hover:text-yellow-400'
            }`}
            title={item.isStarred ? 'Remove star' : 'Add star'}
          >
            <svg
              className="w-5 h-5 drop-shadow-md"
              fill={item.isStarred ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        )}

        {/* Video indicator */}
        {item.type === 'video' && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <span>▶</span>
            <span>{item.duration ? formatDuration(item.duration) : '--:--'}</span>
          </div>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="absolute top-8 left-2 flex gap-1 flex-wrap">
            {item.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded"
              >
                {tag.name}
              </span>
            ))}
            {item.tags.length > 2 && (
              <span className="bg-gray-500 text-white text-xs px-2 py-0.5 rounded">
                +{item.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Hover overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* Filename */}
      <div className="p-2 bg-white">
        <p className="text-xs text-gray-600 truncate" title={item.filename}>
          {item.filename}
        </p>
      </div>
    </div>
  );
}

export default GalleryItem;
