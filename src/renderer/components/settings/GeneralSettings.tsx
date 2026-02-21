import React, { useEffect, useState } from 'react';
import { Sun, Moon, Monitor, CheckCircle, XCircle, AlertCircle, Settings, Play } from 'lucide-react';
import { useSettingsStore } from '../../stores/settings-store';
import { useThemeStore } from '../../stores/theme-store';
import Toggle from '../common/Toggle';
import type { PermissionStatus, PermissionState } from '../../../shared/types/electron.d';

function PermissionStatusIndicator({ label, status }: { label: string; status: PermissionState }) {
  const getStatusInfo = () => {
    switch (status) {
      case 'granted':
        return { icon: CheckCircle, text: 'Granted', className: 'text-green-500' };
      case 'denied':
        return { icon: XCircle, text: 'Denied', className: 'text-red-500' };
      case 'not-determined':
        return { icon: AlertCircle, text: 'Not Set', className: 'text-yellow-500' };
      case 'restricted':
        return { icon: XCircle, text: 'Restricted', className: 'text-red-500' };
      case 'not-applicable':
        return { icon: CheckCircle, text: 'Not Required', className: 'text-content-tertiary' };
      default:
        return { icon: AlertCircle, text: 'Unknown', className: 'text-content-tertiary' };
    }
  };

  const { icon: Icon, text, className } = getStatusInfo();

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-content-secondary">{label}</span>
      <div className={`flex items-center gap-1.5 ${className}`}>
        <Icon size={14} strokeWidth={2} />
        <span className="text-sm font-medium">{text}</span>
      </div>
    </div>
  );
}

function GeneralSettings() {
  const { settings, updateSetting } = useSettingsStore();
  const { theme, setTheme } = useThemeStore();
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

  const isMac = navigator.platform.toLowerCase().includes('mac');

  // Load permission status on mount (macOS only)
  useEffect(() => {
    if (isMac) {
      loadPermissions();
    }
  }, [isMac]);

  const loadPermissions = async () => {
    setIsLoadingPermissions(true);
    try {
      const status = await window.electronAPI.getPermissionStatus();
      setPermissions(status);
    } catch (error) {
      console.error('[GeneralSettings] Failed to load permissions:', error);
    }
    setIsLoadingPermissions(false);
  };

  const openSetupWizard = () => {
    window.location.hash = '#/setup?returnTo=settings';
  };

  const openSystemPreferences = () => {
    window.electronAPI.openScreenRecordingSettings();
  };

  if (!settings) return null;

  const themeOptions = [
    { id: 'light' as const, label: 'Light', icon: Sun },
    { id: 'dark' as const, label: 'Dark', icon: Moon },
    { id: 'system' as const, label: 'System', icon: Monitor },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-content-primary">General</h2>

      {/* Appearance */}
      <div className="py-4 border-b border-border">
        <h3 className="font-medium text-content-primary mb-2">Appearance</h3>
        <p className="text-sm text-content-tertiary mb-3">
          Choose how Shot Manager looks
        </p>
        <div className="flex gap-2">
          {themeOptions.map((option) => {
            const IconComponent = option.icon;
            const isActive = theme === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setTheme(option.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'bg-surface-tertiary text-content-secondary hover:bg-surface-secondary hover:text-content-primary'
                }`}
              >
                <IconComponent size={16} strokeWidth={1.5} />
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Launch at Startup */}
      <div className="flex items-center justify-between py-4 border-b border-border">
        <div>
          <h3 className="font-medium text-content-primary">Launch at startup</h3>
          <p className="text-sm text-content-tertiary">
            Automatically start Shot Manager when you log in
          </p>
        </div>
        <Toggle
          checked={settings.launchAtStartup}
          onChange={(value) => updateSetting('launchAtStartup', value)}
        />
      </div>

      {/* Menu Bar / System Tray */}
      {isMac ? (
        <div className="flex items-center justify-between py-4 border-b border-border">
          <div>
            <h3 className="font-medium text-content-primary">Show in menu bar</h3>
            <p className="text-sm text-content-tertiary">
              Display icon in the menu bar for quick access
            </p>
          </div>
          <Toggle
            checked={settings.showInMenuBar}
            onChange={(value) => updateSetting('showInMenuBar', value)}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between py-4 border-b border-border">
          <div>
            <h3 className="font-medium text-content-primary">Show in system tray</h3>
            <p className="text-sm text-content-tertiary">
              Display icon in the system tray
            </p>
          </div>
          <Toggle
            checked={settings.showInTaskbar}
            onChange={(value) => updateSetting('showInTaskbar', value)}
          />
        </div>
      )}

      {/* Permissions - macOS only */}
      {isMac && (
        <div className="py-4 border-b border-border">
          <h3 className="font-medium text-content-primary mb-2">Permissions</h3>
          <p className="text-sm text-content-tertiary mb-3">
            Screen recording permission is required for captures
          </p>

          {/* Permission status indicators */}
          {isLoadingPermissions ? (
            <div className="text-sm text-content-tertiary py-2">Loading permissions...</div>
          ) : permissions ? (
            <div className="space-y-1 mb-4 bg-surface-secondary rounded-lg px-3 py-2">
              <PermissionStatusIndicator
                label="Screen Recording"
                status={permissions.screen}
              />
              <PermissionStatusIndicator
                label="Microphone"
                status={permissions.microphone}
              />
            </div>
          ) : (
            <div className="text-sm text-content-tertiary py-2 mb-4">
              Unable to check permissions
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={openSetupWizard}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              <Play size={16} strokeWidth={1.5} />
              <span className="text-sm font-medium">Run Setup Wizard</span>
            </button>
            <button
              onClick={openSystemPreferences}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-tertiary text-content-secondary hover:bg-surface-secondary hover:text-content-primary transition-colors"
            >
              <Settings size={16} strokeWidth={1.5} />
              <span className="text-sm font-medium">System Preferences</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GeneralSettings;
