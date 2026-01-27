import { ipcMain, shell, desktopCapturer, screen, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/channels';
import { captureScreenshot, getDisplayInfo } from '../capture/screenshot';
import { startRecording, stopRecording, pauseRecording, resumeRecording, getRecordingState, initializeRecordingIpc } from '../capture/video';
import { getCaptures, getAllTags, createTag, deleteTag, addTagToCapture, removeTagFromCapture } from '../services/database';
import { getSettings, getSetting, setSetting, resetSettings } from '../services/settings';
import { shortcutManager } from '../services/shortcuts';
import { deleteFile, openFile, showInFolder, selectSavePath, renameFile } from '../services/file-manager';
import { showMainWindow, hideMainWindow } from '../windows/main-window';
import type { FileQueryOptions } from '../../shared/types/electron.d';

export function registerIpcHandlers(): void {
  // Capture handlers
  ipcMain.handle(IPC_CHANNELS.CAPTURE_SCREENSHOT, async (_event, options) => {
    try {
      return await captureScreenshot(options);
    } catch (error) {
      console.error('[IPC] Screenshot capture failed:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_VIDEO_START, async (_event, options) => {
    return startRecording(options);
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_VIDEO_STOP, async () => {
    return stopRecording();
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_VIDEO_PAUSE, async () => {
    return pauseRecording();
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_VIDEO_RESUME, async () => {
    return resumeRecording();
  });

  // File handlers
  ipcMain.handle(IPC_CHANNELS.FILE_GET_ALL, async (_event, options?: FileQueryOptions) => {
    return getCaptures(options);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_DELETE, async (_event, id: number) => {
    return deleteFile(id);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_RENAME, async (_event, id: number, newFilename: string) => {
    return renameFile(id, newFilename);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_OPEN, async (_event, filepath: string) => {
    return openFile(filepath);
  });

  ipcMain.on(IPC_CHANNELS.FILE_OPEN_FOLDER, (_event, filepath: string) => {
    showInFolder(filepath);
  });

  // Tag handlers
  ipcMain.handle(IPC_CHANNELS.TAG_GET_ALL, async () => {
    return getAllTags();
  });

  ipcMain.handle(IPC_CHANNELS.TAG_CREATE, async (_event, name: string) => {
    return createTag(name);
  });

  ipcMain.handle(IPC_CHANNELS.TAG_DELETE, async (_event, id: number) => {
    return deleteTag(id);
  });

  ipcMain.handle(IPC_CHANNELS.TAG_ADD, async (_event, captureId: number, tagId: number) => {
    return addTagToCapture(captureId, tagId);
  });

  ipcMain.handle(IPC_CHANNELS.TAG_REMOVE, async (_event, captureId: number, tagId: number) => {
    return removeTagFromCapture(captureId, tagId);
  });

  // Settings handlers
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
    return getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, key: string, value: any) => {
    setSetting(key as any, value);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SELECT_SAVE_PATH, async () => {
    return selectSavePath();
  });

  // Shortcut handlers
  ipcMain.handle(IPC_CHANNELS.SHORTCUT_GET_ALL, async () => {
    return shortcutManager.getConfig();
  });

  ipcMain.handle(IPC_CHANNELS.SHORTCUT_UPDATE, async (_event, actionId: string, accelerator: string) => {
    return shortcutManager.updateShortcut(actionId, accelerator);
  });

  ipcMain.handle(IPC_CHANNELS.SHORTCUT_RESET, async () => {
    shortcutManager.resetToDefaults();
    return { success: true };
  });

  // Window handlers
  ipcMain.on(IPC_CHANNELS.WINDOW_SHOW_DASHBOARD, () => {
    showMainWindow();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_HIDE, () => {
    hideMainWindow();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.minimize();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    window?.close();
  });

  // Screen handlers
  ipcMain.handle(IPC_CHANNELS.SCREEN_GET_DISPLAYS, async () => {
    return getDisplayInfo();
  });

  ipcMain.handle(IPC_CHANNELS.SCREEN_GET_SOURCES, async () => {
    return desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
    });
  });

  // Handle recording data from renderer
  ipcMain.on('recording:data', (event, data) => {
    // This is handled in video.ts via one-time listener
  });

  // Initialize recording IPC handlers (for countdown)
  initializeRecordingIpc();
}
