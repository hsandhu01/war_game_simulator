import { useEffect } from 'react';
import { ACTIONS } from '../engine/simulationReducer';

const RSS_URLS = [
  'http://feeds.bbci.co.uk/news/world/rss.xml',
  'https://www.aljazeera.com/xml/rss/all.xml'
];

export function useLiveNews(dispatch) {
  useEffect(() => {
    let timeoutId;
    let failCount = 0;

    const fetchNews = async () => {
      try {
        const feedUrl = RSS_URLS[Math.floor(Math.random() * RSS_URLS.length)];
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
        const data = await res.json();
        
        if (data.status === 'ok' && data.items && data.items.length > 0) {
          // Grab a random headline from the top 10
          const randomItem = data.items[Math.floor(Math.random() * Math.min(10, data.items.length))];
          
          dispatch({
            type: ACTIONS.ADD_LIVE_NEWS,
            payload: {
              id: Date.now(),
              text: `[LIVE INTEL] ${randomItem.title}`,
              type: "system", // Will style it specifically if needed
              timestamp: new Date().toISOString()
            }
          });
          failCount = 0;
        }
      } catch (err) {
        console.error("Failed to fetch live news:", err);
        failCount++;
      } finally {
        // Fetch another headline between 10s and 30s
        const nextDelay = failCount > 3 ? 60000 : 10000 + Math.random() * 20000;
        timeoutId = setTimeout(fetchNews, nextDelay);
      }
    };

    // Initial fetch after 5 seconds
    timeoutId = setTimeout(fetchNews, 5000);

    return () => clearTimeout(timeoutId);
  }, [dispatch]);
}
