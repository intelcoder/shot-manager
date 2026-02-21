import { BrowserWindow, screen } from 'electron';
import path from 'path';

// Window configuration
const OVERLAY_CONFIG = {
  COUNTDOWN_WIDTH: 200,
  COUNTDOWN_HEIGHT: 200,
  RECORDING_WIDTH: 180,
  RECORDING_HEIGHT: 56,
  MARGIN: 20,
} as const;

interface OverlayState {
  window: BrowserWindow | null;
  mode: 'countdown' | 'recording' | null;
}

const state: OverlayState = {
  window: null,
  mode: null,
};

const isDev = process.env.NODE_ENV === 'development';

export function showRecordingOverlay(mode: 'countdown' | 'recording', countdownDuration?: number): void {
  // If already showing with same mode, just update
  if (state.window && state.mode === mode) {
    state.window.webContents.send('overlay:update', { mode, countdownDuration });
    return;
  }

  // Close existing window if switching modes
  if (state.window) {
    state.window.close();
    state.window = null;
  }

  state.mode = mode;

  // Get display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Position based on mode
  const width = mode === 'countdown' ? OVERLAY_CONFIG.COUNTDOWN_WIDTH : OVERLAY_CONFIG.RECORDING_WIDTH;
  const height = mode === 'countdown' ? OVERLAY_CONFIG.COUNTDOWN_HEIGHT : OVERLAY_CONFIG.RECORDING_HEIGHT;

  // Countdown: center of screen, Recording: top-right corner
  const x = mode === 'countdown'
    ? Math.floor(screenWidth / 2 - width / 2)
    : screenWidth - width - OVERLAY_CONFIG.MARGIN;
  const y = mode === 'countdown'
    ? Math.floor(screenHeight / 2 - height / 2)
    : OVERLAY_CONFIG.MARGIN;

  state.window = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    hasShadow: true,
    focusable: mode === 'recording', // Allow focus for recording controls
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Exclude from screen capture so overlay doesn't appear in recordings
  state.window.setContentProtection(true);

  // Set window to be always on top with highest level
  state.window.setAlwaysOnTop(true, 'screen-saver');

  // Load the overlay page with mode in URL for immediate availability
  const params = `mode=${mode}${countdownDuration ? `&countdown=${countdownDuration}` : ''}`;
  const url = isDev
    ? `http://localhost:5173/#/recording-overlay?${params}`
    : `file://${path.join(__dirname, '../renderer/index.html')}#/recording-overlay?${params}`;

  state.window.loadURL(url);

  // Send initial data after load
  state.window.webContents.on('did-finish-load', () => {
    state.window?.webContents.send('overlay:init', { mode, countdownDuration });
  });

  state.window.on('closed', () => {
    state.window = null;
    state.mode = null;
  });
}

export function updateRecordingOverlay(data: { duration: number; isPaused: boolean }): void {
  if (state.window && state.mode === 'recording') {
    state.window.webContents.send('overlay:recording-status', data);
  }
}

export function transitionToRecording(): void {
  if (state.window && state.mode === 'countdown') {
    // Get current position
    const bounds = state.window.getBounds();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;

    // Update mode
    state.mode = 'recording';

    // Resize and reposition for recording mode
    const newWidth = OVERLAY_CONFIG.RECORDING_WIDTH;
    const newHeight = OVERLAY_CONFIG.RECORDING_HEIGHT;
    const newX = screenWidth - newWidth - OVERLAY_CONFIG.MARGIN;
    const newY = OVERLAY_CONFIG.MARGIN;

    state.window.setBounds({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });

    // Tell renderer to switch to recording mode
    state.window.webContents.send('overlay:switch-mode', { mode: 'recording' });
  }
}

export function closeRecordingOverlay(): void {
  if (state.window) {
    state.window.close();
    state.window = null;
    state.mode = null;
  }
}

export function getRecordingOverlayWindow(): BrowserWindow | null {
  return state.window;
}
