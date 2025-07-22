import React, { useState } from 'react';

const DateFilter = ({ onDateFilterChange, activeFilter }) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const presetFilters = [
    { key: 'all', label: 'All Time', icon: '🕒' },
    { key: 'today', label: 'Today', icon: '📅' },
    { key: '24h', label: 'Last 24h', icon: '⏰' },
    { key: '7d', label: 'Last 7 days', icon: '📆' },
    { key: '30d', label: 'Last 30 days', icon: '🗓️' },
    { key: 'custom', label: 'Custom Range', icon: '🎯' }
  ];

  const handlePresetClick = (filterKey) => {
    if (filterKey === 'custom') {
      setShowCustom(true);
      // Clear any previous active filter when entering custom mode
      if (activeFilter !== 'custom') {
        onDateFilterChange(null); // Clear active filter
      }
      return;
    }
    
    setShowCustom(false);
    onDateFilterChange(filterKey);
  };

  const handleCustomSubmit = () => {
    if (customStart && customEnd) {
      onDateFilterChange('custom', customStart, customEnd);
      setShowCustom(false);
    }
  };

  const handleCustomCancel = () => {
    setShowCustom(false);
    setCustomStart('');
    setCustomEnd('');
    if (activeFilter === 'custom') {
      onDateFilterChange('all');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-3 mb-4">
      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {presetFilters.map(filter => (
          <button
            key={filter.key}
            onClick={() => handlePresetClick(filter.key)}
            className={`
              px-2.5 py-1 text-xs font-medium rounded-full border transition-all duration-150 select-none
              ${activeFilter === filter.key && !(filter.key === 'custom' && showCustom && !activeFilter)
                ? 'bg-purple-500 text-white border-purple-500 shadow-sm hover:bg-purple-600' 
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
              }
            `}
          >
            {filter.icon} {filter.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range Input */}
      {showCustom && (
        <div className="mt-3 p-3 bg-gray-50 rounded-md">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">From:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">To:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCustomSubmit}
              disabled={!customStart || !customEnd}
              className="text-xs px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Apply
            </button>
            <button
              onClick={handleCustomCancel}
              className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilter;
