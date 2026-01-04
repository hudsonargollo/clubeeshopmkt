/**
 * Address Autocomplete Component
 * Requirements: 9.1, 9.2 - Address autocomplete with validation
 * 
 * Provides address input with autocomplete suggestions.
 * Can integrate with Google Maps or Mapbox for production use.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ValidatedAddress } from '~/lib/orderUtils';

export interface AddressAutocompleteProps {
  /** Callback when a valid address is selected */
  onAddressSelect: (address: ValidatedAddress) => void;
  /** Optional initial address value */
  initialAddress?: ValidatedAddress;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Optional CSS class name */
  className?: string;
  /** API provider: 'google' | 'mapbox' | 'mock' (default: 'mock') */
  provider?: 'google' | 'mapbox' | 'mock';
  /** API key for the provider (required for google/mapbox) */
  apiKey?: string;
}

/**
 * Address suggestion from autocomplete
 */
interface AddressSuggestion {
  id: string;
  description: string;
  address: ValidatedAddress;
}

/**
 * Mock address suggestions for development/testing
 */
const MOCK_SUGGESTIONS: AddressSuggestion[] = [
  {
    id: '1',
    description: '123 Main Street, New York, NY 10001',
    address: {
      street: '123 Main Street',
      city: 'New York',
      postal_code: '10001',
      country: 'USA',
      coordinates: { lat: 40.7128, lng: -74.006 },
    },
  },
  {
    id: '2',
    description: '456 Oak Avenue, Los Angeles, CA 90001',
    address: {
      street: '456 Oak Avenue',
      city: 'Los Angeles',
      postal_code: '90001',
      country: 'USA',
      coordinates: { lat: 34.0522, lng: -118.2437 },
    },
  },
  {
    id: '3',
    description: '789 Pine Road, Chicago, IL 60601',
    address: {
      street: '789 Pine Road',
      city: 'Chicago',
      postal_code: '60601',
      country: 'USA',
      coordinates: { lat: 41.8781, lng: -87.6298 },
    },
  },
];

/**
 * AddressAutocomplete - Address input with autocomplete suggestions
 * 
 * In production, this would integrate with Google Maps Places API
 * or Mapbox Geocoding API for real address validation.
 * 
 * @example
 * ```tsx
 * <AddressAutocomplete
 *   onAddressSelect={(address) => setDeliveryAddress(address)}
 *   placeholder="Enter delivery address"
 * />
 * ```
 */
export function AddressAutocomplete({
  onAddressSelect,
  initialAddress,
  placeholder = 'Enter delivery address...',
  disabled = false,
  className = '',
  provider = 'mock',
  apiKey,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(
    initialAddress ? formatAddress(initialAddress) : ''
  );
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Format address for display
   */
  function formatAddress(address: ValidatedAddress): string {
    return `${address.street}, ${address.city}, ${address.postal_code}`;
  }

  /**
   * Fetch suggestions based on input (mock implementation)
   */
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (provider === 'mock') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Filter mock suggestions based on query
        const filtered = MOCK_SUGGESTIONS.filter(s =>
          s.description.toLowerCase().includes(query.toLowerCase())
        );
        
        // If no matches, create a suggestion from the input
        if (filtered.length === 0 && query.length > 5) {
          filtered.push({
            id: 'custom',
            description: query,
            address: parseAddressFromString(query),
          });
        }
        
        setSuggestions(filtered);
      } else if (provider === 'google' && apiKey) {
        // TODO: Implement Google Places API integration
        // const response = await fetch(
        //   `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}`
        // );
        setError('Google Maps integration not yet implemented');
      } else if (provider === 'mapbox' && apiKey) {
        // TODO: Implement Mapbox Geocoding API integration
        // const response = await fetch(
        //   `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${apiKey}`
        // );
        setError('Mapbox integration not yet implemented');
      }
    } catch (err) {
      setError('Failed to fetch address suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [provider, apiKey]);

  /**
   * Parse a string into an address object (best effort)
   */
  function parseAddressFromString(str: string): ValidatedAddress {
    const parts = str.split(',').map(p => p.trim());
    return {
      street: parts[0] || str,
      city: parts[1] || 'Unknown',
      postal_code: parts[2] || '00000',
      country: parts[3] || 'USA',
    };
  }

  /**
   * Handle input change with debounce
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSelectedIndex(-1);
    
    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
      setIsOpen(true);
    }, 300);
  }, [fetchSuggestions]);

  /**
   * Handle suggestion selection
   */
  const handleSelect = useCallback((suggestion: AddressSuggestion) => {
    setInputValue(suggestion.description);
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    onAddressSelect(suggestion.address);
  }, [onAddressSelect]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, suggestions, selectedIndex, handleSelect]);

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Cleanup debounce on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          aria-label="Delivery address"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="address-suggestions"
          role="combobox"
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id="address-suggestions"
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`px-4 py-2 cursor-pointer ${
                index === selectedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              }`}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <span className="block text-sm">{suggestion.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AddressAutocomplete;
