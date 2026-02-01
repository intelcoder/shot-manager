import React, { useEffect, useState } from 'react';
import { Plus, Archive, FolderClosed } from 'lucide-react';
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
    <div className="p-4 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-content-tertiary uppercase">Folders</h3>
        <button
          onClick={() => setShowNewFolderDialog(true)}
          className="p-1 text-content-tertiary hover:text-content-primary hover:bg-surface-tertiary rounded transition-colors"
          title="New Folder"
        >
          <Plus size={16} strokeWidth={1.5} />
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
              ? 'bg-accent-subtle text-accent'
              : isDragOverAll
                ? 'bg-surface-tertiary'
                : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
          }`}
        >
          <Archive size={16} strokeWidth={1.5} className="text-content-tertiary" />
          <span className="flex-1">All Captures</span>
          <span className="text-xs text-content-tertiary bg-surface-tertiary px-1.5 py-0.5 rounded-full">
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
              ? 'bg-accent-subtle text-accent'
              : isDragOverUncategorized
                ? 'bg-accent-subtle ring-2 ring-accent'
                : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
          }`}
        >
          <FolderClosed size={16} strokeWidth={1.5} className="text-content-tertiary" />
          <span className="flex-1">Uncategorized</span>
          {uncategorizedCount > 0 && (
            <span className="text-xs text-content-tertiary bg-surface-tertiary px-1.5 py-0.5 rounded-full">
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
