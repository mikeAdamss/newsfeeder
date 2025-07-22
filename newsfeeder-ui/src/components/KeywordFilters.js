import React, { useState } from 'react';

// Helper function to extract readable source name from feed URL
const getSourceName = (feedUrl) => {
  try {
    const url = new URL(feedUrl);
    const domain = url.hostname.replace('www.', '');
    
    // Map common domains to readable names
    const domainMap = {
      'reddit.com': 'Reddit',
      'dev.to': 'Dev.to',
      'feeds.bbci.co.uk': 'BBC',
      'rss.nytimes.com': 'New York Times',
      'feeds.arstechnica.com': 'Ars Technica',
      'techcrunch.com': 'TechCrunch',
      'theverge.com': 'The Verge',
      'feeds.feedburner.com': 'VentureBeat',
      'wired.com': 'Wired',
      'rss.cnn.com': 'CNN',
      'feeds.reuters.com': 'Reuters'
    };
    
    // Check if we have a mapped name
    if (domainMap[domain]) {
      return domainMap[domain];
    }
    
    // For Reddit, extract subreddit name
    if (domain === 'reddit.com' && url.pathname.includes('/r/')) {
      const subreddit = url.pathname.match(/\/r\/([^\/]+)/);
      if (subreddit) {
        return `r/${subreddit[1]}`;
      }
    }
    
    // For Dev.to, check if it's a tag feed
    if (domain === 'dev.to' && url.pathname.includes('/tag/')) {
      const tag = url.pathname.match(/\/tag\/([^\/]+)/);
      if (tag) {
        return `Dev.to (${tag[1]})`;
      }
    }
    
    // Fallback to domain name, capitalize first letter
    return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    
  } catch (e) {
    // If URL parsing fails, return a fallback
    return 'Unknown Source';
  }
};

const KeywordFilters = ({ 
  topic, 
  keywords, 
  sources, 
  activeFilters, 
  activeSourceFilters,
  activeDateFilter,
  customDateRange,
  onFilterToggle, 
  onSourceFilterToggle,
  onDateFilterChange,
  onSelectAll, 
  onClearAll,
  onSelectAllSources,
  onClearAllSources,
  getSourceName: externalGetSourceName
}) => {
  const [keywordsExpanded, setKeywordsExpanded] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const sourceNameFn = externalGetSourceName || getSourceName;
  
  // Date filter preset options
  const presetFilters = [
    { key: 'all', label: 'All Time', icon: '🕒' },
    { key: '24h', label: 'Last 24h', icon: '⏰' },
    { key: '48h', label: 'Last 48h', icon: '⏱️' },
    { key: '7d', label: 'Last 7 days', icon: '📆' },
    { key: '30d', label: 'Last 30 days', icon: '🗓️' },
    { key: 'custom', label: 'Custom Range', icon: '🎯' }
  ];

  const handlePresetClick = (filterKey) => {
    if (filterKey === 'custom') {
      setShowCustom(true);
      // Clear any previous active filter when entering custom mode
      if (activeDateFilter !== 'custom') {
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
    if (activeDateFilter === 'custom') {
      onDateFilterChange('all');
    }
  };
  
  // Always show the component since we now have date filtering even without keywords/sources
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      {/* Compact header with counts */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Filters ({activeFilters.size + activeSourceFilters.size + (activeDateFilter && activeDateFilter !== 'all' ? 1 : 0)} active)
        </h3>
      </div>

      {/* Keywords Section */}
      {keywords && keywords.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <button 
                  onClick={() => onSelectAll(topic)}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  title="Select all keywords"
                >
                  All
                </button>
                <button 
                  onClick={() => onClearAll(topic)}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  title="Clear all keywords"
                >
                  None
                </button>
              </div>
              <button
                onClick={() => setKeywordsExpanded(!keywordsExpanded)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${keywordsExpanded ? 'rotate-90' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                Keywords ({activeFilters.size}/{keywords.length})
              </button>
            </div>
          </div>
          
          {keywordsExpanded && (
            <div className="flex flex-wrap gap-1.5 ml-6">
              {keywords.map(keyword => (
                <button
                  key={`keyword-${keyword}`}
                  onClick={() => onFilterToggle(topic, keyword)}
                  className={`
                    px-2.5 py-1 text-xs font-medium rounded-full border transition-all duration-150 select-none
                    ${activeFilters.has(keyword) 
                      ? 'bg-blue-500 text-white border-blue-500 shadow-sm hover:bg-blue-600' 
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }
                  `}
                >
                  {keyword}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sources Section */}
      {sources && sources.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <button 
                  onClick={() => onSelectAllSources(topic)}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  title="Select all sources"
                >
                  All
                </button>
                <button 
                  onClick={() => onClearAllSources(topic)}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  title="Clear all sources"
                >
                  None
                </button>
              </div>
              <button
                onClick={() => setSourcesExpanded(!sourcesExpanded)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-green-600 transition-colors"
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${sourcesExpanded ? 'rotate-90' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Sources ({activeSourceFilters.size}/{sources.length})
              </button>
            </div>
          </div>
          
          {sourcesExpanded && (
            <div className="flex flex-wrap gap-1.5 ml-6">
              {sources.map(source => (
                <button
                  key={`source-${source}`}
                  onClick={() => onSourceFilterToggle(topic, source)}
                  className={`
                    px-2.5 py-1 text-xs font-medium rounded-full border transition-all duration-150 select-none
                    ${activeSourceFilters.has(source) 
                      ? 'bg-green-500 text-white border-green-500 shadow-sm hover:bg-green-600' 
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }
                  `}
                >
                  📰 {sourceNameFn(source)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Date Filter Section */}
      <div className={sources && sources.length > 0 ? "mt-4" : ""}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-700 flex items-center gap-2 flex-shrink-0">
            <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
            Date
          </span>
          
          {/* Inline Date Filter Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {presetFilters.map(filter => (
              <button
                key={filter.key}
                onClick={() => handlePresetClick(filter.key)}
                className={`
                  px-2.5 py-1 text-xs font-medium rounded-full border transition-all duration-150 select-none
                  ${activeDateFilter === filter.key && !(filter.key === 'custom' && showCustom && !activeDateFilter)
                    ? 'bg-purple-500 text-white border-purple-500 shadow-sm hover:bg-purple-600' 
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }
                `}
              >
                {filter.icon} {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Input */}
        {showCustom && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md ml-6">
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
    </div>
  );
};

export default KeywordFilters;
