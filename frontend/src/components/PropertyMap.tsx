import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Property, Trail, CustomAddressAnalysis } from '../types';
import {
  getDifficultyColor,
  getDifficultyBadge,
  calculateTrailLengthMiles,
  formatTrailLength,
} from '../utils/trailUtils';
import TrailPopout from './TrailPopout';
import { Compass } from 'lucide-react';

// Re-export utility functions for backward compatibility with existing tests
export { getDifficultyColor };

// Utility to format price into short abbreviation (e.g., 850000 -> $850k, 1250000 -> $1.25M)
export function formatPriceAbbreviation(price: number): string {
  if (price < 1000) {
    return `$${price}`;
  }
  if (price < 1000000) {
    const thousands = price / 1000;
    return `$${Math.round(thousands)}k`;
  }
  const millions = price / 1000000;
  const formattedMillions = parseFloat(millions.toFixed(2));
  return `$${formattedMillions}M`;
}

// Helper component to handle map viewport panning when center updates
function ChangeView({ center }: { center: { latitude: number; longitude: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.latitude, center.longitude], map.getZoom());
  }, [center, map]);
  return null;
}

// Helper component to fit map bounds to selected trail
function FitTrailBounds({ trail }: { trail: Trail | null }) {
  const map = useMap();
  useEffect(() => {
    if (trail && trail.coordinates && trail.coordinates.length > 1) {
      const bounds = L.latLngBounds(
        trail.coordinates.map((p) => [p.latitude, p.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
  }, [trail, map]);
  return null;
}

interface PropertyMapProps {
  properties: Property[];
  trails: Trail[];
  center: { latitude: number; longitude: number };
  selectedProperty: Property | null;
  onSelectProperty: (property: Property) => void;
  customAddress?: CustomAddressAnalysis;
  selectedTrail?: Trail | null;
  onSelectTrail?: (trail: Trail | null) => void;
}

export default function PropertyMap({
  properties,
  trails,
  center,
  selectedProperty,
  onSelectProperty,
  customAddress,
  selectedTrail: externalSelectedTrail,
  onSelectTrail: externalOnSelectTrail,
}: PropertyMapProps) {
  // Support both controlled and uncontrolled selectedTrail state
  const [internalSelectedTrail, setInternalSelectedTrail] = useState<Trail | null>(null);
  const activeTrail = externalSelectedTrail !== undefined ? externalSelectedTrail : internalSelectedTrail;

  // Active filter for legend (null = show all)
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);

  const handleSelectTrail = (trail: Trail | null) => {
    if (externalOnSelectTrail) {
      externalOnSelectTrail(trail);
    }
    setInternalSelectedTrail(trail);
  };

  // Custom center marker (Simple styled dot)
  const centerIcon = L.divIcon({
    className: 'custom-center-marker',
    html: `
      <div class="flex items-center justify-center w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-md animate-ping absolute"></div>
      <div class="flex items-center justify-center w-6 h-6 bg-red-600 rounded-full border-2 border-white shadow-md relative z-10">
        <span class="text-white text-[10px] font-bold">📍</span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  // Custom Address icon (Glowing gold pin with pulse)
  const customAddressIcon = L.divIcon({
    className: 'custom-address-marker',
    html: `
      <div class="flex items-center justify-center w-8 h-8 bg-amber-400 rounded-full border-2 border-white shadow-lg animate-ping absolute"></div>
      <div class="flex items-center justify-center w-8 h-8 bg-amber-500 rounded-full border-2 border-white shadow-lg relative z-10">
        <span class="text-white text-xs font-black">⭐</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  // Filter trails based on legend selection
  const visibleTrails = difficultyFilter
    ? trails.filter((t) => t.difficulty === difficultyFilter)
    : trails;

  // Difficulty counts for legend
  const counts = {
    easy: trails.filter((t) => t.difficulty === 'easy').length,
    intermediate: trails.filter((t) => t.difficulty === 'intermediate').length,
    advanced: trails.filter((t) => t.difficulty === 'advanced').length,
    expert: trails.filter((t) => t.difficulty === 'expert').length,
    unknown: trails.filter((t) => t.difficulty === 'unknown').length,
  };

  return (
    <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <ChangeView center={center} />
        <FitTrailBounds trail={activeTrail} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Search Center Marker */}
        <Marker position={[center.latitude, center.longitude]} icon={centerIcon}>
          <Popup>
            <div className="text-xs font-semibold text-gray-800">
              🔍 Searched Center Coordinate
            </div>
          </Popup>
        </Marker>

        {/* Trail Layers with High Contrast Dual-Stroke & Hit Area */}
        {visibleTrails.map((trail) => {
          const positions = trail.coordinates.map(
            (p) => [p.latitude, p.longitude] as [number, number]
          );
          if (positions.length < 2) return null;

          const isSelected = activeTrail?.id === trail.id;
          const badge = getDifficultyBadge(trail.difficulty);
          const color = badge.color;
          const lengthMiles = trail.lengthMiles ?? calculateTrailLengthMiles(trail.coordinates);
          const formattedLength = formatTrailLength(lengthMiles);

          return (
            <React.Fragment key={trail.id}>
              {/* Outer Casing / Outline Polyline to make trails POP off map */}
              <Polyline
                positions={positions}
                pathOptions={{
                  color: isSelected ? '#F59E0B' : '#0F172A', // Golden glow if selected, dark slate casing default
                  weight: isSelected ? 12 : 7,
                  opacity: isSelected ? 0.95 : 0.65,
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: isSelected ? '8, 8' : undefined,
                }}
              />

              {/* Core Colored Trail Line */}
              <Polyline
                positions={positions}
                pathOptions={{
                  color: color,
                  weight: isSelected ? 6 : 4,
                  opacity: isSelected ? 1 : 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />

              {/* Interactive Hit-Buffer Polyline (20px wide transparent click zone) */}
              <Polyline
                positions={positions}
                pathOptions={{
                  color: 'transparent',
                  weight: 22,
                  opacity: 0,
                }}
                eventHandlers={{
                  click: () => {
                    handleSelectTrail(trail);
                  },
                }}
              >
                {/* Tooltip on hover */}
                <Tooltip sticky direction="top" className="custom-trail-tooltip">
                  <div className="p-1 text-slate-900 font-sans">
                    <div className="flex items-center gap-1 text-xs font-black">
                      <span>{badge.symbol}</span>
                      <span>{trail.name || 'Unnamed Trail'}</span>
                    </div>
                    <div className="text-[10px] text-slate-600 font-bold mt-0.5">
                      {badge.shortLabel} • {formattedLength.miles}
                    </div>
                  </div>
                </Tooltip>

                {/* Leaflet Popup on click */}
                <Popup>
                  <div className="p-1 font-sans">
                    <div className="flex items-center gap-1 text-xs font-extrabold text-slate-900">
                      <span>{badge.symbol}</span>
                      <span>{trail.name || 'Unnamed Trail'}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 mt-1">
                      Rating:{' '}
                      <span style={{ color }}>{badge.label}</span>
                    </p>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Length: {formattedLength.formatted}
                    </p>
                    <button
                      onClick={() => handleSelectTrail(trail)}
                      className="mt-2 text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-1 px-3 rounded-lg w-full transition-colors shadow-sm"
                    >
                      View Trail Popout & Nearby Homes ➔
                    </button>
                  </div>
                </Popup>
              </Polyline>
            </React.Fragment>
          );
        })}

        {/* Custom Address Marker & Connecting Line */}
        {customAddress && (
          <>
            <Marker
              position={[customAddress.latitude, customAddress.longitude]}
              icon={customAddressIcon}
            >
              <Popup>
                <div className="p-2 w-56 font-sans">
                  <div className="flex items-center justify-between mb-1">
                    <span className="bg-amber-100 text-amber-900 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded border border-amber-300">
                      {customAddress.matchType === 'exact' ? '🎯 Exact Parcel Pinpoint' : '📍 Address Pin'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-extrabold mt-1 leading-tight">
                    {customAddress.formattedAddress}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    {customAddress.latitude.toFixed(6)}°, {customAddress.longitude.toFixed(6)}°
                  </p>
                  {customAddress.propertyType && (
                    <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                      {customAddress.propertyType} {customAddress.lotSize ? `• ${(customAddress.lotSize / 43560).toFixed(2)} Acres` : ''}
                    </p>
                  )}
                  {customAddress.nearestTrail && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-amber-800 font-bold">
                      🚲 Nearest Trail: {customAddress.nearestTrail.name}
                      <span className="block text-slate-500 text-[9px] font-normal mt-0.5">
                        {customAddress.nearestTrail.distanceMiles} miles away
                      </span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>

            {customAddress.nearestTrail && customAddress.nearestTrail.closestPoint && (
              <Polyline
                positions={[
                  [customAddress.latitude, customAddress.longitude],
                  [
                    customAddress.nearestTrail.closestPoint.latitude,
                    customAddress.nearestTrail.closestPoint.longitude,
                  ],
                ]}
                pathOptions={{
                  color: '#D97706',
                  weight: 3,
                  opacity: 0.9,
                  dashArray: '6, 8',
                }}
              />
            )}
          </>
        )}

        {/* Property Price Tag Markers */}
        {properties.map((property) => {
          const isSelected = selectedProperty?.id === property.id;
          const priceLabel = formatPriceAbbreviation(property.price);
          const markerHtml = `
            <div class="transition-all duration-200 transform hover:scale-105 select-none shadow-md rounded-full font-extrabold text-[11px] px-2.5 py-1 text-center whitespace-nowrap border ${
              isSelected
                ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-300 ring-offset-1 scale-110 z-50'
                : 'bg-white text-emerald-800 border-emerald-500 hover:bg-emerald-50'
            }">
              ${priceLabel}
            </div>
          `;

          const priceIcon = L.divIcon({
            className: `custom-price-marker ${isSelected ? 'z-50' : 'z-10'}`,
            html: markerHtml,
            iconSize: [52, 24],
            iconAnchor: [26, 12],
          });

          return (
            <Marker
              key={property.id}
              position={[property.latitude, property.longitude]}
              icon={priceIcon}
              eventHandlers={{
                click: () => {
                  onSelectProperty(property);
                },
              }}
            >
              <Popup>
                <div className="p-2 w-48 font-sans">
                  <h4 className="font-extrabold text-emerald-700 text-base">
                    ${property.price.toLocaleString()}
                  </h4>
                  <p className="text-xs text-gray-700 font-semibold mt-1 leading-tight">
                    {property.formattedAddress}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {property.bedrooms}bds | {property.bathrooms}ba |{' '}
                    {property.squareFootage.toLocaleString()} sqft
                  </p>
                  {property.nearestTrail && (
                    <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-emerald-800 font-medium">
                      🚲 {property.nearestTrail.name}
                      <span className="block text-gray-500 text-[10px] font-normal mt-0.5">
                        {property.nearestTrail.distanceMiles} miles away
                      </span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Trail Detail Popout */}
      {activeTrail && (
        <TrailPopout
          trail={activeTrail}
          properties={properties}
          onClose={() => handleSelectTrail(null)}
          onZoomToTrail={() => {
            // Re-trigger zoom
            const current = activeTrail;
            handleSelectTrail(null);
            setTimeout(() => handleSelectTrail(current), 10);
          }}
          onSelectProperty={onSelectProperty}
        />
      )}

      {/* Interactive Map Difficulty Legend Control */}
      <div className="absolute bottom-6 left-4 z-[999] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 p-3 max-w-xs font-sans">
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span>Trail Rating Legend</span>
          </span>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {visibleTrails.length} mapped
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {[
            { key: 'easy', label: 'Easy', color: '#10B981', symbol: '🟢', count: counts.easy },
            { key: 'intermediate', label: 'Blue', color: '#3B82F6', symbol: '🔷', count: counts.intermediate },
            { key: 'advanced', label: 'Black', color: '#111827', symbol: '◆', count: counts.advanced },
            { key: 'expert', label: 'Expert', color: '#EF4444', symbol: '◆◆', count: counts.expert },
          ].map((item) => {
            const isFiltered = difficultyFilter === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setDifficultyFilter(isFiltered ? null : item.key)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-extrabold transition-all ${
                  isFiltered
                    ? 'ring-2 ring-emerald-500 shadow-sm bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
                title={`Filter by ${item.label} trails`}
              >
                <span>{item.symbol}</span>
                <span>{item.label}</span>
                <span className="text-[9px] opacity-70">({item.count})</span>
              </button>
            );
          })}
          {difficultyFilter && (
            <button
              onClick={() => setDifficultyFilter(null)}
              className="text-[10px] font-bold text-emerald-700 hover:underline px-1 py-1"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
