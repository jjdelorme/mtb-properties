import React from 'react';

interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  loading: boolean;
  searchType: 'area' | 'address';
  setSearchType: (t: 'area' | 'address') => void;
}

export default function SearchBar({
  query,
  setQuery,
  handleSearch,
  loading,
  searchType,
  setSearchType,
}: SearchBarProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-100 transition-all duration-300">
      {/* Search Type Sliding Selector / Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => {
            setSearchType('area');
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
            searchType === 'area'
              ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-slate-900/5'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🏘️</span>
          <span>Properties by City/ZIP</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSearchType('address');
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
            searchType === 'address'
              ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-slate-900/5'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📍</span>
          <span>Custom Address Analyzer</span>
        </button>
      </div>

      <div className="text-center md:text-left mb-6">
        {searchType === 'area' ? (
          <>
            <h3 className="text-lg font-extrabold text-slate-800">Search Property Listings</h3>
            <p className="text-slate-500 text-xs mt-1">
              Enter a city, ZIP code, or street address to find homes and evaluate their proximity to mountain bike trails.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-extrabold text-slate-800">Custom Address Proximity Analyzer</h3>
            <p className="text-slate-500 text-xs mt-1">
              Type in any specific street address (supports aliases, County Roads, unit numbers, etc.) to trace its exact distance to nearby singletracks.
            </p>
          </>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder={
            searchType === 'area'
              ? 'Enter ZIP code or City Name (e.g. 80401, Durango, or 1701 Gothic Rd, Crested Butte)'
              : 'Enter Full Street Address (e.g. 1701 County Road 317 (Gothic Road), Crested Butte, CO 81224)'
          }
          className="flex-1 border border-slate-250 bg-slate-50/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white outline-none transition-all text-sm font-medium shadow-inner"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50 text-sm flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-[1.01] transform active:scale-100 cursor-pointer"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Quick-select buttons */}
      <div className="flex gap-2 mt-4 flex-wrap justify-center md:justify-start items-center">
        {['80401', '84532', '98225'].map((zip) => {
          const names: Record<string, string> = { '80401': 'Golden', '84532': 'Moab', '98225': 'Bellingham' };
          return (
            <button
              key={zip}
              type="button"
              onClick={() => setQuery(searchType === 'area' ? zip : `100 Main St, ${names[zip]}, ${zip === '80401' ? 'CO' : zip === '84532' ? 'UT' : 'WA'}`)}
              className="text-[10px] font-bold bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-800 py-1.5 px-3 rounded-lg transition-colors border border-slate-200/50 cursor-pointer shadow-sm"
            >
              {searchType === 'area' ? `Use Sandbox ZIP: ${zip}` : `Demo Address in ${names[zip]}`}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setQuery('1701 County Road 317 (Gothic Road), Crested Butte, CO 81224')}
          className="text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 py-1.5 px-3 rounded-lg transition-colors border border-emerald-200 cursor-pointer shadow-sm"
        >
          Try Crested Butte Gothic Rd
        </button>
      </div>
    </div>
  );
}
