import { BrowserWindow, screen } from 'electron';
import path from 'path';

let captureWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development';

export function createCaptureOverlay(mode: 'screenshot' | 'video'): BrowserWindow {
  if (captureWindow) {
    captureWindow.close();
  }

  // Get total bounds of all displays
  const displays = screen.getAllDisplays();
  const bounds = calculateTotalBounds(displays);

  captureWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    fullscreenable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load capture overlay
  const url = isDev
    ? `http://localhost:5173/#/capture?mode=${mode}`
    : `file://${path.join(__dirname, '../renderer/index.html')}#/capture?mode=${mode}`;

  captureWindow.loadURL(url);

  captureWindow.on('closed', () => {
    captureWindow = null;
  });

  // Don't close on blur - user might click buttons in the overlay
  // User can press ESC or click Cancel to close

  return captureWindow;
}

export function getCaptureWindow(): BrowserWindow | null {
  return captureWindow;
}

export function closeCaptureOverlay(): void {
  if (captureWindow) {
    captureWindow.close();
    captureWindow = null;
  }
}

function calculateTotalBounds(displays: Electron.Display[]): Electron.Rectangle {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const display of displays) {
    const { x, y, width, height } = display.bounds;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
