import React, { useEffect, useState } from 'react';
import GeneralSettings from './GeneralSettings';
import FileSettings from './FileSettings';
import CaptureSettings from './CaptureSettings';
import ShortcutSettings from './ShortcutSettings';
import CleanupSettings from './CleanupSettings';
import { useSettingsStore } from '../../stores/settings-store';

interface SettingsPanelProps {
  onBack: () => void;
}

type SettingsTab = 'general' | 'files' | 'capture' | 'shortcuts' | 'cleanup';

function SettingsPanel({ onBack }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { settings, isLoading, loadSettings, loadShortcuts } = useSettingsStore();

  useEffect(() => {
    loadSettings();
    loadShortcuts();
  }, [loadSettings, loadShortcuts]);

  if (isLoading || !settings) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin text-4xl">⚙️</div>
      </div>
    );
  }

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'files', label: 'Files & Storage', icon: '📁' },
    { id: 'capture', label: 'Capture', icon: '📷' },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: '⌨️' },
    { id: 'cleanup', label: 'Auto-Cleanup', icon: '🧹' },
  ];

  return (
    <div className="flex-1 flex">
      {/* Sidebar */}
      <nav className="w-56 border-r bg-gray-50 p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          ← Back
        </button>

        <h2 className="text-lg font-semibold mb-4">Settings</h2>

        <div className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'files' && <FileSettings />}
        {activeTab === 'capture' && <CaptureSettings />}
        {activeTab === 'shortcuts' && <ShortcutSettings />}
        {activeTab === 'cleanup' && <CleanupSettings />}
      </div>
    </div>
  );
}

export default SettingsPanel;
