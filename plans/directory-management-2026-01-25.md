# Directory Management Feature Plan

**Created**: 2026-01-25
**Status**: Planning

## Overview

Add folder/collection management to Shot Manager, allowing users to organize captures into custom directories with support for multi-select and batch operations.

## Requirements

1. **Create folders/collections** - User-defined organizational structure
2. **Move files between folders** - Drag-and-drop or menu-based
3. **Multi-select for batch operations** - Select multiple items for bulk actions

## Database Changes

### New Table: folders

```sql
CREATE TABLE folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES folders(id), -- NULL for root folders
  color TEXT, -- optional folder color
  icon TEXT, -- optional icon identifier
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Modify captures table

```sql
ALTER TABLE captures ADD COLUMN folder_id INTEGER REFERENCES folders(id);
-- NULL folder_id means "Uncategorized" / root level
```

## Type Definitions

### src/shared/types/folder.ts

```typescript
export interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  color?: string;
  icon?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FolderTree extends Folder {
  children: FolderTree[];
  captureCount: number;
}
```

### Update capture.ts

```typescript
export interface Capture {
  // ... existing fields
  folderId: number | null;
}
```

## IPC Channels

Add to `src/shared/constants/channels.ts`:

```typescript
// Folder operations
FOLDER_CREATE: 'folder:create',
FOLDER_UPDATE: 'folder:update',
FOLDER_DELETE: 'folder:delete',
FOLDER_LIST: 'folder:list',
FOLDER_GET_TREE: 'folder:get-tree',

// Batch operations
CAPTURES_MOVE: 'captures:move',
CAPTURES_DELETE_BATCH: 'captures:delete-batch',
CAPTURES_TAG_BATCH: 'captures:tag-batch',
```

## UI Components

### FolderTree (Sidebar)

```
Sidebar
├── FolderTree
│   ├── FolderItem (recursive)
│   │   ├── Expand/collapse arrow
│   │   ├── Folder icon + name
│   │   ├── Capture count badge
│   │   └── Context menu (rename, delete, new subfolder)
│   └── "New Folder" button
└── Tags section (existing)
```

### Multi-select in Gallery

- Checkbox appears on hover (top-left of card)
- Shift+click for range select
- Ctrl/Cmd+click for toggle select
- Selection toolbar appears when items selected:
  - Move to folder
  - Add/remove tags
  - Delete selected
  - Export selected

### Drag and Drop

- Drag captures from gallery to folder tree
- Drag folders to reorder or nest
- Visual feedback during drag (ghost, drop target highlight)

## State Store Changes

### captures-store.ts additions

```typescript
interface CapturesState {
  // ... existing
  selectedIds: number[];           // multi-select support
  currentFolderId: number | null;  // active folder filter

  // New actions
  selectCapture: (id: number, additive?: boolean) => void;
  selectRange: (startId: number, endId: number) => void;
  clearSelection: () => void;
  moveCaptures: (captureIds: number[], folderId: number | null) => Promise<void>;
  deleteCaptures: (captureIds: number[]) => Promise<void>;
}
```

### New folders-store.ts

```typescript
interface FoldersState {
  folders: Folder[];
  folderTree: FolderTree[];
  expandedFolderIds: Set<number>;

  loadFolders: () => Promise<void>;
  createFolder: (name: string, parentId?: number) => Promise<Folder>;
  updateFolder: (id: number, updates: Partial<Folder>) => Promise<void>;
  deleteFolder: (id: number) => Promise<void>;
  toggleExpanded: (id: number) => void;
}
```

## Implementation Phases

### Phase 1: Database & Backend
1. Add `folders` table migration
2. Add `folder_id` column to captures
3. Implement folder CRUD in database service
4. Add IPC handlers for folder operations

### Phase 2: State Management
1. Create `folders-store.ts`
2. Add multi-select to `captures-store.ts`
3. Update capture queries to filter by folder

### Phase 3: UI - Folder Tree
1. Create `FolderTree` component
2. Create `FolderItem` component with context menu
3. Integrate into Sidebar
4. Add "New Folder" dialog

### Phase 4: UI - Multi-select
1. Add checkbox to `CaptureCard`
2. Implement selection logic (click, shift, ctrl)
3. Create `SelectionToolbar` component
4. Wire up batch operations

### Phase 5: Drag and Drop
1. Add react-dnd or native drag support
2. Enable drag from Gallery to FolderTree
3. Enable folder reordering
4. Add visual drop indicators

## Edge Cases

- Deleting folder with captures: prompt to move or delete contents
- Deleting folder with subfolders: cascade delete or prevent
- Moving capture already in target folder: no-op
- Root folder cannot be deleted
- Maximum nesting depth (suggest 5 levels)

## Future Considerations

- Smart folders (auto-populate based on criteria)
- Folder sharing/export
- Folder-specific settings (naming, quality)
- Search within folder scope
