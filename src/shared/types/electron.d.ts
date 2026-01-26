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

export interface FileQueryOptions {
  type?: 'screenshot' | 'video' | 'all';
  dateRange?: 'today' | 'week' | 'month' | 'all';
  startDate?: string;
  endDate?: string;
  tags?: number[];
  search?: string;
  limit?: number;
  offset?: number;
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
  openFile: (filepath: string) => Promise<void>;
  openInFolder: (filepath: string) => void;

  // Tags
  getAllTags: () => Promise<Tag[]>;
  createTag: (name: string) => Promise<Tag>;
  deleteTag: (id: number) => Promise<void>;
  addTagToCapture: (captureId: number, tagId: number) => Promise<void>;
  removeTagFromCapture: (captureId: number, tagId: number) => Promise<void>;

  // Settings
  getSettings: () => Promise<AppSettings>;
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  selectSavePath: () => Promise<{ success: boolean; path?: string; error?: string }>;

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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
