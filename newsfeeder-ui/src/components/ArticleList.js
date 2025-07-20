import React from 'react';

const ArticleList = ({ topic, articles, activeFilters }) => {
  const filteredArticles = articles.filter(article => {
    if (activeFilters.size === 0) {
      return false; // No filters active means no articles shown
    }
    
    if (!article.matched_keywords || article.matched_keywords.length === 0) {
      return false;
    }
    
    return article.matched_keywords.some(keyword => activeFilters.has(keyword));
  });

  const ExternalLinkIcon = () => (
    <svg className="inline w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
    </svg>
  );

  if (activeFilters.size === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12">
        <div className="text-center">
          <div className="text-blue-400 text-6xl mb-4">🔍</div>
          <p className="text-gray-600 text-lg font-medium mb-2">Select one or more keyword filters to see articles</p>
          <p className="text-gray-500">Use the checkboxes above to choose topics of interest</p>
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
        {topic} News
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
            
            {article.matched_keywords && article.matched_keywords.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {article.matched_keywords.map(keyword => (
                    <span 
                      key={keyword}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-gray-700 leading-relaxed mb-3">
              {article.summary || 'No summary available'}
            </p>
            
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>📅 {article.published || 'Date not available'}</span>
              <a 
                href={article.from_feed}
                className="text-blue-600 hover:text-blue-800 hover:underline"
                target="_blank" 
                rel="noopener noreferrer"
              >
                Source Feed →
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default ArticleList;
