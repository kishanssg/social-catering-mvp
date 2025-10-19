import React from 'react';
import chevronUpDownIcon from '../../assets/icons/chevron-up-down.svg';

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function SortDropdown({ value, onChange, options, className = '' }: SortDropdownProps) {
  return (
    <div 
      className={`flex items-center gap-2.5 px-3 py-2 justify-end rounded-lg border bg-white ${className}`}
      style={{ borderColor: 'rgba(41, 40, 38, 0.5)' }}
    >
      <span 
        className="font-manrope text-xs font-normal leading-[140%]"
        style={{ color: '#292826' }}
      >
        Sort by
      </span>
      <img src={chevronUpDownIcon} width={16} height={16} alt="Sort" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
