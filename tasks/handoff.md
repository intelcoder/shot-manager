# Shot Manager - Handoff Document

## Feature Overview
**Shot Manager** is an Electron-based screenshot and video recording application for Windows and macOS, similar to CleanShot X or ShareX.

### Core Features
- Full-screen and area-selection screenshots
- Full-screen and area-selection video recording
- System tray integration
- Global keyboard shortcuts
- File management with tagging
- Customizable settings (save path, file naming, formats)
- Preview popup after capture

---

## Current Status

### Working
- [x] Project setup (Electron + Vite + React + TypeScript + Tailwind)
- [x] Main window with dashboard UI
- [x] System tray with context menu
- [x] Global keyboard shortcuts registration
- [x] Settings panel with tabs (General, Files, Capture, Shortcuts)
- [x] Database setup (sql.js)
- [x] IPC communication between main and renderer
- [x] Capture overlay UI with area selection
- [x] File manager service structure

### Partially Working / Needs Testing
- [ ] Screenshot capture and save
- [ ] Preview popup after capture
- [ ] Gallery display of captured files

### Not Implemented / Not Working
- [ ] Video recording
- [ ] Audio recording with video
- [ ] Thumbnail generation
- [ ] File tagging in gallery
- [ ] Copy to clipboard confirmation

---

## Known Issues

### 1. Screenshot Capture Not Saving
**Location:** `src/main/capture/screenshot.ts`, `src/main/services/file-manager.ts`

**Symptoms:**
- User selects area and clicks "Capture"
- Overlay closes but no file is saved
- No preview appears

**Debug logs added:** Yes - run `bun run start` and watch console for:
```
[Screenshot] Starting capture with options: ...
[FileManager] Settings: ...
[FileManager] Will save to: ...
```

**Possible causes:**
1. `desktopCapturer.getSources()` not finding screen source on Windows
2. Crop coordinates may be incorrect with display scaling
3. Save path may not exist or be writable
4. The overlay captures itself before closing (timing issue)

**Files to investigate:**
- `src/main/capture/screenshot.ts:22-45` - Source detection logic
- `src/main/services/file-manager.ts:16-70` - Save logic
- `src/main/windows/capture-window.ts` - Overlay timing

### 2. Tray Icon May Be Invisible
**Location:** `src/main/tray.ts`

**Status:** Fixed with programmatic SVG icon fallback, but custom icon assets should be added.

**TODO:** Create proper tray icons at `assets/icons/tray/`:
- `tray.png` (16x16, for Windows)
- `trayTemplate.png` (16x16, for macOS)
- `tray-recording.png` (16x16, recording state)

### 3. Preview Popup Not Showing
**Location:** `src/main/windows/preview-window.ts`

**Depends on:** Screenshot capture working first. Preview is triggered after successful save.

---

## Architecture

```
src/
├── main/                    # Electron main process
│   ├── index.ts            # App entry point
│   ├── tray.ts             # System tray
│   ├── capture/
│   │   ├── screenshot.ts   # Screenshot capture logic
│   │   └── video.ts        # Video recording logic
│   ├── ipc/
│   │   └── handlers.ts     # IPC handlers
│   ├── services/
│   │   ├── database.ts     # sql.js database
│   │   ├── file-manager.ts # File save/delete operations
│   │   ├── settings.ts     # App settings (electron-store)
│   │   └── shortcuts.ts    # Global shortcuts manager
│   └── windows/
│       ├── main-window.ts  # Main dashboard window
│       ├── capture-window.ts # Capture overlay window
│       └── preview-window.ts # Preview popup window
├── renderer/               # React frontend
│   ├── App.tsx            # Router
│   ├── components/
│   │   ├── capture/       # Capture overlay UI
│   │   ├── dashboard/     # Gallery, sidebar, search
│   │   ├── preview/       # Preview popup
│   │   └── settings/      # Settings panels
│   └── stores/            # Zustand stores
├── preload/               # Preload scripts (context bridge)
└── shared/                # Shared types and constants
```

