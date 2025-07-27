import React, { useState, useEffect } from 'react';
import NewsDigest from './components/NewsDigest';
import './App.css';

function App() {
  const [topicsIndex, setTopicsIndex] = useState(null);
  const [topicData, setTopicData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load topics index on mount
  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/topics/index.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load topics index');
        }
        return response.json();
      })
      .then(data => {
        setTopicsIndex(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Function to load a specific topic's data
  const loadTopicData = async (topicName) => {
    if (topicData[topicName]) {
      return topicData[topicName]; // Already loaded
    }

    try {
      const filename = topicName.toLowerCase().replace(' ', '_');
      const response = await fetch(`${process.env.PUBLIC_URL}/topics/${filename}.json`);

      if (!response.ok) {
        throw new Error(`Failed to load ${topicName} data`);
      }
      
      const data = await response.json();
      
      // Update the topicData state with the new data
      setTopicData(prev => ({
        ...prev,
        [topicName]: data.articles
      }));
      
      return data.articles;
    } catch (err) {
      console.error(`Error loading topic ${topicName}:`, err);
      throw err;
    }
  };

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
            Make sure topics/index.json is in the public folder
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <NewsDigest 
        topicsIndex={topicsIndex}
        topicData={topicData}
        loadTopicData={loadTopicData}
      />
    </div>
  );
}

export default App;
