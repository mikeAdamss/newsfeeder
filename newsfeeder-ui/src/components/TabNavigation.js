import React from 'react';

const TabNavigation = ({ topicsIndex, topicData, currentTab, activeFilters, onTabChange, loadingTopic }) => {
  const getArticleCounts = (topic) => {
    const articles = topicData[topic] || [];
    const filters = activeFilters[topic] || new Set();
    const totalCount = articles.length;
    
    if (filters.size === 0) {
      return { filtered: 0, total: totalCount }; // No filters active means no articles shown
    }
    
    const filteredCount = articles.filter(article => {
      if (!article.matched_keywords || article.matched_keywords.length === 0) {
        return false;
      }
      return article.matched_keywords.some(keyword => filters.has(keyword));
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
          const { filtered, total } = isLoaded ? getArticleCounts(topic) : { filtered: 0, total: getTopicCount(topic) };
          
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
                {isLoading ? '...' : (isLoaded && filtered === total ? total : `${filtered}/${total}`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabNavigation;
