import type {
  ScreenshotOptions,
  RecordingOptions,
  CaptureResult,
  CaptureFile,
  Tag,
  DisplayInfo,
  RecordingState,
} from './capture';
import type { AppSettings, ShortcutConfig } from './settings';
import type { Folder, FolderTree, CreateFolderInput, UpdateFolderInput } from './folder';
import type { CleanupRule, CreateCleanupRuleInput, UpdateCleanupRuleInput, CleanupPreview, CleanupResult, CleanupHistoryEntry } from './cleanup';

export type PermissionState = 'granted' | 'denied' | 'not-determined' | 'not-applicable' | 'restricted';

export interface PermissionStatus {
  screen: PermissionState;
  microphone: PermissionState;
  platform: 'darwin' | 'win32' | 'linux';
}

export interface FileQueryOptions {
  type?: 'screenshot' | 'video' | 'all';
  dateRange?: 'today' | 'week' | 'month' | 'all';
  startDate?: string;
  endDate?: string;
  tags?: number[];
  search?: string;
  folderId?: number | null | 'uncategorized';
  limit?: number;
  offset?: number;
}

export interface FolderTreeResponse {
  folders: FolderTree[];
  uncategorizedCount: number;
  totalCount: number;
}

export interface RecordingStartData {
  sourceId: string;
  options: RecordingOptions;
  display: {
    width: number;
    height: number;
    scaleFactor: number;
  };
  videoQuality: 'low' | 'medium' | 'high';
}

export interface RecordingData {
  buffer: ArrayBuffer;
  width: number;
  height: number;
}

export interface CountdownData {
  duration: number;
  options: RecordingOptions;
  sourceId: string;
  display: {
    width: number;
    height: number;
    scaleFactor: number;
  };
}

export interface OverlayInitData {
  mode: 'countdown' | 'recording';
  countdownDuration?: number;
}

export interface OverlayRecordingStatusData {
  duration: number;
  isPaused: boolean;
}

export interface AreaBorderInitData {
  area: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  screenBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  countdownDuration?: number;
}

export interface AreaBorderUpdateData {
  area: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ElectronAPI {
  // Capture
  takeScreenshot: (options: ScreenshotOptions) => Promise<CaptureResult>;
  startRecording: (options: RecordingOptions) => Promise<void>;
  stopRecording: () => Promise<CaptureResult>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;

  // Files
  getAllFiles: (options?: FileQueryOptions) => Promise<CaptureFile[]>;
  deleteFile: (id: number) => Promise<void>;
  renameFile: (id: number, newFilename: string) => Promise<{ success: boolean; error?: string; capture?: CaptureFile }>;
  openFile: (filepath: string) => Promise<void>;
  openInFolder: (filepath: string) => void;
  startDrag: (filePaths: string[], iconPath?: string) => void;

  // Tags
  getAllTags: () => Promise<Tag[]>;
  createTag: (name: string) => Promise<Tag>;
  deleteTag: (id: number) => Promise<void>;
  addTagToCapture: (captureId: number, tagId: number) => Promise<void>;
  removeTagFromCapture: (captureId: number, tagId: number) => Promise<void>;

  // Folders
  createFolder: (input: CreateFolderInput) => Promise<Folder>;
  getAllFolders: () => Promise<Folder[]>;
  getFolderTree: () => Promise<FolderTreeResponse>;
  updateFolder: (id: number, input: UpdateFolderInput) => Promise<Folder | null>;
  deleteFolder: (id: number) => Promise<void>;

  // Batch operations
  moveCapturesTo: (captureIds: number[], folderId: number | null) => Promise<void>;
  deleteCapturesBatch: (captureIds: number[]) => Promise<void>;
  tagCapturesBatch: (captureIds: number[], tagId: number, action: 'add' | 'remove') => Promise<void>;
  toggleCaptureStar: (captureId: number) => Promise<boolean>;
  starCapturesBatch: (captureIds: number[], starred: boolean) => Promise<void>;

  // Cleanup rules
  createCleanupRule: (input: CreateCleanupRuleInput) => Promise<CleanupRule>;
  updateCleanupRule: (id: number, input: UpdateCleanupRuleInput) => Promise<CleanupRule | null>;
  deleteCleanupRule: (id: number) => Promise<void>;
  getAllCleanupRules: () => Promise<CleanupRule[]>;
  previewCleanup: (ruleId: number) => Promise<CleanupPreview>;
  executeCleanup: (ruleId: number) => Promise<CleanupResult>;
  getCleanupHistory: () => Promise<CleanupHistoryEntry[]>;

  // Settings
  getSettings: () => Promise<AppSettings>;
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  selectSavePath: () => Promise<{ success: boolean; path?: string; error?: string }>;

  // Permissions
  getPermissionStatus: () => Promise<PermissionStatus>;
  requestMicrophonePermission: () => Promise<PermissionState>;
  openScreenRecordingSettings: () => void;
  openMicrophoneSettings: () => void;

  // Shortcuts
  getShortcuts: () => Promise<ShortcutConfig>;
  updateShortcut: (actionId: string, accelerator: string) => Promise<{ success: boolean; error?: string }>;
  resetShortcuts: () => Promise<void>;

  // Window
  showDashboard: () => void;
  hideWindow: () => void;
  minimizeWindow: () => void;
  closeWindow: () => void;

  // Screen
  getDisplays: () => Promise<DisplayInfo[]>;
  getScreenSources: () => Promise<Electron.DesktopCapturerSource[]>;

  // Events
  onCaptureComplete: (callback: (result: CaptureResult) => void) => () => void;
  onRecordingStatus: (callback: (state: RecordingState) => void) => () => void;
  onShortcutTriggered: (callback: (actionId: string) => void) => () => void;
  onPreviewData: (callback: (data: CaptureResult) => void) => () => void;

  // Recording commands (main -> renderer)
  onRecordingStart: (callback: (data: RecordingStartData) => void) => () => void;
  onRecordingStop: (callback: () => void) => () => void;
  onRecordingPause: (callback: () => void) => () => void;
  onRecordingResume: (callback: () => void) => () => void;
  sendRecordingData: (data: RecordingData) => void;
  sendRecordingStartFailed: () => void;

  // Countdown
  onRecordingCountdown: (callback: (data: CountdownData) => void) => () => void;
  sendCountdownComplete: () => void;
  sendCountdownCancel: () => void;

  // Shortcut events
  onRecordWindowShortcut: (callback: () => void) => () => void;

  // Recording overlay events
  onOverlayInit: (callback: (data: OverlayInitData) => void) => () => void;
  onOverlaySwitchMode: (callback: (data: { mode: 'countdown' | 'recording' }) => void) => () => void;
  onOverlayRecordingStatus: (callback: (data: OverlayRecordingStatusData) => void) => () => void;

  // Area border overlay events
  onAreaBorderInit: (callback: (data: AreaBorderInitData) => void) => () => void;
  onAreaBorderUpdate: (callback: (data: AreaBorderUpdateData) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
