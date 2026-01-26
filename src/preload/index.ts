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
  openFile: (filepath) =>
    ipcRenderer.invoke(IPC_CHANNELS.FILE_OPEN, filepath),
  openInFolder: (filepath) =>
    ipcRenderer.send(IPC_CHANNELS.FILE_OPEN_FOLDER, filepath),

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

  // Settings
  getSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  setSetting: (key, value) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
  selectSavePath: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SELECT_SAVE_PATH),

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
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
