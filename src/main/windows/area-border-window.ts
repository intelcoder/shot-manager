import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { IPC_CHANNELS } from '../../shared/constants/channels';
import type { SelectionArea } from '../../shared/types/capture';

interface AreaBorderState {
  window: BrowserWindow | null;
  area: SelectionArea | null;
}

const state: AreaBorderState = {
  window: null,
  area: null,
};

const isDev = process.env.NODE_ENV === 'development';

export function showAreaBorderOverlay(area: SelectionArea): void {
  // Close existing window if any
  if (state.window) {
    state.window.close();
    state.window = null;
  }

  state.area = area;

  // Get total bounds of all displays to cover everything
  const displays = screen.getAllDisplays();
  const bounds = calculateTotalBounds(displays);

  state.window = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    // Allow clicks to pass through
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Make the window click-through (ignore mouse events)
  state.window.setIgnoreMouseEvents(true);

  // Set window to be always on top with highest level
  state.window.setAlwaysOnTop(true, 'screen-saver');

  // Load the area border overlay page
  const url = isDev
    ? 'http://localhost:5173/#/area-border'
    : `file://${path.join(__dirname, '../renderer/index.html')}#/area-border`;

  state.window.loadURL(url);

  // Send area data after load
  state.window.webContents.on('did-finish-load', () => {
    if (state.window && state.area) {
      state.window.webContents.send(IPC_CHANNELS.AREA_BORDER_INIT, {
        area: state.area,
        screenBounds: bounds,
      });
    }
  });

  state.window.on('closed', () => {
    state.window = null;
    state.area = null;
  });
}

export function updateAreaBorderOverlay(area: SelectionArea): void {
  if (state.window) {
    state.area = area;
    state.window.webContents.send(IPC_CHANNELS.AREA_BORDER_UPDATE, { area });
  }
}

export function closeAreaBorderOverlay(): void {
  if (state.window) {
    state.window.close();
    state.window = null;
    state.area = null;
  }
}

export function getAreaBorderWindow(): BrowserWindow | null {
  return state.window;
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
