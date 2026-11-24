import React from 'react';
import { Property, Trail, CustomAddressAnalysis } from '../types';
import PropertyCard from './PropertyCard';
import { Compass, MapPin, ArrowRight, Layers } from 'lucide-react';
import { getDifficultyBadge } from '../utils/trailUtils';

interface PropertySidebarProps {
  properties: Property[];
  trails?: Trail[];
  selectedProperty: Property | null;
  onSelectProperty: (property: Property) => void;
  activeTrail?: Trail | null;
  selectedTrail?: Trail | null;
  onSelectTrail?: (trail: Trail | null) => void;
  customAddress?: CustomAddressAnalysis;
  activeTab?: 'properties' | 'trails';
  setActiveTab?: (tab: 'properties' | 'trails') => void;
}

export default function PropertySidebar({
  properties = [],
  trails = [],
  selectedProperty,
  onSelectProperty,
  activeTrail: propActiveTrail,
  selectedTrail: propSelectedTrail,
  onSelectTrail = () => {},
  customAddress,
  activeTab,
  setActiveTab,
}: PropertySidebarProps) {
  // Support both activeTrail and selectedTrail prop names
  const activeTrail = propActiveTrail !== undefined ? propActiveTrail : (propSelectedTrail ?? null);

  // Tab management: default or surface the 'trails' tab when customAddress is present
  const [internalTab, setInternalTab] = React.useState<'properties' | 'trails'>(() =>
    customAddress ? 'trails' : 'properties'
  );

  // Sync internalTab when customAddress arrives or changes
  const prevCustomAddressRef = React.useRef(customAddress);
  React.useEffect(() => {
    if (customAddress && customAddress !== prevCustomAddressRef.current) {
      setInternalTab('trails');
      if (setActiveTab) {
        setActiveTab('trails');
      }
    } else if (!customAddress && prevCustomAddressRef.current) {
      setInternalTab('properties');
      if (setActiveTab) {
        setActiveTab('properties');
      }
    }
    prevCustomAddressRef.current = customAddress;
  }, [customAddress, setActiveTab]);

  const currentTab = activeTab !== undefined ? activeTab : internalTab;

  const handleTabChange = (tab: 'properties' | 'trails') => {
    setInternalTab(tab);
    if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  return (
    <aside className="w-full md:w-96 lg:w-[420px] bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-65px)] shadow-xl z-20 shrink-0">
      {/* Header Tabs Navigation */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70">
        <div className="flex bg-slate-200/80 p-1 rounded-xl">
          <button
            onClick={() => handleTabChange('properties')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              currentTab === 'properties'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>🏘️</span>
            <span>Homes ({properties.length})</span>
          </button>
          <button
            onClick={() => handleTabChange('trails')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              currentTab === 'trails'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>🚲</span>
            <span>Trails ({trails.length})</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 font-semibold mt-2.5 px-1">
          {currentTab === 'properties'
            ? 'Sorted by mountain bike singletrack proximity (closest first).'
            : 'Select any trail to view popout details, rating, length & nearby homes.'}
        </p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Custom Address Proximity Analysis Card */}
        {customAddress && (
          <div className="bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-900 rounded-2xl shadow-xl p-5 text-white border border-emerald-450/40 relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]">
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-400/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>

            <div className="flex justify-between items-start mb-3 relative z-10">
              <span className="bg-amber-400/90 text-slate-950 text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-md shadow-sm">
                {customAddress.matchType === 'exact' ? '🎯 Exact Parcel Pinpoint' : '📍 Custom Address Pin'}
              </span>
              {customAddress.nearestTrail && (
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm ${
                    customAddress.nearestTrail.distanceMiles < 0.5
                      ? 'bg-emerald-400 text-slate-950 animate-pulse'
                      : 'bg-white/10 text-white border border-white/10'
                  }`}
                >
                  {customAddress.nearestTrail.distanceMiles < 0.5
                    ? '🔥 Immediate Access'
                    : 'Rideable Proximity'}
                </span>
              )}
            </div>

            <div className="relative z-10">
              <h4 className="font-black text-sm flex items-center gap-1.5 leading-tight text-white">
                <MapPin className="w-4 h-4 shrink-0 text-amber-300" />
                <span className="truncate">{customAddress.formattedAddress.split(',')[0]}</span>
              </h4>
              <p className="text-[11px] text-emerald-100 mt-1 font-medium line-clamp-2 opacity-90">
                {customAddress.formattedAddress}
              </p>

              <div className="flex items-center gap-2 mt-2 text-[10px] text-emerald-200 font-mono">
                <span className="bg-slate-950/40 px-2 py-0.5 rounded border border-white/10">
                  {customAddress.latitude.toFixed(6)}°, {customAddress.longitude.toFixed(6)}°
                </span>
                {customAddress.propertyType && (
                  <span className="bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded font-bold border border-emerald-400/20">
                    {customAddress.propertyType}
                    {customAddress.lotSize ? ` • ${(customAddress.lotSize / 43560).toFixed(2)} Acres` : ''}
                  </span>
                )}
              </div>
            </div>

            {customAddress.nearestTrail ? (
              <div className="mt-4 bg-slate-950/40 border border-white/15 rounded-xl p-3 flex flex-col gap-2 relative z-10 shadow-inner">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-emerald-200 font-bold flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-amber-300 animate-spin-slow" /> Nearest Singletrack:
                  </span>
                  <span className="font-extrabold text-amber-300 text-xs bg-slate-950/60 px-2 py-0.5 rounded-md border border-amber-400/30 shadow-sm">
                    {customAddress.nearestTrail.distanceMiles} miles
                  </span>
                </div>
                <div className="text-white font-extrabold text-sm flex items-center gap-1 justify-between mt-1">
                  <span className="truncate max-w-[200px] text-emerald-50 font-bold">
                    {customAddress.nearestTrail.name}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0 text-amber-300 hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-emerald-100 mt-3 italic bg-slate-900/10 p-2 rounded-lg border border-white/5">
                No singletrack trails discovered within search radius of this address.
              </p>
            )}
          </div>
        )}

        {/* Tab 1: Properties List */}
        {currentTab === 'properties' && (
          <>
            {properties.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center bg-white border border-dashed border-slate-200 rounded-2xl p-6">
                <p className="text-slate-400 text-lg">🏠</p>
                <p className="text-slate-600 font-bold mt-2 text-sm">No listings found</p>
                <p className="text-xs text-slate-400 mt-1">
                  No matching properties mapped within this area boundaries.
                </p>
              </div>
            ) : (
              properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isSelected={selectedProperty?.id === property.id}
                  onSelect={() => onSelectProperty(property)}
                />
              ))
            )}
          </>
        )}

        {/* Tab 2: Trails List */}
        {currentTab === 'trails' && (
          <>
            {trails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center bg-white border border-dashed border-slate-200 rounded-2xl p-6">
                <p className="text-slate-400 text-lg">🚲</p>
                <p className="text-slate-600 font-bold mt-2 text-sm">No trails mapped</p>
                <p className="text-xs text-slate-400 mt-1">
                  No mountain bike trails discovered in this query radius.
                </p>
              </div>
            ) : (
              trails.map((trail) => {
                const isSelected = activeTrail?.id === trail.id;
                const badge = getDifficultyBadge(trail.difficulty);

                return (
                  <div
                    key={trail.id}
                    onClick={() => onSelectTrail(isSelected ? null : trail)}
                    className={`border rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-extrabold text-sm text-slate-800 leading-tight">
                        {trail.name}
                      </h4>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${badge.bgClass} ${badge.textClass} ${badge.borderClass}`}
                      >
                        {badge.shortLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        Type: {trail.highway}
                      </span>
                      {trail.lengthMiles && (
                        <span>• {trail.lengthMiles} miles long</span>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-700 font-bold">
                      <span>{isSelected ? 'Viewing on map' : 'Click to inspect & zoom'}</span>
                      <ArrowRight
                        className={`w-3.5 h-3.5 transition-transform ${
                          isSelected ? 'translate-x-1' : ''
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </aside>
  );
}
