import React from 'react';
import magnifyingGlassIcon from '../../assets/icons/magnifying-glass.svg';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: string;
  className?: string;
}

export function SearchInput({ 
  value, 
  onChange, 
  placeholder = 'Search', 
  width = '180px',
  className = '' 
}: SearchInputProps) {
  return (
    <div 
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-white ${className}`}
      style={{ 
        width,
        borderColor: 'rgba(41, 40, 38, 0.5)',
      }}
    >
      <img src={magnifyingGlassIcon} width={20} height={20} className="flex-shrink-0" alt="Search" />
      <div className="flex items-center gap-2.5 flex-1 px-1.5 py-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none font-manrope text-sm font-normal leading-[140%]"
          style={{ color: value ? '#292826' : 'rgba(41, 40, 38, 0.5)' }}
        />
      </div>
    </div>
  );
}
