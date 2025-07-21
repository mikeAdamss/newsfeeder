import React from 'react';

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
  onFilterToggle, 
  onSourceFilterToggle,
  onSelectAll, 
  onClearAll,
  onSelectAllSources,
  onClearAllSources,
  getSourceName: externalGetSourceName
}) => {
  const sourceNameFn = externalGetSourceName || getSourceName;
  
  if ((!keywords || keywords.length === 0) && (!sources || sources.length === 0)) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Filter Articles</h3>
          {/* Simple key showing filter types */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-600 rounded-full"></span>
              <span>Keywords</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-600 rounded-full"></span>
              <span>Sources</span>
            </div>
          </div>
        </div>
        <div className="space-x-2">
          {keywords && keywords.length > 0 && (
            <>
              <button 
                onClick={() => onSelectAll(topic)}
                className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                All Keywords
              </button>
              <button 
                onClick={() => onClearAll(topic)}
                className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Clear Keywords
              </button>
            </>
          )}
          {sources && sources.length > 0 && (
            <>
              <button 
                onClick={() => onSelectAllSources(topic)}
                className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                All Sources
              </button>
              <button 
                onClick={() => onClearAllSources(topic)}
                className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Clear Sources
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {/* Keyword filters */}
        {keywords && keywords.map(keyword => (
          <button
            key={`keyword-${keyword}`}
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
        
        {/* Source filters */}
        {sources && sources.map(source => (
          <button
            key={`source-${source}`}
            onClick={() => onSourceFilterToggle(topic, source)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 select-none
              ${activeSourceFilters.has(source) 
                ? 'bg-green-600 text-white border-green-600 shadow-sm hover:bg-green-700 hover:shadow-md' 
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }
            `}
          >
            📰 {sourceNameFn(source)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default KeywordFilters;
