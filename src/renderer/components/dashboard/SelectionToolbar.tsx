import React, { useState } from 'react';
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
      <div className="bg-gray-900 text-white rounded-lg shadow-xl px-4 py-3 flex items-center gap-4">
        {/* Selection count */}
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>

        <div className="w-px h-6 bg-gray-700" />

        {/* Select all */}
        <button
          onClick={selectAll}
          className="text-sm hover:text-primary-300 transition-colors"
        >
          Select all
        </button>

        <div className="w-px h-6 bg-gray-700" />

        {/* Move to folder */}
        <div className="relative">
          <button
            onClick={() => {
              setShowFolderMenu(!showFolderMenu);
              setShowTagMenu(false);
            }}
            className="flex items-center gap-1 text-sm hover:text-primary-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            Move
          </button>

          {showFolderMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border py-1 min-w-[180px] max-h-64 overflow-auto">
              <button
                onClick={() => handleMoveToFolder(null)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Uncategorized
              </button>
              <hr className="my-1" />
              {flatFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleMoveToFolder(folder.id)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  style={{ paddingLeft: `${folder.depth * 12 + 12}px` }}
                >
                  {folder.name}
                </button>
              ))}
              {flatFolders.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-400">No folders</div>
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
            className="flex items-center gap-1 text-sm hover:text-primary-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            Tag
          </button>

          {showTagMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border py-1 min-w-[150px] max-h-64 overflow-auto">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAddTag(tag.id)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <span className="text-primary-500">●</span>
                  {tag.name}
                </button>
              ))}
              {tags.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-400">No tags</div>
              )}
            </div>
          )}
        </div>

        {/* Star/Unstar */}
        <button
          onClick={handleStar}
          className={`flex items-center gap-1 text-sm transition-colors ${
            allStarred
              ? 'text-yellow-400 hover:text-yellow-300'
              : 'hover:text-yellow-400'
          }`}
          title={allStarred ? 'Remove star from selected' : 'Star selected'}
        >
          <svg
            className="w-4 h-4"
            fill={allStarred ? 'currentColor' : 'none'}
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
          {allStarred ? 'Unstar' : 'Star'}
        </button>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete
        </button>

        <div className="w-px h-6 bg-gray-700" />

        {/* Clear selection */}
        <button
          onClick={clearSelection}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="Clear selection"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default SelectionToolbar;
