import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Property, Trail, TrailDifficulty } from '../types';

// Simple color mapping utility for trails based on difficulty
export function getDifficultyColor(difficulty: TrailDifficulty): string {
  switch (difficulty) {
    case 'easy':
      return '#10B981'; // Green
    case 'intermediate':
      return '#3B82F6'; // Blue
    case 'advanced':
      return '#111827'; // Dark Gray / Black
    case 'expert':
      return '#EF4444'; // Red / Double Black
    case 'unknown':
    default:
      return '#F97316'; // Orange / Fallback
  }
}

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
  // Format with up to 2 decimal places, removing trailing zeros
  const formattedMillions = parseFloat(millions.toFixed(2));
  return `$${formattedMillions}M`;
}

// Helper component to handle map viewport panning/pivoting when center updates
function ChangeView({ center }: { center: { latitude: number; longitude: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.latitude, center.longitude], map.getZoom());
  }, [center, map]);
  return null;
}

interface PropertyMapProps {
  properties: Property[];
  trails: Trail[];
  center: { latitude: number; longitude: number };
  selectedProperty: Property | null;
  onSelectProperty: (property: Property) => void;
}

export default function PropertyMap({
  properties,
  trails,
  center,
  selectedProperty,
  onSelectProperty,
}: PropertyMapProps) {
  
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

  return (
    <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <ChangeView center={center} />
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

        {/* Trail Polyline Layers */}
        {trails.map((trail) => {
          const positions = trail.coordinates.map((p) => [p.latitude, p.longitude] as [number, number]);
          if (positions.length < 2) return null;
          
          const color = getDifficultyColor(trail.difficulty);

          return (
            <Polyline
              key={trail.id}
              positions={positions}
              pathOptions={{
                color: color,
                weight: 4,
                opacity: 0.85,
              }}
            >
              <Popup>
                <div className="p-1">
                  <h4 className="font-bold text-gray-800 text-sm">{trail.name || 'Unnamed Trail'}</h4>
                  <p className="text-xs text-gray-500 capitalize mt-1">
                    Difficulty: <span className="font-semibold" style={{ color }}>{trail.difficulty}</span>
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">OSM Way: {trail.id}</p>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Property Price Tag Markers */}
        {properties.map((property) => {
          const isSelected = selectedProperty?.id === property.id;
          
          // Create custom divIcon representing a clean price bubble
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
                    {property.bedrooms}bds | {property.bathrooms}ba | {property.squareFootage.toLocaleString()} sqft
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
    </div>
  );
}
