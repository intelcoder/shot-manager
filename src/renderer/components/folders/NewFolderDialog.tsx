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
      className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface-primary rounded-xl shadow-macos-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-content-primary mb-4">New Folder</h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Folder name */}
            <div>
              <label htmlFor="folder-name" className="block text-sm font-medium text-content-secondary mb-1">
                Name
              </label>
              <input
                ref={inputRef}
                id="folder-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter folder name"
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface-primary text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>

            {/* Parent folder selection */}
            <div>
              <label htmlFor="parent-folder" className="block text-sm font-medium text-content-secondary mb-1">
                Parent Folder (optional)
              </label>
              <select
                id="parent-folder"
                value={selectedParentId ?? ''}
                onChange={(e) => setSelectedParentId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
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
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-content-secondary hover:bg-surface-tertiary rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 text-sm text-white bg-accent hover:bg-accent-hover rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
