import { Property, Trail } from '../types';
import { getDifficultyBadge, calculateTrailLengthMiles, formatTrailLength } from '../utils/trailUtils';
import { X, Maximize2, Home, ArrowRight } from 'lucide-react';

interface TrailPopoutProps {
  trail: Trail;
  properties: Property[];
  onClose: () => void;
  onZoomToTrail: (trail: Trail) => void;
  onSelectProperty: (property: Property) => void;
}

export default function TrailPopout({
  trail,
  properties,
  onClose,
  onZoomToTrail,
  onSelectProperty,
}: TrailPopoutProps) {
  const badge = getDifficultyBadge(trail.difficulty);
  const lengthMiles = trail.lengthMiles ?? calculateTrailLengthMiles(trail.coordinates);
  const formattedLength = formatTrailLength(lengthMiles);

  // Find properties closest to this trail (within 2 miles)
  const nearbyProperties = properties.filter((p) => {
    if (!p.nearestTrail) return false;
    return p.nearestTrail.trailId === trail.id || p.nearestTrail.name === trail.name;
  });

  // Extract raw tags for display details
  const surface = trail.rawTags?.surface || trail.rawTags?.['mtb:type'] || trail.highway || 'Singletrack Path';
  const mtbScale = trail.rawTags?.['mtb:scale'];

  return (
    <div
      data-testid="trail-popout"
      className="absolute top-4 right-4 z-[1000] w-80 md:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-4"
    >
      {/* Header with Difficulty Color Accent Bar */}
      <div
        className="h-2 w-full"
        style={{ backgroundColor: badge.color }}
      />

      <div className="p-4">
        {/* Title and Top Controls */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full border mb-1.5 ${badge.bgClass} ${badge.borderClass} ${badge.textClass}`}
            >
              <span className="text-xs">{badge.symbol}</span>
              <span>{badge.label}</span>
            </span>
            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
              {trail.name || 'Unnamed Singletrack'}
            </h3>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onZoomToTrail(trail)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
              title="Zoom to fit trail"
              aria-label="Zoom to trail"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close trail popout"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Trail Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 my-3">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">
              Trail Length
            </span>
            <span className="text-sm font-black text-slate-800 flex items-center gap-1 mt-0.5">
              📏 {formattedLength.miles}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block">
              ({formattedLength.km})
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">
              Surface & Type
            </span>
            <span className="text-xs font-black text-slate-800 capitalize truncate block mt-0.5">
              🚴 {surface}
            </span>
            {mtbScale && (
              <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                MTB Scale: {mtbScale}
              </span>
            )}
          </div>
        </div>

        {/* OSM Way Info */}
        <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between px-1 mb-3">
          <span>OSM Element: {trail.id}</span>
          <span>{trail.coordinates.length} waypoints mapped</span>
        </div>

        {/* Nearby Properties Section */}
        <div className="border-t border-slate-100 pt-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-emerald-600" />
              <span>Nearby Home Listings ({nearbyProperties.length})</span>
            </h4>
          </div>

          {nearbyProperties.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500 font-medium">
                No active properties in current search mapped closest to this specific trail.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {nearbyProperties.map((property) => (
                <div
                  key={property.id}
                  onClick={() => onSelectProperty(property)}
                  className="p-2.5 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all cursor-pointer group flex justify-between items-center"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-emerald-700 text-xs">
                        ${property.price.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {property.bedrooms}bd | {property.bathrooms}ba
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-700 truncate mt-0.5">
                      {property.formattedAddress}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-1">
                    {property.nearestTrail && (
                      <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                        {property.nearestTrail.distanceMiles} mi
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
