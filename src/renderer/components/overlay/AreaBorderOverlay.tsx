import React, { useEffect, useState } from 'react';
import type { SelectionArea } from '../../../shared/types/capture';

interface AreaBorderData {
  area: SelectionArea;
  screenBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

function AreaBorderOverlay() {
  const [data, setData] = useState<AreaBorderData | null>(null);

  useEffect(() => {
    // Listen for initial area data
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
    };
  }, []);

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

        {/* Recording indicator label */}
        <div
          className="absolute -top-7 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>Recording Area</span>
        </div>
      </div>
    </div>
  );
}

export default AreaBorderOverlay;
