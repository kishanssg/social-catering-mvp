import React, { useState, useEffect, useRef, useCallback } from 'react';
import { venuesApi } from '../../services/venuesApi';
import type { Venue, VenueSearchResult } from '../../types/venues';
import chevronUpDownIcon from '../../assets/icons/chevron-up-down.svg';
import checkIcon from '../../assets/icons/check.svg';

interface VenueAutocompleteProps {
  selectedVenue: Venue | null;
  onVenueSelect: (venue: Venue) => void;
  onInstructionsUpdate?: (venueId: number, instructions: { arrival_instructions?: string; parking_info?: string }) => void;
}

export const VenueAutocomplete: React.FC<VenueAutocompleteProps> = ({
  selectedVenue,
  onVenueSelect,
  onInstructionsUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cachedResults, setCachedResults] = useState<VenueSearchResult[]>([]);
  const [googleResults, setGoogleResults] = useState<VenueSearchResult[]>([]);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [arrivalInstructions, setArrivalInstructions] = useState('');
  const [parkingInfo, setParkingInfo] = useState('');
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize instructions when venue is selected
  useEffect(() => {
    if (selectedVenue) {
      setArrivalInstructions(selectedVenue.arrival_instructions || '');
      setParkingInfo(selectedVenue.parking_info || '');
      setQuery('');
      setIsOpen(false);
      setShowSaved(false);
    }
  }, [selectedVenue]);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const response = await venuesApi.search(searchQuery, sessionToken);
      setCachedResults(response.cached || []);
      setGoogleResults(response.google_results || []);
      
      // Update session token if provided
      if (response.session_token) {
        setSessionToken(response.session_token);
      }
    } catch (error) {
      console.error('Venue search error:', error);
      setCachedResults([]);
      setGoogleResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken]);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300); // 300ms debounce
  };

  // Handle venue selection
  const handleSelectVenue = async (result: VenueSearchResult) => {
    setIsLoading(true);
    try {
      let venue: Venue | null = null;

      if (result.id) {
        venue = await venuesApi.getById(result.id);
      } else if (result.place_id) {
        const response = await venuesApi.select(result.place_id, sessionToken);
        venue = response.venue;
      } else {
        throw new Error('Venue is missing both id and place_id');
      }

      onVenueSelect(venue);
      setIsOpen(false);
      setQuery('');
    } catch (error) {
      console.error('Venue selection error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle save instructions
  const handleSaveInstructions = async () => {
    if (!selectedVenue) return;

    setIsSavingInstructions(true);
    try {
      await venuesApi.update(selectedVenue.id, {
        arrival_instructions: arrivalInstructions,
        parking_info: parkingInfo,
      });
      
      if (onInstructionsUpdate) {
        onInstructionsUpdate(selectedVenue.id, {
          arrival_instructions: arrivalInstructions,
          parking_info: parkingInfo,
        });
      }
      // show quiet saved confirmation
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1800);
    } catch (error) {
      console.error('Failed to save instructions:', error);
    } finally {
      setIsSavingInstructions(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allResults = [...cachedResults, ...googleResults];
  const showDropdown = isOpen && allResults.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Search Input or Selected Venue Display */}
      {!selectedVenue ? (
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => {
                setIsOpen(true);
                // Load all venues when input is focused (if not already loaded)
                if (cachedResults.length === 0 && googleResults.length === 0) {
                  performSearch(''); // Load all venues
                }
              }}
              placeholder="Search for a venue..."
              className="w-full h-11 px-4 py-2.5 border border-primary-color/20 rounded-lg font-manrope text-sm leading-[140%] text-font-primary placeholder:text-font-secondary focus:outline-none focus:border-primary-color hover:border-primary-color/30 transition-colors"
            />
            <img
              src={chevronUpDownIcon}
              width="20"
              height="20"
              alt="Toggle"
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ imageRendering: 'crisp-edges' }}
            />
          </div>

          {/* Dropdown Results */}
          {showDropdown && (
            <div className="absolute z-[999] w-full mt-1 bg-white border border-primary-color/20 rounded-lg shadow-lg max-h-[280px] overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-3 text-sm text-font-secondary">Searching...</div>
              ) : allResults.length > 0 ? (
                <>
                  {cachedResults.length > 0 && (
                    <div className="border-b border-primary-color/10">
                      <div className="px-4 py-2 text-xs font-semibold text-font-secondary uppercase">
                        Recent Venues
                      </div>
                      {cachedResults.map((result, index) => (
                        <div
                          key={`cached-${result.place_id}-${index}`}
                          className="px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-primary-color/5 last:border-b-0"
                          onClick={() => handleSelectVenue(result)}
                        >
                          <div className="font-semibold text-sm text-font-primary">{result.name}</div>
                          <div className="text-xs text-font-secondary mt-0.5">{result.address}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {googleResults.length > 0 && (
                    <div>
                      {cachedResults.length > 0 && (
                        <div className="px-4 py-2 text-xs font-semibold text-font-secondary uppercase">
                          Search Results
                        </div>
                      )}
                      {googleResults.map((result, index) => (
                        <div
                          key={`google-${result.place_id}-${index}`}
                          className="px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-primary-color/5 last:border-b-0"
                          onClick={() => handleSelectVenue(result)}
                        >
                          <div className="font-semibold text-sm text-font-primary">{result.name}</div>
                          <div className="text-xs text-font-secondary mt-0.5">{result.address}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="px-4 py-3 text-sm text-font-secondary">No venues found</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg p-5 border border-primary-color/30 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          {/* Selected Venue Display */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-bold text-base text-font-primary">{selectedVenue.name}</h3>
              <p className="text-sm text-font-secondary mt-1">{selectedVenue.formatted_address}</p>
            </div>
            <button
              onClick={() => {
                onVenueSelect(null as any);
                setQuery('');
                setCachedResults([]);
                setGoogleResults([]);
              }}
              className="text-sm font-normal font-manrope text-red-500 hover:underline ml-4"
            >
              Change
            </button>
          </div>
          <div className="w-full border-t border-dashed border-primary-color/20 mb-4" />

          {/* Instructions Section - always editable */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-font-secondary uppercase mb-2 tracking-wide">
                Arrival Instructions
              </label>
              <textarea
                value={arrivalInstructions}
                onChange={(e) => setArrivalInstructions(e.target.value)}
                placeholder="e.g., Enter through main entrance, check in at front desk..."
                className="w-full px-3 py-2 border border-primary-color/20 rounded-lg font-manrope text-sm text-font-primary placeholder:text-font-secondary focus:outline-none focus:border-primary-color resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-font-secondary uppercase mb-2 tracking-wide">
                Parking Information
              </label>
              <textarea
                value={parkingInfo}
                onChange={(e) => setParkingInfo(e.target.value)}
                placeholder="e.g., Free parking in rear lot, valet available..."
                className="w-full px-3 py-2 border border-primary-color/20 rounded-lg font-manrope text-sm text-font-primary placeholder:text-font-secondary focus:outline-none focus:border-primary-color resize-none"
                rows={3}
              />
            </div>

            {/* Card footer: Save button (right-aligned) + Saved confirmation */}
            <div className="flex items-center justify-end gap-3 pt-1">
              {showSaved && (
                <span className="flex items-center gap-1 text-sm text-font-secondary">
                  <img src={checkIcon} width="14" height="14" alt="Saved" />
                  Saved
                </span>
              )}
              <button
                onClick={handleSaveInstructions}
                className="px-4 py-2 text-sm font-normal font-manrope text-white bg-primary-color hover:bg-primary-color/90 rounded-lg transition-colors min-w-[88px] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSavingInstructions || (!selectedVenue ? true : (arrivalInstructions === (selectedVenue.arrival_instructions || '') && parkingInfo === (selectedVenue.parking_info || '')))}
              >
                {isSavingInstructions ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

