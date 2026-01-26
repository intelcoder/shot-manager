# Phase 5: File Management

## Objective
Implement configurable save locations, file organization with date-based folders, and custom naming conventions.

## Dependencies
- Phase 4 completed (capture features working)

---

## 5.1 Save Location Configuration

### Settings Storage

```typescript
// Using electron-store for persistent settings
import Store from 'electron-store';

interface AppSettings {
  savePath: string;              // Base path for all captures
  filePrefix: string;            // Custom prefix for filenames
  screenshotFormat: 'png' | 'jpg' | 'webp';
  videoFormat: 'webm' | 'mp4';
  organizationStyle: 'date' | 'flat';  // Date folders or flat
}

const store = new Store<AppSettings>({
  defaults: {
    savePath: getDefaultSavePath(),  // Platform-specific default
    filePrefix: 'Screenshot',
    screenshotFormat: 'png',
    videoFormat: 'webm',
    organizationStyle: 'date'
  }
});
```

### Default Save Paths

```typescript
import { app } from 'electron';
import path from 'path';
import os from 'os';

function getDefaultSavePath(): string {
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS: ~/Pictures/Shot Manager/
    return path.join(os.homedir(), 'Pictures', 'Shot Manager');
  } else if (platform === 'win32') {
    // Windows: C:\Users\{user}\Pictures\Shot Manager\
    return path.join(os.homedir(), 'Pictures', 'Shot Manager');
  } else {
    // Linux: ~/Pictures/Shot Manager/
    return path.join(os.homedir(), 'Pictures', 'Shot Manager');
  }
}
```

### Path Selection Dialog

```typescript
// src/main/services/file-manager.ts
import { dialog } from 'electron';

async function selectSavePath(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Select Save Location',
    defaultPath: store.get('savePath'),
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const selectedPath = result.filePaths[0];

  // Validate path is writable
  if (await isPathWritable(selectedPath)) {
    store.set('savePath', selectedPath);
    return selectedPath;
  }

  throw new Error('Selected path is not writable');
}
```

---

## 5.2 Date-Based Folder Structure

### Folder Structure
```
Shot Manager/
├── 2026/
│   ├── 01/
│   │   ├── 24/
│   │   │   ├── Screenshot_2026-01-24_09-15-30.png
│   │   │   └── Screenshot_2026-01-24_14-22-45.png
│   │   └── 25/
│   │       ├── Screenshot_2026-01-25_10-00-00.png
│   │       └── Recording_2026-01-25_11-30-00.webm
│   └── 02/
│       └── ...
└── 2025/
    └── ...
```

### Implementation

```typescript
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';

interface FolderOptions {
  basePath: string;
  date: Date;
  style: 'date' | 'flat';
}

function ensureSaveFolder(options: FolderOptions): string {
  let targetPath: string;

  if (options.style === 'date') {
    const year = format(options.date, 'yyyy');
    const month = format(options.date, 'MM');
    const day = format(options.date, 'dd');
    targetPath = path.join(options.basePath, year, month, day);
  } else {
    targetPath = options.basePath;
  }

  // Create folder if it doesn't exist
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }

  return targetPath;
}
```

---

## 5.3 File Naming Convention

### Filename Generator

```typescript
import { format } from 'date-fns';

interface FilenameOptions {
  prefix: string;
  timestamp: Date;
  type: 'screenshot' | 'video';
  format: 'png' | 'jpg' | 'webp' | 'webm' | 'mp4';
  counter?: number;  // For duplicates
}

function generateFilename(options: FilenameOptions): string {
  const timestamp = format(options.timestamp, 'yyyy-MM-dd_HH-mm-ss');
  const extension = options.format;

  let filename = `${options.prefix}_${timestamp}.${extension}`;

  // Handle duplicates
  if (options.counter && options.counter > 0) {
    filename = `${options.prefix}_${timestamp}_${options.counter}.${extension}`;
  }

  return filename;
}

// Examples:
// MyPrefix_2026-01-25_14-30-45.png
// MyPrefix_2026-01-25_14-30-45_1.png (duplicate)
```

### Duplicate Handling

