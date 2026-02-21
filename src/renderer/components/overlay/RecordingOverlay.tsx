import React, { useEffect, useState, useCallback } from 'react';

type OverlayMode = 'countdown' | 'recording';

interface RecordingData {
  duration: number;
  isPaused: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getInitialOverlayParams(): { mode: OverlayMode; countdown: number } {
  const hash = window.location.hash;
  const queryString = hash.split('?')[1] || '';
  const params = new URLSearchParams(queryString);
  const mode = (params.get('mode') as OverlayMode) || 'countdown';
  const countdown = parseInt(params.get('countdown') || '3', 10);
  return { mode, countdown };
}

function RecordingOverlay() {
  const initial = getInitialOverlayParams();
  const [mode, setMode] = useState<OverlayMode>(initial.mode);
  const [countdown, setCountdown] = useState(initial.countdown);
  const [countdownAnimating, setCountdownAnimating] = useState(false);
  const [recordingData, setRecordingData] = useState<RecordingData>({ duration: 0, isPaused: false });

  // Handle countdown tick
  useEffect(() => {
    if (mode !== 'countdown') return;

    if (countdown <= 0) {
      // Countdown complete, notify main process
      window.electronAPI?.sendCountdownComplete();
      return;
    }

    // Trigger animation
    setCountdownAnimating(true);
    const animationTimeout = setTimeout(() => {
      setCountdownAnimating(false);
    }, 200);

    // Countdown tick
    const countdownTimeout = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => {
      clearTimeout(animationTimeout);
      clearTimeout(countdownTimeout);
    };
  }, [countdown, mode]);

  // Handle ESC to cancel countdown
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && mode === 'countdown') {
      window.electronAPI?.sendCountdownCancel();
      window.electronAPI?.closeWindow();
    }
  }, [mode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Listen for IPC events
  useEffect(() => {
    // Initial setup
    const unsubscribeInit = window.electronAPI?.onOverlayInit((data) => {
      setMode(data.mode);
      if (data.countdownDuration) {
        setCountdown(data.countdownDuration);
      }
    });

    // Mode switch (countdown -> recording)
    const unsubscribeSwitchMode = window.electronAPI?.onOverlaySwitchMode((data) => {
      setMode(data.mode);
    });

    // Recording status updates from overlay-specific channel
    const unsubscribeOverlayStatus = window.electronAPI?.onOverlayRecordingStatus((data) => {
      setRecordingData(data);
    });

    // Also listen to general recording status for fallback
    const unsubscribeStatus = window.electronAPI?.onRecordingStatus((state) => {
      if (mode === 'recording') {
        setRecordingData({ duration: state.duration, isPaused: state.isPaused });
      }
    });

    return () => {
      unsubscribeInit?.();
      unsubscribeSwitchMode?.();
      unsubscribeOverlayStatus?.();
      unsubscribeStatus?.();
    };
  }, [mode]);

  // Handle stop recording
  const handleStop = () => {
    window.electronAPI?.stopRecording();
  };

  // Handle pause/resume
  const handlePauseResume = () => {
    if (recordingData.isPaused) {
      window.electronAPI?.resumeRecording();
    } else {
      window.electronAPI?.pauseRecording();
    }
  };

  if (mode === 'countdown') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/80 rounded-full backdrop-blur-sm">
        <div
          className={`
            text-7xl font-bold text-white
            transition-transform duration-200 ease-out
            ${countdownAnimating ? 'scale-125' : 'scale-100'}
          `}
          style={{
            textShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
          }}
        >
          {countdown}
        </div>
      </div>
    );
  }

  // Recording mode
  return (
    <div
      className="w-full h-full flex items-center gap-3 px-4 bg-red-600 rounded-full shadow-lg cursor-move"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Blinking red dot */}
      <span
        className={`w-3 h-3 rounded-full bg-white ${recordingData.isPaused ? '' : 'animate-pulse'}`}
      />

      {/* Status text */}
      <span className="text-white text-sm font-medium">
        {recordingData.isPaused ? 'PAUSED' : 'REC'}
      </span>

      {/* Duration */}
      <span className="text-white text-sm font-mono">
        {formatDuration(recordingData.duration)}
      </span>

      {/* Controls */}
      <div
        className="flex items-center gap-1 ml-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handlePauseResume}
          className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
          title={recordingData.isPaused ? 'Resume' : 'Pause'}
        >
          {recordingData.isPaused ? '▶' : '⏸'}
        </button>
        <button
          onClick={handleStop}
          className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"
          title="Stop"
        >
          ⏹
        </button>
      </div>
    </div>
  );
}

export default RecordingOverlay;