---

## Key Configuration

### Vite Build
- Main process: `vite.main.config.ts`
- Preload: `vite.preload.config.ts`
- Renderer: `vite.renderer.config.ts`

**Important:** `sql.js` must be in `external` array in `vite.main.config.ts` to avoid bundling issues.

### Default Shortcuts
| Action | Shortcut |
|--------|----------|
| Screenshot (Full) | Ctrl+Shift+3 |
| Screenshot (Area) | Ctrl+Shift+4 |
| Record (Full) | Ctrl+Shift+5 |
| Record (Area) | Ctrl+Shift+6 |
| Stop Recording | Ctrl+Shift+0 |
| Open Dashboard | Ctrl+Shift+D |

### Default Save Path
Windows: `C:\Users\{user}\Pictures\Shot Manager\`
macOS: `~/Pictures/Shot Manager/`

---

## Next Steps (Priority Order)

### 1. ~~Fix Capture Button Click~~ (FIXED)
**Symptom:** Clicking "Capture" button does NOT work, but pressing Enter DOES work.

**Root cause:** Clicking button triggered overlay's `onMouseDown` which started a new selection, interfering with the click.

**Fix applied:** Added `onMouseDown={(e) => e.stopPropagation()}` to both Capture and Cancel buttons in `CaptureOverlay.tsx`.

### 2. ~~Fix Screenshot Save Path~~ (FIXED)
**Issue:** `DEFAULT_SETTINGS.savePath` was empty string. If settings file existed with empty value, it wouldn't use the default.

**Fix applied:**
- Added fallback in `saveScreenshot()` - if savePath is empty, defaults to `Pictures/Shot Manager`
- Added validation for other settings (prefix, format, style)
- Added better logging in `ensureSaveFolder()` with error handling

### 2. Test Preview Popup
- Once screenshots save, verify preview appears
- Check preview route loads correctly in production build

### 3. Implement Video Recording
- `src/main/capture/video.ts` exists but needs testing
- Uses MediaRecorder API via renderer process
- Needs IPC for start/stop/data transfer

### 4. Add Thumbnail Generation
- Generate thumbnails for gallery view
- Store thumbnail path in database

### 5. Polish UI
- Add loading states
- Add error notifications
- Improve gallery layout

---

## Commands

```bash
# Development
bun run dev

# Build
bun run build

# Run built app
bun run start

# Package for distribution
bun run package:win   # Windows
bun run package:mac   # macOS
```

---

## Documentation
See `docs/planning/` for detailed implementation plans:
- `00-overview.md` - Project overview
- `03-screenshot.md` - Screenshot implementation
- `04-video-recording.md` - Video recording implementation
- `07-settings-shortcuts.md` - Settings and shortcuts

---

## Session Notes

### Fixes Applied This Session
1. Added `sql.js` to Vite externals (was causing "Cannot set properties of undefined" error)
2. Added `build:preload` to build script (preload wasn't being built)
3. Fixed dev script to build preload before starting Electron
4. Changed stop recording shortcut from `Ctrl+Shift+Escape` to `Ctrl+Shift+0` (Escape doesn't work on Windows)
5. Added shortcut migration for existing configs
6. Changed main window to `show: true` on startup
7. Added fallback tray icon (SVG-based)
8. Removed blur handler on capture window (was closing before capture completed)
9. Fixed `format` variable shadowing date-fns import in file-manager.ts
10. Added debug logging throughout capture flow

### Files Modified
- `vite.main.config.ts`
- `package.json`
- `scripts/dev-main.js`
- `src/shared/types/settings.ts`
- `src/main/services/shortcuts.ts`
- `src/main/windows/main-window.ts`
- `src/main/windows/capture-window.ts`
- `src/main/tray.ts`
- `src/main/services/file-manager.ts`
- `src/main/capture/screenshot.ts`
- `src/main/ipc/handlers.ts`
