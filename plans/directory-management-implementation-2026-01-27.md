# Directory Management Implementation Plan

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Database & Backend | ✅ Complete |
| Phase 2 | State Management | ✅ Complete |
| Phase 3 | UI - Folder Tree | ✅ Complete |
| Phase 4 | UI - Multi-select | ✅ Complete |
| Phase 5 | Drag and Drop | ✅ Complete |

**All phases implemented.** Drag-and-drop to move captures between folders is fully functional.

---

## Bug Fixes

### Fix: Drag-and-Drop Ignoring Dragged Item IDs (2026-01-27)

**Problem:** When dragging captures to folders, the drop handler ignored the actual dragged item IDs and instead operated on the current selection state. This meant dragging an unselected item did nothing.

**Root Cause:** In `FolderTree.tsx`, `handleDrop` called `moveSelectedToFolder(folderId)` which only used `selectedIds` from the store, ignoring the `captureIds` parameter passed from the drag event.

**Solution:** Modified `moveSelectedToFolder` to accept an optional `captureIds` parameter:
- `captures-store.ts`: Changed signature to `moveSelectedToFolder(folderId, captureIds?)`
- Implementation uses `explicitIds ?? Array.from(get().selectedIds)` to determine which captures to move
- Only clears selection when no explicit IDs provided (backward compatible)
- `FolderTree.tsx`: Now passes `captureIds` from drag data to the function

**Files Modified:**
- `src/renderer/stores/captures-store.ts` (interface + implementation)
- `src/renderer/components/folders/FolderTree.tsx`

---

### Fix: Electron Drag-and-Drop Not Firing Drop Events (2026-01-27)

**Problem:** Dragging captures to folders in the sidebar did not trigger the drop handler. The drag visual feedback worked but dropping had no effect.

**Root Cause:** Electron's Chromium requires explicit `dropEffect` to be set in `onDragOver` for the drop event to fire. Additionally, some MIME type compatibility issues existed.

**Solution:** Applied multiple fixes for Electron drag-and-drop:

1. **Set dropEffect in onDragOver** (critical fix):
   ```typescript
   onDragOver={(e) => {
     e.preventDefault();
     e.dataTransfer.dropEffect = 'move';  // Required!
   }}
   ```

2. **Set both MIME types for compatibility:**
   ```typescript
   e.dataTransfer.setData('application/json', data);
   e.dataTransfer.setData('text/plain', data);  // Fallback
   ```

3. **Read both MIME types when receiving:**
   ```typescript
   const data = e.dataTransfer.getData('application/json')
             || e.dataTransfer.getData('text/plain');
   ```

4. **Added onDragEnter handler** for proper highlight state management

5. **Improved onDragLeave** to check bounds before clearing highlight (prevents flicker)

**Files Modified:**
- `src/renderer/components/dashboard/GalleryItem.tsx` - Set both MIME types, set dropEffect
- `src/renderer/components/folders/FolderItem.tsx` - Added onDragEnter, set dropEffect, read both MIME types
- `src/renderer/components/folders/FolderTree.tsx` - Same fixes for Uncategorized virtual folder

---

## Overview

Add folder/collection management to Shot Manager with multi-select and batch operations, following the design in `plans/directory-management-2026-01-25.md`.

## Key Design Decisions

1. **Database constraints**: `folder_id` uses `ON DELETE SET NULL` (captures stay when folder deleted), folder `parent_id` uses `ON DELETE CASCADE` (subfolders deleted with parent)
2. **Virtual folders**: "All Captures" and "Uncategorized" are virtual views (not database rows), handled in UI/queries
3. **Capture counts**: Computed on-demand via SQL aggregation, not stored in FolderTree
4. **Selection state**: Uses `Set<number>` for O(1) lookups
5. **Drag-and-drop**: Native HTML5 DnD (no external library needed for this scope)
6. **Migration safety**: Wrapped in transaction with rollback on failure

## Implementation Phases

### Phase 1: Database & Backend

**New file:** `src/shared/types/folder.ts`
- `Folder` interface (id, name, parentId, color, icon, sortOrder, timestamps)
- `FolderTree` interface (extends Folder with children array; captureCount computed via SQL aggregation)
- `CreateFolderInput`, `UpdateFolderInput` types

**Modify:** `src/shared/types/capture.ts`
- Add `folder_id: number | null` to CaptureRecord
- Add `folderId: number | null` to CaptureFile

**Modify:** `src/shared/constants/channels.ts`
- Add folder channels: `FOLDER_CREATE`, `FOLDER_UPDATE`, `FOLDER_DELETE`, `FOLDER_LIST`, `FOLDER_GET_TREE`
- Add batch channels: `CAPTURES_MOVE_TO_FOLDER`, `CAPTURES_DELETE_BATCH`, `CAPTURES_TAG_BATCH`

**Modify:** `src/main/services/database.ts`
- Create `folders` table with migration:
  ```sql
  CREATE TABLE folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    color TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX idx_folders_parent_id ON folders(parent_id);
  ```
- Add `folder_id` column to captures:
  ```sql
  ALTER TABLE captures ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL;
  CREATE INDEX idx_captures_folder_id ON captures(folder_id);
  ```
- Wrap migration in transaction with rollback on failure
- Add folder CRUD: `createFolder`, `getAllFolders`, `getFolderTree` (with COUNT aggregation), `updateFolder`, `deleteFolder`
- Add batch: `moveCapturesTo`, `deleteCapturesBatch`, `addTagToCapturesBatch`
- Update `getCaptures` to support `folderId` filter

