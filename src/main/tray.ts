import { Tray, Menu, nativeImage, app } from 'electron';
import path from 'path';
import { showMainWindow } from './windows/main-window';
import { createCaptureOverlay } from './windows/capture-window';
import { shortcutManager } from './services/shortcuts';

let tray: Tray | null = null;

export function createTray(): void {
  // Create tray icon - use file if exists, otherwise create a simple one
  const iconPath = getTrayIconPath();
  let icon: Electron.NativeImage;

  if (iconPath) {
    icon = nativeImage.createFromPath(iconPath);
    icon = icon.resize({ width: 16, height: 16 });
  } else {
    // Create a simple camera icon (16x16)
    icon = createDefaultTrayIcon();
  }

  tray = new Tray(icon);
  tray.setToolTip('Shot Manager');

  // Build context menu
  updateTrayMenu();

  // Handle click
  tray.on('click', () => {
    showMainWindow();
  });
}

export function updateTrayMenu(): void {
  if (!tray) return;

  const shortcuts = shortcutManager.getConfig();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Take Screenshot',
      submenu: [
        {
          label: 'Full Screen',
          accelerator: formatAccelerator(shortcuts['screenshot-full']),
          click: () => triggerFullScreenshot(),
        },
        {
          label: 'Select Area',
          accelerator: formatAccelerator(shortcuts['screenshot-area']),
          click: () => createCaptureOverlay('screenshot'),
        },
      ],
    },
    {
      label: 'Record Video',
      submenu: [
        {
          label: 'Full Screen',
          accelerator: formatAccelerator(shortcuts['record-full']),
          click: () => triggerFullRecording(),
        },
        {
          label: 'Select Area',
          accelerator: formatAccelerator(shortcuts['record-area']),
          click: () => createCaptureOverlay('video'),
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      accelerator: formatAccelerator(shortcuts['open-dashboard']),
      click: () => showMainWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

export function setTrayRecording(isRecording: boolean, duration?: number): void {
  if (!tray) return;

  if (isRecording) {
    const recordingIconPath = getTrayIconPath(true);
    if (recordingIconPath) {
      const icon = nativeImage.createFromPath(recordingIconPath);
      tray.setImage(icon.resize({ width: 16, height: 16 }));
    }

    if (duration !== undefined) {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      tray.setToolTip(`Recording: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    } else {
      tray.setToolTip('Recording...');
    }
  } else {
    const iconPath = getTrayIconPath();
    if (iconPath) {
      const icon = nativeImage.createFromPath(iconPath);
      tray.setImage(icon.resize({ width: 16, height: 16 }));
    }
    tray.setToolTip('Shot Manager');
  }
}

function createDefaultTrayIcon(): Electron.NativeImage {
  // Create a simple 16x16 camera icon as a data URL
  // This is a simple gray camera icon
  const size = 16;
  const canvas = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${process.platform === 'darwin' ? 'black' : 'white'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </svg>
  `;

  const base64 = Buffer.from(canvas).toString('base64');
  const dataUrl = `data:image/svg+xml;base64,${base64}`;

  return nativeImage.createFromDataURL(dataUrl);
}

function getTrayIconPath(recording: boolean = false): string | null {
  const isDev = process.env.NODE_ENV === 'development';
  const basePath = isDev
    ? path.join(__dirname, '../../assets/icons/tray')
    : path.join(process.resourcesPath, 'assets/icons/tray');

  // Use template images on macOS
  let iconPath: string;
  if (process.platform === 'darwin') {
    iconPath = path.join(basePath, recording ? 'tray-recordingTemplate.png' : 'trayTemplate.png');
  } else {
    iconPath = path.join(basePath, recording ? 'tray-recording.png' : 'tray.png');
  }

  // Check if file exists
  const fs = require('fs');
  if (fs.existsSync(iconPath)) {
    return iconPath;
  }

  return null;
}

function formatAccelerator(accelerator: string | undefined): string | undefined {
  if (!accelerator) return undefined;

  // Convert to display format
  return accelerator
    .replace('CommandOrControl', process.platform === 'darwin' ? 'Cmd' : 'Ctrl')
    .replace('Command', 'Cmd')
    .replace('Control', 'Ctrl');
}

function triggerFullScreenshot(): void {
  // Import dynamically to avoid circular dependencies
  const { captureFullScreen } = require('./capture/screenshot');
  captureFullScreen();
}

function triggerFullRecording(): void {
  const { startFullScreenRecording } = require('./capture/video');
  startFullScreenRecording();
}

export function getTray(): Tray | null {
  return tray;
}

// Declare app.isQuitting
declare module 'electron' {
  interface App {
    isQuitting?: boolean;
  }
}
