'use client';

import { Search, X } from 'lucide-react';

/**
 * Table search field. Controlled — filtering stays client-side in the pages, as
 * it already was, so no API contract changes.
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={14}
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
      />
      <input
        type="search"
        role="searchbox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-ivory border border-line text-ink placeholder:text-faint font-sans text-[16px] sm:text-[13px] pl-9 pr-9 py-2.5 transition-colors duration-200 ease-editorial hover:border-ink/30 focus:outline-none focus:border-ink [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-faint hover:text-ink transition-colors duration-200 ease-editorial"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
