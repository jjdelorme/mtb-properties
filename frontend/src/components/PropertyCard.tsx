import { Property } from '../types';
import { Home, Compass } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  isSelected: boolean;
  onSelect: (p: Property) => void;
}

export default function PropertyCard({ property, isSelected, onSelect }: PropertyCardProps) {
  return (
    <div
      onClick={() => onSelect(property)}
      className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500 shadow-sm'
          : 'border-gray-100 hover:border-gray-200 bg-white'
      }`}
    >
      <div className="flex justify-between items-start">
        <h4 className="text-xl font-extrabold text-emerald-700 tracking-tight">
          ${property.price.toLocaleString()}
        </h4>
        <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
          {property.propertyType}
        </span>
      </div>

      <p className="text-sm text-gray-700 font-semibold mt-1 truncate" title={property.formattedAddress}>
        {property.formattedAddress}
      </p>

      <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
        <Home className="w-3.5 h-3.5 text-gray-400" />
        <span>
          {property.bedrooms} Bed | {property.bathrooms} Bath | {property.squareFootage.toLocaleString()} sqft
        </span>
      </p>

      {property.nearestTrail ? (
        <div className="mt-3 text-xs bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-lg p-2.5 flex flex-col gap-1">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1 text-emerald-800">
              🚲 Nearest Trail: {property.nearestTrail.name}
            </span>
            <span className="text-emerald-700 font-extrabold bg-white px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5">
              {property.nearestTrail.distanceMiles} miles
            </span>
          </div>
          <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
            <Compass className="w-3 h-3 text-emerald-500" />
            <span>Closest point coordinates: {property.nearestTrail.closestPoint.latitude.toFixed(4)}, {property.nearestTrail.closestPoint.longitude.toFixed(4)}</span>
          </p>
        </div>
      ) : (
        <div className="mt-3 text-xs bg-amber-50 text-amber-800 border border-amber-100 rounded-lg p-2.5">
          ⚠️ No nearby trail calculations available.
        </div>
      )}
    </div>
  );
}
