import React, { useState } from 'react';
import type { CaptureFile } from '../../../shared/types/capture';

interface GalleryItemProps {
  item: CaptureFile;
  onClick: () => void;
  onDelete: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function GalleryItem({ item, onClick, onDelete }: GalleryItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageSrc = item.thumbnail_path
    ? `file://${item.thumbnail_path}`
    : item.type === 'screenshot'
    ? `file://${item.filepath}`
    : undefined;

  return (
    <div
      className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 shadow-sm hover:shadow-md transition-shadow"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
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

        {/* Video indicator */}
        {item.type === 'video' && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <span>▶</span>
            <span>{item.duration ? formatDuration(item.duration) : '--:--'}</span>
          </div>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
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
