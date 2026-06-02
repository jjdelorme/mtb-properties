import { Property } from '../types';
import PropertyCard from './PropertyCard';

interface PropertySidebarProps {
  properties: Property[];
  selectedProperty: Property | null;
  onSelectProperty: (property: Property) => void;
}

export default function PropertySidebar({
  properties,
  selectedProperty,
  onSelectProperty,
}: PropertySidebarProps) {
  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-100 w-full md:w-96 shrink-0">
      <div className="p-4 bg-white border-b border-gray-100 shadow-sm shrink-0">
        <h3 className="font-bold text-gray-800 text-lg flex items-center justify-between">
          <span>🏠 Home Listings</span>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {properties.length} Active
          </span>
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Sorted automatically by mountain bike trail proximity (closest first).
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center bg-white border border-dashed border-gray-200 rounded-xl p-6">
            <p className="text-gray-400 text-lg">🏠</p>
            <p className="text-gray-600 font-semibold mt-2">No properties found</p>
            <p className="text-xs text-gray-400 mt-1">
              Try searching for one of our sandbox ZIP codes or city names.
            </p>
          </div>
        ) : (
          properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              isSelected={selectedProperty?.id === property.id}
              onSelect={onSelectProperty}
            />
          ))
        )}
      </div>
    </div>
  );
}
