import { BrowserWindow, screen } from 'electron';
import path from 'path';
import type { CaptureResult } from '../../shared/types/capture';

// Window configuration constants
const PREVIEW_WINDOW = {
  WIDTH: 320,
  HEIGHT: 200,
  MARGIN: 20,
  BLUR_GRACE_PERIOD: 500, // Allow button clicks to complete before auto-close
} as const;

// Encapsulated preview state
interface PreviewState {
  window: BrowserWindow | null;
  timer: NodeJS.Timeout | null;
  timerStart: number;
  remaining: number;
}

const state: PreviewState = {
  window: null,
  timer: null,
  timerStart: 0,
  remaining: 0,
};

const isDev = process.env.NODE_ENV === 'development';

export function showPreviewPopup(result: CaptureResult, duration: number = 5000): void {
  if (state.window) {
    state.window.close();
  }

  // Position in bottom-right corner
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  state.window = new BrowserWindow({
    width: PREVIEW_WINDOW.WIDTH,
    height: PREVIEW_WINDOW.HEIGHT,
    x: screenWidth - PREVIEW_WINDOW.WIDTH - PREVIEW_WINDOW.MARGIN,
    y: screenHeight - PREVIEW_WINDOW.HEIGHT - PREVIEW_WINDOW.MARGIN,
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
      sandbox: true,
    },
  });

  // Load preview page without sensitive data in URL
  const url = isDev
    ? 'http://localhost:5173/#/preview'
    : `file://${path.join(__dirname, '../renderer/index.html')}#/preview`;

  state.window.loadURL(url);

  // Send data via IPC after page loads (avoids URL length limits and exposure)
  state.window.webContents.on('did-finish-load', () => {
    state.window?.webContents.send('preview:data', result);
  });

  state.window.on('closed', () => {
    state.window = null;
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  });

  // Pause auto-close on focus (user interacting)
  state.window.on('focus', () => {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
      // Calculate remaining time
      state.remaining = Math.max(0, state.remaining - (Date.now() - state.timerStart));
    }
  });

  // Resume timer on blur with grace period to allow button clicks to complete
  state.window.on('blur', () => {
    const timeToClose = state.remaining > 0
      ? state.remaining
      : PREVIEW_WINDOW.BLUR_GRACE_PERIOD;
    startAutoCloseTimer(timeToClose);
  });

  // Start auto-close timer
  state.remaining = duration;
  startAutoCloseTimer(duration);
}

function startAutoCloseTimer(duration: number): void {
  if (state.timer) {
    clearTimeout(state.timer);
  }
  state.timerStart = Date.now();
  state.remaining = duration;
  state.timer = setTimeout(() => {
    state.remaining = 0;
    closePreviewPopup();
  }, duration);
}

export function closePreviewPopup(): void {
  if (state.window) {
    state.window.close();
    state.window = null;
  }
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  state.timerStart = 0;
  state.remaining = 0;
}

export function getPreviewWindow(): BrowserWindow | null {
  return state.window;
}
