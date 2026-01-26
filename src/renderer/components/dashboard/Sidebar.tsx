import React from 'react';
import { useCapturesStore } from '../../stores/captures-store';

interface SidebarProps {
  onSettingsClick: () => void;
}

function Sidebar({ onSettingsClick }: SidebarProps) {
  const { filters, setFilters, tags } = useCapturesStore();

  const dateRanges = [
    { id: 'today', label: 'Today', icon: '📅' },
    { id: 'week', label: 'This Week', icon: '📅' },
    { id: 'month', label: 'This Month', icon: '📅' },
    { id: 'all', label: 'All Time', icon: '📅' },
  ] as const;

  return (
    <aside className="w-56 border-r bg-white flex flex-col">
      {/* Date Filters */}
      <div className="p-4 border-b">
        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Date</h3>
        <nav className="space-y-1">
          {dateRanges.map((range) => (
            <button
              key={range.id}
              onClick={() => setFilters({ dateRange: range.id })}
              className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                filters.dateRange === range.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{range.icon}</span>
              <span>{range.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tags */}
      <div className="p-4 flex-1 overflow-auto">
        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Tags</h3>
        {tags.length === 0 ? (
          <p className="text-sm text-gray-400">No tags yet</p>
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
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-primary-500">●</span>
                  <span>{tag.name}</span>
                </span>
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Settings */}
      <div className="p-4 border-t">
        <button
          onClick={onSettingsClick}
          className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        >
          <span>⚙️</span>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
