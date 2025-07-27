import React from 'react';

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
    
    // All conditions must be true (AND logic)
    return keywordMatch && sourceMatch && dateMatch;
  });

  const ExternalLinkIcon = () => (
    <svg className="inline w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
    </svg>
  );

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

  if (filteredArticles.length === 0) {
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
      <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b-2 border-blue-500 pb-2">
        {topic} News ({filteredArticles.length}/{articles.length})
      </h2>
      
      <div className="space-y-6">
        {filteredArticles.map((article, index) => (
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
            
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>📅 {article.published || 'Date not available'}</span>
              <a 
                href={article.from_feed}
                className="text-blue-600 hover:text-blue-800 hover:underline"
                target="_blank" 
                rel="noopener noreferrer"
              >
                {getSourceName ? getSourceName(article.from_feed) : 'Source Feed'} →
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ArticleList;
