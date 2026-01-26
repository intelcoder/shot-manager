# Phase 3: Screenshot Feature

## Objective
Implement full-screen and area-selection screenshot capture with clipboard support and preview popup.

## Dependencies
- Phase 2 completed (IPC, window management, database)

---

## 3.1 Screenshot Architecture

### Flow Diagram
```
User triggers screenshot (shortcut or tray menu)
    │
    ├─→ Full Screen Mode
    │       ├── Get all displays
    │       ├── (If multi-monitor) Show monitor selector
    │       ├── Capture selected screen
    │       └── Process and save
    │
    └─→ Area Selection Mode
            ├── Create fullscreen overlay
            ├── User drags to select area
            ├── Capture selected region
            └── Process and save

Process and save:
    ├── Generate filename (prefix + timestamp)
    ├── Create date-based folder if needed
    ├── Save PNG to disk
    ├── Copy to clipboard
    ├── Insert record to database
    └── Show preview popup
```

---

## 3.2 Screen Capture Implementation

### Using Electron's desktopCapturer

```typescript
// src/main/capture/screenshot.ts
import { desktopCapturer, screen, clipboard, nativeImage } from 'electron';

interface ScreenshotOptions {
  mode: 'fullscreen' | 'area';
  displayId?: number;      // For multi-monitor
  area?: {                 // For area selection
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ScreenshotResult {
  filepath: string;
  filename: string;
  width: number;
  height: number;
  size: number;
}

export async function captureScreenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
  // 1. Get the target display
  const display = options.displayId
    ? screen.getAllDisplays().find(d => d.id === options.displayId)
    : screen.getPrimaryDisplay();

  // 2. Capture the screen
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: display.size.width * display.scaleFactor,
      height: display.size.height * display.scaleFactor
    }
  });

  // 3. Find matching source for display
  const source = sources.find(s => /* match display */);

  // 4. Get image data
  let image = source.thumbnail;

  // 5. Crop if area selection
  if (options.mode === 'area' && options.area) {
    image = image.crop(options.area);
  }

  // 6. Save and return
  return await saveScreenshot(image);
}
```

### Platform-Specific Considerations

#### macOS
- Requires Screen Recording permission
- Check with `systemPreferences.getMediaAccessStatus('screen')`
- Request with `systemPreferences.askForMediaAccess('screen')`
- Handle permission denial gracefully

#### Windows
- No special permissions needed
- May need to handle DPI scaling
- Consider using `screen.getPrimaryDisplay().scaleFactor`

---

## 3.3 Area Selection Overlay

### Overlay Window Setup
```typescript
// src/main/windows/capture-window.ts
export function createCaptureOverlay(): BrowserWindow {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();

  // Create overlay covering all displays
  const bounds = calculateTotalBounds(displays);

  return new BrowserWindow({
    ...bounds,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    hasShadow: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true
    }
  });
}
```

### Selection UI Component (React)

```typescript
// src/renderer/components/capture/AreaSelector.tsx
interface AreaSelectorProps {
  onSelect: (area: SelectionArea) => void;
  onCancel: () => void;
}

// Features:
// - Dark semi-transparent overlay
// - Crosshair cursor
// - Click and drag to select
// - Selection box with resize handles
// - Display dimensions while selecting
// - ESC to cancel
// - Enter or click "Capture" to confirm
```

### Selection State
```typescript
interface SelectionState {
  isSelecting: boolean;
  startPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
  selectedArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}
```

### Visual Design
```
┌─────────────────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░┌─────────────────────────┐░░░░░░░░░░░░░░░░│
│░░░░░░│                         │░░░░ 800 x 600 ░│  ← Dimensions
│░░░░░░│    Clear/Visible Area   │░░░░░░░░░░░░░░░░│
│░░░░░░│                         │░░░░░░░░░░░░░░░░│
│░░░░░░│                         │░░░░░░░░░░░░░░░░│
│░░░░░░└─────────────────────────┘░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│    [ESC] Cancel                    [Enter] Capture│
└─────────────────────────────────────────────────┘
░ = Dark overlay (semi-transparent)
```

---

## 3.4 Multi-Monitor Support

### Monitor Selection UI
```typescript
// When user triggers fullscreen capture with multiple monitors
interface MonitorSelectorProps {
  displays: Display[];
  onSelect: (displayId: number) => void;
  onCancel: () => void;
}

// Show visual representation of monitor layout
// User clicks on monitor to select
// Keyboard: 1, 2, 3... to select by number
```

