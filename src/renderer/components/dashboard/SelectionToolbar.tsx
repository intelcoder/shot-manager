import React, { useState } from 'react';
import { FolderOpen, Tag, Star, Trash2, X } from 'lucide-react';
import { useCapturesStore } from '../../stores/captures-store';
import { useFoldersStore } from '../../stores/folders-store';

function SelectionToolbar() {
  const {
    selectedIds,
    clearSelection,
    selectAll,
    deleteSelected,
    moveSelectedToFolder,
    addTagToSelected,
    starSelected,
    tags,
    captures,
  } = useCapturesStore();
  const { folderTree, loadFolderTree } = useFoldersStore();

  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);

  const selectedCount = selectedIds.size;

  // Check if any selected items are starred
  const selectedCaptures = captures.filter((c) => selectedIds.has(c.id));
  const allStarred = selectedCaptures.length > 0 && selectedCaptures.every((c) => c.isStarred);
  const someStarred = selectedCaptures.some((c) => c.isStarred);

  if (selectedCount === 0) {
    return null;
  }

  const handleStar = async () => {
    // If all selected items are starred, unstar them; otherwise, star all
    await starSelected(!allStarred);
  };

  const handleDelete = async () => {
    if (confirm(`Delete ${selectedCount} item${selectedCount > 1 ? 's' : ''}?`)) {
      await deleteSelected();
      await loadFolderTree();
    }
  };

  const handleMoveToFolder = async (folderId: number | null) => {
    await moveSelectedToFolder(folderId);
    await loadFolderTree();
    setShowFolderMenu(false);
  };

  const handleAddTag = async (tagId: number) => {
    await addTagToSelected(tagId);
    setShowTagMenu(false);
  };

  // Flatten folder tree for the dropdown
  const flattenFolders = (folders: typeof folderTree, depth = 0): { id: number; name: string; depth: number }[] => {
    return folders.flatMap((folder) => [
      { id: folder.id, name: folder.name, depth },
      ...flattenFolders(folder.children, depth + 1),
    ]);
  };

  const flatFolders = flattenFolders(folderTree);

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-surface-primary dark:bg-surface-tertiary text-content-primary rounded-xl shadow-macos-lg border border-border px-4 py-3 flex items-center gap-4 backdrop-blur-macos">
        {/* Selection count */}
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>

        <div className="w-px h-6 bg-border" />

        {/* Select all */}
        <button
          onClick={selectAll}
          className="text-sm text-content-secondary hover:text-accent transition-colors"
        >
          Select all
        </button>

        <div className="w-px h-6 bg-border" />

        {/* Move to folder */}
        <div className="relative">
          <button
            onClick={() => {
              setShowFolderMenu(!showFolderMenu);
              setShowTagMenu(false);
            }}
            className="flex items-center gap-1.5 text-sm text-content-secondary hover:text-accent transition-colors"
          >
            <FolderOpen size={16} strokeWidth={1.5} />
            Move
          </button>

          {showFolderMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-surface-primary rounded-lg shadow-macos-lg border border-border py-1 min-w-[180px] max-h-64 overflow-auto">
              <button
                onClick={() => handleMoveToFolder(null)}
                className="w-full text-left px-3 py-2 text-sm text-content-secondary hover:bg-surface-secondary hover:text-content-primary transition-colors"
              >
                Uncategorized
              </button>
              <hr className="my-1 border-border" />
              {flatFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleMoveToFolder(folder.id)}
                  className="w-full text-left px-3 py-2 text-sm text-content-secondary hover:bg-surface-secondary hover:text-content-primary transition-colors"
                  style={{ paddingLeft: `${folder.depth * 12 + 12}px` }}
                >
                  {folder.name}
                </button>
              ))}
              {flatFolders.length === 0 && (
                <div className="px-3 py-2 text-sm text-content-tertiary">No folders</div>
              )}
            </div>
          )}
        </div>

        {/* Add tag */}
        <div className="relative">
          <button
            onClick={() => {
              setShowTagMenu(!showTagMenu);
              setShowFolderMenu(false);
            }}
            className="flex items-center gap-1.5 text-sm text-content-secondary hover:text-accent transition-colors"
          >
            <Tag size={16} strokeWidth={1.5} />
            Tag
          </button>

          {showTagMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-surface-primary rounded-lg shadow-macos-lg border border-border py-1 min-w-[150px] max-h-64 overflow-auto">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAddTag(tag.id)}
                  className="w-full text-left px-3 py-2 text-sm text-content-secondary hover:bg-surface-secondary hover:text-content-primary flex items-center gap-2 transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tag.color || 'var(--accent)' }}
                  />
                  {tag.name}
                </button>
              ))}
              {tags.length === 0 && (
                <div className="px-3 py-2 text-sm text-content-tertiary">No tags</div>
              )}
            </div>
          )}
        </div>

        {/* Star/Unstar */}
        <button
          onClick={handleStar}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            allStarred
              ? 'text-yellow-500 hover:text-yellow-400'
              : 'text-content-secondary hover:text-yellow-500'
          }`}
          title={allStarred ? 'Remove star from selected' : 'Star selected'}
        >
          <Star size={16} strokeWidth={1.5} fill={allStarred ? 'currentColor' : 'none'} />
          {allStarred ? 'Unstar' : 'Star'}
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-400 transition-colors"
        >
          <Trash2 size={16} strokeWidth={1.5} />
          Delete
        </button>

        <div className="w-px h-6 bg-border" />

        {/* Clear selection */}
        <button
          onClick={clearSelection}
          className="p-1.5 hover:bg-surface-tertiary rounded-lg transition-colors text-content-secondary hover:text-content-primary"
          title="Clear selection"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

export default SelectionToolbar;
