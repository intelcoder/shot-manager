# Preview Fix & Instant Area Capture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two bugs: (1) Preview popup not displaying the captured image correctly (shows transparent area instead), and (2) Area screenshot should capture instantly on mouse-up instead of requiring a confirm button click.

**Architecture:** Bug 1 is a CSS height chain issue — the preview window's `transparent: true` + missing `height: 100%` on `html/body/#root` causes the `h-full` container to collapse, so the image area gets zero height. Additionally, on Windows, `file://` paths with backslashes produce invalid URLs. Bug 2 is a UX flow change — for screenshots only, auto-capture when the mouse is released after drawing a selection area (video recording still needs the confirm button since it's a more intentional action).

**Tech Stack:** React, TailwindCSS, Electron BrowserWindow, CSS

---

## Bug 1: Preview Popup Not Showing Image

### Root Cause Analysis

The preview window (`preview-window.ts`) creates a `BrowserWindow` with `transparent: true`. The `PreviewPopup` component uses `w-full h-full` on its container, and the image area uses `flex-1` to fill available space. However:

1. **Missing height chain:** `html`, `body`, and `#root` don't have `height: 100%` set. Without this, `h-full` (which is `height: 100%`) on the component container has no reference height and collapses to content height only.
2. **Windows file paths:** `path.join()` produces backslash paths on Windows (e.g., `C:\Users\foo\image.png`). Using `file://${filepath}` produces `file://C:\Users\...` which is invalid. The correct format is `file:///C:/Users/...`.

The dashboard works fine because its layout flows naturally with content and doesn't rely on percentage-based heights. The preview popup specifically needs the full height chain because it uses a flex column layout with `flex-1` to allocate image space.

### Task 1: Fix CSS Height Chain for Preview Window

**Files:**
- Modify: `src/renderer/styles/global.css`

**Step 1: Add height chain CSS**

Add the following CSS rules to `global.css` to ensure `html`, `body`, and `#root` all have full height:

```css
html, body, #root {
  height: 100%;
}
```

This goes at the top of the file, right after the `@tailwind` directives and before the `*` box-sizing rule. This ensures the full height chain is established so that `h-full` on child components resolves correctly.

**Step 2: Verify no layout regressions**

Run: `npm run dev`
Check: Dashboard window still renders correctly (it uses natural content flow, so `height: 100%` on parents should not affect it). Preview window now shows the image filling the preview area.

**Step 3: Commit**

```bash
git add src/renderer/styles/global.css
git commit -m "fix: add height chain CSS so preview popup image renders correctly"
```

### Task 2: Fix Windows File Path URLs

**Files:**
- Modify: `src/renderer/components/preview/PreviewPopup.tsx`

**Step 1: Create a helper to normalize file paths to valid file:// URLs**

At the top of `PreviewPopup.tsx` (after the imports), add:

```typescript
function toFileUrl(filepath: string): string {
  // On Windows, path.join produces backslashes. Convert to forward slashes for file:// URLs.
  const normalized = filepath.replace(/\\/g, '/');
  // Ensure triple-slash for absolute paths: file:///C:/Users/...
  return `file:///${normalized.replace(/^\/+/, '')}`;
}
```

**Step 2: Update image and video src attributes**

Replace the two `file://${data.filepath}` usages:

Line ~118 (video):
```tsx
src={toFileUrl(data.filepath)}
```

Line ~126 (img):
```tsx
src={toFileUrl(data.filepath)}
```

**Step 3: Run dev and test**

Run: `npm run dev`
Check: Take a screenshot, verify the preview popup shows the image. The file URL should now be correctly formatted as `file:///C:/Users/...`.

**Step 4: Commit**

```bash
git add src/renderer/components/preview/PreviewPopup.tsx
git commit -m "fix: normalize Windows file paths to valid file:// URLs in preview"
```

### Task 3: Fix File URLs in Dashboard Components (Consistency)

**Files:**
- Modify: `src/renderer/components/dashboard/DetailModal.tsx`
- Modify: `src/renderer/components/dashboard/GalleryItem.tsx`

**Step 1: Add the same `toFileUrl` helper as a shared utility**

Since multiple components need this, extract it. Create a minimal utility:

Modify: `src/renderer/components/preview/PreviewPopup.tsx` — move the `toFileUrl` function to a shared location.

Create: `src/renderer/utils/file-url.ts`

```typescript
/**
 * Convert a local file path to a valid file:// URL.
 * Handles Windows backslash paths.
 */
export function toFileUrl(filepath: string): string {
  const normalized = filepath.replace(/\\/g, '/');
  return `file:///${normalized.replace(/^\/+/, '')}`;
}
```

**Step 2: Update PreviewPopup.tsx to import from shared utility**

Remove the local `toFileUrl` function and replace with:
```typescript
import { toFileUrl } from '../../utils/file-url';
```

**Step 3: Update DetailModal.tsx**

Add import:
```typescript
import { toFileUrl } from '../../utils/file-url';
```

Replace `file://${currentItem.filepath}` with `toFileUrl(currentItem.filepath)` in both places (line ~172 for video, line ~178 for img).

