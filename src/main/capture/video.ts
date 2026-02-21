import { desktopCapturer, screen, BrowserWindow, ipcMain } from 'electron';
import { saveVideo } from '../services/file-manager';
import { getSetting } from '../services/settings';
import { showPreviewPopup } from '../windows/preview-window';
import { closeCaptureOverlay } from '../windows/capture-window';
import { getMainWindow } from '../windows/main-window';
import { showRecordingOverlay, updateRecordingOverlay, transitionToRecording, closeRecordingOverlay } from '../windows/recording-overlay-window';
import { showAreaBorderOverlay, closeAreaBorderOverlay } from '../windows/area-border-window';
import { setTrayRecording } from '../tray';
import { IPC_CHANNELS } from '../../shared/constants/channels';
import type { RecordingOptions, CaptureResult, RecordingState, SelectionArea } from '../../shared/types/capture';

let recordingState: RecordingState = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  startTime: null,
};

let durationInterval: NodeJS.Timeout | null = null;
let currentRecordingWindow: BrowserWindow | null = null;
let pendingRecordingData: {
  sourceId: string;
  options: RecordingOptions;
  display: { width: number; height: number; scaleFactor: number };
} | null = null;

export function getRecordingState(): RecordingState {
  return { ...recordingState };
}

function forceResetRecordingState(): void {
  console.warn('Force-resetting stuck recording state');
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }
  recordingState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    startTime: null,
  };
  setTrayRecording(false);
  currentRecordingWindow = null;
  pendingRecordingData = null;
  closeRecordingOverlay();
  closeAreaBorderOverlay();
  broadcastRecordingStatus();
}

export async function startRecording(options: RecordingOptions): Promise<void> {
  if (recordingState.isRecording) {
    // Force-reset stuck state so the user can start a new recording
    forceResetRecordingState();
  }

  // Also cancel any pending countdown
  if (pendingRecordingData) {
    pendingRecordingData = null;
    closeRecordingOverlay();
    closeAreaBorderOverlay();
  }

  // Close capture overlay if open
  closeCaptureOverlay();

  // Get the target display
  const display = options.displayId
    ? screen.getAllDisplays().find((d) => d.id === options.displayId)
    : screen.getPrimaryDisplay();

  if (!display) {
    throw new Error('Display not found');
  }

  // Get screen sources - include windows if mode is 'window'
  const sourceTypes: ('screen' | 'window')[] = options.mode === 'window' ? ['window'] : ['screen'];
  const sources = await desktopCapturer.getSources({
    types: sourceTypes,
  });

  let source: Electron.DesktopCapturerSource | undefined;

  if (options.mode === 'window' && options.windowId) {
    // Find the specific window by ID
    source = sources.find((s) => s.id === options.windowId);
  } else {
    // Find the screen source for the display
    source = sources.find((s) => {
      if (s.display_id) {
        return s.display_id === display.id.toString();
      }
      return s.name.toLowerCase().includes('screen');
    });
  }

  if (!source) {
    throw new Error('Source not found');
  }

  const videoQuality = getSetting('videoQuality') as 'low' | 'medium' | 'high';

  const recordingData = {
    sourceId: source.id,
    options,
    display: {
      width: display.size.width,
      height: display.size.height,
      scaleFactor: display.scaleFactor,
    },
    videoQuality,
  };

  // Check if countdown is enabled
  const countdownEnabled = getSetting('countdownEnabled');
  const countdownDuration = getSetting('countdownDuration');

  if (countdownEnabled && countdownDuration > 0) {
    // Store pending recording data and send countdown event
    pendingRecordingData = recordingData;

    if (options.mode === 'area' && options.area) {
      // Area mode: show countdown integrated into the area border overlay
      showAreaBorderOverlay(options.area, countdownDuration);
    } else {
      // Non-area: show floating countdown overlay
      showRecordingOverlay('countdown', countdownDuration);
    }
  } else {
    // Show area border overlay for area recording
    if (options.mode === 'area' && options.area) {
      showAreaBorderOverlay(options.area);
    }

    // Start recording immediately with overlay
    showRecordingOverlay('recording');
    startRecordingImmediate(recordingData);
  }
}

function startRecordingImmediate(data: {
  sourceId: string;
  options: RecordingOptions;
  display: { width: number; height: number; scaleFactor: number };
}): void {
  // Update state
  recordingState = {
    isRecording: true,
    isPaused: false,
    duration: 0,
    startTime: Date.now(),
  };

  // Update tray
  setTrayRecording(true, 0);

  // Start duration timer
  durationInterval = setInterval(() => {
    if (recordingState.isRecording && !recordingState.isPaused && recordingState.startTime) {
      recordingState.duration = Math.floor((Date.now() - recordingState.startTime) / 1000);
      setTrayRecording(true, recordingState.duration);
      broadcastRecordingStatus();

      // Update the floating overlay
      updateRecordingOverlay({
        duration: recordingState.duration,
        isPaused: recordingState.isPaused,
      });

      // Check max duration limit
      const maxDuration = getSetting('maxRecordingDuration');
      if (maxDuration > 0 && recordingState.duration >= maxDuration) {
        console.log(`Max recording duration reached: ${maxDuration}s`);
        stopRecording();
      }
    }
  }, 1000);

  // Send start signal to renderer with source info
  const mainWindow = getMainWindow();
  if (mainWindow) {
    currentRecordingWindow = mainWindow;
    mainWindow.webContents.send(IPC_CHANNELS.RECORDING_START, data);
  }

  broadcastRecordingStatus();
}

