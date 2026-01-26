# Phase 1: Project Setup

## Objective
Initialize a well-structured Electron + React + TypeScript project with modern tooling.

## Duration Estimate
Foundation setup for the entire application.

---

## 1.1 Project Initialization

### Tasks
- [ ] Create project directory structure
- [ ] Initialize npm/yarn project
- [ ] Configure TypeScript
- [ ] Set up Electron with Vite
- [ ] Configure React with hot reload

### Commands
```bash
# Initialize project
npm init -y

# Install Electron + Vite + React
npm install electron
npm install -D vite @vitejs/plugin-react
npm install react react-dom
npm install -D @types/react @types/react-dom

# TypeScript
npm install -D typescript @types/node

# Electron builder for packaging
npm install -D electron-builder
```

---

## 1.2 Directory Structure

```
shot-manager/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Main entry point
│   │   ├── tray.ts              # System tray management
│   │   ├── windows/             # Window management
│   │   │   ├── main-window.ts   # Dashboard window
│   │   │   └── capture-window.ts# Overlay for area selection
│   │   ├── capture/             # Capture logic
│   │   │   ├── screenshot.ts    # Screenshot capture
│   │   │   └── video.ts         # Video recording
│   │   ├── ipc/                 # IPC handlers
│   │   │   └── handlers.ts      # All IPC channel handlers
│   │   ├── services/            # Business logic
│   │   │   ├── file-manager.ts  # File saving/organization
│   │   │   ├── database.ts      # SQLite operations
│   │   │   └── shortcuts.ts     # Global shortcut registration
│   │   └── utils/               # Utilities
│   │       └── platform.ts      # Platform-specific helpers
│   │
│   ├── renderer/                # React frontend
│   │   ├── index.html           # HTML entry
│   │   ├── main.tsx             # React entry
│   │   ├── App.tsx              # Root component
│   │   ├── components/          # React components
│   │   │   ├── common/          # Shared components
│   │   │   ├── dashboard/       # Dashboard components
│   │   │   ├── capture/         # Capture overlay components
│   │   │   ├── settings/        # Settings components
│   │   │   └── preview/         # Preview popup components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── stores/              # Zustand stores
│   │   ├── styles/              # Global styles
│   │   └── utils/               # Frontend utilities
│   │
│   ├── shared/                  # Shared between main/renderer
│   │   ├── types/               # TypeScript interfaces
│   │   │   ├── capture.ts       # Capture-related types
│   │   │   ├── settings.ts      # Settings types
│   │   │   └── ipc.ts           # IPC message types
│   │   └── constants/           # Shared constants
│   │       └── channels.ts      # IPC channel names
│   │
│   └── preload/                 # Preload scripts
│       └── index.ts             # Context bridge setup
│
├── assets/                      # Static assets
│   ├── icons/                   # App icons
│   └── images/                  # Images
│
├── docs/                        # Documentation
│   └── planning/                # Planning documents
│
├── electron-builder.yml         # Build configuration
├── vite.main.config.ts          # Vite config for main process
├── vite.renderer.config.ts      # Vite config for renderer
├── tsconfig.json                # TypeScript config
├── package.json
└── README.md
```

---

## 1.3 Configuration Files

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@main/*": ["src/main/*"],
      "@renderer/*": ["src/renderer/*"],
      "@shared/*": ["src/shared/*"],
      "@preload/*": ["src/preload/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### package.json scripts
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:main\" \"npm run dev:renderer\"",
    "dev:main": "vite build --config vite.main.config.ts --watch",
    "dev:renderer": "vite --config vite.renderer.config.ts",
    "build": "npm run build:main && npm run build:renderer",
    "build:main": "vite build --config vite.main.config.ts",
    "build:renderer": "vite build --config vite.renderer.config.ts",
    "package": "electron-builder",
    "start": "electron ."
  }
}
```

---

## 1.4 Dependencies

### Production Dependencies
| Package | Purpose |
|---------|---------|
| `electron` | Desktop app framework |
| `react` | UI library |
| `react-dom` | React DOM renderer |
| `zustand` | State management |
| `better-sqlite3` | SQLite database |
| `electron-store` | Persistent settings storage |
| `date-fns` | Date formatting utilities |

### Development Dependencies
| Package | Purpose |
|---------|---------|
| `typescript` | Type safety |
| `vite` | Build tool |
| `@vitejs/plugin-react` | React support for Vite |
| `electron-builder` | App packaging |
| `concurrently` | Run multiple scripts |
| `tailwindcss` | Utility CSS framework |
| `postcss` | CSS processing |
| `autoprefixer` | CSS vendor prefixes |

---

## 1.5 Deliverables

After Phase 1 completion:
- [ ] Project runs with `npm run dev`
- [ ] Electron window opens with React content
- [ ] Hot reload works for renderer process
- [ ] TypeScript compiles without errors
- [ ] Path aliases work (@main, @renderer, @shared)
- [ ] Basic "Hello World" displays in window

---

## 1.6 Verification

```bash
# Run development mode
npm run dev

# Verify:
# 1. Electron window opens
# 2. React app renders
# 3. DevTools accessible (Ctrl+Shift+I / Cmd+Option+I)
# 4. Changes to renderer code hot reload
```
