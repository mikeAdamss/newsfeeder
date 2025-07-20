import React from 'react';

const TabNavigation = ({ newsData, currentTab, activeFilters, onTabChange }) => {
  const getArticleCounts = (topic) => {
    const articles = newsData[topic] || [];
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

  return (
    <div className="mb-8">
      <div className="flex flex-wrap justify-center gap-2">
        {Object.keys(newsData).map(topic => {
          const { filtered, total } = getArticleCounts(topic);
          return (
            <button
              key={topic}
              onClick={() => onTabChange(topic)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                currentTab === topic
                  ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 shadow-md hover:shadow-lg'
              }`}
            >
              <span className="block">{topic}</span>
              <span className={`text-sm ${
                currentTab === topic ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {filtered === total ? total : `${filtered}/${total}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabNavigation;
