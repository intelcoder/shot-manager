import React from 'react';
import { useSettingsStore } from '../../stores/settings-store';

function FileSettings() {
  const { settings, updateSetting, selectSavePath } = useSettingsStore();

  if (!settings) return null;

  const handleBrowse = async () => {
    const result = await selectSavePath();
    if (!result.success) {
      console.error('Failed to select save path');
    }
  };

  // Generate preview filename
  const now = new Date();
  const previewFilename = `${settings.filePrefix}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}.${settings.screenshotFormat}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-800">Files & Storage</h2>

      {/* Save Location */}
      <div className="py-4 border-b">
        <h3 className="font-medium text-gray-800 mb-2">Save Location</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={settings.savePath}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
          />
          <button
            onClick={handleBrowse}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Browse...
          </button>
        </div>
      </div>

      {/* File Name Prefix */}
      <div className="py-4 border-b">
        <h3 className="font-medium text-gray-800 mb-2">File Name Prefix</h3>
        <input
          type="text"
          value={settings.filePrefix}
          onChange={(e) => updateSetting('filePrefix', e.target.value)}
          placeholder="Screenshot"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <p className="text-sm text-gray-500 mt-2">
          Preview: <span className="font-mono text-gray-700">{previewFilename}</span>
        </p>
      </div>

      {/* Screenshot Format */}
      <div className="py-4 border-b">
        <h3 className="font-medium text-gray-800 mb-2">Screenshot Format</h3>
        <select
          value={settings.screenshotFormat}
          onChange={(e) => updateSetting('screenshotFormat', e.target.value as 'png' | 'jpg')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
        >
          <option value="png">PNG (Lossless, larger file)</option>
          <option value="jpg">JPG (Smaller file, slight quality loss)</option>
        </select>
      </div>

      {/* Video Format */}
      <div className="py-4 border-b">
        <h3 className="font-medium text-gray-800 mb-2">Video Format</h3>
        <select
          value={settings.videoFormat}
          onChange={(e) => updateSetting('videoFormat', e.target.value as 'webm' | 'mp4')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
        >
          <option value="webm">WebM (Recommended)</option>
          <option value="mp4">MP4 (Better compatibility)</option>
        </select>
      </div>

      {/* Folder Organization */}
      <div className="py-4 border-b">
        <h3 className="font-medium text-gray-800 mb-2">Folder Organization</h3>
        <select
          value={settings.organizationStyle}
          onChange={(e) => updateSetting('organizationStyle', e.target.value as 'date' | 'flat')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
        >
          <option value="date">Date-based (Year/Month/Day)</option>
          <option value="flat">Flat (All in one folder)</option>
        </select>

        {settings.organizationStyle === 'date' && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="font-medium mb-1">Folder structure preview:</p>
            <div className="font-mono text-xs">
              <p>📁 {settings.savePath.split(/[/\\]/).pop()}/</p>
              <p className="ml-4">📁 {now.getFullYear()}/</p>
              <p className="ml-8">📁 {String(now.getMonth() + 1).padStart(2, '0')}/</p>
              <p className="ml-12">📁 {String(now.getDate()).padStart(2, '0')}/</p>
              <p className="ml-16">📄 {previewFilename}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileSettings;
