import { desktopCapturer, screen, BrowserWindow } from 'electron';
import { saveVideo } from '../services/file-manager';
import { getSetting } from '../services/settings';
import { showPreviewPopup } from '../windows/preview-window';
import { closeCaptureOverlay } from '../windows/capture-window';
import { setTrayRecording } from '../tray';
import type { RecordingOptions, CaptureResult, RecordingState, SelectionArea } from '../../shared/types/capture';

let recordingState: RecordingState = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  startTime: null,
};

let durationInterval: NodeJS.Timeout | null = null;
let currentRecordingWindow: BrowserWindow | null = null;

export function getRecordingState(): RecordingState {
  return { ...recordingState };
}

export async function startRecording(options: RecordingOptions): Promise<void> {
  if (recordingState.isRecording) {
    throw new Error('Already recording');
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

  // Get screen sources
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
  });

  const source = sources.find((s) => {
    if (s.display_id) {
      return s.display_id === display.id.toString();
    }
    return s.name.toLowerCase().includes('screen');
  });

  if (!source) {
    throw new Error('Screen source not found');
  }

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
    }
  }, 1000);

  // Send start signal to renderer with source info
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    currentRecordingWindow = mainWindow;
    mainWindow.webContents.send('recording:start', {
      sourceId: source.id,
      options,
      display: {
        width: display.size.width,
        height: display.size.height,
        scaleFactor: display.scaleFactor,
      },
    });
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
    currentRecordingWindow.webContents.send('recording:pause');
  }

  broadcastRecordingStatus();
}

export function resumeRecording(): void {
  if (!recordingState.isRecording || !recordingState.isPaused) return;

  recordingState.isPaused = false;

  if (currentRecordingWindow) {
    currentRecordingWindow.webContents.send('recording:resume');
  }

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

  // Request video data from renderer
  return new Promise((resolve) => {
    if (currentRecordingWindow) {
      // Set up one-time listener for recording data
      const handler = async (_event: Electron.IpcMainEvent, data: { buffer: ArrayBuffer; width: number; height: number }) => {
        currentRecordingWindow = null;

        if (!data || !data.buffer) {
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

      const { ipcMain } = require('electron');
      ipcMain.once('recording:data', handler);

      currentRecordingWindow.webContents.send('recording:stop');
    } else {
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
