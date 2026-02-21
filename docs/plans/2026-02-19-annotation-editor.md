# Annotation Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a non-destructive annotation editor to Shot Manager that lets users draw arrows, text labels, and rectangle highlights on screenshots, storing annotations as JSON in the database alongside the original untouched file.

**Architecture:** Fabric.js canvas renders on top of the screenshot image inside an inline panel that replaces the gallery view while editing. Annotations are serialized to JSON via `canvas.toJSON()` and stored in a new `annotations` DB column. The original file is never modified. Export flattens via `canvas.toDataURL()` and copies to clipboard.

**Tech Stack:** Fabric.js v6 (canvas), sql.js (DB migration), Electron IPC pattern (channels → handlers → preload → types), React + Zustand

---

## Design Decisions (confirmed)

| Decision | Choice |
|----------|--------|
| Storage | Non-destructive: `annotations TEXT` column in `captures` table (Fabric.js canvas JSON) |
| UX location | Inline panel — replaces gallery `<main>` area while editing, returns on save/cancel |
| Tools | Arrow, text label, rectangle highlight + select/move |
| Entry points | Hover button on GalleryItem thumbnail + "Annotate" button in DetailModal |
| Rendering | Fabric.js v6 |

---

### Task 1: Install Fabric.js

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install fabric**

```bash
npm install fabric
```

Expected: fabric appears in `package.json` dependencies.

**Step 2: Verify types are bundled**

Fabric v6 ships its own TypeScript types. Verify:
```bash
ls node_modules/fabric/dist/index.d.ts
```
Expected: file exists. If missing, run `npm install --save-dev @types/fabric`.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add fabric.js for annotation editor"
```

---

### Task 2: Add annotation types to shared types

**Files:**
- Modify: `src/shared/types/capture.ts`
- Modify: `src/shared/types/electron.d.ts`

**Step 1: Add `annotations` to `CaptureRecord` in `src/shared/types/capture.ts`**

Add one field to `CaptureRecord` (after `thumbnail_path`):

```typescript
annotations: string | null;  // Fabric.js canvas JSON
```

And add to `CaptureFile` (after `isStarred`):
```typescript
annotations: string | null;
```

**Step 2: Add annotation IPC types to `src/shared/types/electron.d.ts`**

Add to the `ElectronAPI` interface (after `toggleCaptureStar`):

```typescript
saveAnnotations: (captureId: number, annotationsJson: string) => Promise<void>;
exportAnnotatedImage: (captureId: number, dataUrl: string) => Promise<void>;
```

**Step 3: No test needed** (type changes, verified by `npm run typecheck` in final task)

**Step 4: Commit**

```bash
git add src/shared/types/capture.ts src/shared/types/electron.d.ts
git commit -m "feat: add annotation types to shared types"
```

---

### Task 3: Database migration — add annotations column

**Files:**
- Modify: `src/main/services/database.ts`

**Step 1: Find `runMigrations` function**

In `src/main/services/database.ts`, search for `runMigrations`. It will look like:
```typescript
function runMigrations(): void {
  // ... existing migrations
}
```

**Step 2: Add the migration**

Add a new migration block at the end of `runMigrations()`:

```typescript
// Migration: add annotations column
try {
  db!.run('ALTER TABLE captures ADD COLUMN annotations TEXT');
  saveDatabase();
  console.log('[DB] Migration: added annotations column');
} catch {
  // Column already exists — ignore
}
```

**Step 3: Add `saveAnnotations` and update `getCaptures` to return annotations**

Add this function after the existing capture functions:

```typescript
export function saveAnnotations(captureId: number, annotationsJson: string): void {
  const db = getDatabase();
  db.run('UPDATE captures SET annotations = ? WHERE id = ?', [annotationsJson, captureId]);
  saveDatabase();
}
```

**Step 4: Update the captures SELECT query**

Find the SQL query in `getCaptures` (or equivalent) that selects capture columns. It will look like:
```sql
SELECT c.id, c.type, c.filename, c.filepath, ...
```

Add `c.annotations` to the SELECT list.

Then in the mapping from DB row to `CaptureRecord`, add:
```typescript
annotations: row.annotations as string | null,
```

**Step 5: Write a test**

Create `src/main/services/database.test.ts` (if it doesn't exist) or add to existing:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
// NOTE: database.ts requires Electron's app.getPath — unit test the pure logic only
// Integration test via manual verification after running the app
```

