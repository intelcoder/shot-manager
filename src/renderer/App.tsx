import React, { useEffect, useState, useCallback } from 'react';
import Dashboard from './components/dashboard/Dashboard';
import CaptureOverlay from './components/capture/CaptureOverlay';
import PreviewPopup from './components/preview/PreviewPopup';
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
  const { startRecording } = useRecordingStore();

  // Initialize MediaRecorder listeners for video recording (only in dashboard window)
  useMediaRecorder(route === 'dashboard');

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

    // Listen for window record shortcut
    const unsubscribeWindowShortcut = window.electronAPI?.onRecordWindowShortcut(() => {
      setShowWindowPicker(true);
    });

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      unsubscribeRecording?.();
      unsubscribePreview?.();
      unsubscribeWindowShortcut?.();
    };
  }, [setRecordingState]);

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
