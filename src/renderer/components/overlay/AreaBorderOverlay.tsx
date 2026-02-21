import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { SelectionArea } from '../../../shared/types/capture';

interface AreaBorderData {
  area: SelectionArea;
  screenBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  countdownDuration?: number;
}

function getInitialDataFromUrl(): AreaBorderData | null {
  const hash = window.location.hash;
  const queryString = hash.split('?')[1] || '';
  const params = new URLSearchParams(queryString);

  const ax = params.get('ax');
  const ay = params.get('ay');
  const aw = params.get('aw');
  const ah = params.get('ah');
  const sx = params.get('sx');
  const sy = params.get('sy');
  const sw = params.get('sw');
  const sh = params.get('sh');

  if (!ax || !ay || !aw || !ah || !sx || !sy || !sw || !sh) {
    return null;
  }

  const cd = params.get('cd');

  return {
    area: {
      x: parseInt(ax, 10),
      y: parseInt(ay, 10),
      width: parseInt(aw, 10),
      height: parseInt(ah, 10),
    },
    screenBounds: {
      x: parseInt(sx, 10),
      y: parseInt(sy, 10),
      width: parseInt(sw, 10),
      height: parseInt(sh, 10),
    },
    countdownDuration: cd ? parseInt(cd, 10) : undefined,
  };
}

function AreaBorderOverlay() {
  const [data, setData] = useState<AreaBorderData | null>(getInitialDataFromUrl);
  const initialCountdown = data?.countdownDuration && data.countdownDuration > 0
    ? data.countdownDuration
    : null;
  const [countdown, setCountdown] = useState<number | null>(initialCountdown);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start countdown when data arrives via IPC with countdownDuration
  // (backup for URL params — in case IPC arrives with different data)
  useEffect(() => {
    if (!data?.countdownDuration || data.countdownDuration <= 0) return;

    setCountdown((prev) => prev !== null ? prev : data.countdownDuration!);
  }, [data?.countdownDuration]);

  // Tick the countdown
  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      setCountdown(null);
      window.electronAPI?.sendCountdownComplete();
      return;
    }

    timerRef.current = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimer();
  }, [countdown, clearTimer]);

  // Handle ESC key during countdown
  useEffect(() => {
    if (countdown === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearTimer();
        setCountdown(null);
        window.electronAPI?.sendCountdownCancel();
        window.electronAPI?.closeWindow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [countdown, clearTimer]);

  useEffect(() => {
    // Listen for initial area data (backup for URL params)
    const unsubscribeInit = window.electronAPI?.onAreaBorderInit((initData) => {
      setData(initData);
    });

    // Listen for area updates
    const unsubscribeUpdate = window.electronAPI?.onAreaBorderUpdate((updateData) => {
      setData((prev) => prev ? { ...prev, area: updateData.area } : null);
    });

    return () => {
      unsubscribeInit?.();
      unsubscribeUpdate?.();
      clearTimer();
    };
  }, [clearTimer]);

  if (!data) {
    return null;
  }

  const { area, screenBounds } = data;

  // Calculate position relative to the window (which covers all screens)
  // The area coordinates are in screen coordinates, so we need to offset by screenBounds
  const left = area.x - screenBounds.x;
  const top = area.y - screenBounds.y;

  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Area border with animated dashed line */}
      <div
        className="absolute border-2 border-red-500 rounded-sm"
        style={{
          left,
          top,
          width: area.width,
          height: area.height,
          boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.3), inset 0 0 0 1px rgba(239, 68, 68, 0.2)',
        }}
      >
        {/* Corner indicators */}
        <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-red-500" />
        <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-red-500" />
        <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-red-500" />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-red-500" />

        {/* Countdown display centered in the area */}
        {countdown !== null && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex items-center justify-center rounded-full bg-black/70 text-white font-bold"
                style={{ width: 80, height: 80, fontSize: 36 }}
              >
                {countdown}
              </div>
              <span className="text-white text-xs bg-black/50 px-2 py-0.5 rounded">
                Press ESC to cancel
              </span>
            </div>
          </div>
        )}

        {/* Recording indicator label - show only when not counting down */}
        {countdown === null && (
          <div
            className="absolute -top-7 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>Recording Area</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AreaBorderOverlay;
