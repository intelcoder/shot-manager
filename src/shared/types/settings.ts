export interface AppSettings {
  // General
  launchAtStartup: boolean;
  showInMenuBar: boolean;
  showInTaskbar: boolean;

  // Files
  savePath: string;
  filePrefix: string;
  screenshotFormat: 'png' | 'jpg';
  videoFormat: 'webm' | 'mp4';
  organizationStyle: 'date' | 'flat';

  // Capture
  playSound: boolean;
  showPreview: boolean;
  previewDuration: number;
  copyToClipboard: boolean;

  // Recording
  videoQuality: 'low' | 'medium' | 'high';
  audioEnabled: boolean;
  defaultAudioDevice: string | null;
  maxRecordingDuration: number; // seconds, 0 = unlimited

  // Countdown
  countdownEnabled: boolean;
  countdownDuration: 3 | 5 | 10;
}

export interface ShortcutConfig {
  [actionId: string]: string;
}

export interface ShortcutAction {
  id: string;
  label: string;
  description: string;
  category: 'capture' | 'recording' | 'app';
  defaultShortcut: string;
}

export const SHORTCUT_ACTIONS: ShortcutAction[] = [
  {
    id: 'screenshot-full',
    label: 'Screenshot (Full Screen)',
    description: 'Capture the entire screen',
    category: 'capture',
    defaultShortcut: 'CommandOrControl+Shift+3',
  },
  {
    id: 'screenshot-area',
    label: 'Screenshot (Select Area)',
    description: 'Select and capture a region',
    category: 'capture',
    defaultShortcut: 'CommandOrControl+Shift+4',
  },
  {
    id: 'record-full',
    label: 'Record (Full Screen)',
    description: 'Start recording entire screen',
    category: 'recording',
    defaultShortcut: 'CommandOrControl+Shift+5',
  },
  {
    id: 'record-area',
    label: 'Record (Select Area)',
    description: 'Select and record a region',
    category: 'recording',
    defaultShortcut: 'CommandOrControl+Shift+6',
  },
  {
    id: 'record-window',
    label: 'Record (Window)',
    description: 'Record a specific window',
    category: 'recording',
    defaultShortcut: 'CommandOrControl+Shift+7',
  },
  {
    id: 'record-stop',
    label: 'Stop Recording',
    description: 'Stop current recording',
    category: 'recording',
    defaultShortcut: 'CommandOrControl+Shift+0',
  },
  {
    id: 'open-dashboard',
    label: 'Open Dashboard',
    description: 'Show the main window',
    category: 'app',
    defaultShortcut: 'CommandOrControl+Shift+D',
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  launchAtStartup: false,
  showInMenuBar: true,
  showInTaskbar: true,
  savePath: '',
  filePrefix: 'Screenshot',
  screenshotFormat: 'png',
  videoFormat: 'webm',
  organizationStyle: 'date',
  playSound: true,
  showPreview: true,
  previewDuration: 5,
  copyToClipboard: true,
  videoQuality: 'high',
  audioEnabled: false,
  defaultAudioDevice: null,
  maxRecordingDuration: 0, // 0 = unlimited
  countdownEnabled: true,
  countdownDuration: 3,
};
