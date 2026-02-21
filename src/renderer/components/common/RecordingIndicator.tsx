import React from 'react';
import { Play, Pause, Square } from 'lucide-react';
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
    <div className="flex items-center gap-3 px-3 py-1.5 bg-red-50 dark:bg-red-950/50 rounded-full">
      <span className="recording-indicator flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-sm font-medium text-red-700 dark:text-red-400">
          {isPaused ? 'Paused' : 'REC'}
        </span>
      </span>

      <span className="text-sm font-mono text-red-600 dark:text-red-400">
        {formatDuration(duration)}
      </span>

      <div className="flex items-center gap-1">
        {isPaused ? (
          <button
            onClick={resumeRecording}
            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors text-red-600 dark:text-red-400"
            title="Resume"
          >
            <Play size={14} strokeWidth={2} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={pauseRecording}
            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors text-red-600 dark:text-red-400"
            title="Pause"
          >
            <Pause size={14} strokeWidth={2} />
          </button>
        )}
        <button
          onClick={stopRecording}
          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors text-red-600 dark:text-red-400"
          title="Stop"
        >
          <Square size={14} strokeWidth={2} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}

export default RecordingIndicator;
