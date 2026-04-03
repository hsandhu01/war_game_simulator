import React from 'react';
import './NewsTicker.css';

function NewsTicker({ logs }) {
  return (
    <div className="news-ticker glass-panel glow-panel">
      <div className="ticker-label blink">LIVE INTEL</div>
      <div className="ticker-content">
        <ul className="log-list">
          {logs.map(log => (
            <li key={log.id} className={`log-item ${log.type}`}>
              <span className="timestamp">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className="log-text">{log.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default NewsTicker;
