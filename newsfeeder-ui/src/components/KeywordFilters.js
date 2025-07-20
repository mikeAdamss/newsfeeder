import React from 'react';

const KeywordFilters = ({ topic, keywords, activeFilters, onFilterToggle, onSelectAll, onClearAll }) => {
  if (!keywords || keywords.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Filter by Keywords</h3>
        <div className="space-x-2">
          <button 
            onClick={() => onSelectAll(topic)}
            className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            Select All
          </button>
          <button 
            onClick={() => onClearAll(topic)}
            className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {keywords.map(keyword => (
          <button
            key={keyword}
            onClick={() => onFilterToggle(topic, keyword)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 select-none
              ${activeFilters.has(keyword) 
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm hover:bg-blue-700 hover:shadow-md' 
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }
            `}
          >
            {keyword}
          </button>
        ))}
      </div>
    </div>
  );
};

export default KeywordFilters;
