import React from 'react';

const TabNavigation = ({ 
  topicsIndex, 
  topicData, 
  currentTab, 
  activeFilters, 
  activeSourceFilters, 
  activeDateFilter, 
  customDateRange, 
  onTabChange, 
  loadingTopic 
}) => {
  const isWithinDateRange = (publishedDate, dateFilter, customRange) => {
    if (!dateFilter || dateFilter === 'all') return true;
    if (!publishedDate) return false;
    
    const articleDate = new Date(publishedDate);
    const now = new Date();
    
    if (dateFilter === 'custom' && customRange.start && customRange.end) {
      return articleDate >= customRange.start && articleDate <= customRange.end;
    }
    
    const timeRanges = {
      '24h': 24 * 60 * 60 * 1000,
      '48h': 48 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    if (timeRanges[dateFilter]) {
      const cutoffTime = now.getTime() - timeRanges[dateFilter];
      return articleDate.getTime() >= cutoffTime;
    }
    
    return true;
  };

  const getArticleCounts = (topic) => {
    const articles = topicData[topic] || [];
    const keywordFilters = activeFilters[topic] || new Set();
    const sourceFilters = activeSourceFilters[topic] || new Set();
    const totalCount = articles.length;
    
    // If no filters are active, no articles are shown
    if (keywordFilters.size === 0 && sourceFilters.size === 0) {
      return { filtered: 0, total: totalCount };
    }
    
    const filteredCount = articles.filter(article => {
      // Check keyword filters (if any are active)
      let keywordMatch = keywordFilters.size === 0; // If no keyword filters, pass keyword check
      if (keywordFilters.size > 0 && article.matched_keywords && article.matched_keywords.length > 0) {
        keywordMatch = article.matched_keywords.some(keyword => keywordFilters.has(keyword));
      }
      
      // Check source filters (if any are active)
      let sourceMatch = sourceFilters.size === 0; // If no source filters, pass source check
      if (sourceFilters.size > 0 && article.from_feed) {
        sourceMatch = sourceFilters.has(article.from_feed);
      }
      
      // Check date filter
      const dateMatch = isWithinDateRange(article.published, activeDateFilter, customDateRange);
      
      // All active filter types must pass (AND logic)
      return keywordMatch && sourceMatch && dateMatch;
    }).length;
    
    return { filtered: filteredCount, total: totalCount };
  };

  const getTopicCount = (topic) => {
    // If topic data is loaded, use actual count
    if (topicData[topic]) {
      return topicData[topic].length;
    }
    
    // Otherwise, use count from topics index if available
    if (topicsIndex?.summary?.articles_by_topic?.[topic]) {
      return topicsIndex.summary.articles_by_topic[topic];
    }
    
    return 0;
  };

  return (
    <div className="mb-8">
      <div className="flex flex-wrap justify-center gap-2">
        {topicsIndex.topics.map(topic => {
          const isLoaded = !!topicData[topic];
          const isLoading = loadingTopic === topic;
          
          let displayCount;
          if (isLoading) {
            displayCount = '⏳';
          } else if (isLoaded) {
            const { filtered, total } = getArticleCounts(topic);
            // If all articles are showing (no filtering), just show the total
            displayCount = filtered === total ? `${total}` : `${filtered}/${total}`;
          } else {
            // Show total count from index when not loaded yet
            const totalCount = getTopicCount(topic);
            displayCount = totalCount > 0 ? `${totalCount}` : '0';
          }
          
          return (
            <button
              key={topic}
              onClick={() => onTabChange(topic)}
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                currentTab === topic
                  ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 shadow-md hover:shadow-lg'
              } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
            >
              <span className="block">{topic}</span>
              <span className={`text-sm ${
                currentTab === topic ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {displayCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabNavigation;
