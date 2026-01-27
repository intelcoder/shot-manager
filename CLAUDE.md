# Shot Manager - Claude Code Project Guide

## Project Overview

Shot Manager is a cross-platform Electron desktop application for capturing screenshots and recording videos on macOS and Windows. It features a system tray interface, global keyboard shortcuts, and a dashboard UI for managing captures.

## Tech Stack

- **Runtime**: Electron 30, Node 20.x
- **Build**: Vite 5.2, TypeScript 5.4
- **Frontend**: React 18, Zustand (state), TailwindCSS
- **Backend**: sql.js (SQLite), electron-store (settings)
- **Testing**: Vitest, @testing-library/react

## Architecture

Three-process Electron architecture:
- `src/main/` - Main process: app lifecycle, file system, global shortcuts, database
- `src/renderer/` - Renderer process: React UI, user interactions
- `src/preload/` - Preload script: secure IPC bridge
- `src/shared/` - Shared types and constants

## Common Commands

```bash
npm run dev          # Start development mode (main + renderer)
npm run build        # Build all bundles
npm run package      # Create native installers
npm run test         # Run tests with Vitest
npm run lint         # ESLint check
npm run typecheck    # TypeScript compilation check
```

## Path Aliases

- `@main/*` → `src/main/*`
- `@renderer/*` → `src/renderer/*`
- `@shared/*` → `src/shared/*`
- `@preload/*` → `src/preload/*`

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/main/capture/` | Screenshot and video capture logic |
| `src/main/services/` | Database, file manager, settings, shortcuts |
| `src/main/windows/` | Window management (main, preview, capture, overlay) |
| `src/renderer/components/` | React components organized by feature |
| `src/renderer/stores/` | Zustand state stores |
| `src/shared/types/` | TypeScript interfaces |
| `src/shared/constants/` | IPC channel definitions |

## IPC Communication

- Channels defined in `src/shared/constants/channels.ts`
- Main process handlers in `src/main/ipc/handlers.ts`
- Preload exposes API in `src/preload/index.ts`
- Renderer accesses via `window.electronAPI`

## Database

- sql.js SQLite database stored at user data path
- Location: `{userData}/shot-manager.db`
- Service: `src/main/services/database.ts`

## Testing

- Framework: Vitest with jsdom environment
- Test files: `*.test.ts` or `*.test.tsx` alongside source
- Config: `vitest.config.ts`

## Code Style

- TypeScript strict mode enabled
- React functional components with hooks
- Zustand for state management (no Redux)
- TailwindCSS utility classes for styling

## Database Schema

```sql
-- captures table
id              INTEGER PRIMARY KEY
type            TEXT ('screenshot' | 'video')
filename        TEXT
filepath        TEXT
width           INTEGER
height          INTEGER
duration        INTEGER (video only, in seconds)
size            INTEGER (bytes)
thumbnail_path  TEXT
created_at      TEXT (ISO timestamp)

-- tags table
id              INTEGER PRIMARY KEY
name            TEXT
color           TEXT (hex color)

-- capture_tags (junction table)
capture_id      INTEGER REFERENCES captures(id)
tag_id          INTEGER REFERENCES tags(id)
```

## File Organization

- **Two modes**: `date` (YYYY/MM/DD folders) or `flat` (all in root)
- **Naming pattern**: `{prefix}_{timestamp}.{ext}`
- **Settings** (in electron-store):
  - `savePath`: base directory for captures
  - `filePrefix`: prefix for filenames (default: "shot")
  - `organizationStyle`: "date" | "flat"

## UI Component Hierarchy

```
Dashboard
├── Sidebar (filters, tags, stats)
├── Gallery (grid of capture thumbnails)
│   └── CaptureCard (single item)
└── DetailModal (when item selected)
    ├── Preview (image/video player)
    ├── Metadata (dimensions, size, date)
    ├── TagEditor (add/remove tags)
    └── Actions (open, delete, share)
```

- Gallery uses single-select only (click to open DetailModal)
- Grid layout adapts to container width

## State Stores

### captures-store.ts
- `captures: Capture[]` - all captures from database
- `tags: Tag[]` - all available tags
- `filters: { type?, tags?, dateRange? }` - active filters
- CRUD operations: `addCapture`, `deleteCapture`, `updateCapture`
- Tag operations: `addTag`, `removeTag`, `assignTag`

### recording-store.ts
- `isRecording: boolean` - active recording state
- `isPaused: boolean` - pause state during recording
- `duration: number` - elapsed recording time in seconds
- `startRecording`, `stopRecording`, `togglePause`

## Current Limitations

- **No folder/collection system**: Database has no concept of user-created folders
- **No multi-select**: Gallery only supports single item selection
- **Tags only grouping**: Tags are the only way to logically group captures
- **No batch operations**: Cannot perform actions on multiple items at once

## Project Documentation

- **plans/** - Feature plans and design documents (e.g., `plans/feature-name-YYYY-MM-DD.md`)
- **tasks/** - Task tracking and implementation checklists
- **docs/** - User-facing documentation