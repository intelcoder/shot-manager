import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Gallery from './Gallery';
import SearchBar from './SearchBar';
import DetailModal from './DetailModal';
import SelectionToolbar from './SelectionToolbar';
import SettingsPanel from '../settings/SettingsPanel';
import RecordingIndicator from '../common/RecordingIndicator';
import { DragProvider } from '../dnd/DragContext';
import { useCapturesStore } from '../../stores/captures-store';
import { useFoldersStore } from '../../stores/folders-store';
import { useRecordingStore } from '../../stores/recording-store';
import type { CaptureFile } from '../../../shared/types/capture';

function Dashboard() {
  const [selectedItem, setSelectedItem] = useState<CaptureFile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { captures, isLoading, loadCaptures, loadTags, deleteCapture, clearSelection } = useCapturesStore();
  const { loadFolderTree } = useFoldersStore();
  const { isRecording } = useRecordingStore();

  useEffect(() => {
    loadCaptures();
    loadTags();
    loadFolderTree();

    // Listen for new captures
    const unsubscribe = window.electronAPI?.onCaptureComplete(() => {
      loadCaptures();
      loadFolderTree();
    });

    return () => {
      unsubscribe?.();
    };
  }, [loadCaptures, loadTags, loadFolderTree]);

  const handleItemClick = (item: CaptureFile) => {
    setSelectedItem(item);
  };

  const handleItemDelete = async (item: CaptureFile) => {
    if (confirm('Are you sure you want to delete this capture?')) {
      await deleteCapture(item.id);
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
    }
  };

  const handleOpenFile = (item: CaptureFile) => {
    window.electronAPI?.openFile(item.filepath);
  };

  const handleShowInFolder = (item: CaptureFile) => {
    window.electronAPI?.openInFolder(item.filepath);
  };

  const handleItemUpdate = (updatedItem: CaptureFile) => {
    setSelectedItem(updatedItem);
  };

  if (showSettings) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <SettingsPanel onBack={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <DragProvider>
      <div className="h-screen flex flex-col bg-white">
        {/* Header */}
        <header className="border-b bg-gray-50">
          <div className="flex items-center justify-between px-4 py-2">
            <h1 className="text-lg font-semibold text-gray-800">Shot Manager</h1>
            {isRecording && <RecordingIndicator />}
          </div>
          <SearchBar />
        </header>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar onSettingsClick={() => setShowSettings(true)} />
          <main className="flex-1 overflow-auto bg-gray-50">
            <Gallery
              items={captures}
              isLoading={isLoading}
              onItemClick={handleItemClick}
              onItemDelete={handleItemDelete}
            />
          </main>
        </div>

        {/* Selection Toolbar */}
        <SelectionToolbar />

        {/* Detail Modal */}
        {selectedItem && (
          <DetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onDelete={handleItemDelete}
            onOpenFile={handleOpenFile}
            onShowInFolder={handleShowInFolder}
            onItemUpdate={handleItemUpdate}
          />
        )}
      </div>
    </DragProvider>
  );
}

export default Dashboard;
