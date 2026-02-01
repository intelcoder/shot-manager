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
  FILE_RENAME: 'file:rename',
  FILE_OPEN: 'file:open',
  FILE_OPEN_FOLDER: 'file:open-folder',
  FILE_GET_THUMBNAIL: 'file:get-thumbnail',

  // Tags
  TAG_ADD: 'tag:add',
  TAG_REMOVE: 'tag:remove',
  TAG_GET_ALL: 'tag:get-all',
  TAG_CREATE: 'tag:create',
  TAG_DELETE: 'tag:delete',

  // Folders
  FOLDER_CREATE: 'folder:create',
  FOLDER_UPDATE: 'folder:update',
  FOLDER_DELETE: 'folder:delete',
  FOLDER_LIST: 'folder:list',
  FOLDER_GET_TREE: 'folder:get-tree',

  // Batch operations
  CAPTURES_MOVE_TO_FOLDER: 'captures:move-to-folder',
  CAPTURES_DELETE_BATCH: 'captures:delete-batch',
  CAPTURES_TAG_BATCH: 'captures:tag-batch',
  CAPTURE_TOGGLE_STAR: 'capture:toggle-star',
  CAPTURES_STAR_BATCH: 'captures:star-batch',

  // Cleanup rules
  CLEANUP_RULE_CREATE: 'cleanup:rule:create',
  CLEANUP_RULE_UPDATE: 'cleanup:rule:update',
  CLEANUP_RULE_DELETE: 'cleanup:rule:delete',
  CLEANUP_RULE_LIST: 'cleanup:rule:list',
  CLEANUP_PREVIEW: 'cleanup:preview',
  CLEANUP_EXECUTE: 'cleanup:execute',
  CLEANUP_HISTORY: 'cleanup:history',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_SELECT_SAVE_PATH: 'settings:select-save-path',

  // Permissions
  PERMISSIONS_GET_STATUS: 'permissions:get-status',
  PERMISSIONS_REQUEST_MICROPHONE: 'permissions:request-microphone',
  PERMISSIONS_OPEN_SCREEN_SETTINGS: 'permissions:open-screen-settings',
  PERMISSIONS_OPEN_MICROPHONE_SETTINGS: 'permissions:open-microphone-settings',

  // Shortcuts
  SHORTCUT_UPDATE: 'shortcut:update',
  SHORTCUT_RESET: 'shortcut:reset',
  SHORTCUT_GET_ALL: 'shortcut:get-all',
  SHORTCUT_RECORD_WINDOW: 'shortcut:record-window',
  SHORTCUT_RECORD_FULL: 'shortcut:record-full',

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
  ON_PREVIEW_DATA: 'preview:data',

  // Recording commands (main -> renderer)
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop',
  RECORDING_PAUSE: 'recording:pause',
  RECORDING_RESUME: 'recording:resume',
  RECORDING_DATA: 'recording:data',

  // Countdown (main <-> renderer)
  RECORDING_COUNTDOWN: 'recording:countdown',
  RECORDING_COUNTDOWN_COMPLETE: 'recording:countdown-complete',
  RECORDING_COUNTDOWN_CANCEL: 'recording:countdown-cancel',

  // Recording overlay (main -> renderer)
  OVERLAY_INIT: 'overlay:init',
  OVERLAY_SWITCH_MODE: 'overlay:switch-mode',
  OVERLAY_RECORDING_STATUS: 'overlay:recording-status',
  OVERLAY_UPDATE: 'overlay:update',

  // Area border overlay (main -> renderer)
  AREA_BORDER_INIT: 'area-border:init',
  AREA_BORDER_UPDATE: 'area-border:update',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
