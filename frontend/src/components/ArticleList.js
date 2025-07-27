import React, { useState } from 'react';

// Helper function to truncate HTML content
const truncateHtml = (html, maxLength = 800) => {
  if (!html) return '';
  
  // Remove HTML tags to calculate text length
  const textContent = html.replace(/<[^>]*>/g, '');
  
  if (textContent.length <= maxLength) {
    return html;
  }
  
  // If text is too long, try to find a good breaking point in the HTML
  let truncated = '';
  let textLength = 0;
  let inTag = false;
  
  for (let i = 0; i < html.length; i++) {
    const char = html[i];
    
    if (char === '<') {
      inTag = true;
    } else if (char === '>') {
      inTag = false;
    } else if (!inTag) {
      textLength++;
      if (textLength > maxLength) {
        break;
      }
    }
    
    truncated += char;
  }
  
  // Clean up unclosed tags and add ellipsis
  return truncated.replace(/<[^>]*$/g, '') + '...';
};

// Efficient date filtering utility
const createDateMatcher = (filterType, customRange) => {
  if (!filterType || filterType === 'all') return () => true;
  
  const now = new Date();
  let cutoffDate;
  
  switch (filterType) {
    case '24h':
      cutoffDate = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      break;
    case '48h':
      cutoffDate = new Date(now.getTime() - (48 * 60 * 60 * 1000));
      break;
    case '7d':
      cutoffDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      break;
    case '30d':
      cutoffDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      break;
    case 'custom':
      if (customRange && customRange.start && customRange.end) {
        const start = new Date(customRange.start);
        const end = new Date(customRange.end);
        return (articleDate) => articleDate >= start && articleDate <= end;
      }
      return () => true;
    default:
      return () => true;
  }
  
  return (articleDate) => articleDate >= cutoffDate;
};

// Convert published_parsed array to Date object efficiently
const parseArticleDate = (article) => {
  if (article.published_parsed && Array.isArray(article.published_parsed)) {
    const [year, month, day, hour, minute, second] = article.published_parsed;
    return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
  }
  // Fallback to string parsing
  return article.published ? new Date(article.published) : new Date(0);
};