**Modify:** `src/main/ipc/handlers.ts`
- Register handlers for all new channels

**Modify:** `src/preload/index.ts`
- Expose folder and batch APIs

**Modify:** `src/shared/types/electron.d.ts`
- Add folder API types to ElectronAPI interface
- Add `folderId` to FileQueryOptions

---

### Phase 2: State Management

**New file:** `src/renderer/stores/folders-store.ts`
- State: `folders`, `folderTree`, `expandedFolderIds`, `currentFolderId`, `isLoading`, `error`
- Actions: `loadFolders`, `loadFolderTree`, `createFolder`, `updateFolder`, `deleteFolder`, `setCurrentFolder`, `toggleExpanded`

**Modify:** `src/renderer/stores/captures-store.ts`
- Add state: `selectedIds: Set<number>`, `lastSelectedId: number | null`
- Add actions: `selectCapture(id, mode)`, `selectAll`, `clearSelection`
- Add batch actions: `moveSelectedToFolder`, `deleteSelected`, `addTagToSelected`, `removeTagFromSelected`
- Update `setFilters` to clear selection on filter change

---

### Phase 3: UI - Folder Tree

**New file:** `src/renderer/components/folders/FolderTree.tsx`
- Displays "All Captures", "Uncategorized", and folder hierarchy
- New folder button
- Integrates with folders-store

**New file:** `src/renderer/components/folders/FolderItem.tsx`
- Expand/collapse toggle
- Folder name (editable inline)
- Capture count badge
- Context menu (Rename, New Subfolder, Delete)
- Drop target for drag-and-drop

**New file:** `src/renderer/components/folders/NewFolderDialog.tsx`
- Modal dialog for creating folders
- Supports parent folder selection

**Modify:** `src/renderer/components/dashboard/Sidebar.tsx`
- Add FolderTree component above date filters
- Keep existing date and tag filters

---

### Phase 4: UI - Multi-select

**Modify:** `src/renderer/components/dashboard/GalleryItem.tsx`
- Add selection checkbox (visible on hover or when selected)
- Handle Ctrl+click (toggle), Shift+click (range), regular click
- Visual ring when selected

**Modify:** `src/renderer/components/dashboard/Gallery.tsx`
- Pass selection state from captures-store to GalleryItem
- Track selection mode

**New file:** `src/renderer/components/dashboard/SelectionToolbar.tsx`
- Floating toolbar at bottom when items selected
- Shows selection count
- Actions: Move to folder, Add tag, Delete
- Clear selection button

**Modify:** `src/renderer/components/dashboard/Dashboard.tsx`
- Add SelectionToolbar component
- Load folder tree on mount

---

### Phase 5: Drag and Drop

**New file:** `src/renderer/components/dnd/DragContext.tsx`
- React context for drag state
- `startDrag`, `endDrag`, `setDropTarget` functions

**Modify:** `src/renderer/components/dashboard/GalleryItem.tsx`
- Add `draggable` attribute
- `onDragStart`: Start drag with selected IDs or single ID
- `onDragEnd`: Clean up drag state

**Modify:** `src/renderer/components/folders/FolderItem.tsx`
- `onDragOver`: Highlight as drop target
- `onDrop`: Move captures to folder

**Modify:** `src/renderer/App.tsx`
- Wrap app with DragProvider

---

## Files Summary

### New Files (7)
1. `src/shared/types/folder.ts`
2. `src/renderer/stores/folders-store.ts`
3. `src/renderer/components/folders/FolderTree.tsx`
4. `src/renderer/components/folders/FolderItem.tsx`
5. `src/renderer/components/folders/NewFolderDialog.tsx`
6. `src/renderer/components/dashboard/SelectionToolbar.tsx`
7. `src/renderer/components/dnd/DragContext.tsx`

### Modified Files (12)
1. `src/shared/types/capture.ts`
2. `src/shared/types/electron.d.ts`
3. `src/shared/constants/channels.ts`
4. `src/main/services/database.ts`
5. `src/main/ipc/handlers.ts`
6. `src/preload/index.ts`
7. `src/renderer/stores/captures-store.ts`
8. `src/renderer/components/dashboard/Sidebar.tsx`
9. `src/renderer/components/dashboard/Gallery.tsx`
10. `src/renderer/components/dashboard/GalleryItem.tsx`
11. `src/renderer/components/dashboard/Dashboard.tsx`
12. `src/renderer/App.tsx`

---

## Verification Plan

### After Each Phase
1. Run `npm run typecheck` - ensure no TypeScript errors
2. Run `npm run lint` - ensure code style
3. Run `npm run test` - ensure existing tests pass

### Phase 1 Verification
- Start app, verify database migration runs without errors
- Check that existing captures still load correctly

### Phase 2 Verification
- Verify folders-store loads empty folder list
- Verify captures-store selection state works

### Phase 3 Verification
- Create folders via UI
- Navigate between folders
- Verify gallery filters by folder

### Phase 4 Verification
- Select multiple items with Ctrl+click
- Range select with Shift+click
- Batch delete selected items
- Batch move to folder

### Phase 5 Verification
- Drag single item to folder
- Drag multiple selected items to folder
- Visual feedback during drag

### Final Integration Test
1. Create nested folder structure (3 levels)
2. Take new screenshots
3. Multi-select and move to folders
4. Verify folder counts update
5. Delete folder with contents
6. Verify captures move to Uncategorized or are deleted
