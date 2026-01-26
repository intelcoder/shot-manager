# Phase 8: Polish & Packaging

## Objective
Final polish, performance optimization, testing, and creating distribution builds for macOS and Windows.

## Dependencies
- All previous phases completed

---

## 8.1 Performance Optimization

### Thumbnail Generation

```typescript
// Generate thumbnails on capture to avoid loading full images
// src/main/services/thumbnail.ts
import sharp from 'sharp';
import path from 'path';

interface ThumbnailOptions {
  width: number;
  height: number;
  quality: number;
}

async function generateThumbnail(
  imagePath: string,
  options: ThumbnailOptions = { width: 320, height: 180, quality: 80 }
): Promise<string> {
  const thumbnailDir = path.join(app.getPath('userData'), 'thumbnails');
  const filename = path.basename(imagePath, path.extname(imagePath)) + '.jpg';
  const thumbnailPath = path.join(thumbnailDir, filename);

  await sharp(imagePath)
    .resize(options.width, options.height, { fit: 'cover' })
    .jpeg({ quality: options.quality })
    .toFile(thumbnailPath);

  return thumbnailPath;
}
```

### Video Thumbnail Extraction

```typescript
// Extract frame from video for thumbnail
// Using ffmpeg-static
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

ffmpeg.setFfmpegPath(ffmpegPath);

async function generateVideoThumbnail(videoPath: string): Promise<string> {
  const thumbnailDir = path.join(app.getPath('userData'), 'thumbnails');
  const filename = path.basename(videoPath, path.extname(videoPath)) + '.jpg';
  const thumbnailPath = path.join(thumbnailDir, filename);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'],  // 1 second in
        filename: filename,
        folder: thumbnailDir,
        size: '320x180'
      })
      .on('end', () => resolve(thumbnailPath))
      .on('error', reject);
  });
}
```

### Lazy Loading Gallery

```typescript
// src/renderer/components/dashboard/Gallery.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function Gallery({ items }: GalleryProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: Math.ceil(items.length / 4),  // 4 columns
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,  // Row height
    overscan: 5
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * 4;
          const rowItems = items.slice(startIndex, startIndex + 4);

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
              className="grid grid-cols-4 gap-4 p-4"
            >
              {rowItems.map((item) => (
                <GalleryItem key={item.id} item={item} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Memory Management

```typescript
// Cleanup resources when windows are hidden
mainWindow.on('hide', () => {
  // Clear thumbnail cache
  // Pause any background operations
});

mainWindow.on('show', () => {
  // Reload data
  // Resume operations
});

// Limit concurrent file operations
import pLimit from 'p-limit';
const limit = pLimit(3);  // Max 3 concurrent

async function processFiles(files: string[]) {
  return Promise.all(
    files.map((file) => limit(() => processFile(file)))
  );
}
```

---

## 8.2 Error Handling

### Global Error Handler

```typescript
// src/main/index.ts
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log to file
  // Show error dialog
  dialog.showErrorBox('Error', 'An unexpected error occurred');
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// Renderer error handling
app.on('render-process-gone', (event, webContents, details) => {
  console.error('Renderer crashed:', details);
  // Restart renderer or show error
});
```

### User-Friendly Error Messages

```typescript
// src/shared/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public technicalMessage?: string
  ) {
    super(userMessage);
  }
}

export const ErrorCodes = {
  CAPTURE_FAILED: 'CAPTURE_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FILE_SAVE_FAILED: 'FILE_SAVE_FAILED',
  SHORTCUT_CONFLICT: 'SHORTCUT_CONFLICT',
  DATABASE_ERROR: 'DATABASE_ERROR'
};

// Usage
throw new AppError(
  ErrorCodes.PERMISSION_DENIED,
  'Screen recording permission is required. Please enable it in System Preferences.',
  'systemPreferences.getMediaAccessStatus returned "denied"'
);
```

### Error Boundary (React)

```typescript
// src/renderer/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen">
          <h1>Something went wrong</h1>
          <button onClick={() => window.location.reload()}>
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 8.3 macOS Permissions

### Permission Checker

