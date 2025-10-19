import React, { useState, useEffect } from 'react';
import { Clock, DollarSign } from 'lucide-react';

interface HoursEntryProps {
  hoursWorked?: number;
  hourlyRate?: number;
  totalPay?: number;
  onHoursChange: (hours: number | undefined) => void;
  onRateChange: (rate: number | undefined) => void;
  disabled?: boolean;
  className?: string;
}

export const HoursEntry: React.FC<HoursEntryProps> = ({
  hoursWorked,
  hourlyRate,
  totalPay,
  onHoursChange,
  onRateChange,
  disabled = false,
  className = ""
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempHours, setTempHours] = useState(hoursWorked?.toString() || '');
  const [tempRate, setTempRate] = useState(hourlyRate?.toString() || '');

  useEffect(() => {
    setTempHours(hoursWorked?.toString() || '');
    setTempRate(hourlyRate?.toString() || '');
  }, [hoursWorked, hourlyRate]);

  const handleSave = () => {
    const hours = tempHours ? parseFloat(tempHours) : undefined;
    const rate = tempRate ? parseFloat(tempRate) : undefined;
    
    onHoursChange(hours);
    onRateChange(rate);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempHours(hoursWorked?.toString() || '');
    setTempRate(hourlyRate?.toString() || '');
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const calculatedTotal = hoursWorked && hourlyRate ? hoursWorked * hourlyRate : 0;
  const displayTotal = totalPay !== undefined ? totalPay : calculatedTotal;

  if (!isEditing) {
    return (
      <div className={`${className} ${disabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-gray-600">
              {hoursWorked ? `${hoursWorked}h` : 'No hours'}
            </span>
          </div>
          <div className="flex items-center text-sm">
            <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
            <span className="text-gray-600">
              {hourlyRate ? `$${hourlyRate}/h` : 'No rate'}
            </span>
          </div>
          {displayTotal > 0 && (
            <div className="text-sm font-medium text-green-600">
              ${displayTotal.toFixed(2)}
            </div>
          )}
        </div>
        {!disabled && (
          <button
            onClick={() => setIsEditing(true)}
            className="mt-1 text-xs text-blue-600 hover:text-blue-500"
          >
            Edit hours
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${className} space-y-2`}>
      <div className="flex items-center space-x-2">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Hours
          </label>
          <div className="relative">
            <Clock className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
            <input
              type="number"
              step="0.25"
              min="0"
              max="24"
              value={tempHours}
              onChange={(e) => setTempHours(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Rate ($)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={tempRate}
              onChange={(e) => setTempRate(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>
      
      {tempHours && tempRate && (
        <div className="text-sm text-gray-600">
          Total: <span className="font-medium text-green-600">
            ${(parseFloat(tempHours) * parseFloat(tempRate)).toFixed(2)}
          </span>
        </div>
      )}
      
      <div className="flex space-x-2">
        <button
          onClick={handleSave}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