const ArticleList = ({ 
  topic, 
  articles, 
  activeFilters, 
  activeSourceFilters, 
  activeDateFilter, 
  customDateRange, 
  getSourceName 
}) => {
  // Add sort and relevance filter state
  const [sortMode, setSortMode] = useState('recent'); // 'recent', 'keywords', 'relevance', 'least_relevant', 'heuristic'
  const [minRelevance, setMinRelevance] = useState(0); // 0-100
  const [showReason, setShowReason] = useState({}); // { [index]: boolean }

  // Create date matcher once for efficiency
  const isDateMatch = createDateMatcher(activeDateFilter, customDateRange);
  
  const filteredArticles = articles.filter(article => {
    // If either filter type has no selections, show nothing
    if (activeFilters.size === 0 || activeSourceFilters.size === 0) {
      return false;
    }
    
    // Check keyword filters - at least one keyword must match
    const keywordMatch = article.matched_keywords && 
      article.matched_keywords.some(keyword => activeFilters.has(keyword));
    
    // Check source filters - source must be selected
    const sourceMatch = article.from_feed && activeSourceFilters.has(article.from_feed);
    
    // Check date filter - convert date once and check
    const dateMatch = isDateMatch(parseArticleDate(article));
    
    // Relevance filter
    if (typeof article.relevance_percent === 'number' && article.relevance_percent < minRelevance) {
      return false;
    }
    
    // All conditions must be true (AND logic)
    return keywordMatch && sourceMatch && dateMatch;
  });

  // Heuristic scoring function
  const getHeuristicScore = (article) => {
    // Weights
    const wRel = 2;
    const wKey = 1;
    const wRec = 1;
    // Relevance percent (0-100)
    const rel = typeof article.relevance_percent === 'number' ? article.relevance_percent : 0;
    // Keyword hits
    const keyHits = article.matched_keywords ? article.matched_keywords.length : 0;
    // Recency: hours since published (lower is better)
    const publishedDate = parseArticleDate(article);
    const now = new Date();
    const hoursAgo = (now - publishedDate) / (1000 * 60 * 60);
    // Normalize recency: 0 = now, 1 = 1 day old, 2 = 2 days, cap at 7 days
    const recencyNorm = Math.max(0, 7 - Math.min(7, hoursAgo / 24)); // 0-7, higher is newer
    // Heuristic score
    return (rel * wRel) + (keyHits * wKey) + (recencyNorm * wRec);
  };

  // Sort articles based on sortMode
  let sortedArticles = [...filteredArticles];
  if (sortMode === 'keywords') {
    sortedArticles.sort((a, b) => {
      const aHits = a.matched_keywords ? a.matched_keywords.length : 0;
      const bHits = b.matched_keywords ? b.matched_keywords.length : 0;
      // Descending by keyword hits,
      if (bHits !== aHits) return bHits - aHits;
      // Fallback: most recent first
      return parseArticleDate(b) - parseArticleDate(a);
    });
  } else if (sortMode === 'relevance') {
    sortedArticles.sort((a, b) => {
      const aRel = typeof a.relevance_percent === 'number' ? a.relevance_percent : -1;
      const bRel = typeof b.relevance_percent === 'number' ? b.relevance_percent : -1;
      if (bRel !== aRel) return bRel - aRel;
      return parseArticleDate(b) - parseArticleDate(a);
    });
  } else if (sortMode === 'least_relevant') {
    sortedArticles.sort((a, b) => {
      const aRel = typeof a.relevance_percent === 'number' ? a.relevance_percent : 101;
      const bRel = typeof b.relevance_percent === 'number' ? b.relevance_percent : 101;
      if (aRel !== bRel) return aRel - bRel;
      return parseArticleDate(b) - parseArticleDate(a);
    });
  } else if (sortMode === 'heuristic') {
    sortedArticles.sort((a, b) => getHeuristicScore(b) - getHeuristicScore(a));
  } else if (sortMode === 'recent_relevance') {
    // Sort by most recent, then by highest relevance within each date
    sortedArticles.sort((a, b) => {
      const dateDiff = parseArticleDate(b) - parseArticleDate(a);
      if (dateDiff !== 0) return dateDiff;
      const aRel = typeof a.relevance_percent === 'number' ? a.relevance_percent : -1;
      const bRel = typeof b.relevance_percent === 'number' ? b.relevance_percent : -1;
      return bRel - aRel;
    });
  } else if (sortMode === 'relevance_recent') {
    // Sort by highest relevance, then by most recent within each relevance score
    sortedArticles.sort((a, b) => {
      const aRel = typeof a.relevance_percent === 'number' ? a.relevance_percent : -1;
      const bRel = typeof b.relevance_percent === 'number' ? b.relevance_percent : -1;
      if (bRel !== aRel) return bRel - aRel;
      return parseArticleDate(b) - parseArticleDate(a);
    });
  } else {
    // Default: most recent first
    sortedArticles.sort((a, b) => parseArticleDate(b) - parseArticleDate(a));
  }

  const ExternalLinkIcon = () => (
    <svg className="inline w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
    </svg>
  );

  // Map sort modes to descriptions
  const SORT_MODE_DESCRIPTIONS = {
    recent: 'Sorts articles by most recent publication date.',
    keywords: 'Sorts by the number of matched keywords (descending), then by date.',
    relevance: 'Sorts by AI-assigned relevance percent (highest first), then by date.',
    least_relevant: 'Sorts by lowest AI-assigned relevance percent, then by date.',
    heuristic: 'Sorts by a combined score: (2×relevance) + keyword hits + recency.',
    recent_relevance: 'Sorts by most recent, then by highest relevance within each date.',
    relevance_recent: 'Sorts by highest relevance, then by most recent within each relevance score.'
  };

  if (activeFilters.size === 0 || activeSourceFilters.size === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12">
        <div className="text-center">
          <div className="text-blue-400 text-6xl mb-4">🔍</div>
          <p className="text-gray-600 text-lg font-medium mb-2">Select filters to see articles</p>
          <p className="text-gray-500">Choose keywords (blue) or sources (green) from the filters above</p>
        </div>
      </div>
    );
  }

  if (sortedArticles.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📭</div>
          <p className="text-gray-500 text-lg">No articles match the selected filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-wrap items-center mb-4 gap-2">
        <h2 className="text-3xl font-bold text-gray-800 border-b-2 border-blue-500 pb-2 mr-4">
          {topic} News
        </h2>
        <label htmlFor="sortMode" className="mr-2 font-medium text-gray-700">Sort by:</label>
        <div className="relative flex items-center mr-2">
          <select
            id="sortMode"
            value={sortMode}
            onChange={e => setSortMode(e.target.value)}
            className="border rounded px-2 py-1 text-gray-700 mr-1"
          >
            <option value="recent">Most Recent</option>
            <option value="keywords">Most Keyword Hits</option>
            <option value="relevance">Highest Relevance</option>
            <option value="least_relevant">Least Relevant</option>
            <option value="heuristic">Heuristic (AI+Keywords+Recency)</option>
            <option value="recent_relevance">Recent, then Relevance</option>
            <option value="relevance_recent">Relevance, then Recent</option>
          </select>
          <span className="relative group cursor-pointer">
            <svg
              className="w-4 h-4 text-gray-400 ml-1 inline-block align-middle"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ verticalAlign: 'middle' }}
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4m0-4h.01" />
            </svg>
            <div className="absolute left-1/2 z-10 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-3 py-2 whitespace-pre w-64 -translate-x-1/2 mt-2 shadow-lg" style={{ pointerEvents: 'none' }}>
              {SORT_MODE_DESCRIPTIONS[sortMode]}
            </div>
          </span>
        </div>
        <label htmlFor="minRelevance" className="ml-2 mr-1 font-medium text-gray-700">Min Relevance:</label>
        <select
          id="minRelevance"
          value={minRelevance}
          onChange={e => setMinRelevance(Number(e.target.value))}
          className="border rounded px-2 py-1 w-24 text-gray-700 mr-4"
        >
          {[...Array(11).keys()].map(i => (
            <option key={i * 10} value={i * 10}>{i * 10}%</option>
          ))}
        </select>
        <span className="text-lg text-gray-600">({sortedArticles.length}/{articles.length})</span>
      </div>
      <div className="space-y-6">
        {sortedArticles.map((article, index) => (
          <article 
            key={`${article.link}-${index}`}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-blue-500"
          >
            <h3 className="text-xl font-bold mb-3">
              <a 
                href={article.link}
                className="text-blue-700 hover:text-blue-900 hover:underline transition-colors duration-200"
                target="_blank" 
                rel="noopener noreferrer"
              >
                {article.title}
                <ExternalLinkIcon />
              </a>
            </h3>
            {(article.matched_keywords && article.matched_keywords.length > 0) || article.from_feed ? (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {article.matched_keywords && article.matched_keywords.map(keyword => (
                    <span 
                      key={keyword}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                  {article.from_feed && (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                      📰 {getSourceName ? getSourceName(article.from_feed) : 'Source'}
                    </span>
                  )}
                </div>
              </div>
            ) : null}
            <div className="text-gray-700 leading-relaxed mb-3">
              {article.summary && article.summary !== '-' ? (
                <p>{article.summary}</p>
              ) : article.is_html_summary && article.summary_html ? (
                <div dangerouslySetInnerHTML={{__html: truncateHtml(article.summary_html, 600)}} />
              ) : (
                <p>No summary available</p>
              )}
              {article.has_llm_summary && (
                <div className="mt-2 text-xs text-blue-600 italic">
                  ✨ AI-generated concise summary
                </div>
              )}
            </div>
            <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
              <span>
                📅 {article.published || 'Date not available'}
                {typeof article.relevance_percent === 'number' ? (
                  <span className="ml-3 text-yellow-700 font-semibold">{article.relevance_percent}% relevance</span>
                ) : null}
                {article.relevance_reason && (
                  <button
                    className="ml-2 text-xs text-blue-600 underline focus:outline-none"
                    onClick={() => setShowReason(prev => ({ ...prev, [index]: !prev[index] }))}
                  >
                    {showReason[index] ? 'Hide reason' : 'Show reason'}
                  </button>
                )}
              </span>
              <a 
                href={article.from_feed}
                className="text-blue-600 hover:text-blue-800 hover:underline"
                target="_blank" 
                rel="noopener noreferrer"
              >
                {getSourceName ? getSourceName(article.from_feed) : 'Source Feed'} →
              </a>
            </div>
            {article.relevance_reason && showReason[index] && (
              <div className="mt-2 text-xs text-gray-700 bg-yellow-50 border-l-4 border-yellow-300 p-2 rounded">
                <span className="font-semibold">Relevance reason:</span> {article.relevance_reason}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};

export default ArticleList;
