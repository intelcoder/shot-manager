import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants/channels';
import type { ElectronAPI } from '../shared/types/electron.d';

const electronAPI: ElectronAPI = {
  // Capture
  takeScreenshot: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_SCREENSHOT, options),
  startRecording: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_VIDEO_START, options),
  stopRecording: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_VIDEO_STOP),
  pauseRecording: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_VIDEO_PAUSE),
  resumeRecording: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_VIDEO_RESUME),

  // Files
  getAllFiles: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_GET_ALL, options),
  deleteFile: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_DELETE, id),
  renameFile: (id, newFilename) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_RENAME, id, newFilename),
  openFile: (filepath) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN, filepath),
  openInFolder: (filepath) =>
    ipcRenderer.send(IPC_CHANNELS.FILE_OPEN_FOLDER, filepath),
  startDrag: (filePaths, iconPath) =>
    ipcRenderer.send(IPC_CHANNELS.FILE_START_DRAG, filePaths, iconPath),

  // Tags
  getAllTags: () =>
    ipcRenderer.invoke(IPC_CHANNELS.TAG_GET_ALL),
  createTag: (name) =>
    ipcRenderer.invoke(IPC_CHANNELS.TAG_CREATE, name),
  deleteTag: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.TAG_DELETE, id),
  addTagToCapture: (captureId, tagId) =>
    ipcRenderer.invoke(IPC_CHANNELS.TAG_ADD, captureId, tagId),
  removeTagFromCapture: (captureId, tagId) =>
    ipcRenderer.invoke(IPC_CHANNELS.TAG_REMOVE, captureId, tagId),

  // Folders
  createFolder: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLDER_CREATE, input),
  getAllFolders: () =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLDER_LIST),
  getFolderTree: () =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLDER_GET_TREE),
  updateFolder: (id, input) =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLDER_UPDATE, id, input),
  deleteFolder: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.FOLDER_DELETE, id),

  // Batch operations
  moveCapturesTo: (captureIds, folderId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURES_MOVE_TO_FOLDER, captureIds, folderId),
  deleteCapturesBatch: (captureIds) =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURES_DELETE_BATCH, captureIds),
  tagCapturesBatch: (captureIds, tagId, action) =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURES_TAG_BATCH, captureIds, tagId, action),
  toggleCaptureStar: (captureId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURE_TOGGLE_STAR, captureId),
  starCapturesBatch: (captureIds, starred) =>
    ipcRenderer.invoke(IPC_CHANNELS.CAPTURES_STAR_BATCH, captureIds, starred),
  saveAnnotations: (captureId, annotationsJson) =>
    ipcRenderer.invoke(IPC_CHANNELS.ANNOTATION_SAVE, captureId, annotationsJson),
  exportAnnotatedImage: (captureId, dataUrl) =>
    ipcRenderer.invoke(IPC_CHANNELS.ANNOTATION_EXPORT, captureId, dataUrl),

  // Cleanup rules
  createCleanupRule: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CLEANUP_RULE_CREATE, input),
  updateCleanupRule: (id, input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CLEANUP_RULE_UPDATE, id, input),
  deleteCleanupRule: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.CLEANUP_RULE_DELETE, id),
  getAllCleanupRules: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CLEANUP_RULE_LIST),
  previewCleanup: (ruleId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CLEANUP_PREVIEW, ruleId),
  executeCleanup: (ruleId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CLEANUP_EXECUTE, ruleId),
  getCleanupHistory: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CLEANUP_HISTORY),

  // Settings
  getSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  setSetting: (key, value) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
  selectSavePath: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_SAVE_PATH),

  // Permissions
  getPermissionStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.PERMISSIONS_GET_STATUS),
  requestMicrophonePermission: () =>
    ipcRenderer.invoke(IPC_CHANNELS.PERMISSIONS_REQUEST_MICROPHONE),
  openScreenRecordingSettings: () =>
    ipcRenderer.send(IPC_CHANNELS.PERMISSIONS_OPEN_SCREEN_SETTINGS),
  openMicrophoneSettings: () =>
    ipcRenderer.send(IPC_CHANNELS.PERMISSIONS_OPEN_MICROPHONE_SETTINGS),

  // Shortcuts
  getShortcuts: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SHORTCUT_GET_ALL),
  updateShortcut: (actionId, accelerator) =>
    ipcRenderer.invoke(IPC_CHANNELS.SHORTCUT_UPDATE, actionId, accelerator),
  resetShortcuts: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SHORTCUT_RESET),

  // Window
  showDashboard: () =>
    ipcRenderer.send(IPC_CHANNELS.WINDOW_SHOW_DASHBOARD),
  hideWindow: () =>
    ipcRenderer.send(IPC_CHANNELS.WINDOW_HIDE),
  minimizeWindow: () =>
    ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
  closeWindow: () =>
    ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),

  // Screen
  getDisplays: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SCREEN_GET_DISPLAYS),
  getScreenSources: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SCREEN_GET_SOURCES),

  // Events
  onCaptureComplete: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, result: any) => callback(result);
    ipcRenderer.on(IPC_CHANNELS.ON_CAPTURE_COMPLETE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_CAPTURE_COMPLETE, handler);
  },
  onRecordingStatus: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, state: any) => callback(state);
    ipcRenderer.on(IPC_CHANNELS.ON_RECORDING_STATUS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_RECORDING_STATUS, handler);
  },
  onShortcutTriggered: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, actionId: string) => callback(actionId);
    ipcRenderer.on(IPC_CHANNELS.ON_SHORTCUT_TRIGGERED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_SHORTCUT_TRIGGERED, handler);
  },
  onPreviewData: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.ON_PREVIEW_DATA, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ON_PREVIEW_DATA, handler);
  },

  // Recording commands (main -> renderer)
  onRecordingStart: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.RECORDING_START, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_START, handler);
  },
  onRecordingStop: (callback) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.RECORDING_STOP, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_STOP, handler);
  },
  onRecordingPause: (callback) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.RECORDING_PAUSE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_PAUSE, handler);
  },
  onRecordingResume: (callback) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.RECORDING_RESUME, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_RESUME, handler);
  },
  sendRecordingData: (data) => {
    ipcRenderer.send(IPC_CHANNELS.RECORDING_DATA, data);
  },
  sendRecordingStartFailed: () => {
    ipcRenderer.send(IPC_CHANNELS.RECORDING_START_FAILED);
  },

  // Countdown
  onRecordingCountdown: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.RECORDING_COUNTDOWN, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_COUNTDOWN, handler);
  },
  sendCountdownComplete: () => {
    ipcRenderer.send(IPC_CHANNELS.RECORDING_COUNTDOWN_COMPLETE);
  },
  sendCountdownCancel: () => {
    ipcRenderer.send(IPC_CHANNELS.RECORDING_COUNTDOWN_CANCEL);
  },

  // Shortcut events
  onRecordWindowShortcut: (callback) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.SHORTCUT_RECORD_WINDOW, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SHORTCUT_RECORD_WINDOW, handler);
  },

  // Recording overlay events
  onOverlayInit: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.OVERLAY_INIT, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.OVERLAY_INIT, handler);
  },
  onOverlaySwitchMode: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.OVERLAY_SWITCH_MODE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.OVERLAY_SWITCH_MODE, handler);
  },
  onOverlayRecordingStatus: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.OVERLAY_RECORDING_STATUS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.OVERLAY_RECORDING_STATUS, handler);
  },

  // Area border overlay events
  onAreaBorderInit: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.AREA_BORDER_INIT, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AREA_BORDER_INIT, handler);
  },
  onAreaBorderUpdate: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.AREA_BORDER_UPDATE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.AREA_BORDER_UPDATE, handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
