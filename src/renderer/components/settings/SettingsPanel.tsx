import React, { useEffect, useState } from 'react';
import { Settings, FolderOpen, Camera, Keyboard, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import GeneralSettings from './GeneralSettings';
import FileSettings from './FileSettings';
import CaptureSettings from './CaptureSettings';
import ShortcutSettings from './ShortcutSettings';
import CleanupSettings from './CleanupSettings';
import { useSettingsStore } from '../../stores/settings-store';
import Icon from '../common/Icon';

interface SettingsPanelProps {
  onBack: () => void;
}

type SettingsTab = 'general' | 'files' | 'capture' | 'shortcuts' | 'cleanup';

const tabs: { id: SettingsTab; label: string; icon: typeof Settings }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'files', label: 'Files & Storage', icon: FolderOpen },
  { id: 'capture', label: 'Capture', icon: Camera },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'cleanup', label: 'Auto-Cleanup', icon: Trash2 },
];

function SettingsPanel({ onBack }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { settings, isLoading, loadSettings, loadShortcuts } = useSettingsStore();

  useEffect(() => {
    loadSettings();
    loadShortcuts();
  }, [loadSettings, loadShortcuts]);

  if (isLoading || !settings) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-primary">
        <Loader2 className="w-8 h-8 text-content-tertiary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-surface-primary">
      {/* Sidebar */}
      <nav className="w-56 border-r border-border bg-surface-secondary p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-content-secondary hover:text-content-primary mb-6 transition-colors"
        >
          <Icon icon={ArrowLeft} size="sm" />
          <span>Back</span>
        </button>

        <h2 className="text-lg font-semibold text-content-primary mb-4">Settings</h2>

        <div className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-colors ${
                activeTab === tab.id
                  ? 'bg-accent-subtle text-accent'
                  : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
              }`}
            >
              <Icon icon={tab.icon} size="md" />
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
