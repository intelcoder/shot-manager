import { systemPreferences, shell } from 'electron';

export type PermissionState = 'granted' | 'denied' | 'not-determined' | 'not-applicable';

export interface PermissionStatus {
  screen: PermissionState;
  microphone: PermissionState;
  platform: 'darwin' | 'win32' | 'linux';
}

/**
 * Get the current permission status for screen recording and microphone
 */
export function getPermissionStatus(): PermissionStatus {
  const platform = process.platform as 'darwin' | 'win32' | 'linux';

  if (platform === 'darwin') {
    return {
      screen: getScreenPermissionMac(),
      microphone: getMicrophonePermissionMac(),
      platform,
    };
  }

  // Windows and Linux don't require explicit screen recording permission
  return {
    screen: 'not-applicable',
    microphone: platform === 'win32' ? getMicrophonePermissionWindows() : 'not-applicable',
    platform,
  };
}

/**
 * Get screen recording permission status on macOS
 */
function getScreenPermissionMac(): PermissionState {
  const status = systemPreferences.getMediaAccessStatus('screen');
  return mapMediaAccessStatus(status);
}

/**
 * Get microphone permission status on macOS
 */
function getMicrophonePermissionMac(): PermissionState {
  const status = systemPreferences.getMediaAccessStatus('microphone');
  return mapMediaAccessStatus(status);
}

/**
 * Get microphone permission status on Windows
 */
function getMicrophonePermissionWindows(): PermissionState {
  // Windows media access status is available via systemPreferences
  try {
    const status = systemPreferences.getMediaAccessStatus('microphone');
    return mapMediaAccessStatus(status);
  } catch {
    // Fallback if not supported
    return 'not-determined';
  }
}

/**
 * Map Electron's media access status to our PermissionState type
 */
function mapMediaAccessStatus(status: string): PermissionState {
  switch (status) {
    case 'granted':
      return 'granted';
    case 'denied':
      return 'denied';
    case 'restricted':
      return 'denied';
    case 'not-determined':
    case 'unknown':
    default:
      return 'not-determined';
  }
}

/**
 * Request microphone permission
 * On macOS, this triggers the system permission prompt
 * On Windows, this may also trigger a prompt depending on privacy settings
 */
export async function requestMicrophonePermission(): Promise<PermissionState> {
  if (process.platform === 'darwin') {
    try {
      const granted = await systemPreferences.askForMediaAccess('microphone');
      return granted ? 'granted' : 'denied';
    } catch (error) {
      console.error('[Permissions] Failed to request microphone access:', error);
      return 'denied';
    }
  }

  // On Windows, just return current status as there's no direct API to request
  return getPermissionStatus().microphone;
}

/**
 * Open macOS System Preferences to the Screen Recording section
 * Note: Screen recording permission cannot be requested programmatically on macOS
 */
export function openScreenRecordingSettings(): void {
  if (process.platform === 'darwin') {
    // Open Privacy & Security > Screen Recording on macOS
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
  }
}

/**
 * Open system settings for microphone permissions
 */
export function openMicrophoneSettings(): void {
  if (process.platform === 'darwin') {
    // Open Privacy & Security > Microphone on macOS
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
  } else if (process.platform === 'win32') {
    // Open Windows Settings > Privacy > Microphone
    shell.openExternal('ms-settings:privacy-microphone');
  }
}