### Display Detection
```typescript
import { screen } from 'electron';

function getDisplayInfo() {
  const displays = screen.getAllDisplays();
  return displays.map((display, index) => ({
    id: display.id,
    label: `Display ${index + 1}`,
    bounds: display.bounds,
    isPrimary: display.id === screen.getPrimaryDisplay().id,
    scaleFactor: display.scaleFactor
  }));
}
```

---

## 3.5 Clipboard Integration

```typescript
import { clipboard, nativeImage } from 'electron';

async function copyToClipboard(imagePath: string): Promise<void> {
  const image = nativeImage.createFromPath(imagePath);
  clipboard.writeImage(image);
}

// Alternative: Copy from buffer directly after capture
function copyImageToClipboard(image: NativeImage): void {
  clipboard.writeImage(image);
}
```

---

## 3.6 Preview Popup

### Popup Behavior
1. Appears in bottom-right corner after capture
2. Shows thumbnail of captured image
3. Auto-dismisses after 5 seconds
4. Click to open in default viewer
5. "Copy" button to copy again
6. "Delete" button to remove
7. Hover pauses auto-dismiss

### Component Structure
```typescript
// src/renderer/components/preview/PreviewPopup.tsx
interface PreviewPopupProps {
  capture: {
    filepath: string;
    filename: string;
    type: 'screenshot' | 'video';
    thumbnail?: string;  // Base64 for quick display
  };
  onDismiss: () => void;
  onOpen: () => void;
  onDelete: () => void;
}
```

### Visual Design
```
┌──────────────────────────────┐
│  ┌─────────┐                 │
│  │         │  Screenshot     │
│  │ Preview │  captured!      │
│  │  Image  │                 │
│  │         │  filename.png   │
│  └─────────┘                 │
│                              │
│  [Open]  [Copy]  [Delete]  ✕ │
└──────────────────────────────┘
```

---

## 3.7 File Operations

### Generate Filename
```typescript
// src/main/services/file-manager.ts
import { format } from 'date-fns';

interface NamingConfig {
  prefix: string;        // User-configured prefix
  timestamp: Date;
  type: 'screenshot' | 'video';
}

function generateFilename(config: NamingConfig): string {
  const timestamp = format(config.timestamp, 'yyyy-MM-dd_HH-mm-ss');
  const ext = config.type === 'screenshot' ? 'png' : 'mp4';
  return `${config.prefix}_${timestamp}.${ext}`;
}

// Example: "MyPrefix_2026-01-25_14-30-45.png"
```

### Create Date Folder
```typescript
function getDateFolder(basePath: string, date: Date): string {
  const year = format(date, 'yyyy');
  const month = format(date, 'MM');
  const day = format(date, 'dd');

  const folderPath = path.join(basePath, year, month, day);

  // Create if not exists
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  return folderPath;
}

// Example: /Users/name/Screenshots/2026/01/25/
```

---

## 3.8 Database Record

```typescript
interface CaptureRecord {
  type: 'screenshot';
  filename: string;
  filepath: string;
  width: number;
  height: number;
  size: number;
  created_at: Date;
}

async function insertCapture(record: CaptureRecord): Promise<number> {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO captures (type, filename, filepath, width, height, size)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    record.type,
    record.filename,
    record.filepath,
    record.width,
    record.height,
    record.size
  );

  return result.lastInsertRowid;
}
```

---

## 3.9 Deliverables

After Phase 3 completion:
- [ ] Full-screen screenshot works
- [ ] Area selection with crosshair drag works
- [ ] Multi-monitor selection works
- [ ] Image copied to clipboard
- [ ] Image saved to configured location
- [ ] Date-based folder created automatically
- [ ] Custom prefix applied to filename
- [ ] Preview popup shows after capture
- [ ] Database record created
- [ ] macOS permissions handled

---

## 3.10 Verification

```bash
# Test scenarios:
# 1. Take fullscreen screenshot → saved + copied
# 2. Take area screenshot → selection works, saved + copied
# 3. Cancel area selection with ESC
# 4. Multi-monitor: select specific monitor
# 5. Check file saved in correct date folder
# 6. Check filename has correct prefix
# 7. Click preview popup opens file
# 8. Delete from preview popup removes file
# 9. Verify database has record
# 10. macOS: test permission flow
```
