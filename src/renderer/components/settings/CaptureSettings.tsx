import React from 'react';
import { useSettingsStore } from '../../stores/settings-store';
import Toggle from '../common/Toggle';

function CaptureSettings() {
  const { settings, updateSetting } = useSettingsStore();

  if (!settings) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-800">Capture</h2>

      {/* Play Sound */}
      <div className="flex items-center justify-between py-4 border-b">
        <div>
          <h3 className="font-medium text-gray-800">Play sound</h3>
          <p className="text-sm text-gray-500">
            Play a camera shutter sound when capturing
          </p>
        </div>
        <Toggle
          checked={settings.playSound}
          onChange={(value) => updateSetting('playSound', value)}
        />
      </div>

      {/* Show Preview */}
      <div className="flex items-center justify-between py-4 border-b">
        <div>
          <h3 className="font-medium text-gray-800">Show preview</h3>
          <p className="text-sm text-gray-500">
            Display a popup preview after capture
          </p>
        </div>
        <Toggle
          checked={settings.showPreview}
          onChange={(value) => updateSetting('showPreview', value)}
        />
      </div>

      {/* Preview Duration */}
      {settings.showPreview && (
        <div className="py-4 border-b ml-6">
          <h3 className="font-medium text-gray-800 mb-2">Preview duration</h3>
          <select
            value={settings.previewDuration}
            onChange={(e) => updateSetting('previewDuration', Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value={3}>3 seconds</option>
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
          </select>
        </div>
      )}

      {/* Copy to Clipboard */}
      <div className="flex items-center justify-between py-4 border-b">
        <div>
          <h3 className="font-medium text-gray-800">Copy to clipboard</h3>
          <p className="text-sm text-gray-500">
            Automatically copy screenshots to clipboard
          </p>
        </div>
        <Toggle
          checked={settings.copyToClipboard}
          onChange={(value) => updateSetting('copyToClipboard', value)}
        />
      </div>

      <h3 className="text-lg font-semibold text-gray-800 pt-4">Video Recording</h3>

      {/* Video Quality */}
      <div className="py-4 border-b">
        <h3 className="font-medium text-gray-800 mb-2">Video quality</h3>
        <select
          value={settings.videoQuality}
          onChange={(e) => updateSetting('videoQuality', e.target.value as 'low' | 'medium' | 'high')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
        >
          <option value="low">Low (720p, smaller files)</option>
          <option value="medium">Medium (1080p)</option>
          <option value="high">High (Original resolution)</option>
        </select>
      </div>

      {/* Audio */}
      <div className="flex items-center justify-between py-4 border-b">
        <div>
          <h3 className="font-medium text-gray-800">Enable audio by default</h3>
          <p className="text-sm text-gray-500">
            Record microphone audio with video
          </p>
        </div>
        <Toggle
          checked={settings.audioEnabled}
          onChange={(value) => updateSetting('audioEnabled', value)}
        />
      </div>
    </div>
  );
}

export default CaptureSettings;
