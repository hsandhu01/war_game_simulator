import React, { useReducer, useEffect } from 'react';
import { simulationReducer, initialState, ACTIONS } from './engine/simulationReducer';
import { useLiveNews } from './hooks/useLiveNews';
import { useGameLoop } from './hooks/useGameLoop';
import { feature } from 'topojson-client';
import geoData from './data/world-50m.json';
import countryData from './data/countries.json';
import WorldMap from './components/WorldMap';
import CommandCenter from './components/CommandCenter';
import NewsTicker from './components/NewsTicker';
import './App.css';

function App() {
  const [state, dispatch] = useReducer(simulationReducer, initialState);
  const { playerNationId, gameOverReason } = state;

  // Initialize live news
  useLiveNews(dispatch);

  useGameLoop(dispatch, !!gameOverReason, !!playerNationId);

  // Initialize data on mount
  useEffect(() => {
    const allGeo = feature(geoData, geoData.objects.countries).features;
    const fullPayload = allGeo.map(geo => {
       const geoName = geo.properties.name;
       const hardcoded = countryData.find(c => c.name === geoName || c.id === geoName || (c.aliases && c.aliases.includes(geoName)));
       if (hardcoded) return hardcoded; // keep custom configs for USA, China etc

       return {
         id: geoName,
         name: geoName,
         threat_level: 0,
         military_strength: 25 + Math.floor(Math.random() * 50),
         alliance: "Neutral",
         economic_power: 100 + Math.floor(Math.random() * 200)
       };
    });

    dispatch({ type: 'INIT_COUNTRIES', payload: fullPayload });
  }, []);

  const handleCountrySelect = (countryId) => {
    if (state.interactionMode === 'SELECTING_TARGET') {
      if (countryId !== state.selectedCountryId && countryId) {
        dispatch({ 
          type: ACTIONS.EXECUTE_ACTION, 
          payload: { actorId: state.selectedCountryId, actionType: state.pendingAction, targetId: countryId } 
        });
      }
      return; // Ignore clicks if they click nothing or themselves during target mode
    }
    dispatch({ type: ACTIONS.SELECT_COUNTRY, payload: countryId });
  };

  const handleInitiateAction = (actionType) => {
    dispatch({ type: 'SET_INTERACTION_MODE', payload: { mode: 'SELECTING_TARGET', action: actionType } });
  };

  const handleCancelTargeting = () => {
    dispatch({ type: 'CANCEL_TARGETING' });
  };

  const selectedCountry = state.countries.find(c => c.id === state.selectedCountryId);

  const playerCountry = state.countries.find(c => c.id === playerNationId);
  
  // Calculate Defcon against Top 15 Aggressors to prevent 241-nation dilution
  const topThreats = [...state.countries].sort((a, b) => b.threat_level - a.threat_level).slice(0, 15);
  const globalDefcon = Math.max(1, 5 - Math.floor((topThreats.reduce((sum, c) => sum + c.threat_level, 0) / 15) / 20));

  return (
    <div className="app-container">
      <div className="crt-effect"></div>
      <div className="scan-line"></div>
      
      {/* Setup Overlay */}
      {!playerNationId && (
        <div className="game-overlay glass-panel">
          <h1>SELECT COMMAND JURISDICTION</h1>
          <p>Choose the nation you wish to command.</p>
          <div style={{
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '15px', 
            justifyContent: 'center', 
            marginTop: '20px',
            maxHeight: '55vh',
            overflowY: 'auto',
            padding: '10px 20px',
            borderTop: '1px solid rgba(45, 212, 191, 0.2)',
            borderBottom: '1px solid rgba(45, 212, 191, 0.2)'
          }}>
            {state.countries.length > 0 ? state.countries.map(c => (
              <button key={c.id} className="btn" onClick={() => dispatch({ type: ACTIONS.SET_PLAYER_NATION, payload: c.id })}>
                {c.name}
              </button>
            )) : <p>Loading Geodata...</p>}
          </div>
          
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ADVANCED EXPERIMENTAL ENGINES</span>
            <button 
              className={`btn ${state.chaosEnabled ? 'danger' : ''}`} 
              onClick={() => dispatch({ type: ACTIONS.TOGGLE_CHAOS })}
            >
              CHAOS ENGINE: {state.chaosEnabled ? 'ONLINE' : 'OFFLINE'}
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlays */}
      {gameOverReason === 'nuclear' && (
        <div className="game-overlay glass-panel nuclear-glow">
          <h1 style={{color: 'red', fontSize: '3rem', textShadow: '0 0 20px red'}}>MUTUALLY ASSURED DESTRUCTION</h1>
          <p style={{fontSize: '1.2rem'}}>Global thermonuclear war has been initiated. Millions are dead.</p>
          <button className="btn danger" style={{marginTop: '30px'}} onClick={() => window.location.reload()}>REBOOT SIMULATION</button>
        </div>
      )}

      {gameOverReason === 'ww3' && (
        <div className="game-overlay glass-panel" style={{borderColor: '#000', background: 'rgba(0,0,0,0.9)'}}>
          <h1 style={{color: '#fff', fontSize: '3rem'}}>WORLD WAR III</h1>
          <p style={{fontSize: '1.2rem', color: '#94a3b8'}}>Over 15% of the globe has been systematically conquered or eradicated. Global society has collapsed.</p>
          <button className="btn danger" style={{marginTop: '30px'}} onClick={() => window.location.reload()}>RESTART HISTORY</button>
        </div>
      )}

      <header className="top-hud glass-panel glow-panel">
        <h1 className="hud-title">
          <span className="blink">🔴</span> GLOBAL THREAT SIMULATOR {playerCountry && <span style={{marginLeft: '15px', fontSize: '1rem', color: '#fff'}}>| COMMANDING: {playerCountry.name.toUpperCase()} (AP: {Math.floor(playerCountry.ap)})</span>}
        </h1>
        <div className="hud-stats">
          <span>ACTIVE ENTITIES: {state.countries.length}</span>
          <span className={`defcon-indicator defcon-${globalDefcon}`}>DEFCON: {globalDefcon}</span>
        </div>
      </header>

      <main className="map-container">
        <WorldMap 
          countries={state.countries} 
          selectedCountryId={state.selectedCountryId}
          interactionMode={state.interactionMode}
          onCountrySelect={handleCountrySelect}
        />
      </main>

      {selectedCountry && (
        <CommandCenter 
          selectedCountry={selectedCountry}
          playerCountry={playerCountry}
          globalDefcon={globalDefcon}
          interactionMode={state.interactionMode}
          pendingAction={state.pendingAction}
          onInitiateAction={handleInitiateAction}
          onCancelTargeting={handleCancelTargeting}
          onClose={() => handleCountrySelect(null)}
        />
      )}

      <NewsTicker logs={state.logs} />
    </div>
  );
}

export default App;