```typescript
function getUniqueFilename(folder: string, baseFilename: string): string {
  let filename = baseFilename;
  let counter = 0;

  while (fs.existsSync(path.join(folder, filename))) {
    counter++;
    const ext = path.extname(baseFilename);
    const name = path.basename(baseFilename, ext);
    filename = `${name}_${counter}${ext}`;
  }

  return filename;
}
```

---

## 5.4 File Operations Service

### Complete File Manager

```typescript
// src/main/services/file-manager.ts
import { shell, nativeImage, clipboard } from 'electron';
import fs from 'fs';
import path from 'path';

class FileManager {
  /**
   * Save a screenshot to disk
   */
  async saveScreenshot(image: NativeImage, options: SaveOptions): Promise<SaveResult> {
    const folder = ensureSaveFolder({
      basePath: store.get('savePath'),
      date: new Date(),
      style: store.get('organizationStyle')
    });

    const baseFilename = generateFilename({
      prefix: store.get('filePrefix'),
      timestamp: new Date(),
      type: 'screenshot',
      format: store.get('screenshotFormat')
    });

    const filename = getUniqueFilename(folder, baseFilename);
    const filepath = path.join(folder, filename);

    // Convert and save based on format
    const format = store.get('screenshotFormat');
    let buffer: Buffer;

    switch (format) {
      case 'png':
        buffer = image.toPNG();
        break;
      case 'jpg':
        buffer = image.toJPEG(90);  // 90% quality
        break;
      case 'webp':
        buffer = image.toBitmap();  // Would need conversion
        break;
      default:
        buffer = image.toPNG();
    }

    await fs.promises.writeFile(filepath, buffer);

    // Get file stats
    const stats = await fs.promises.stat(filepath);
    const size = image.getSize();

    return {
      filepath,
      filename,
      width: size.width,
      height: size.height,
      size: stats.size
    };
  }

  /**
   * Save a video recording to disk
   */
  async saveVideo(buffer: Buffer, duration: number): Promise<SaveResult> {
    const folder = ensureSaveFolder({
      basePath: store.get('savePath'),
      date: new Date(),
      style: store.get('organizationStyle')
    });

    const baseFilename = generateFilename({
      prefix: store.get('filePrefix'),
      timestamp: new Date(),
      type: 'video',
      format: store.get('videoFormat')
    });

    const filename = getUniqueFilename(folder, baseFilename);
    const filepath = path.join(folder, filename);

    await fs.promises.writeFile(filepath, buffer);

    const stats = await fs.promises.stat(filepath);

    return {
      filepath,
      filename,
      duration,
      size: stats.size
    };
  }

  /**
   * Copy image to clipboard
   */
  copyToClipboard(imagePath: string): void {
    const image = nativeImage.createFromPath(imagePath);
    clipboard.writeImage(image);
  }

  /**
   * Open file in default application
   */
  async openFile(filepath: string): Promise<void> {
    await shell.openPath(filepath);
  }

  /**
   * Open containing folder
   */
  showInFolder(filepath: string): void {
    shell.showItemInFolder(filepath);
  }

  /**
   * Delete file from disk and database
   */
  async deleteFile(filepath: string, captureId: number): Promise<void> {
    // Delete from disk
    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath);
    }

    // Delete from database
    await database.deleteCapture(captureId);
  }

  /**
   * Get all files from database with optional filters
   */
  async getAllFiles(options?: QueryOptions): Promise<CaptureFile[]> {
    return database.getCaptures(options);
  }

  /**
   * Validate save path is writable
   */
  async validateSavePath(testPath: string): Promise<boolean> {
    try {
      const testFile = path.join(testPath, '.shot-manager-test');
      await fs.promises.writeFile(testFile, '');
      await fs.promises.unlink(testFile);
      return true;
    } catch {
      return false;
    }
  }
}

export const fileManager = new FileManager();
```

---

## 5.5 IPC Handlers for File Operations

