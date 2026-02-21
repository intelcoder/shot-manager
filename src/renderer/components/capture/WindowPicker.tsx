import React, { useEffect, useState } from 'react';

interface WindowPickerProps {
  onSelect: (windowId: string) => void;
  onClose: () => void;
}

interface WindowSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon?: string;
}

function WindowPicker({ onSelect, onClose }: WindowPickerProps) {
  const [windows, setWindows] = useState<WindowSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadWindows();
  }, []);

  const loadWindows = async () => {
    try {
      setLoading(true);
      const sources = await window.electronAPI.getScreenSources();

      // Filter to only windows (not screens) and exclude own app
      const windowSources = sources
        .filter((source) => source.id.startsWith('window:'))
        .filter((source) => !source.name.toLowerCase().includes('shot manager'))
        .map((source) => ({
          id: source.id,
          name: source.name,
          thumbnail: source.thumbnail.toDataURL(),
          appIcon: source.appIcon?.toDataURL(),
        }));

      setWindows(windowSources);
    } catch (error) {
      console.error('Failed to load windows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedId) {
      onSelect(selectedId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && selectedId) {
      handleSelect();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-surface-primary rounded-xl shadow-2xl w-[800px] max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-content-primary">Select a Window to Record</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-tertiary rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-content-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Window Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : windows.length === 0 ? (
            <div className="text-center text-content-tertiary py-8">
              No windows available to record.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {windows.map((window) => (
                <button
                  key={window.id}
                  onClick={() => setSelectedId(window.id)}
                  onDoubleClick={() => {
                    setSelectedId(window.id);
                    onSelect(window.id);
                  }}
                  className={`
                    relative rounded-lg overflow-hidden border-2 transition-all
                    ${selectedId === window.id
                      ? 'border-accent ring-2 ring-accent/20'
                      : 'border-border hover:border-content-tertiary'
                    }
                  `}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-surface-tertiary">
                    <img
                      src={window.thumbnail}
                      alt={window.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Window name */}
                  <div className="p-2 bg-surface-primary">
                    <div className="flex items-center gap-2">
                      {window.appIcon && (
                        <img src={window.appIcon} alt="" className="w-4 h-4" />
                      )}
                      <span className="text-sm text-content-secondary truncate">
                        {window.name}
                      </span>
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {selectedId === window.id && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-surface-secondary">
          <p className="text-sm text-content-tertiary">
            Double-click or select a window and click Record
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-content-secondary bg-surface-tertiary hover:bg-surface-primary rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedId}
              className={`
                px-4 py-2 rounded-lg transition-colors
                ${selectedId
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-surface-tertiary text-content-tertiary cursor-not-allowed'
                }
              `}
            >
              Record Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WindowPicker;
