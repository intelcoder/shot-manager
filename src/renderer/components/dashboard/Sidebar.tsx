import React from 'react';
import { Calendar, Settings } from 'lucide-react';
import { useCapturesStore } from '../../stores/captures-store';
import FolderTree from '../folders/FolderTree';
import Icon from '../common/Icon';

interface SidebarProps {
  onSettingsClick: () => void;
}

function Sidebar({ onSettingsClick }: SidebarProps) {
  const { filters, setFilters, tags } = useCapturesStore();

  const dateRanges = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ] as const;

  return (
    <aside className="w-56 border-r border-border glass flex flex-col">
      {/* Folder Tree */}
      <FolderTree />

      {/* Date Filters */}
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-semibold text-content-tertiary uppercase mb-2">Date</h3>
        <nav className="space-y-1">
          {dateRanges.map((range) => (
            <button
              key={range.id}
              onClick={() => setFilters({ dateRange: range.id })}
              className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                filters.dateRange === range.id
                  ? 'bg-accent-subtle text-accent'
                  : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
              }`}
            >
              <Icon icon={Calendar} size="sm" />
              <span>{range.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tags */}
      <div className="p-4 flex-1 overflow-auto">
        <h3 className="text-xs font-semibold text-content-tertiary uppercase mb-2">Tags</h3>
        {tags.length === 0 ? (
          <p className="text-sm text-content-tertiary">No tags yet</p>
        ) : (
          <nav className="space-y-1">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => {
                  const currentTags = filters.tags || [];
                  const newTags = currentTags.includes(tag.id)
                    ? currentTags.filter((t) => t !== tag.id)
                    : [...currentTags, tag.id];
                  setFilters({ tags: newTags });
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors ${
                  filters.tags?.includes(tag.id)
                    ? 'bg-accent-subtle text-accent'
                    : 'text-content-secondary hover:bg-surface-tertiary hover:text-content-primary'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tag.color || 'var(--accent)' }}
                  />
                  <span>{tag.name}</span>
                </span>
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-border">
        <button
          onClick={onSettingsClick}
          className="w-full text-left px-3 py-2 rounded-md text-sm text-content-secondary hover:bg-surface-tertiary hover:text-content-primary flex items-center gap-2 transition-colors"
        >
          <Icon icon={Settings} size="md" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