Skip automated test for the DB migration — it requires Electron context. Verify manually in Task 8.

**Step 6: Commit**

```bash
git add src/main/services/database.ts
git commit -m "feat: add annotations column migration and saveAnnotations DB function"
```

---

### Task 4: Add IPC channels, handlers, and preload

**Files:**
- Modify: `src/shared/constants/channels.ts`
- Modify: `src/main/ipc/handlers.ts`
- Modify: `src/preload/index.ts`

**Step 1: Add channels to `src/shared/constants/channels.ts`**

After the `CAPTURE_TOGGLE_STAR` line, add:

```typescript
// Annotations
ANNOTATION_SAVE: 'annotation:save',
ANNOTATION_EXPORT: 'annotation:export',
```

**Step 2: Add handlers to `src/main/ipc/handlers.ts`**

Add import at top (with other database imports):
```typescript
import { saveAnnotations } from '../services/database';
```

Add import for fs and path (already imported in file-manager, but handlers.ts needs it):
```typescript
import fs from 'fs';
import path from 'path';
```

Add at the end of `registerIpcHandlers()`:

```typescript
// Annotation handlers
ipcMain.handle(IPC_CHANNELS.ANNOTATION_SAVE, async (_event, captureId: number, annotationsJson: string) => {
  saveAnnotations(captureId, annotationsJson);
});

ipcMain.handle(IPC_CHANNELS.ANNOTATION_EXPORT, async (_event, captureId: number, dataUrl: string) => {
  // Decode base64 data URL and copy to clipboard
  const { clipboard, nativeImage } = await import('electron');
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64, 'base64');
  const image = nativeImage.createFromBuffer(imageBuffer);
  clipboard.writeImage(image);
});
```

**Step 3: Add preload wiring in `src/preload/index.ts`**

After `toggleCaptureStar`, add:

```typescript
saveAnnotations: (captureId, annotationsJson) =>
  ipcRenderer.invoke(IPC_CHANNELS.ANNOTATION_SAVE, captureId, annotationsJson),
exportAnnotatedImage: (captureId, dataUrl) =>
  ipcRenderer.invoke(IPC_CHANNELS.ANNOTATION_EXPORT, captureId, dataUrl),
```

**Step 4: Commit**

```bash
git add src/shared/constants/channels.ts src/main/ipc/handlers.ts src/preload/index.ts
git commit -m "feat: add annotation IPC channels, handlers, and preload bridge"
```

---

### Task 5: Build the AnnotationEditor component

**Files:**
- Create: `src/renderer/components/annotation/AnnotationEditor.tsx`

This is the main UI task. The component:
- Takes a `CaptureFile` as prop
- Loads the image onto a Fabric.js canvas
- Provides toolbar: Select, Arrow, Text, Rectangle, Undo, Redo, Export, Cancel, Save
- On Save: serializes canvas JSON → IPC `saveAnnotations` → calls `onSave`
- On Cancel: calls `onCancel` without saving

**Step 1: Create the file**

```tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import type { CaptureFile } from '../../../shared/types/capture';
import { toFileUrl } from '../../utils/file-url';

type Tool = 'select' | 'arrow' | 'text' | 'rectangle';

interface AnnotationEditorProps {
  item: CaptureFile;
  onSave: (updatedItem: CaptureFile) => void;
  onCancel: () => void;
}

function AnnotationEditor({ item, onSave, onCancel }: AnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [isSaving, setIsSaving] = useState(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  // Track mouse state for drawing
  const isDrawingRef = useRef(false);
  const startPointRef = useRef({ x: 0, y: 0 });
  const activeObjectRef = useRef<fabric.Object | null>(null);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      selection: true,
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    // Load the image as background
    const imageUrl = toFileUrl(item.filepath);
    fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
      const canvasEl = canvasRef.current!;
      const containerWidth = canvasEl.parentElement?.clientWidth ?? 800;
      const containerHeight = canvasEl.parentElement?.clientHeight ?? 600;

      const scaleX = containerWidth / (img.width ?? 1);
      const scaleY = containerHeight / (img.height ?? 1);
      const scale = Math.min(scaleX, scaleY, 1);

      const canvasWidth = (img.width ?? 0) * scale;
      const canvasHeight = (img.height ?? 0) * scale;

      canvas.setWidth(canvasWidth);
      canvas.setHeight(canvasHeight);

      img.set({ left: 0, top: 0, scaleX: scale, scaleY: scale, selectable: false, evented: false });
      canvas.add(img);
      canvas.sendObjectToBack(img);

      // Restore saved annotations if any
      if (item.annotations) {
        try {
          const saved = JSON.parse(item.annotations);
          // Load objects except the background image (index 0)
          canvas.loadFromJSON(saved).then(() => {
            canvas.renderAll();
            pushHistory();
          });
        } catch {
          pushHistory();
        }
      } else {
        pushHistory();
      }
    });

    return () => {
      canvas.dispose();
    };
  }, [item]);

  // History management
  const pushHistory = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    // Truncate forward history
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current])).then(() => {
      canvas.renderAll();
    });
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current])).then(() => {
      canvas.renderAll();
    });
  }, []);

  // Switch tool behavior
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Reset all event listeners
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');

    if (activeTool === 'select') {
      canvas.selection = true;
      canvas.forEachObject((obj) => { obj.selectable = obj !== canvas.item(0); });
      return;
    }

    // Disable selection for drawing tools
    canvas.selection = false;
    canvas.discardActiveObject();
    canvas.renderAll();

    canvas.on('mouse:down', (opt) => {
      isDrawingRef.current = true;
      const pointer = canvas.getPointer(opt.e);
      startPointRef.current = { x: pointer.x, y: pointer.y };

      if (activeTool === 'text') {
        const text = new fabric.IText('Label', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: '#FF3B30',
          fontWeight: 'bold',
          editable: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        canvas.renderAll();
        isDrawingRef.current = false;
        pushHistory();
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (!isDrawingRef.current) return;
      const pointer = canvas.getPointer(opt.e);
      const { x: x1, y: y1 } = startPointRef.current;

      if (activeTool === 'rectangle') {
        if (activeObjectRef.current) {
          canvas.remove(activeObjectRef.current);
        }
        const rect = new fabric.Rect({
          left: Math.min(x1, pointer.x),
          top: Math.min(y1, pointer.y),
          width: Math.abs(pointer.x - x1),
          height: Math.abs(pointer.y - y1),
          fill: 'rgba(255, 235, 59, 0.35)',
          stroke: '#FFC107',
          strokeWidth: 2,
          selectable: false,
        });
        canvas.add(rect);
        activeObjectRef.current = rect;
        canvas.renderAll();
      }

      if (activeTool === 'arrow') {
        if (activeObjectRef.current) {
          canvas.remove(activeObjectRef.current);
        }
        // Arrow = line + triangle arrowhead as a group
        const line = new fabric.Line([x1, y1, pointer.x, pointer.y], {
          stroke: '#FF3B30',
          strokeWidth: 3,
          selectable: false,
        });
        // Calculate angle for arrowhead
        const angle = Math.atan2(pointer.y - y1, pointer.x - x1) * (180 / Math.PI);
        const arrowhead = new fabric.Triangle({
          width: 14,
          height: 14,
          fill: '#FF3B30',
          left: pointer.x,
          top: pointer.y,
          angle: angle + 90,
          originX: 'center',
          originY: 'center',
          selectable: false,
        });
        const group = new fabric.Group([line, arrowhead], { selectable: false });
        canvas.add(group);
        activeObjectRef.current = group;
        canvas.renderAll();
      }
    });

    canvas.on('mouse:up', () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      if (activeObjectRef.current) {
        activeObjectRef.current.set({ selectable: true });
        activeObjectRef.current = null;
        pushHistory();
      }
    });
  }, [activeTool, pushHistory]);

  const handleSave = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setIsSaving(true);
    try {
      const json = JSON.stringify(canvas.toJSON());
      await window.electronAPI.saveAnnotations(item.id, json);
      onSave({ ...item, annotations: json });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 });
    window.electronAPI.exportAnnotatedImage(item.id, dataUrl);
  };

  const toolButton = (tool: Tool, label: string, icon: string) => (
    <button
      onClick={() => setActiveTool(tool)}
      title={label}
      className={`p-2 rounded text-sm font-medium transition-colors ${
        activeTool === tool
          ? 'bg-primary-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
      }`}
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700 mr-2">Annotate</span>
        {toolButton('select', 'Select', '↖')}
        {toolButton('arrow', 'Arrow', '→')}
        {toolButton('text', 'Text', 'T')}
        {toolButton('rectangle', 'Highlight', '▭')}
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <button
          onClick={undo}
          title="Undo"
          className="p-2 rounded text-sm bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
        >
          ↩
        </button>
        <button
          onClick={redo}
          title="Redo"
          className="p-2 rounded text-sm bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
        >
          ↪
        </button>
        <div className="flex-1" />
        <button
          onClick={handleExport}
          title="Copy to clipboard"
          className="px-3 py-1.5 text-sm rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
        >
          Copy
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1.5 text-sm rounded bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default AnnotationEditor;
```

