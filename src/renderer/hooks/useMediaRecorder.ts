import { useEffect, useRef, useCallback } from 'react';
import type { RecordingStartData } from '../../shared/types/electron';
import type { RecordingOptions, SelectionArea } from '../../shared/types/capture';

interface MediaRecorderState {
  mediaRecorder: MediaRecorder | null;
  mediaStream: MediaStream | null;
  chunks: Blob[];
  width: number;
  height: number;
  area?: SelectionArea;
}

export function useMediaRecorder() {
  const stateRef = useRef<MediaRecorderState>({
    mediaRecorder: null,
    mediaStream: null,
    chunks: [],
    width: 0,
    height: 0,
    area: undefined,
  });

  const cleanup = useCallback(() => {
    const state = stateRef.current;

    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      try {
        state.mediaRecorder.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }

    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach((track) => track.stop());
    }

    stateRef.current = {
      mediaRecorder: null,
      mediaStream: null,
      chunks: [],
      width: 0,
      height: 0,
      area: undefined,
    };
  }, []);

  const startRecording = useCallback(async (data: RecordingStartData) => {
    try {
      // Clean up any existing recording
      cleanup();

      const { sourceId, options, display } = data;

      // Get video constraints based on quality and display
      const constraints = getVideoConstraints(sourceId, display, options);

      // Get the media stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Store dimensions for later
      const videoTrack = stream.getVideoTracks()[0];
      const trackSettings = videoTrack.getSettings();
      stateRef.current.width = trackSettings.width || display.width;
      stateRef.current.height = trackSettings.height || display.height;
      stateRef.current.area = options.area;
      stateRef.current.mediaStream = stream;
      stateRef.current.chunks = [];

      // Determine the best codec
      const mimeType = getSupportedMimeType();

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: getVideoBitrate(display.width, display.height),
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          stateRef.current.chunks.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        cleanup();
      };

      mediaRecorder.onstop = () => {
        // Data will be sent via handleStop
      };

      stateRef.current.mediaRecorder = mediaRecorder;

      // Start recording with 1-second timeslice for chunk collection
      mediaRecorder.start(1000);

      console.log('Recording started with constraints:', constraints);
    } catch (error) {
      console.error('Failed to start recording:', error);
      cleanup();
    }
  }, [cleanup]);

  const handleStop = useCallback(async () => {
    const state = stateRef.current;

    if (!state.mediaRecorder || state.mediaRecorder.state === 'inactive') {
      console.warn('No active recording to stop');
      return;
    }

    // Create a promise that resolves when we have all data
    const dataPromise = new Promise<void>((resolve) => {
      if (state.mediaRecorder) {
        state.mediaRecorder.onstop = () => resolve();
      } else {
        resolve();
      }
    });

    // Stop the recorder
    state.mediaRecorder.stop();

    // Wait for stop event
    await dataPromise;

    // Combine chunks into a single blob
    if (state.chunks.length > 0) {
      const blob = new Blob(state.chunks, { type: state.chunks[0].type });

      // Convert to ArrayBuffer
      const buffer = await blob.arrayBuffer();

      // Calculate actual dimensions (accounting for area selection)
      let width = state.width;
      let height = state.height;

      if (state.area) {
        width = state.area.width;
        height = state.area.height;
      }

      // Send data to main process
      window.electronAPI.sendRecordingData({
        buffer,
        width,
        height,
      });
    } else {
      // Send empty data to indicate failure
      window.electronAPI.sendRecordingData({
        buffer: new ArrayBuffer(0),
        width: 0,
        height: 0,
      });
    }

    // Clean up
    cleanup();
  }, [cleanup]);

  const handlePause = useCallback(() => {
    const { mediaRecorder } = stateRef.current;
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      console.log('Recording paused');
    }
  }, []);

  const handleResume = useCallback(() => {
    const { mediaRecorder } = stateRef.current;
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      console.log('Recording resumed');
    }
  }, []);

  useEffect(() => {
    // Set up IPC listeners for recording commands
    const unsubscribeStart = window.electronAPI?.onRecordingStart((data) => {
      console.log('Received recording:start', data);
      startRecording(data);
    });

    const unsubscribeStop = window.electronAPI?.onRecordingStop(() => {
      console.log('Received recording:stop');
      handleStop();
    });

    const unsubscribePause = window.electronAPI?.onRecordingPause(() => {
      console.log('Received recording:pause');
      handlePause();
    });

    const unsubscribeResume = window.electronAPI?.onRecordingResume(() => {
      console.log('Received recording:resume');
      handleResume();
    });

    return () => {
      unsubscribeStart?.();
      unsubscribeStop?.();
      unsubscribePause?.();
      unsubscribeResume?.();
      cleanup();
    };
  }, [startRecording, handleStop, handlePause, handleResume, cleanup]);
}

function getVideoConstraints(
  sourceId: string,
  display: { width: number; height: number; scaleFactor: number },
  options: RecordingOptions
): MediaStreamConstraints {
  // Calculate actual pixel dimensions
  const width = display.width * display.scaleFactor;
  const height = display.height * display.scaleFactor;

  return {
    audio: false, // Audio support excluded initially
    video: {
      // @ts-expect-error - Electron-specific constraints
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId,
        minWidth: width,
        maxWidth: width,
        minHeight: height,
        maxHeight: height,
        minFrameRate: 30,
        maxFrameRate: 60,
      },
    },
  };
}

function getSupportedMimeType(): string {
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return 'video/webm';
}

function getVideoBitrate(width: number, height: number): number {
  const pixels = width * height;

  // Bitrate based on resolution
  if (pixels >= 3840 * 2160) {
    return 20_000_000; // 4K: 20 Mbps
  } else if (pixels >= 2560 * 1440) {
    return 12_000_000; // 1440p: 12 Mbps
  } else if (pixels >= 1920 * 1080) {
    return 8_000_000; // 1080p: 8 Mbps
  } else if (pixels >= 1280 * 720) {
    return 5_000_000; // 720p: 5 Mbps
  }

  return 2_500_000; // Default: 2.5 Mbps
}
