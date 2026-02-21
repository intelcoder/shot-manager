import React from 'react';
import { Camera } from 'lucide-react';
import GalleryItem from './GalleryItem';
import { useCapturesStore } from '../../stores/captures-store';
import type { CaptureFile } from '../../../shared/types/capture';

interface GalleryProps {
  items: CaptureFile[];
  isLoading: boolean;
  onItemClick: (item: CaptureFile) => void;
  onItemDelete: (item: CaptureFile) => void;
}

function Gallery({ items, isLoading, onItemClick, onItemDelete }: GalleryProps) {
  const { selectedIds, selectCapture, isSelected } = useCapturesStore();

  const handleSelect = (item: CaptureFile, e: React.MouseEvent) => {
    if (e.shiftKey) {
      selectCapture(item.id, 'range');
    } else if (e.ctrlKey || e.metaKey) {
      selectCapture(item.id, 'toggle');
    } else {
      selectCapture(item.id, 'toggle');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="aspect-video bg-surface-tertiary rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-content-tertiary">
        <Camera size={64} strokeWidth={1} className="mb-4 text-content-tertiary" />
        <h3 className="text-lg font-medium mb-2 text-content-secondary">No captures yet</h3>
        <p className="text-sm">
          Take a screenshot or record a video to get started
        </p>
        <div className="mt-4 text-sm text-content-tertiary">
          <p>Press Ctrl+Shift+3 for fullscreen screenshot</p>
          <p>Press Ctrl+Shift+4 for area selection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <GalleryItem
            key={item.id}
            item={item}
            isSelected={isSelected(item.id)}
            onSelect={(e) => handleSelect(item, e)}
            onClick={() => onItemClick(item)}
            onDelete={() => onItemDelete(item)}
          />
        ))}
      </div>
    </div>
  );
}

export default Gallery;
