export const IPC_CHANNELS = {
  // Capture
  CAPTURE_SCREENSHOT: 'capture:screenshot',
  CAPTURE_VIDEO_START: 'capture:video:start',
  CAPTURE_VIDEO_STOP: 'capture:video:stop',
  CAPTURE_VIDEO_PAUSE: 'capture:video:pause',
  CAPTURE_VIDEO_RESUME: 'capture:video:resume',

  // Files
  FILE_GET_ALL: 'file:get-all',
  FILE_DELETE: 'file:delete',
  FILE_OPEN: 'file:open',
  FILE_OPEN_FOLDER: 'file:open-folder',
  FILE_GET_THUMBNAIL: 'file:get-thumbnail',

  // Tags
  TAG_ADD: 'tag:add',
  TAG_REMOVE: 'tag:remove',
  TAG_GET_ALL: 'tag:get-all',
  TAG_CREATE: 'tag:create',
  TAG_DELETE: 'tag:delete',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_SELECT_SAVE_PATH: 'settings:select-save-path',

  // Shortcuts
  SHORTCUT_UPDATE: 'shortcut:update',
  SHORTCUT_RESET: 'shortcut:reset',
  SHORTCUT_GET_ALL: 'shortcut:get-all',

  // Window
  WINDOW_SHOW_DASHBOARD: 'window:show-dashboard',
  WINDOW_HIDE: 'window:hide',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_SHOW_CAPTURE_OVERLAY: 'window:show-capture-overlay',
  WINDOW_CLOSE_CAPTURE_OVERLAY: 'window:close-capture-overlay',

  // Screen
  SCREEN_GET_SOURCES: 'screen:get-sources',
  SCREEN_GET_DISPLAYS: 'screen:get-displays',

  // Events (main -> renderer)
  ON_CAPTURE_COMPLETE: 'on:capture-complete',
  ON_RECORDING_STATUS: 'on:recording-status',
  ON_SHORTCUT_TRIGGERED: 'on:shortcut-triggered',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
