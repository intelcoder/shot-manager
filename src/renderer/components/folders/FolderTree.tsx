import React, { useEffect, useState } from 'react';
import { useFoldersStore } from '../../stores/folders-store';
import { useCapturesStore } from '../../stores/captures-store';
import FolderItem from './FolderItem';
import NewFolderDialog from './NewFolderDialog';

function FolderTree() {
  const {
    folderTree,
    currentFolderId,
    setCurrentFolder,
    uncategorizedCount,
    totalCount,
    loadFolderTree,
  } = useFoldersStore();
  const { setFilters, moveSelectedToFolder, clearSelection } = useCapturesStore();
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [isDragOverAll, setIsDragOverAll] = useState(false);
  const [isDragOverUncategorized, setIsDragOverUncategorized] = useState(false);

  useEffect(() => {
    loadFolderTree();
  }, [loadFolderTree]);

  const handleFolderSelect = (folderId: number | 'all' | 'uncategorized') => {
    setCurrentFolder(folderId);
    if (folderId === 'all') {
      setFilters({ folderId: undefined });
    } else if (folderId === 'uncategorized') {
      setFilters({ folderId: 'uncategorized' });
    } else {
      setFilters({ folderId });
    }
  };

  const handleDrop = async (captureIds: number[], folderId: number | null) => {
    await moveSelectedToFolder(folderId, captureIds);
    clearSelection();
    await loadFolderTree();
  };

  const handleDropOnUncategorized = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverUncategorized(false);

    // Try both MIME types for browser compatibility
    const data = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
    if (data) {
      try {
        const { captureIds } = JSON.parse(data);
        if (Array.isArray(captureIds) && captureIds.length > 0) {
          handleDrop(captureIds, null);
        }
      } catch (err) {
        console.error('Failed to parse drag data:', err);
      }
    }
  };

  return (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase">Folders</h3>
        <button
          onClick={() => setShowNewFolderDialog(true)}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          title="New Folder"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <nav className="space-y-0.5">
        {/* All Captures (virtual) */}
        <button
          onClick={() => handleFolderSelect('all')}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOverAll(true);
          }}
          onDragLeave={() => setIsDragOverAll(false)}
          className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
            currentFolderId === 'all'
              ? 'bg-primary-100 text-primary-700'
              : isDragOverAll
                ? 'bg-gray-50'
                : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <span className="flex-1">All Captures</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
            {totalCount}
          </span>
        </button>

        {/* Uncategorized (virtual) */}
        <button
          onClick={() => handleFolderSelect('uncategorized')}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragOverUncategorized(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDragLeave={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
              setIsDragOverUncategorized(false);
            }
          }}
          onDrop={handleDropOnUncategorized}
          className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
            currentFolderId === 'uncategorized'
              ? 'bg-primary-100 text-primary-700'
              : isDragOverUncategorized
                ? 'bg-primary-50 ring-2 ring-primary-300'
                : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
          <span className="flex-1">Uncategorized</span>
          {uncategorizedCount > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {uncategorizedCount}
            </span>
          )}
        </button>

        {/* Folder tree */}
        {folderTree.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            depth={0}
            onSelect={(id) => handleFolderSelect(id)}
            isSelected={currentFolderId === folder.id}
            onDrop={handleDrop}
          />
        ))}
      </nav>

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <NewFolderDialog onClose={() => setShowNewFolderDialog(false)} />
      )}
    </div>
  );
}

export default FolderTree;
