# Phase 2: Core Architecture

## Objective
Establish the Electron main/renderer process communication, system tray, and window management foundation.

## Dependencies
- Phase 1 completed

---

## 2.1 Main Process Entry Point

### src/main/index.ts
```typescript
// Main responsibilities:
// - App lifecycle management
// - Window creation
// - System tray setup
// - Global shortcut registration
// - IPC handler registration

import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './windows/main-window';
import { createTray } from './tray';
import { registerIpcHandlers } from './ipc/handlers';
import { registerGlobalShortcuts } from './services/shortcuts';
import { initDatabase } from './services/database';
```

### Lifecycle Flow
```
app.ready
    ├── Initialize database
    ├── Create system tray
    ├── Register IPC handlers
    ├── Register global shortcuts
    └── (Optional) Create main window
        └── Window hidden by default, shown from tray

app.window-all-closed
    └── Keep app running (tray mode)

app.before-quit
    ├── Cleanup shortcuts
    └── Close database
```

---

## 2.2 System Tray

### src/main/tray.ts

#### Tray Menu Structure
```
Shot Manager (Icon)
├── Take Screenshot        → Submenu
│   ├── Full Screen       (Shortcut displayed)
│   └── Select Area       (Shortcut displayed)
├── Record Video          → Submenu
│   ├── Full Screen       (Shortcut displayed)
│   └── Select Area       (Shortcut displayed)
├── ─────────────────
├── Open Dashboard
├── Settings
├── ─────────────────
└── Quit
```

#### Implementation Notes
- Use `nativeImage` for tray icon
- Different icons for macOS (template) vs Windows
- Update icon during recording (red dot indicator)
- Show recording duration in tooltip during recording

---

## 2.3 Window Management

### Dashboard Window (src/main/windows/main-window.ts)
```typescript
// Configuration
{
  width: 1200,
  height: 800,
  minWidth: 800,
  minHeight: 600,
  show: false,           // Hidden by default
  frame: true,           // Standard window frame
  titleBarStyle: 'hiddenInset', // macOS: hidden title bar
  webPreferences: {
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false
  }
}
```

### Capture Overlay Window (src/main/windows/capture-window.ts)
```typescript
// Full-screen transparent overlay for area selection
{
  fullscreen: true,
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  webPreferences: {
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false
  }
}
```

### Preview Popup Window
```typescript
// Corner notification popup
{
  width: 320,
  height: 200,
  x: screenWidth - 340,  // Bottom-right corner
  y: screenHeight - 220,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  transparent: true
}
```

---

## 2.4 IPC Communication

### Channel Naming Convention
```typescript
// src/shared/constants/channels.ts
export const IPC_CHANNELS = {
  // Capture
  CAPTURE_SCREENSHOT: 'capture:screenshot',
  CAPTURE_VIDEO_START: 'capture:video:start',
  CAPTURE_VIDEO_STOP: 'capture:video:stop',

  // Files
  FILE_GET_ALL: 'file:get-all',
  FILE_DELETE: 'file:delete',
  FILE_OPEN: 'file:open',
  FILE_OPEN_FOLDER: 'file:open-folder',

  // Tags
  TAG_ADD: 'tag:add',
  TAG_REMOVE: 'tag:remove',
  TAG_GET_ALL: 'tag:get-all',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_SAVE_PATH: 'settings:get-save-path',
  SETTINGS_SET_SAVE_PATH: 'settings:set-save-path',

  // Shortcuts
  SHORTCUT_REGISTER: 'shortcut:register',
  SHORTCUT_UNREGISTER: 'shortcut:unregister',

  // Window
  WINDOW_SHOW_DASHBOARD: 'window:show-dashboard',
  WINDOW_HIDE: 'window:hide',
  WINDOW_SHOW_PREVIEW: 'window:show-preview',

  // Events (main → renderer)
  ON_CAPTURE_COMPLETE: 'on:capture-complete',
  ON_RECORDING_STATUS: 'on:recording-status',
  ON_SHORTCUT_TRIGGERED: 'on:shortcut-triggered'
} as const;
```

### IPC Handler Pattern
```typescript
// src/main/ipc/handlers.ts
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/channels';

export function registerIpcHandlers() {
  // Use handle for async request/response
  ipcMain.handle(IPC_CHANNELS.FILE_GET_ALL, async (event, options) => {
    // Return data to renderer
  });

  // Use on for one-way messages
  ipcMain.on(IPC_CHANNELS.WINDOW_HIDE, (event) => {
    // Perform action, no response needed
  });
}
```

---

## 2.5 Preload Script

### src/preload/index.ts
```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/channels';

// Expose safe API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Capture
  takeScreenshot: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_SCREENSHOT, options),
  startRecording: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_VIDEO_START, options),
  stopRecording: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_VIDEO_STOP),

  // Files
  getAllFiles: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_GET_ALL, options),
  deleteFile: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_DELETE, id),
  openFile: (path) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN, path),

  // Settings
  getSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  setSettings: (settings) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),
  selectSavePath: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_SAVE_PATH),

  // Event listeners
  onCaptureComplete: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.ON_CAPTURE_COMPLETE, callback);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_CAPTURE_COMPLETE, callback);
  },
  onRecordingStatus: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.ON_RECORDING_STATUS, callback);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_RECORDING_STATUS, callback);
  }
});
```

### Type Declaration
```typescript
// src/shared/types/electron.d.ts
export interface ElectronAPI {
  takeScreenshot: (options: ScreenshotOptions) => Promise<CaptureResult>;
  startRecording: (options: RecordingOptions) => Promise<void>;
  stopRecording: () => Promise<CaptureResult>;
  getAllFiles: (options?: FileQueryOptions) => Promise<CaptureFile[]>;
  // ... etc
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

---

## 2.6 Database Schema

### SQLite Tables (better-sqlite3)

```sql
-- Captures table
CREATE TABLE captures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('screenshot', 'video')),
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  duration INTEGER,  -- For videos, in seconds
  size INTEGER,      -- File size in bytes
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

-- Capture-Tag relationship
CREATE TABLE capture_tags (
  capture_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (capture_id, tag_id),
  FOREIGN KEY (capture_id) REFERENCES captures(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_captures_created_at ON captures(created_at);
CREATE INDEX idx_captures_type ON captures(type);
```

---

## 2.7 Deliverables

After Phase 2 completion:
- [ ] System tray appears with menu
- [ ] Dashboard window opens from tray
- [ ] IPC communication works between main/renderer
- [ ] Database initializes on startup
- [ ] Preload script exposes API to renderer
- [ ] Window management (show/hide) works

---

## 2.8 Verification

```bash
# Test checklist:
# 1. App starts minimized to tray
# 2. Tray icon visible in system tray
# 3. Right-click tray shows menu
# 4. "Open Dashboard" opens window
# 5. Closing window hides (not quits)
# 6. "Quit" actually exits app
# 7. Database file created in app data folder
```
