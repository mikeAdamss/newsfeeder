import React, { useState, useEffect } from 'react';
import TabNavigation from './TabNavigation';
import KeywordFilters from './KeywordFilters';
import ArticleList from './ArticleList';

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

const NewsDigest = ({ topicsIndex, topicData, loadTopicData }) => {
  const [currentTab, setCurrentTab] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [allKeywordsUsed, setAllKeywordsUsed] = useState({});
  const [allSourcesUsed, setAllSourcesUsed] = useState({});
  const [activeSourceFilters, setActiveSourceFilters] = useState({});
  const [activeDateFilter, setActiveDateFilter] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [loadingTopic, setLoadingTopic] = useState(null);

  // Initialize when topicsIndex changes
  useEffect(() => {
    if (topicsIndex && topicsIndex.topics && topicsIndex.topics.length > 0) {
      // Set first topic as active tab
      const firstTopic = topicsIndex.topics[0];
      setCurrentTab(firstTopic);
    }
  }, [topicsIndex]);

  // Load initial topic data when currentTab is set for the first time
  useEffect(() => {
    if (currentTab && !topicData[currentTab] && loadTopicData) {
      const loadInitialTopic = async () => {
        setLoadingTopic(currentTab);
        try {
          await loadTopicData(currentTab);
        } catch (error) {
          console.error(`Failed to load initial topic ${currentTab}:`, error);
        } finally {
          setLoadingTopic(null);
        }
      };
      loadInitialTopic();
    }
  }, [currentTab, topicData, loadTopicData]);

  // Process topic data when it changes
  useEffect(() => {
    if (currentTab && topicData[currentTab]) {
      const articles = topicData[currentTab];
      
      // Extract keywords and sources for the current topic
      const topicKeywords = new Set();
      const topicSources = new Set();
      
      articles.forEach(article => {
        if (article.matched_keywords) {
          article.matched_keywords.forEach(keyword => topicKeywords.add(keyword));
        }
        if (article.from_feed) {
          topicSources.add(article.from_feed);
        }
      });
      
      const keywordsArray = Array.from(topicKeywords).sort();
      const sourcesArray = Array.from(topicSources).sort();
      
      // Update state for current topic
      setAllKeywordsUsed(prev => ({ ...prev, [currentTab]: keywordsArray }));
      setAllSourcesUsed(prev => ({ ...prev, [currentTab]: sourcesArray }));
      // Initialize with all filters selected by default
      if (!(activeFilters[currentTab])) {
        setActiveFilters(prev => ({ ...prev, [currentTab]: new Set(keywordsArray) }));
      }
      if (!(activeSourceFilters[currentTab])) {
        setActiveSourceFilters(prev => ({ ...prev, [currentTab]: new Set(sourcesArray) }));
      }
    }
  }, [currentTab, topicData]);

  const handleTabChange = async (tabName) => {
    if (tabName !== currentTab) {
      setCurrentTab(tabName);
      
      // Load topic data if not already loaded
      if (!topicData[tabName]) {
        setLoadingTopic(tabName);
        try {
          await loadTopicData(tabName);
        } catch (error) {
          console.error(`Failed to load topic ${tabName}:`, error);
        } finally {
          setLoadingTopic(null);
        }
      }
    }
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

  const handleSourceFilterToggle = (topic, source) => {
    setActiveSourceFilters(prev => {
      const newFilters = { ...prev };
      if (!newFilters[topic]) {
        newFilters[topic] = new Set();
      } else {
        newFilters[topic] = new Set(newFilters[topic]);
      }

      if (newFilters[topic].has(source)) {
        newFilters[topic].delete(source);
      } else {
        newFilters[topic].add(source);
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

  const handleSelectAllSources = (topic) => {
    setActiveSourceFilters(prev => ({
      ...prev,
      [topic]: new Set(allSourcesUsed[topic] || [])
    }));
  };

  const handleClearAllSources = (topic) => {
    setActiveSourceFilters(prev => ({
      ...prev,
      [topic]: new Set()
    }));
  };

  const handleDateFilterChange = (filterType, startDate, endDate) => {
    setActiveDateFilter(filterType);
    if (filterType === 'custom' && startDate && endDate) {
      setCustomDateRange({ start: new Date(startDate), end: new Date(endDate) });
    } else {
      setCustomDateRange({ start: null, end: null });
    }
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

  if (!topicsIndex || !topicsIndex.topics || topicsIndex.topics.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-xl text-gray-600">No topics available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto p-6">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">📰 News Digest</h1>
        
        <TabNavigation 
          topicsIndex={topicsIndex}
          topicData={topicData}
          currentTab={currentTab}
          activeFilters={activeFilters}
          activeSourceFilters={activeSourceFilters}
          activeDateFilter={activeDateFilter}
          customDateRange={customDateRange}
          onTabChange={handleTabChange}
          loadingTopic={loadingTopic}
        />
        
        {currentTab && (
          <>
            <KeywordFilters
              topic={currentTab}
              keywords={allKeywordsUsed[currentTab] || []}
              sources={allSourcesUsed[currentTab] || []}
              activeFilters={activeFilters[currentTab] || new Set()}
              activeSourceFilters={activeSourceFilters[currentTab] || new Set()}
              activeDateFilter={activeDateFilter}
              customDateRange={customDateRange}
              onFilterToggle={handleFilterToggle}
              onSourceFilterToggle={handleSourceFilterToggle}
              onDateFilterChange={handleDateFilterChange}
              onSelectAll={handleSelectAllFilters}
              onClearAll={handleClearAllFilters}
              onSelectAllSources={handleSelectAllSources}
              onClearAllSources={handleClearAllSources}
              getSourceName={getSourceName}
            />
            
            <ArticleList
              topic={currentTab}
              articles={topicData[currentTab] || []}
              activeFilters={activeFilters[currentTab] || new Set()}
              activeSourceFilters={activeSourceFilters[currentTab] || new Set()}
              activeDateFilter={activeDateFilter}
              customDateRange={customDateRange}
              getSourceName={getSourceName}
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
