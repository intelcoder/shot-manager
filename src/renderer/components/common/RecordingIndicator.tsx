import React from 'react';
import { useRecordingStore } from '../../stores/recording-store';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function RecordingIndicator() {
  const { isRecording, isPaused, duration, stopRecording, pauseRecording, resumeRecording } = useRecordingStore();

  if (!isRecording) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-red-50 rounded-full">
      <span className="recording-indicator flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-sm font-medium text-red-700">
          {isPaused ? 'Paused' : 'REC'}
        </span>
      </span>

      <span className="text-sm font-mono text-red-600">
        {formatDuration(duration)}
      </span>

      <div className="flex items-center gap-1">
        {isPaused ? (
          <button
            onClick={resumeRecording}
            className="p-1 hover:bg-red-100 rounded transition-colors"
            title="Resume"
          >
            ▶️
          </button>
        ) : (
          <button
            onClick={pauseRecording}
            className="p-1 hover:bg-red-100 rounded transition-colors"
            title="Pause"
          >
            ⏸️
          </button>
        )}
        <button
          onClick={stopRecording}
          className="p-1 hover:bg-red-100 rounded transition-colors"
          title="Stop"
        >
          ⏹️
        </button>
      </div>
    </div>
  );
}

export default RecordingIndicator;
