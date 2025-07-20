import React, { useState, useEffect } from 'react';
import NewsDigest from './components/NewsDigest';
import './App.css';

function App() {
  const [newsData, setNewsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/matched_entries.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load news data');
        }
        return response.json();
      })
      .then(data => {
        setNewsData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📰</div>
          <p className="text-xl text-gray-600">Loading news digest...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-xl text-gray-600">Error: {error}</p>
          <p className="text-sm text-gray-500 mt-2">
            Make sure matched_entries.json is in the public folder
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <NewsDigest newsData={newsData} />
    </div>
  );
}

export default App;
