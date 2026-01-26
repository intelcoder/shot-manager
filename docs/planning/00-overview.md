# Shot Manager - Project Overview

## Product Vision
A cross-platform (macOS & Windows) Electron application for easy screenshot and video recording management with customizable save locations, keyboard shortcuts, and organized file management.

## Tech Stack
- **Runtime**: Electron
- **Frontend**: React 18+
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Database**: SQLite (better-sqlite3) for metadata/tags

## Project Phases

| Phase | Name | Description |
|-------|------|-------------|
| 1 | Project Setup | Initialize Electron + React + TypeScript project structure |
| 2 | Core Architecture | Main/renderer process setup, IPC communication, system tray |
| 3 | Screenshot Feature | Full screen and area selection capture |
| 4 | Video Recording | Screen recording with audio narration |
| 5 | File Management | Save location, naming conventions, date-based folders |
| 6 | Dashboard UI | Gallery view, search, tags management |
| 7 | Settings & Shortcuts | Customizable keyboard shortcuts and preferences |
| 8 | Polish & Packaging | Testing, optimization, and distribution builds |

## Core Features Summary

### Capture
- Screenshot: Full screen / Area selection (crosshair drag)
- Video: Full screen / Area selection with audio narration
- Multi-monitor support (select which monitor)
- Copy to clipboard AND save to file

### Organization
- Date-based folder structure (year/month/day)
- Optional user-assigned tags
- Custom prefix + timestamp naming
- PNG format for screenshots

### UI
- System tray with quick actions
- Dashboard window with gallery view
- Corner popup preview after capture
- Search by tags + filename

### Settings
- Fully customizable keyboard shortcuts
- Configurable save location
- Custom file name prefix

## File Structure
```
docs/planning/
├── 00-overview.md          # This file
├── 01-project-setup.md     # Phase 1: Project initialization
├── 02-core-architecture.md # Phase 2: Electron architecture
├── 03-screenshot.md        # Phase 3: Screenshot feature
├── 04-video-recording.md   # Phase 4: Video recording
├── 05-file-management.md   # Phase 5: File organization
├── 06-dashboard-ui.md      # Phase 6: Dashboard interface
├── 07-settings-shortcuts.md# Phase 7: Settings & shortcuts
└── 08-polish-packaging.md  # Phase 8: Final polish
```