**Step 2: Commit**

```bash
git add src/renderer/components/annotation/AnnotationEditor.tsx
git commit -m "feat: add AnnotationEditor component with Fabric.js (arrow, text, rectangle tools)"
```

---

### Task 6: Add "Annotate" entry point to GalleryItem

**Files:**
- Modify: `src/renderer/components/dashboard/GalleryItem.tsx`

Only screenshots can be annotated (not videos).

**Step 1: Add `onAnnotate` prop to the interface**

```typescript
interface GalleryItemProps {
  item: CaptureFile;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onClick: () => void;
  onDelete: () => void;
  onAnnotate: () => void;  // add this
}
```

**Step 2: Destructure `onAnnotate` in function signature**

```typescript
function GalleryItem({ item, isSelected, onSelect, onClick, onDelete, onAnnotate }: GalleryItemProps) {
```

**Step 3: Add annotate button to the hover overlay**

Find the hover overlay div (around line 196–209):
```tsx
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
```

Replace with:
```tsx
{/* Hover overlay */}
{isHovered && (
  <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3">
    {item.type === 'screenshot' && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAnnotate();
        }}
        className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
        title="Annotate"
      >
        ✏️
      </button>
    )}
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
```

**Step 4: Commit**

```bash
git add src/renderer/components/dashboard/GalleryItem.tsx
git commit -m "feat: add annotate button to GalleryItem hover overlay"
```

---

### Task 7: Add "Annotate" button to DetailModal

**Files:**
- Modify: `src/renderer/components/dashboard/DetailModal.tsx`

**Step 1: Add `onAnnotate` prop**

Add to `DetailModalProps`:
```typescript
onAnnotate: (item: CaptureFile) => void;
```

**Step 2: Destructure in function signature**

```typescript
function DetailModal({ item, onClose, onDelete, onOpenFile, onShowInFolder, onItemUpdate, onAnnotate }: DetailModalProps) {
```

**Step 3: Find the action buttons area and add Annotate button**

Find where "Open File" and "Show in Folder" buttons are rendered. They will look something like:
```tsx
<button onClick={() => onOpenFile(currentItem)} ...>Open File</button>
<button onClick={() => onShowInFolder(currentItem)} ...>Show in Folder</button>
```

Add before the Open File button (only for screenshots):
```tsx
{currentItem.type === 'screenshot' && (
  <button
    onClick={() => {
      onClose();
      onAnnotate(currentItem);
    }}
    className="px-3 py-1.5 text-sm rounded bg-primary-500 text-white hover:bg-primary-600"
  >
    Annotate
  </button>
)}
```

**Step 4: Commit**

```bash
git add src/renderer/components/dashboard/DetailModal.tsx
git commit -m "feat: add Annotate button to DetailModal for screenshots"
```

---

### Task 8: Wire AnnotationEditor into Dashboard

**Files:**
- Modify: `src/renderer/components/dashboard/Dashboard.tsx`
- Modify: `src/renderer/components/dashboard/Gallery.tsx` (pass onAnnotate to GalleryItem)

