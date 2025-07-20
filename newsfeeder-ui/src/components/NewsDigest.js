import React, { useState, useEffect } from 'react';
import TabNavigation from './TabNavigation';
import KeywordFilters from './KeywordFilters';
import ArticleList from './ArticleList';

const NewsDigest = ({ newsData }) => {
  const [currentTab, setCurrentTab] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [allKeywordsUsed, setAllKeywordsUsed] = useState({});

  // Initialize when newsData changes
  useEffect(() => {
    if (Object.keys(newsData).length > 0) {
      // Set first topic as active tab
      const firstTopic = Object.keys(newsData)[0];
      setCurrentTab(firstTopic);

      // Extract all keywords used for each topic
      const keywordsUsed = {};
      const initialFilters = {};

      Object.entries(newsData).forEach(([topic, articles]) => {
        const topicKeywords = new Set();
        articles.forEach(article => {
          if (article.matched_keywords) {
            article.matched_keywords.forEach(keyword => topicKeywords.add(keyword));
          }
        });
        keywordsUsed[topic] = Array.from(topicKeywords).sort();
        // Initialize all filters as active (matching original behavior)
        initialFilters[topic] = new Set(keywordsUsed[topic]);
      });

      setAllKeywordsUsed(keywordsUsed);
      setActiveFilters(initialFilters);
    }
  }, [newsData]);

  const handleTabChange = (tabName) => {
    setCurrentTab(tabName);
  };

  const handleFilterToggle = (topic, keyword) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (!newFilters[topic]) {
        newFilters[topic] = new Set();
      } else {
        newFilters[topic] = new Set(newFilters[topic]);
      }

      if (newFilters[topic].has(keyword)) {
        newFilters[topic].delete(keyword);
      } else {
        newFilters[topic].add(keyword);
      }

      return newFilters;
    });
  };

  const handleSelectAllFilters = (topic) => {
    setActiveFilters(prev => ({
      ...prev,
      [topic]: new Set(allKeywordsUsed[topic] || [])
    }));
  };

  const handleClearAllFilters = (topic) => {
    setActiveFilters(prev => ({
      ...prev,
      [topic]: new Set()
    }));
  };

  const getCurrentTime = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (Object.keys(newsData).length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-xl text-gray-600">No news data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">📰 News Digest</h1>
        
        <TabNavigation 
          newsData={newsData}
          currentTab={currentTab}
          activeFilters={activeFilters}
          onTabChange={handleTabChange}
        />
        
        {currentTab && (
          <>
            <KeywordFilters
              topic={currentTab}
              keywords={allKeywordsUsed[currentTab] || []}
              activeFilters={activeFilters[currentTab] || new Set()}
              onFilterToggle={handleFilterToggle}
              onSelectAll={handleSelectAllFilters}
              onClearAll={handleClearAllFilters}
            />
            
            <ArticleList
              topic={currentTab}
              articles={newsData[currentTab] || []}
              activeFilters={activeFilters[currentTab] || new Set()}
            />
          </>
        )}
        
        <div className="text-center mt-12 text-gray-500">
          <p>Generated on {getCurrentTime()}</p>
        </div>
      </div>
    </div>
  );
};

export default NewsDigest;
