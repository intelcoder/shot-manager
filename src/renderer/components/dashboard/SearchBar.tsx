import React, { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useCapturesStore } from '../../stores/captures-store';

function SearchBar() {
  const { filters, setFilters } = useCapturesStore();
  const [searchValue, setSearchValue] = useState(filters.search || '');

  // Debounce search
  const debounceSearch = useCallback((value: string) => {
    const timeoutId = setTimeout(() => {
      setFilters({ search: value || undefined });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [setFilters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    debounceSearch(value);
  };

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      {/* Search Input */}
      <div className="flex-1 relative">
        <input
          type="text"
          placeholder="Search by filename..."
          value={searchValue}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-10 py-2 border border-border rounded-lg bg-surface-primary text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary">
          <Search size={18} strokeWidth={1.5} />
        </span>
        {searchValue && (
          <button
            onClick={() => {
              setSearchValue('');
              setFilters({ search: undefined });
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content-secondary transition-colors"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Type Filter */}
      <select
        value={filters.type || 'all'}
        onChange={(e) => setFilters({ type: e.target.value as any })}
        className="px-4 py-2 border border-border rounded-lg bg-surface-primary text-content-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow"
      >
        <option value="all">All Types</option>
        <option value="screenshot">Screenshots</option>
        <option value="video">Videos</option>
      </select>
    </div>
  );
}

export default SearchBar;
