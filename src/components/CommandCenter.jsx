import React, { useState } from 'react';
import { Target, Shield, Zap, AlertTriangle, X } from 'lucide-react';
import './CommandCenter.css';

function CommandCenter({ selectedCountry, playerCountry, globalDefcon, interactionMode, pendingAction, onInitiateAction, onCancelTargeting, onClose }) {
  const actions = [
    { name: "Mobilize Troops", icon: Shield, type: "defensive", cost: 100 },
    { name: "Send Naval Fleet", icon: Target, type: "defensive", cost: 150 },
    { name: "Deploy Air Force", icon: Target, type: "hostile", cost: 250 },
    { name: "Impose Sanctions", icon: Zap, type: "economic", cost: 50 },
    { name: "Send Aid", icon: Shield, type: "diplomatic", cost: 200 },
    { name: "Deploy Spies", icon: Target, type: "covert", cost: 150 },
    { name: "Cyber Attack", icon: Zap, type: "covert", cost: 300 },
    { name: "Launch Invasion", icon: AlertTriangle, type: "hostile", danger: true, cost: 500 }
  ];

  if (globalDefcon === 1) {
    actions.push({ name: "Nuclear Strike", icon: AlertTriangle, type: "hostile", danger: true, cost: 1000 });
  }

  const isPlayerControlled = playerCountry && playerCountry.id === selectedCountry.id;

  const handleActionClick = (action) => {
    if (playerCountry.ap < action.cost) return; // Prevent clicking if too poor
    onInitiateAction(action.name);
  };

  const threatColor = selectedCountry.threat_level > 70 ? 'var(--accent-red)' : 
                      selectedCountry.threat_level > 30 ? 'var(--accent-amber)' : 
                      'var(--accent-cyan)';

  if (interactionMode === 'SELECTING_TARGET') {
    return (
      <div className="command-panel glass-panel glow-panel" style={{ borderColor: 'var(--accent-red)' }}>
        <div className="panel-header">
          <h2>AWAITING COORDINATES</h2>
          <button className="close-btn" onClick={onCancelTargeting}><X size={20} /></button>
        </div>
        <div className="intel-section" style={{ textAlign: 'center', padding: '30px' }}>
          <Target size={40} color="var(--accent-red)" className="blink" style={{ margin: '0 auto 15px auto', display: 'block' }} />
          <h3 style={{ color: 'var(--accent-red)' }}>DIRECTIVE: {pendingAction.toUpperCase()}</h3>
          <p style={{ color: 'var(--text-muted)' }}>Select a target nation on the global map to execute directive.</p>
          <button className="btn danger execute-btn" style={{ marginTop: '20px' }} onClick={onCancelTargeting}>
            ABORT DIRECTIVE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="command-panel glass-panel glow-panel">
      <div className="panel-header">
        <h2>{selectedCountry.name} {isPlayerControlled ? 'COMMAND' : 'INTEL'}</h2>
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
      </div>

      <div className="intel-section">
        <div className="intel-row">
          <span>ALLIANCE:</span> <span className="badge">{selectedCountry.alliance}</span>
        </div>
        <div className="intel-row">
          <span>THREAT LEVEL:</span> 
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${selectedCountry.threat_level}%`, backgroundColor: threatColor }}></div>
          </div>
          <span style={{ color: threatColor, fontWeight: 'bold' }}>{selectedCountry.threat_level}%</span>
        </div>
        <div className="intel-row">
          <span>MILITARY STR:</span> <span>{selectedCountry.military_strength}</span>
        </div>
      </div>

      {isPlayerControlled ? (
        <div className="action-section">
          <h3 style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>AVAILABLE DIRECTIVES</span>
            <span style={{ color: 'var(--accent-cyan)' }}>AP: {Math.floor(playerCountry.ap)}</span>
          </h3>
          <div className="action-grid">
            {actions.map(act => {
              const cantAfford = playerCountry.ap < act.cost;
              return (
                <button 
                  key={act.name}
                  className={`action-btn ${act.danger ? 'danger' : ''} ${act.type === 'covert' ? 'covert-btn' : ''} ${cantAfford ? 'disabled' : ''}`}
                  onClick={() => handleActionClick(act)}
                  disabled={cantAfford}
                  style={cantAfford ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <act.icon size={16} /> {act.name}
                  </div>
                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>-{act.cost} AP</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="action-section" style={{ textAlign: 'center', opacity: 0.7 }}>
          <p>This is a foreign entity.</p>
          <p style={{ fontSize: '0.85rem' }}>Open your own command center to target this nation.</p>
        </div>
      )}
    </div>
  );
}

export default CommandCenter;
