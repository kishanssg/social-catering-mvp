import React, { useState, useEffect } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { getLocations } from '../../services/locationsApi';
import type { Location } from '../../types';

interface LocationDropdownProps {
  selectedLocationId?: number;
  onLocationChange: (locationId: number | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export const LocationDropdown: React.FC<LocationDropdownProps> = ({
  selectedLocationId,
  onLocationChange,
  placeholder = "Select location...",
  className = "",
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await getLocations();
        setLocations(response.data);
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const selectedLocation = locations.find(loc => loc.id === selectedLocationId);

  const handleSelectLocation = (locationId: number) => {
    onLocationChange(locationId);
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    onLocationChange(undefined);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
          ${required && !selectedLocation ? 'border-red-300' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
            <span className={selectedLocation ? 'text-gray-900' : 'text-gray-500'}>
              {selectedLocation ? selectedLocation.display_name || `${selectedLocation.name} - ${selectedLocation.city}, ${selectedLocation.state}` : placeholder}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="px-3 py-2 text-gray-500">Loading locations...</div>
          ) : locations.length === 0 ? (
            <div className="px-3 py-2 text-gray-500">No locations available</div>
          ) : (
            <>
              {!required && (
                <button
                  onClick={handleClearSelection}
                  className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100"
                >
                  Clear selection
                </button>
              )}
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleSelectLocation(location.id)}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-gray-100
                    ${selectedLocationId === location.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                  `}
                >
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <div className="font-medium">{location.name}</div>
                      <div className="text-xs text-gray-500">{location.city}, {location.state}</div>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
