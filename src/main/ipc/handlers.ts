import { ipcMain, shell, desktopCapturer, screen, BrowserWindow, nativeImage } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/channels';
import { captureScreenshot, getDisplayInfo } from '../capture/screenshot';
import { startRecording, stopRecording, pauseRecording, resumeRecording, getRecordingState, initializeRecordingIpc } from '../capture/video';
import {
  getCaptures,
  getAllTags,
  createTag,
  deleteTag,
  addTagToCapture,
  removeTagFromCapture,
  createFolder,
  getAllFolders,
  getFolderTree,
  updateFolder,
  deleteFolder,
  moveCapturesTo,
  deleteCapturesBatch,
  addTagToCapturesBatch,
  removeTagFromCapturesBatch,
  getUncategorizedCount,
  getTotalCaptureCount,
  toggleCaptureStar,
  toggleCapturesBatchStar,
  createCleanupRule,
  updateCleanupRule,
  deleteCleanupRule,
  getAllCleanupRules,
  getCleanupHistory,
} from '../services/database';
import { previewCleanup, executeCleanup } from '../services/cleanup';
import type { CreateCleanupRuleInput, UpdateCleanupRuleInput } from '../../shared/types/cleanup';
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

  ipcMain.on(IPC_CHANNELS.FILE_START_DRAG, (event, filePaths: string[], iconPath?: string) => {
    if (!filePaths || filePaths.length === 0) return;

    let icon: Electron.NativeImage;
    if (iconPath) {
      try {
        icon = nativeImage.createFromPath(iconPath);
        icon = icon.resize({ width: 128, height: 128 });
      } catch {
        icon = nativeImage.createEmpty();
      }
    } else {
      icon = nativeImage.createEmpty();
    }

    if (filePaths.length === 1) {
      event.sender.startDrag({ file: filePaths[0], icon });
    } else {
      event.sender.startDrag({ file: filePaths[0], files: filePaths, icon });
    }
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

  // Folder handlers
  ipcMain.handle(IPC_CHANNELS.FOLDER_CREATE, async (_event, input) => {
    return createFolder(input);
  });

  ipcMain.handle(IPC_CHANNELS.FOLDER_LIST, async () => {
    return getAllFolders();
  });

  ipcMain.handle(IPC_CHANNELS.FOLDER_GET_TREE, async () => {
    return {
      folders: getFolderTree(),
      uncategorizedCount: getUncategorizedCount(),
      totalCount: getTotalCaptureCount(),
    };
  });

  ipcMain.handle(IPC_CHANNELS.FOLDER_UPDATE, async (_event, id: number, input) => {
    return updateFolder(id, input);
  });

  ipcMain.handle(IPC_CHANNELS.FOLDER_DELETE, async (_event, id: number) => {
    return deleteFolder(id);
  });

  // Batch operation handlers
  ipcMain.handle(IPC_CHANNELS.CAPTURES_MOVE_TO_FOLDER, async (_event, captureIds: number[], folderId: number | null) => {
    return moveCapturesTo(captureIds, folderId);
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURES_DELETE_BATCH, async (_event, captureIds: number[]) => {
    return deleteCapturesBatch(captureIds);
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURES_TAG_BATCH, async (_event, captureIds: number[], tagId: number, action: 'add' | 'remove') => {
    if (action === 'add') {
      return addTagToCapturesBatch(captureIds, tagId);
    } else {
      return removeTagFromCapturesBatch(captureIds, tagId);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURE_TOGGLE_STAR, async (_event, captureId: number) => {
    return toggleCaptureStar(captureId);
  });

  ipcMain.handle(IPC_CHANNELS.CAPTURES_STAR_BATCH, async (_event, captureIds: number[], starred: boolean) => {
    return toggleCapturesBatchStar(captureIds, starred);
  });

  // Cleanup rule handlers
  ipcMain.handle(IPC_CHANNELS.CLEANUP_RULE_CREATE, async (_event, input: CreateCleanupRuleInput) => {
    return createCleanupRule(input);
  });

  ipcMain.handle(IPC_CHANNELS.CLEANUP_RULE_UPDATE, async (_event, id: number, input: UpdateCleanupRuleInput) => {
    return updateCleanupRule(id, input);
  });

  ipcMain.handle(IPC_CHANNELS.CLEANUP_RULE_DELETE, async (_event, id: number) => {
    return deleteCleanupRule(id);
  });

  ipcMain.handle(IPC_CHANNELS.CLEANUP_RULE_LIST, async () => {
    return getAllCleanupRules();
  });

  ipcMain.handle(IPC_CHANNELS.CLEANUP_PREVIEW, async (_event, ruleId: number) => {
    return previewCleanup(ruleId);
  });

  ipcMain.handle(IPC_CHANNELS.CLEANUP_EXECUTE, async (_event, ruleId: number) => {
    return executeCleanup(ruleId);
  });

  ipcMain.handle(IPC_CHANNELS.CLEANUP_HISTORY, async () => {
    return getCleanupHistory();
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

  // Initialize recording IPC handlers (for countdown)
  initializeRecordingIpc();
}