```typescript
// src/main/services/permissions.ts (macOS)
import { systemPreferences, dialog } from 'electron';

async function checkScreenCapturePermission(): Promise<boolean> {
  if (process.platform !== 'darwin') return true;

  const status = systemPreferences.getMediaAccessStatus('screen');

  if (status === 'granted') return true;

  if (status === 'denied') {
    const response = await dialog.showMessageBox({
      type: 'warning',
      title: 'Permission Required',
      message: 'Screen Recording permission is required',
      detail: 'Please enable Screen Recording for Shot Manager in System Preferences > Privacy & Security > Screen Recording',
      buttons: ['Open System Preferences', 'Cancel']
    });

    if (response.response === 0) {
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
    }

    return false;
  }

  // Status is 'not-determined', will prompt automatically
  return true;
}

async function checkMicrophonePermission(): Promise<boolean> {
  if (process.platform !== 'darwin') return true;

  const status = systemPreferences.getMediaAccessStatus('microphone');

  if (status === 'granted') return true;

  if (status === 'not-determined') {
    const granted = await systemPreferences.askForMediaAccess('microphone');
    return granted;
  }

  // Show dialog to open preferences
  return false;
}
```

---

## 8.4 Sound Effects

```typescript
// src/main/services/sound.ts
import path from 'path';

class SoundManager {
  private sounds: Map<string, string> = new Map();

  constructor() {
    this.sounds.set('capture', path.join(__dirname, '../../assets/sounds/capture.mp3'));
    this.sounds.set('start-recording', path.join(__dirname, '../../assets/sounds/start.mp3'));
    this.sounds.set('stop-recording', path.join(__dirname, '../../assets/sounds/stop.mp3'));
  }

  play(soundName: string): void {
    const soundPath = this.sounds.get(soundName);
    if (!soundPath) return;

    // Play via hidden window or native module
    // Option 1: Use shell
    if (process.platform === 'darwin') {
      exec(`afplay "${soundPath}"`);
    } else {
      // Windows: Use PowerShell or node-audio
    }
  }
}

export const soundManager = new SoundManager();
```

---

## 8.5 App Icons

### Required Icon Sizes

**macOS:**
- icon.icns (all sizes bundled)
- Sizes: 16, 32, 64, 128, 256, 512, 1024

**Windows:**
- icon.ico (all sizes bundled)
- Sizes: 16, 24, 32, 48, 64, 128, 256

**Tray Icons:**
- macOS: 16x16 and 32x32 (template images - monochrome)
- Windows: 16x16 and 32x32

### Icon Files Structure
```
assets/
├── icons/
│   ├── icon.icns          # macOS app icon
│   ├── icon.ico           # Windows app icon
│   ├── icon.png           # 1024x1024 source
│   ├── tray/
│   │   ├── trayTemplate.png      # macOS tray (dark mode)
│   │   ├── trayTemplate@2x.png   # macOS tray retina
│   │   ├── tray.png              # Windows tray
│   │   ├── tray-recording.png    # Recording indicator
│   │   └── tray-recording@2x.png
```

---

## 8.6 Electron Builder Configuration

### electron-builder.yml

```yaml
appId: com.shotmanager.app
productName: Shot Manager
copyright: Copyright © 2026

directories:
  output: release
  buildResources: assets

files:
  - dist/**/*
  - package.json

extraResources:
  - assets/sounds/**/*

mac:
  category: public.app-category.productivity
  icon: assets/icons/icon.icns
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  target:
    - target: dmg
      arch:
        - x64
        - arm64
    - target: zip
      arch:
        - x64
        - arm64

dmg:
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications
  window:
    width: 540
    height: 380

win:
  icon: assets/icons/icon.ico
  target:
    - target: nsis
      arch:
        - x64
    - target: portable
      arch:
        - x64

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  installerIcon: assets/icons/icon.ico
  uninstallerIcon: assets/icons/icon.ico
  license: LICENSE.txt

publish:
  provider: github
  owner: your-username
  repo: shot-manager
```

### macOS Entitlements

```xml
<!-- build/entitlements.mac.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <key>com.apple.security.device.audio-input</key>
  <true/>
  <key>com.apple.security.device.camera</key>
  <false/>
</dict>
</plist>
```

---

## 8.7 Build Scripts

### package.json scripts