**Step 4: Update GalleryItem.tsx**

Add import:
```typescript
import { toFileUrl } from '../../utils/file-url';
```

Replace `file://${item.thumbnail_path}` and `file://${item.filepath}` with `toFileUrl(item.thumbnail_path)` and `toFileUrl(item.filepath)`.

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors.

**Step 6: Commit**

```bash
git add src/renderer/utils/file-url.ts src/renderer/components/preview/PreviewPopup.tsx src/renderer/components/dashboard/DetailModal.tsx src/renderer/components/dashboard/GalleryItem.tsx
git commit -m "refactor: extract toFileUrl utility and fix file URLs across all components"
```

---

## Bug 2: Instant Area Screenshot (No Confirm Button)

### Current Flow
1. User drags to select area
2. Mouse up → selection box shown with dimensions
3. User clicks "Capture" button or presses Enter
4. Screenshot is taken

### Desired Flow (Screenshots Only)
1. User drags to select area
2. Mouse up → screenshot is taken immediately (if area is >= 10x10)

Video recording keeps the confirm button since starting a recording is a more deliberate action.

### Task 4: Auto-Capture on Mouse Up for Screenshots

**Files:**
- Modify: `src/renderer/components/capture/CaptureOverlay.tsx`

**Step 1: Modify `handleMouseUp` to auto-capture for screenshots**

Change the `handleMouseUp` function to trigger capture immediately when:
- `mode === 'screenshot'`
- The selection area is valid (>= 10x10 pixels)

```typescript
const handleMouseUp = () => {
  if (!selection.isSelecting) return;

  setSelection((prev) => ({
    ...prev,
    isSelecting: false,
  }));

  // For screenshots, capture immediately on mouse up
  if (mode === 'screenshot') {
    // Calculate area inline since state update is async
    const startPoint = selection.startPoint;
    const endPoint = selection.endPoint;
    if (!startPoint || !endPoint) return;

    const x = Math.min(startPoint.x, endPoint.x);
    const y = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);

    if (width < 10 || height < 10) return;

    // Trigger capture
    setIsCapturing(true);
    window.electronAPI.takeScreenshot({
      mode: 'area',
      area: { x, y, width, height },
    }).then(() => {
      onComplete();
    }).catch((error: unknown) => {
      console.error('Capture failed:', error);
      setIsCapturing(false);
    });
  }
};
```

**Step 2: Hide confirm button for screenshots**

Update the controls section to only show the "Capture" and "Cancel" buttons for video mode. The area after mouse up for screenshots will no longer be visible since capture happens instantly, but guard it anyway:

Change the controls render condition from:
```tsx
{area && !selection.isSelecting && (
```
to:
```tsx
{area && !selection.isSelecting && mode === 'video' && (
```

Similarly, update the dimensions display to also only show for video:
```tsx
{area && !selection.isSelecting && mode === 'video' && (
```

And update the instructions text at the bottom:
```tsx
{selection.isSelecting ? (
  'Release to capture'
) : mode === 'video' && area ? (
  'Press Enter to start recording \u2022 Escape to cancel'
) : (
  mode === 'screenshot'
    ? 'Click and drag to capture area \u2022 Escape to cancel'
    : 'Click and drag to select area \u2022 Escape to cancel'
)}
```

**Step 3: Update Enter key handler for video only**

In the `useEffect` keydown handler, Enter should only trigger `handleCapture` for video mode:

```typescript
} else if (e.key === 'Enter' && mode === 'video') {
  handleCapture();
}
```

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors.

**Step 5: Run dev and test**

Run: `npm run dev`
Test:
- Trigger area screenshot shortcut
- Drag to select an area (>= 10x10)
- On mouse release, screenshot should be taken immediately
- Trigger area video recording shortcut
- Drag to select an area
- Confirm button and dimensions should still appear
- Click "Start Recording" to begin recording

**Step 6: Commit**

```bash
git add src/renderer/components/capture/CaptureOverlay.tsx
git commit -m "feat: instant area screenshot capture on mouse release"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/renderer/styles/global.css` | Add `html, body, #root { height: 100% }` for height chain |
| `src/renderer/utils/file-url.ts` | New utility: `toFileUrl()` for Windows file path normalization |
| `src/renderer/components/preview/PreviewPopup.tsx` | Use `toFileUrl()` for image/video src |
| `src/renderer/components/dashboard/DetailModal.tsx` | Use `toFileUrl()` for image/video src |
| `src/renderer/components/dashboard/GalleryItem.tsx` | Use `toFileUrl()` for thumbnail/image src |
| `src/renderer/components/capture/CaptureOverlay.tsx` | Auto-capture on mouse up for screenshots, keep confirm for video |
