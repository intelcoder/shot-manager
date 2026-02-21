import { app, BrowserWindow, protocol } from 'electron';
import fs from 'fs';
import path from 'path';
import { createMainWindow, getMainWindow, showMainWindow } from './windows/main-window';
import { createTray } from './tray';
import { registerIpcHandlers } from './ipc/handlers';
import { initDatabase } from './services/database';
import { shortcutManager } from './services/shortcuts';
import { initSettings } from './services/settings';
import { initCleanupScheduler, stopCleanupScheduler } from './services/cleanup-scheduler';

const isDev = process.env.NODE_ENV === 'development';

// Register custom protocol for serving local media files to sandboxed renderers.
// Must be called before app.whenReady().
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-media',
    privileges: {
      standard: true,
      secure: true,
      stream: true,
      bypassCSP: true,
      supportFetchAPI: true,
    },
  },
]);

async function initialize() {
  // Register protocol handler for local media files
  protocol.handle('local-media', async (request) => {
    // Strip scheme + authority (e.g. "local-media://media/") to get the file path
    const raw = request.url.replace(/^local-media:\/\/[^/]*\//, '');
    const filePath = decodeURIComponent(raw);

    try {
      const data = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.webm': 'video/webm',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
      };
      const contentType = mimeTypes[ext] ?? 'application/octet-stream';
      return new Response(data, { headers: { 'Content-Type': contentType } });
    } catch {
      return new Response('File not found', { status: 404 });
    }
  });

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
