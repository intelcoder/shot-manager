import React, { useState, useRef, useEffect } from 'react';
import { useFoldersStore } from '../../stores/folders-store';

interface NewFolderDialogProps {
  parentId?: number | null;
  onClose: () => void;
}

function NewFolderDialog({ parentId, onClose }: NewFolderDialogProps) {
  const { createFolder, folders } = useFoldersStore();
  const [name, setName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<number | null>(parentId ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createFolder({
        name: name.trim(),
        parentId: selectedParentId,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">New Folder</h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Folder name */}
            <div>
              <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                ref={inputRef}
                id="folder-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter folder name"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>

            {/* Parent folder selection */}
            <div>
              <label htmlFor="parent-folder" className="block text-sm font-medium text-gray-700 mb-1">
                Parent Folder (optional)
              </label>
              <select
                id="parent-folder"
                value={selectedParentId ?? ''}
                onChange={(e) => setSelectedParentId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={isSubmitting}
              >
                <option value="">None (top level)</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewFolderDialog;