```typescript
// src/main/ipc/file-handlers.ts
import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/channels';
import { fileManager } from '../services/file-manager';

export function registerFileHandlers() {
  // Get all captures
  ipcMain.handle(IPC_CHANNELS.FILE_GET_ALL, async (event, options) => {
    return fileManager.getAllFiles(options);
  });

  // Delete capture
  ipcMain.handle(IPC_CHANNELS.FILE_DELETE, async (event, { id, filepath }) => {
    return fileManager.deleteFile(filepath, id);
  });

  // Open file
  ipcMain.handle(IPC_CHANNELS.FILE_OPEN, async (event, filepath) => {
    return fileManager.openFile(filepath);
  });

  // Open in folder
  ipcMain.handle(IPC_CHANNELS.FILE_OPEN_FOLDER, async (event, filepath) => {
    return fileManager.showInFolder(filepath);
  });

  // Select save path
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_SAVE_PATH, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Save Location',
      properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const newPath = result.filePaths[0];

      if (await fileManager.validateSavePath(newPath)) {
        store.set('savePath', newPath);
        return { success: true, path: newPath };
      }

      return { success: false, error: 'Path is not writable' };
    }

    return { success: false, error: 'Cancelled' };
  });
}
```

---

## 5.6 Settings UI Component

```typescript
// src/renderer/components/settings/FileSettings.tsx
interface FileSettingsProps {
  settings: {
    savePath: string;
    filePrefix: string;
    organizationStyle: 'date' | 'flat';
  };
  onUpdate: (settings: Partial<FileSettings>) => void;
}

function FileSettings({ settings, onUpdate }: FileSettingsProps) {
  const handleBrowse = async () => {
    const result = await window.electronAPI.selectSavePath();
    if (result.success) {
      onUpdate({ savePath: result.path });
    }
  };

  return (
    <div className="file-settings">
      {/* Save Location */}
      <div className="setting-row">
        <label>Save Location</label>
        <div className="path-input">
          <input type="text" value={settings.savePath} readOnly />
          <button onClick={handleBrowse}>Browse...</button>
        </div>
      </div>

      {/* File Prefix */}
      <div className="setting-row">
        <label>File Name Prefix</label>
        <input
          type="text"
          value={settings.filePrefix}
          onChange={(e) => onUpdate({ filePrefix: e.target.value })}
          placeholder="Screenshot"
        />
        <span className="preview">
          Preview: {settings.filePrefix}_2026-01-25_14-30-45.png
        </span>
      </div>

      {/* Organization Style */}
      <div className="setting-row">
        <label>Folder Organization</label>
        <select
          value={settings.organizationStyle}
          onChange={(e) => onUpdate({ organizationStyle: e.target.value })}
        >
          <option value="date">Date-based (Year/Month/Day)</option>
          <option value="flat">Flat (All in one folder)</option>
        </select>
      </div>
    </div>
  );
}
```

### Visual Design
```
┌─────────────────────────────────────────────────┐
│  File Settings                                  │
│                                                 │
│  Save Location                                  │
│  ┌─────────────────────────────────┐ [Browse]   │
│  │ C:\Users\Name\Pictures\Shots    │            │
│  └─────────────────────────────────┘            │
│                                                 │
│  File Name Prefix                               │
│  ┌─────────────────────────────────┐            │
│  │ MyScreenshot                    │            │
│  └─────────────────────────────────┘            │
│  Preview: MyScreenshot_2026-01-25_14-30-45.png  │
│                                                 │
│  Folder Organization                            │
│  ┌─────────────────────────────────┐            │
│  │ Date-based (Year/Month/Day)  ▼ │            │
│  └─────────────────────────────────┘            │
│                                                 │
│  Current Structure:                             │
│  📁 Shot Manager/                               │
│    📁 2026/                                     │
│      📁 01/                                     │
│        📁 25/                                   │
│          📄 MyScreenshot_2026-01-25...png       │
└─────────────────────────────────────────────────┘
```

---

## 5.7 Deliverables

After Phase 5 completion:
- [ ] Save path configurable via settings
- [ ] File browser dialog works
- [ ] Date-based folder creation works
- [ ] Custom file prefix applied
- [ ] Settings persist between app restarts
- [ ] Files save to correct location
- [ ] Delete file removes from disk + database
- [ ] "Show in folder" opens file explorer
- [ ] Invalid path shows error

---

## 5.8 Verification

```bash
# Test scenarios:
# 1. Change save path → captures save to new location
# 2. Change file prefix → new captures use new prefix
# 3. Toggle date organization → folder structure changes
# 4. Restart app → settings persist
# 5. Set invalid/read-only path → error shown
# 6. Delete capture → file removed from disk
# 7. Show in folder → opens correct directory
# 8. Take screenshot at midnight → correct date folder
```
