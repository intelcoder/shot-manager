import { create } from 'zustand';
import type { RecordingState, RecordingOptions } from '../../shared/types/capture';

interface RecordingStore extends RecordingState {
  setRecordingState: (state: RecordingState) => void;
  startRecording: (options: RecordingOptions) => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
}

export const useRecordingStore = create<RecordingStore>((set) => ({
  isRecording: false,
  isPaused: false,
  duration: 0,
  startTime: null,

  setRecordingState: (state) => set(state),

  startRecording: async (options) => {
    try {
      await window.electronAPI.startRecording(options);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  },

  stopRecording: async () => {
    try {
      await window.electronAPI.stopRecording();
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  },

  pauseRecording: async () => {
    try {
      await window.electronAPI.pauseRecording();
    } catch (error) {
      console.error('Failed to pause recording:', error);
    }
  },

  resumeRecording: async () => {
    try {
      await window.electronAPI.resumeRecording();
    } catch (error) {
      console.error('Failed to resume recording:', error);
    }
  },
}));