```json
{
  "scripts": {
    "build": "npm run build:main && npm run build:renderer",
    "build:main": "vite build --config vite.main.config.ts",
    "build:renderer": "vite build --config vite.renderer.config.ts",

    "package": "npm run build && electron-builder",
    "package:mac": "npm run build && electron-builder --mac",
    "package:win": "npm run build && electron-builder --win",

    "package:mac:dmg": "npm run build && electron-builder --mac dmg",
    "package:mac:zip": "npm run build && electron-builder --mac zip",
    "package:win:nsis": "npm run build && electron-builder --win nsis",
    "package:win:portable": "npm run build && electron-builder --win portable",

    "release": "npm run build && electron-builder --publish always"
  }
}
```

---

## 8.8 Code Signing

### macOS Code Signing

```bash
# Required environment variables
export APPLE_ID=your@email.com
export APPLE_ID_PASSWORD=app-specific-password
export APPLE_TEAM_ID=XXXXXXXXXX
export CSC_LINK=path/to/certificate.p12
export CSC_KEY_PASSWORD=certificate-password
```

### Windows Code Signing

```bash
# Using Azure SignTool or similar
export WIN_CSC_LINK=path/to/certificate.pfx
export WIN_CSC_KEY_PASSWORD=certificate-password
```

---

## 8.9 Auto-Update

### Using electron-updater

```typescript
// src/main/services/updater.ts
import { autoUpdater } from 'electron-updater';
import { dialog, BrowserWindow } from 'electron';

class AppUpdater {
  constructor() {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `Version ${info.version} is available. Would you like to download it?`,
        buttons: ['Download', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
    });

    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. The application will restart to install.',
        buttons: ['Restart Now', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  }

  checkForUpdates(): void {
    autoUpdater.checkForUpdates();
  }
}

export const appUpdater = new AppUpdater();
```

---

## 8.10 Testing Checklist

### Functional Tests

```markdown
## Screenshot
- [ ] Full screen capture works
- [ ] Area selection works
- [ ] Multi-monitor selection works
- [ ] Copy to clipboard works
- [ ] File saves correctly
- [ ] Preview popup appears
- [ ] Database record created

## Video Recording
- [ ] Full screen recording works
- [ ] Area recording works
- [ ] Audio narration works
- [ ] Recording controls work (pause/stop)
- [ ] Video saves correctly
- [ ] Open in editor works

## Dashboard
- [ ] Gallery displays all captures
- [ ] Search works
- [ ] Filter by type works
- [ ] Filter by date works
- [ ] Tag filtering works
- [ ] Add/remove tags works
- [ ] Delete works
- [ ] Detail modal works

## Settings
- [ ] Save path changes work
- [ ] File prefix changes work
- [ ] All shortcuts customizable
- [ ] Settings persist after restart
- [ ] Launch at startup works

## System Integration
- [ ] Tray icon appears
- [ ] Tray menu works
- [ ] Keyboard shortcuts work globally
- [ ] App minimizes to tray on close
- [ ] Quit actually exits
```

### Platform-Specific Tests

```markdown
## macOS
- [ ] App appears in menu bar
- [ ] Screen capture permission flow
- [ ] Microphone permission flow
- [ ] Retina display support
- [ ] Dark mode support
- [ ] DMG installer works
- [ ] Auto-update works

## Windows
- [ ] App appears in system tray
- [ ] NSIS installer works
- [ ] Portable version works
- [ ] High DPI support
- [ ] Auto-update works
```

---

## 8.11 Deliverables

After Phase 8 completion:
- [ ] All features polished and stable
- [ ] Performance optimized (thumbnails, lazy loading)
- [ ] Error handling complete
- [ ] Sound effects implemented
- [ ] App icons created
- [ ] macOS DMG built and signed
- [ ] Windows NSIS installer built
- [ ] Auto-update configured
- [ ] All tests passing

---

## 8.12 Release Checklist

```markdown
## Pre-Release
- [ ] Version number updated in package.json
- [ ] CHANGELOG.md updated
- [ ] All tests passing
- [ ] Build on macOS (x64 and arm64)
- [ ] Build on Windows (x64)
- [ ] Test installers on clean machines
- [ ] Test auto-update flow

## Release
- [ ] Create GitHub release
- [ ] Upload artifacts
- [ ] Update website/landing page
- [ ] Announce release

## Post-Release
- [ ] Monitor crash reports
- [ ] Collect user feedback
- [ ] Plan next version
```
