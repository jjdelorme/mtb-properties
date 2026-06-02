import React from 'react';

interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  loading: boolean;
}

export default function SearchBar({ query, setQuery, handleSearch, loading }: SearchBarProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
      <h2 className="text-xl font-bold mb-2 text-gray-800 flex items-center gap-2">
        <span>🔍 Search Sandbox Cities</span>
      </h2>
      <p className="text-gray-600 mb-6 text-sm">
        Enter a ZIP code or city name to visualize nearby property listings and mountain bike trails:
        <span className="font-semibold text-emerald-600"> Golden, CO (80401)</span>,{' '}
        <span className="font-semibold text-emerald-600">Moab, UT (84532)</span>, or{' '}
        <span className="font-semibold text-emerald-600">Bellingham, WA (98225)</span>.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Enter ZIP code or City Name (e.g. 80401 or Golden)"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50 text-sm flex items-center gap-2 shadow-sm"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Quick-select buttons */}
      <div className="flex gap-2 mt-4 flex-wrap">
        {['80401', '84532', '98225'].map((zip) => (
          <button
            key={zip}
            onClick={() => setQuery(zip)}
            className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 py-1.5 px-3 rounded-md transition-colors border border-gray-200/40"
          >
            Use Sandbox ZIP: {zip}
          </button>
        ))}
      </div>
    </div>
  );
}
