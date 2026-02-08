import React, { useEffect, useState, useCallback } from 'react';
import Dashboard from './components/dashboard/Dashboard';
import CaptureOverlay from './components/capture/CaptureOverlay';
import PreviewPopup from './components/preview/PreviewPopup';
import CountdownOverlay from './components/capture/CountdownOverlay';
import WindowPicker from './components/capture/WindowPicker';
import RecordingOverlay from './components/overlay/RecordingOverlay';
import AreaBorderOverlay from './components/overlay/AreaBorderOverlay';
import { useRecordingStore } from './stores/recording-store';
import { useMediaRecorder } from './hooks/useMediaRecorder';
import type { CaptureResult } from '../shared/types/capture';

type Route = 'dashboard' | 'capture' | 'preview' | 'recording-overlay' | 'area-border';

function App() {
  const [route, setRoute] = useState<Route>('dashboard');
  const [captureMode, setCaptureMode] = useState<'screenshot' | 'video'>('screenshot');
  const [previewData, setPreviewData] = useState<CaptureResult | null>(null);
  const [showWindowPicker, setShowWindowPicker] = useState(false);
  const setRecordingState = useRecordingStore((state) => state.setRecordingState);
  const { isCountingDown, countdownData, setCountdownState, startRecording } = useRecordingStore();

  // Initialize MediaRecorder listeners for video recording (only in dashboard window)
  useMediaRecorder(route === 'dashboard');

  // Handle countdown complete
  const handleCountdownComplete = useCallback(() => {
    setCountdownState(false);
    window.electronAPI?.sendCountdownComplete();
  }, [setCountdownState]);

  // Handle countdown cancel
  const handleCountdownCancel = useCallback(() => {
    setCountdownState(false);
    window.electronAPI?.sendCountdownCancel();
  }, [setCountdownState]);

  // Handle window selection for recording
  const handleWindowSelect = useCallback((windowId: string) => {
    setShowWindowPicker(false);
    startRecording({
      mode: 'window',
      windowId,
      audio: { enabled: false },
    });
  }, [startRecording]);

  // Handle window picker close
  const handleWindowPickerClose = useCallback(() => {
    setShowWindowPicker(false);
  }, []);

  useEffect(() => {
    // Parse hash route
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const [path, queryString] = hash.split('?');

      if (path === '/capture') {
        setRoute('capture');
        const params = new URLSearchParams(queryString);
        const mode = params.get('mode') as 'screenshot' | 'video';
        if (mode) setCaptureMode(mode);
      } else if (path === '/preview') {
        setRoute('preview');
        // Data now comes via IPC, not URL params
      } else if (path === '/recording-overlay') {
        setRoute('recording-overlay');
      } else if (path === '/area-border') {
        setRoute('area-border');
      } else {
        setRoute('dashboard');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    // Listen for recording status updates
    const unsubscribeRecording = window.electronAPI?.onRecordingStatus((state) => {
      setRecordingState(state);
    });

    // Listen for preview data via IPC (secure, no URL length limits)
    const unsubscribePreview = window.electronAPI?.onPreviewData((data) => {
      setPreviewData(data);
    });

    // Listen for countdown events
    const unsubscribeCountdown = window.electronAPI?.onRecordingCountdown((data) => {
      setCountdownState(true, data);
    });

    // Listen for window record shortcut
    const unsubscribeWindowShortcut = window.electronAPI?.onRecordWindowShortcut(() => {
      setShowWindowPicker(true);
    });

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      unsubscribeRecording?.();
      unsubscribePreview?.();
      unsubscribeCountdown?.();
      unsubscribeWindowShortcut?.();
    };
  }, [setRecordingState, setCountdownState]);

  // Handle closing capture overlay
  const handleCaptureClose = () => {
    window.electronAPI?.closeWindow();
  };

  // Handle capture complete
  const handleCaptureComplete = () => {
    window.electronAPI?.closeWindow();
  };

  // Handle preview dismiss
  const handlePreviewDismiss = () => {
    window.electronAPI?.closeWindow();
  };

  // Show countdown overlay if counting down
  if (isCountingDown && countdownData) {
    return (
      <CountdownOverlay
        duration={countdownData.duration}
        onComplete={handleCountdownComplete}
        onCancel={handleCountdownCancel}
      />
    );
  }

  // Show window picker if triggered
  if (showWindowPicker) {
    return (
      <WindowPicker
        onSelect={handleWindowSelect}
        onClose={handleWindowPickerClose}
      />
    );
  }

  switch (route) {
    case 'capture':
      return (
        <CaptureOverlay
          mode={captureMode}
          onClose={handleCaptureClose}
          onComplete={handleCaptureComplete}
        />
      );
    case 'preview':
      return (
        <PreviewPopup
          data={previewData}
          onDismiss={handlePreviewDismiss}
        />
      );
    case 'recording-overlay':
      return <RecordingOverlay />;
    case 'area-border':
      return <AreaBorderOverlay />;
    default:
      return <Dashboard />;
  }
}

export default App;
