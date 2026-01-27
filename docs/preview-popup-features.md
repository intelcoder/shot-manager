# Preview Popup Features

## Implemented

### 1. Auto-Close Timer Fix
- **File:** `src/main/windows/preview-window.ts`
- Timer now properly tracks elapsed time
- Hovering pauses the timer and calculates remaining duration
- Moving away resumes with actual remaining time (not full 5 seconds)
- Variables reset when window closes

### 2. Click Image to Open
- **File:** `src/renderer/components/preview/PreviewPopup.tsx`
- Removed "Open" button from button row
- Image and video elements are now clickable
- Added `cursor-pointer` class for visual feedback
- Clicking opens the file and dismisses popup

### 3. Swipe Right to Dismiss
- **File:** `src/renderer/components/preview/PreviewPopup.tsx`
- Touch event handlers for swipe gesture
- Visual feedback during swipe (translateX transform)
- Opacity fades as user swipes right
- Dismisses when swipe exceeds 100px threshold

---

## Missing / Potential Improvements

### 1. Mouse Drag Support (Desktop)
- Current swipe uses `onTouchStart/Move/End` (touch devices only)
- Desktop users cannot drag with mouse to dismiss
- Would need `onMouseDown/Move/Up` handlers

### 2. Swipe Animation on Dismiss
- Currently calls `onDismiss()` immediately when threshold exceeded
- No smooth slide-out animation before closing
- Could add CSS transition to animate off-screen before unmounting

### 3. Visual Hint for Clickable Media
- Only cursor change indicates clickability
- Could add hover overlay with "Click to open" text
- Could add subtle scale effect on hover

### 4. Keyboard Accessibility
- No keyboard shortcuts to dismiss (Escape key)
- No keyboard way to open the file (Enter key)

### 5. Progress Indicator
- No visual indicator showing time remaining before auto-close
- Could add a progress bar that depletes over 5 seconds

### 6. Swipe Left for Delete
- Only swipe right (dismiss) is implemented
- Could add swipe left to delete the capture

### 7. Touch Feedback on Buttons
- Buttons lack touch-specific feedback
- Could add `:active` states for better mobile UX
