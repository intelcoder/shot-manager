import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useCapturesStore } from '../../stores/captures-store';
import type { CaptureFile } from '../../../shared/types/capture';

interface TagEditorProps {
  capture: CaptureFile;
}

function TagEditor({ capture }: TagEditorProps) {
  const { tags, addTagToCapture, removeTagFromCapture, createTag } = useCapturesStore();
  const [newTagName, setNewTagName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const availableTags = tags.filter(
    (tag) => !capture.tags.find((t) => t.id === tag.id)
  );

  const filteredTags = newTagName
    ? availableTags.filter((t) =>
        t.name.toLowerCase().includes(newTagName.toLowerCase())
      )
    : availableTags;

  const handleAddTag = async (tagId: number) => {
    await addTagToCapture(capture.id, tagId);
    setShowDropdown(false);
    setNewTagName('');
  };

  const handleRemoveTag = async (tagId: number) => {
    await removeTagFromCapture(capture.id, tagId);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const existingTag = tags.find(
      (t) => t.name.toLowerCase() === newTagName.toLowerCase()
    );

    if (existingTag) {
      await addTagToCapture(capture.id, existingTag.id);
    } else {
      const newTag = await createTag(newTagName.trim());
      await addTagToCapture(capture.id, newTag.id);
    }

    setNewTagName('');
    setShowDropdown(false);
  };

  return (
    <div>
      <label className="text-sm text-content-tertiary mb-2 block">Tags</label>

      {/* Current Tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {capture.tags.map((tag) => (
          <span
            key={tag.id}
            className="bg-accent-subtle text-accent px-3 py-1 rounded-full text-sm flex items-center gap-2"
          >
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="hover:text-accent-hover transition-colors"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </span>
        ))}
      </div>

      {/* Add Tag */}
      <div className="relative">
        <input
          type="text"
          placeholder="Add tag..."
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreateTag();
            }
          }}
          className="w-full px-3 py-2 border border-border rounded-lg bg-surface-primary text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm"
        />

        {/* Dropdown */}
        {showDropdown && (filteredTags.length > 0 || newTagName) && (
          <div className="absolute top-full left-0 w-full bg-surface-primary border border-border rounded-lg shadow-macos-md mt-1 z-10 max-h-48 overflow-auto">
            {filteredTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleAddTag(tag.id)}
                className="w-full text-left px-4 py-2 hover:bg-surface-secondary text-sm text-content-secondary hover:text-content-primary transition-colors"
              >
                {tag.name}
              </button>
            ))}
            {newTagName && !tags.find((t) => t.name.toLowerCase() === newTagName.toLowerCase()) && (
              <button
                onClick={handleCreateTag}
                className="w-full text-left px-4 py-2 hover:bg-surface-secondary text-sm text-accent transition-colors"
              >
                Create "{newTagName}"
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TagEditor;
