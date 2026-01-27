import { app, BrowserWindow } from 'electron';
import path from 'path';
import { createMainWindow, getMainWindow, showMainWindow } from './windows/main-window';
import { createTray } from './tray';
import { registerIpcHandlers } from './ipc/handlers';
import { initDatabase } from './services/database';
import { shortcutManager } from './services/shortcuts';
import { initSettings } from './services/settings';
import { initCleanupScheduler, stopCleanupScheduler } from './services/cleanup-scheduler';

const isDev = process.env.NODE_ENV === 'development';

async function initialize() {
  // Initialize services
  await initDatabase();
  await initSettings();

  // Create system tray
  createTray();

  // Register IPC handlers
  registerIpcHandlers();

  // Register global shortcuts
  shortcutManager.registerAll();

  // Initialize cleanup scheduler
  initCleanupScheduler();

  // Create main window (hidden by default)
  createMainWindow();
}

app.whenReady().then(initialize);

app.on('window-all-closed', () => {
  // Keep app running in tray mode
  // Only quit on macOS when explicitly quitting
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  } else {
    showMainWindow();
  }
});

app.on('before-quit', () => {
  // Cleanup
  shortcutManager.unregisterAll();
  stopCleanupScheduler();
});

// Handle second instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus window if second instance is launched
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
