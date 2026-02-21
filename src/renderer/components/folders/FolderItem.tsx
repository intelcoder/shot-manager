import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Folder } from 'lucide-react';
import type { FolderTree } from '../../../shared/types/folder';
import { useFoldersStore } from '../../stores/folders-store';

interface FolderItemProps {
  folder: FolderTree;
  depth: number;
  onSelect: (folderId: number) => void;
  isSelected: boolean;
  onDrop?: (captureIds: number[], folderId: number) => void;
}

function FolderItem({ folder, depth, onSelect, isSelected, onDrop }: FolderItemProps) {
  const { expandedFolderIds, toggleExpanded, updateFolder, deleteFolder, createFolder } = useFoldersStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const isExpanded = expandedFolderIds.has(folder.id);
  const hasChildren = folder.children.length > 0;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };
    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showContextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleRename = async () => {
    if (editName.trim() && editName !== folder.name) {
      await updateFolder(folder.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditName(folder.name);
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Delete folder "${folder.name}"? Subfolders will also be deleted. Captures will be moved to Uncategorized.`)) {
      await deleteFolder(folder.id);
    }
    setShowContextMenu(false);
  };

  const handleNewSubfolder = async () => {
    setShowContextMenu(false);
    const name = window.prompt('Enter folder name:');
    if (name?.trim()) {
      await createFolder({ name: name.trim(), parentId: folder.id });
      if (!isExpanded) {
        toggleExpanded(folder.id);
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Required: must set dropEffect to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set false if we're actually leaving this element
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDropEvent = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Try both MIME types for browser compatibility
    const data = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
    if (data && onDrop) {
      try {
        const { captureIds } = JSON.parse(data);
        if (Array.isArray(captureIds) && captureIds.length > 0) {
          onDrop(captureIds, folder.id);
        }
      } catch (err) {
        console.error('Failed to parse drag data:', err);
      }
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer group transition-colors ${
          isSelected
            ? 'bg-accent-subtle text-accent'
            : isDragOver
              ? 'bg-accent-subtle ring-2 ring-accent'
              : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(folder.id)}
        onContextMenu={handleContextMenu}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropEvent}
      >
        {/* Expand/collapse toggle */}
        <button
          className={`w-4 h-4 flex items-center justify-center text-content-tertiary hover:text-content-primary ${
            !hasChildren ? 'invisible' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded(folder.id);
          }}
        >
          <ChevronRight
            size={12}
            strokeWidth={2}
            className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>

        {/* Folder icon */}
        <Folder size={16} strokeWidth={1.5} className="text-content-tertiary" />

        {/* Folder name */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="flex-1 px-1 py-0 text-sm bg-surface-primary text-content-primary border border-accent rounded focus:outline-none focus:ring-1 focus:ring-accent"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-sm truncate">{folder.name}</span>
        )}

        {/* Capture count badge */}
        {folder.captureCount > 0 && (
          <span className="text-xs text-content-tertiary bg-surface-tertiary px-1.5 py-0.5 rounded-full">
            {folder.captureCount}
          </span>
        )}
      </div>

      {/* Context menu */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-surface-primary rounded-lg shadow-macos-lg border border-border py-1 min-w-[120px]"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
        >
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-content-secondary hover:bg-surface-secondary hover:text-content-primary transition-colors"
            onClick={() => {
              setShowContextMenu(false);
              setIsEditing(true);
            }}
          >
            Rename
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-content-secondary hover:bg-surface-secondary hover:text-content-primary transition-colors"
            onClick={handleNewSubfolder}
          >
            New Subfolder
          </button>
          <hr className="my-1 border-border" />
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              onSelect={onSelect}
              isSelected={false}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default FolderItem;
