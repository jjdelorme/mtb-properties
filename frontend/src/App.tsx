import React, { useState } from 'react';
import SearchBar from './components/SearchBar';
import PropertySidebar from './components/PropertySidebar';
import PropertyMap from './components/PropertyMap';
import StatusBanner from './components/StatusBanner';
import { Property, SearchResponse } from './types';
import { Compass, AlertTriangle, ArrowLeft } from 'lucide-react';

function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number }>({
    latitude: 39.7555,
    longitude: -105.2211, // Default Golden, CO
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSelectedProperty(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
        setMapCenter(data.center);
      } else {
        setError(data.error || 'Something went wrong while fetching data.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch search results from the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
    // Move map viewport center to focus on the selected property
    setMapCenter({
      latitude: property.latitude,
      longitude: property.longitude,
    });
  };

  const handleResetSearch = () => {
    setResult(null);
    setQuery('');
    setError(null);
    setSelectedProperty(null);
  };

  // If no search results are loaded, render a full-screen landing page with SearchBar centered
  if (!result) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 justify-between">
        <header className="bg-emerald-700 text-white shadow-md py-4 px-6 shrink-0">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Compass className="w-7 h-7 text-emerald-300 animate-pulse" />
              <span>MTB Property Mapper MVP</span>
            </h1>
            <span className="text-xs bg-emerald-800 py-1 px-3 rounded-full font-semibold border border-emerald-600 shadow-inner">
              Milestone 2 & 3: Interactive Dashboard
            </span>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col justify-center">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight leading-none">
              Find Homes with Premier Trail Access
            </h2>
            <p className="text-slate-600 mt-3 text-lg">
              The only real estate search engine engineered specifically for active mountain bikers. Visualize listings and nearby trails in seconds.
            </p>
          </div>

          <SearchBar
            query={query}
            setQuery={setQuery}
            handleSearch={handleSearch}
            loading={loading}
          />

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl shadow-sm mb-6 animate-shake">
              <div className="flex">
                <div className="shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-bold text-rose-800">Search Error</h3>
                  <p className="text-xs text-rose-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="bg-slate-800 text-slate-400 text-center py-4 text-xs mt-auto">
          <p>© 2026 MTB Property Mapper MVP - Engineered for peak singletrack proximity.</p>
        </footer>
      </div>
    );
  }

  // Once results are loaded, render the side-by-side split screen dashboard
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden text-slate-900">
      {/* Top Header Panel */}
      <header className="bg-emerald-700 text-white shadow-md px-6 py-3 flex flex-col md:flex-row justify-between items-center shrink-0 z-10 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetSearch}
            className="p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 transition-colors border border-emerald-600/40"
            title="Back to Landing Page"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none flex items-center gap-1">
              <Compass className="w-5 h-5 text-emerald-300" />
              <span>MTB Property Mapper MVP</span>
            </h1>
            <p className="text-[10px] text-emerald-100 mt-0.5 font-semibold">
              Showing search for: <span className="underline">{result.normalizedLocation}</span>
            </p>
          </div>
        </div>

        {/* Small Inline Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md w-full">
          <input
            type="text"
            placeholder="Search ZIP code or City"
            className="flex-1 border border-emerald-600 bg-emerald-800/40 text-white placeholder-emerald-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-white text-emerald-800 font-bold px-4 py-1.5 rounded-lg hover:bg-emerald-50 active:bg-emerald-100 transition-colors disabled:opacity-50 text-xs shadow-sm shrink-0"
          >
            {loading ? '...' : 'Search'}
          </button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-emerald-800 text-emerald-100 py-1 px-2.5 rounded-full font-bold border border-emerald-600 shadow-inner flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            SOURCE: {result.source.toUpperCase()}
          </span>
        </div>
      </header>

      {result.message && <StatusBanner message={result.message} />}

      {/* Main split-screen mapping and listings container */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Side: Property Listings Sidebar */}
        <PropertySidebar
          properties={result.properties}
          selectedProperty={selectedProperty}
          onSelectProperty={handleSelectProperty}
        />

        {/* Right Side: Leaflet Map Container */}
        <div className="flex-1 h-full min-h-[300px] relative">
          <PropertyMap
            properties={result.properties}
            trails={result.trails}
            center={mapCenter}
            selectedProperty={selectedProperty}
            onSelectProperty={handleSelectProperty}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
