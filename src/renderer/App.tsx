import React, { useEffect, useState } from 'react';
import Dashboard from './components/dashboard/Dashboard';
import CaptureOverlay from './components/capture/CaptureOverlay';
import PreviewPopup from './components/preview/PreviewPopup';
import { useRecordingStore } from './stores/recording-store';

type Route = 'dashboard' | 'capture' | 'preview';

function App() {
  const [route, setRoute] = useState<Route>('dashboard');
  const [captureMode, setCaptureMode] = useState<'screenshot' | 'video'>('screenshot');
  const [previewData, setPreviewData] = useState<any>(null);
  const setRecordingState = useRecordingStore((state) => state.setRecordingState);

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
        const params = new URLSearchParams(queryString);
        const data = params.get('data');
        if (data) {
          try {
            setPreviewData(JSON.parse(decodeURIComponent(data)));
          } catch (e) {
            console.error('Failed to parse preview data:', e);
          }
        }
      } else {
        setRoute('dashboard');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    // Listen for recording status updates
    const unsubscribe = window.electronAPI?.onRecordingStatus((state) => {
      setRecordingState(state);
    });

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      unsubscribe?.();
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
    default:
      return <Dashboard />;
  }
}

export default App;
