import { BrowserWindow, screen } from 'electron';
import path from 'path';
import type { CaptureResult } from '../../shared/types/capture';

let previewWindow: BrowserWindow | null = null;
let autoCloseTimer: NodeJS.Timeout | null = null;

const isDev = process.env.NODE_ENV === 'development';

export function showPreviewPopup(result: CaptureResult, duration: number = 5000): void {
  if (previewWindow) {
    previewWindow.close();
  }

  // Position in bottom-right corner
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = 320;
  const windowHeight = 200;
  const margin = 20;

  previewWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: screenWidth - windowWidth - margin,
    y: screenHeight - windowHeight - margin,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load preview
  const encodedResult = encodeURIComponent(JSON.stringify(result));
  const url = isDev
    ? `http://localhost:5173/#/preview?data=${encodedResult}`
    : `file://${path.join(__dirname, '../renderer/index.html')}#/preview?data=${encodedResult}`;

  previewWindow.loadURL(url);

  previewWindow.on('closed', () => {
    previewWindow = null;
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
  });

  // Pause auto-close on hover
  previewWindow.on('focus', () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
  });

  previewWindow.on('blur', () => {
    startAutoCloseTimer(duration);
  });

  // Start auto-close timer
  startAutoCloseTimer(duration);
}

function startAutoCloseTimer(duration: number): void {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
  }
  autoCloseTimer = setTimeout(() => {
    closePreviewPopup();
  }, duration);
}

export function closePreviewPopup(): void {
  if (previewWindow) {
    previewWindow.close();
    previewWindow = null;
  }
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
}

export function getPreviewWindow(): BrowserWindow | null {
  return previewWindow;
}