**Step 1: Add `annotatingItem` state to Dashboard**

```typescript
const [annotatingItem, setAnnotatingItem] = useState<CaptureFile | null>(null);
```

**Step 2: Add handlers**

```typescript
const handleAnnotate = (item: CaptureFile) => {
  setSelectedItem(null);  // close detail modal if open
  setAnnotatingItem(item);
};

const handleAnnotationSave = (updatedItem: CaptureFile) => {
  // Reload captures to pick up the saved annotations
  loadCaptures();
  setAnnotatingItem(null);
};

const handleAnnotationCancel = () => {
  setAnnotatingItem(null);
};
```

**Step 3: Conditionally render AnnotationEditor instead of Gallery**

Import AnnotationEditor at top:
```typescript
import AnnotationEditor from '../annotation/AnnotationEditor';
```

Replace the `<main>` section in the JSX:
```tsx
<main className="flex-1 overflow-auto bg-gray-50">
  {annotatingItem ? (
    <AnnotationEditor
      item={annotatingItem}
      onSave={handleAnnotationSave}
      onCancel={handleAnnotationCancel}
    />
  ) : (
    <Gallery
      items={captures}
      isLoading={isLoading}
      onItemClick={handleItemClick}
      onItemDelete={handleItemDelete}
      onItemAnnotate={handleAnnotate}
    />
  )}
</main>
```

**Step 4: Update DetailModal call to pass onAnnotate**

```tsx
<DetailModal
  item={selectedItem}
  onClose={() => setSelectedItem(null)}
  onDelete={handleItemDelete}
  onOpenFile={handleOpenFile}
  onShowInFolder={handleShowInFolder}
  onItemUpdate={handleItemUpdate}
  onAnnotate={handleAnnotate}
/>
```

**Step 5: Update Gallery.tsx to accept and pass `onItemAnnotate`**

In `src/renderer/components/dashboard/Gallery.tsx`:

Add to the props interface:
```typescript
onItemAnnotate: (item: CaptureFile) => void;
```

Pass it through to each `<GalleryItem>`:
```tsx
<GalleryItem
  ...
  onAnnotate={() => onItemAnnotate(item)}
/>
```

**Step 6: Commit**

```bash
git add src/renderer/components/dashboard/Dashboard.tsx src/renderer/components/dashboard/Gallery.tsx
git commit -m "feat: wire AnnotationEditor into Dashboard with inline panel pattern"
```

---

### Task 9: Typecheck and smoke test

**Step 1: Run TypeScript check**

```bash
npm run typecheck
```

Expected: 0 errors. If errors, fix them (usually missing prop types or import paths).

**Step 2: Run the app**

```bash
npm run dev
```

**Step 3: Manual verification checklist**

- [ ] App starts without errors in console
- [ ] Hover over a screenshot thumbnail — ✏️ pencil button appears
- [ ] Click ✏️ — gallery is replaced by AnnotationEditor with the screenshot loaded
- [ ] Select Arrow tool — drag on canvas creates a red arrow
- [ ] Select Text tool — click places editable "Label" text
- [ ] Select Rectangle tool — drag creates yellow highlight
- [ ] Undo removes last annotation
- [ ] Cancel returns to gallery without saving
- [ ] Save returns to gallery; re-opening AnnotationEditor shows saved annotations
- [ ] Copy button copies flat PNG to clipboard (paste into another app to verify)
- [ ] Open DetailModal for a screenshot — "Annotate" button visible
- [ ] Click Annotate in DetailModal — modal closes, editor opens

**Step 4: Commit if all passing**

```bash
git add -p  # review any fixes made during typecheck
git commit -m "fix: typecheck fixes for annotation editor"
```

---

## What this plan deliberately omits (YAGNI)

- Annotation thumbnail preview in gallery grid (complex, low conversion impact for MVP)
- Color picker per tool (default colors sufficient for v1)
- Video annotation support (doesn't make sense for video thumbnails)
- Annotation export as separate file in DB (clipboard copy is the v1 export)
- Undo/redo persisted across sessions (in-memory only)