export async function startFullScreenRecording(displayId?: number): Promise<void> {
  const audioEnabled = getSetting('audioEnabled');
  const audioDevice = getSetting('defaultAudioDevice');

  return startRecording({
    mode: 'fullscreen',
    displayId,
    audio: {
      enabled: audioEnabled,
      deviceId: audioDevice || undefined,
    },
  });
}

export async function startAreaRecording(area: SelectionArea, displayId?: number): Promise<void> {
  const audioEnabled = getSetting('audioEnabled');
  const audioDevice = getSetting('defaultAudioDevice');

  return startRecording({
    mode: 'area',
    displayId,
    area,
    audio: {
      enabled: audioEnabled,
      deviceId: audioDevice || undefined,
    },
  });
}

export function pauseRecording(): void {
  if (!recordingState.isRecording || recordingState.isPaused) return;

  recordingState.isPaused = true;

  if (currentRecordingWindow) {
    currentRecordingWindow.webContents.send(IPC_CHANNELS.RECORDING_PAUSE);
  }

  // Update overlay
  updateRecordingOverlay({
    duration: recordingState.duration,
    isPaused: true,
  });

  broadcastRecordingStatus();
}

export function resumeRecording(): void {
  if (!recordingState.isRecording || !recordingState.isPaused) return;

  recordingState.isPaused = false;

  if (currentRecordingWindow) {
    currentRecordingWindow.webContents.send(IPC_CHANNELS.RECORDING_RESUME);
  }

  // Update overlay
  updateRecordingOverlay({
    duration: recordingState.duration,
    isPaused: false,
  });

  broadcastRecordingStatus();
}

export async function stopRecording(): Promise<CaptureResult | null> {
  if (!recordingState.isRecording) {
    return null;
  }

  // Clear timer
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }

  // Update tray
  setTrayRecording(false);

  const duration = recordingState.duration;

  // Reset state
  recordingState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
    startTime: null,
  };

  // Broadcast stopped status immediately so UI updates right away
  broadcastRecordingStatus();

  // Request video data from renderer BEFORE closing overlay windows
  return new Promise((resolve) => {
    if (currentRecordingWindow) {
      let timeoutId: NodeJS.Timeout | null = null;

      // Set up one-time listener for recording data
      const handler = async (_event: Electron.IpcMainEvent, data: { buffer: ArrayBuffer; width: number; height: number }) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        currentRecordingWindow = null;

        // Close overlay windows after data is received
        closeRecordingOverlay();
        closeAreaBorderOverlay();

        if (!data || !data.buffer || data.buffer.byteLength === 0) {
          broadcastRecordingStatus();
          resolve(null);
          return;
        }

        try {
          const buffer = Buffer.from(data.buffer);
          const result = await saveVideo(buffer, duration, data.width, data.height);

          // Show preview if enabled
          const showPreview = getSetting('showPreview');
          const previewDuration = getSetting('previewDuration');

          if (showPreview) {
            showPreviewPopup(result, previewDuration * 1000);
          }

          // Notify all windows
          BrowserWindow.getAllWindows().forEach((win) => {
            win.webContents.send('on:capture-complete', result);
          });

          broadcastRecordingStatus();
          resolve(result);
        } catch (error) {
          console.error('Error saving video:', error);
          broadcastRecordingStatus();
          resolve(null);
        }
      };

      ipcMain.once(IPC_CHANNELS.RECORDING_DATA, handler);

      // Safety timeout: if recording data never arrives, clean up anyway
      timeoutId = setTimeout(() => {
        console.warn('Recording data timeout - cleaning up');
        ipcMain.removeListener(IPC_CHANNELS.RECORDING_DATA, handler);
        currentRecordingWindow = null;
        closeRecordingOverlay();
        closeAreaBorderOverlay();
        broadcastRecordingStatus();
        resolve(null);
      }, 10000);

      // Send stop signal while window is still alive
      currentRecordingWindow.webContents.send(IPC_CHANNELS.RECORDING_STOP);
    } else {
      // No recording window — clean up overlays anyway
      closeRecordingOverlay();
      closeAreaBorderOverlay();
      broadcastRecordingStatus();
      resolve(null);
    }
  });
}

function broadcastRecordingStatus(): void {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((win) => {
    win.webContents.send('on:recording-status', recordingState);
  });
}

// Initialize IPC handlers for countdown
export function initializeRecordingIpc(): void {
  ipcMain.on(IPC_CHANNELS.RECORDING_COUNTDOWN_COMPLETE, () => {
    console.log('Countdown complete, starting recording');
    if (pendingRecordingData) {
      if (pendingRecordingData.options.mode === 'area') {
        // Area: countdown was in area-border overlay, create new recording overlay
        showRecordingOverlay('recording');
      } else {
        // Non-area: countdown was in recording overlay, transition it
        transitionToRecording();
      }
      startRecordingImmediate(pendingRecordingData);
      pendingRecordingData = null;
    }
  });

  ipcMain.on(IPC_CHANNELS.RECORDING_COUNTDOWN_CANCEL, () => {
    console.log('Countdown cancelled');
    pendingRecordingData = null;
    closeRecordingOverlay();
    closeAreaBorderOverlay();
  });

  // Handle renderer reporting that recording failed to start
  ipcMain.on(IPC_CHANNELS.RECORDING_START_FAILED, () => {
    console.warn('Recording start failed in renderer, resetting state');
    forceResetRecordingState();
  });
}
