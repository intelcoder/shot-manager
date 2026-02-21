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
  animationFrameId: number | null;
  cropVideo: HTMLVideoElement | null;
  cropCanvas: HTMLCanvasElement | null;
  rawStream: MediaStream | null;
}

export function useMediaRecorder(enabled: boolean = true) {
  const stateRef = useRef<MediaRecorderState>({
    mediaRecorder: null,
    mediaStream: null,
    chunks: [],
    width: 0,
    height: 0,
    area: undefined,
    animationFrameId: null,
    cropVideo: null,
    cropCanvas: null,
    rawStream: null,
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

    // Cancel animation frame for crop pipeline
    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId);
    }

    // Clean up canvas pipeline
    if (state.cropVideo) {
      state.cropVideo.srcObject = null;
    }
    if (state.cropCanvas) {
      state.cropCanvas.width = 0;
    }

    // Stop raw stream tracks (the original full-screen stream)
    if (state.rawStream) {
      state.rawStream.getTracks().forEach((track) => track.stop());
    }

    // Stop recording stream tracks
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
      animationFrameId: null,
      cropVideo: null,
      cropCanvas: null,
      rawStream: null,
    };
  }, []);

  const startRecording = useCallback(async (data: RecordingStartData) => {
    try {
      // Clean up any existing recording
      cleanup();

      const { sourceId, options, display, videoQuality } = data;

      // Get video constraints based on quality and display
      const constraints = getVideoConstraints(sourceId, display, options, videoQuality);

      // Get the media stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      let recordingStream: MediaStream = stream;

      if (options.area) {
        // Create canvas cropping pipeline
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        await video.play();

        // The capture may be downscaled from native resolution based on quality
        const nativeWidth = display.width * display.scaleFactor;
        const captureWidth = stream.getVideoTracks()[0].getSettings().width || nativeWidth;
        const captureScale = captureWidth / nativeWidth;

        const scaleFactor = display.scaleFactor * captureScale;
        const cropX = options.area.x * scaleFactor;
        const cropY = options.area.y * scaleFactor;
        const cropW = options.area.width * scaleFactor;
        const cropH = options.area.height * scaleFactor;

        const canvas = document.createElement('canvas');
        canvas.width = cropW;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d')!;

        // Animation loop to draw cropped frames
        const drawFrame = () => {
          ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          stateRef.current.animationFrameId = requestAnimationFrame(drawFrame);
        };
        stateRef.current.animationFrameId = requestAnimationFrame(drawFrame);

        stateRef.current.cropVideo = video;
        stateRef.current.cropCanvas = canvas;
        stateRef.current.rawStream = stream;

        // Get cropped stream from canvas
        recordingStream = canvas.captureStream(30);
      }

      // Store dimensions for later
      stateRef.current.width = options.area ? options.area.width : (stream.getVideoTracks()[0].getSettings().width || display.width);
      stateRef.current.height = options.area ? options.area.height : (stream.getVideoTracks()[0].getSettings().height || display.height);
      stateRef.current.area = options.area;
      stateRef.current.mediaStream = recordingStream;
      stateRef.current.chunks = [];

      // Determine the best codec
      const mimeType = getSupportedMimeType();

      // Create MediaRecorder with the (possibly cropped) stream
      const bitWidth = options.area ? options.area.width : display.width;
      const bitHeight = options.area ? options.area.height : display.height;
      const mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType,
        videoBitsPerSecond: getVideoBitrate(bitWidth, bitHeight),
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
      // Notify main process so it can reset isRecording state
      window.electronAPI?.sendRecordingStartFailed();
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

      // Send data to main process
      // Dimensions are already correct (set to area dimensions when cropping)
      window.electronAPI.sendRecordingData({
        buffer,
        width: state.width,
        height: state.height,
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
    if (!enabled) return;

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
  }, [enabled, startRecording, handleStop, handlePause, handleResume, cleanup]);
}

function getQualityCap(quality: 'low' | 'medium' | 'high'): { width: number; height: number } | null {
  switch (quality) {
    case 'low': return { width: 1280, height: 720 };
    case 'medium': return { width: 1920, height: 1080 };
    case 'high': return null; // No cap — native resolution
  }
}

function getVideoConstraints(
  sourceId: string,
  display: { width: number; height: number; scaleFactor: number },
  options: RecordingOptions,
  videoQuality: 'low' | 'medium' | 'high' = 'high'
): MediaStreamConstraints {
  // Calculate actual pixel dimensions
  let width = display.width * display.scaleFactor;
  let height = display.height * display.scaleFactor;

  // Apply quality cap if below native resolution
  const cap = getQualityCap(videoQuality);
  if (cap && (width > cap.width || height > cap.height)) {
    const scale = Math.min(cap.width / width, cap.height / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    // Ensure even dimensions (required by most video codecs)
    width = width - (width % 2);
    height = height - (height % 2);
  }

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
