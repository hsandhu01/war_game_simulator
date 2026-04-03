export const ACTIONS = {
  SELECT_COUNTRY: 'SELECT_COUNTRY',
  EXECUTE_ACTION: 'EXECUTE_ACTION',
  ADD_LIVE_NEWS: 'ADD_LIVE_NEWS',
  SET_PLAYER_NATION: 'SET_PLAYER_NATION',
  GAME_TICK: 'GAME_TICK',
  UN_RESOLUTION: 'UN_RESOLUTION'
};

export const initialState = {
  playerNationId: null,
  gameOverReason: null, // "nuclear", "conquest", etc
  selectedCountryId: null,
  interactionMode: 'IDLE', // IDLE or SELECTING_TARGET
  pendingAction: null,     // Holds the string name of the action
  logs: [
    { id: 1, text: "SIMULATION INITIATED: Awaiting Commander...", type: "system", timestamp: new Date().toISOString() }
  ],
  countries: [] // Will have { ...c, ap: 1000 }
};

const ACTION_EFFECTS = {
  "Mobilize Troops": { threatIncrease: 15, cost: 100, log: (actor, target) => `${actor.name} mobilizes troops near ${target.name}'s border.` },
  "Send Naval Fleet": { threatIncrease: 10, cost: 150, log: (actor, target) => `${actor.name} deploys naval fleet to monitor ${target.name}.` },
  "Impose Sanctions": { threatIncrease: 5, cost: 50, log: (actor, target) => `${actor.name} imposes heavy economic sanctions on ${target.name}.` },
  "Deploy Air Force": { threatIncrease: 25, cost: 250, log: (actor, target) => `WARNING: ${actor.name} executes sweeping tactical airstrikes against military assets in ${target.name}!` },
  "Launch Invasion": { threatIncrease: 40, cost: 500, log: (actor, target) => `CRITICAL ALERT: ${actor.name} launches massive ground forces invading ${target.name}!` },
  "Send Aid": { threatIncrease: -15, cost: 200, log: (actor, target) => `${actor.name} sends humanitarian aid to ${target.name}, easing tensions.` },
  "Nuclear Strike": { threatIncrease: 100, cost: 1000, danger: true, log: (actor, target) => `CRITICAL WARNING: ${actor.name} HAS LAUNCHED NUCLEAR WEAPONS AT ${target.name}. MUTUALLY ASSURED DESTRUCTION IMMINENT.` },
  "Deploy Spies": { threatIncrease: 0, cost: 150, covert: true, log: () => `` },
  "Cyber Attack": { threatIncrease: 0, cost: 300, covert: true, log: () => `` }
};

export function simulationReducer(state, action) {
  switch (action.type) {
    case 'INIT_COUNTRIES':
      return { 
        ...state, 
        countries: action.payload.map(c => ({
          ...c,
          ap: 500 + Math.floor(Math.random() * 500),
          threatTokens: {} // Keeps track of who pissed them off { "USA": 45, "CHN": 10 }
        }))
      };

    case ACTIONS.SET_PLAYER_NATION:
      return { 
        ...state, 
        playerNationId: action.payload, 
        selectedCountryId: action.payload,
        logs: [
          { id: Date.now(), text: `COMMANDER ASSIGNED TO ${action.payload}. INITIATING GLOBAL SYSTEMS.`, type: 'system', timestamp: new Date().toISOString() },
          ...state.logs
        ]
      };
      
    case ACTIONS.SELECT_COUNTRY:
      return { ...state, selectedCountryId: action.payload };

    case ACTIONS.EXECUTE_ACTION: {
      if (state.gameOverReason) return state;

      const { actorId, actionType, targetId } = action.payload;
      const actor = state.countries.find(c => c.id === actorId);
      const target = state.countries.find(c => c.id === targetId);
      
      const effect = ACTION_EFFECTS[actionType];
      if (!effect || !actor || !target || target.isAnnihilated) {
         return { 
           ...state, 
           interactionMode: 'IDLE', 
           pendingAction: null,
           logs: [{id: Date.now(), text: '[SYSTEM] DIRECTIVE ABORTED. Target invalid or unaccessible.', type: 'system'}, ...state.logs].slice(0,100)
         };
      }

      // AP Check
      if (actor.ap < effect.cost) {
        return { 
           ...state, 
           interactionMode: 'IDLE', 
           pendingAction: null,
           logs: [{id: Date.now(), text: '[SYSTEM] DIRECTIVE ABORTED. Insufficient Action Points.', type: 'alert'}, ...state.logs].slice(0,100)
         };
      }

      let gameOverReason = state.gameOverReason;
      if (actionType === "Nuclear Strike") {
        gameOverReason = "nuclear";
      }

      // Covert Math & Alliance Processing
      let actualLogText = effect.log ? effect.log(actor, target) : "";
      let actualThreat = effect.threatIncrease || 0;
      let targetAPDamage = 0;
      let targetMilitaryDamage = 0;
      let targetAnnihilated = false;
      let logType = actionType === "Launch Invasion" || actionType === "Nuclear Strike" ? "critical" : "action";

      if (actionType === "Deploy Spies") {
        if (Math.random() > 0.45) { // Success
          actualThreat = 2; // low undetected tension
          actualLogText = `[COVERT SUCCESS] ${actor.name} agents successfully infiltrated and extracted intel from ${target.name}.`;
          logType = "system";
        } else { // Caught
          actualThreat = 30;
          actualLogText = `[EXPOSED INCIDENT] Spies traced to ${actor.name} have been arrested in ${target.name}!`;
          logType = "alert";
        }
      } else if (actionType === "Cyber Attack") {
        if (Math.random() > 0.35) { // Success
          actualThreat = 5;
          targetAPDamage = Math.floor(target.ap * 0.4); // Destroys 40% of their AP
          actualLogText = `[CYBER CRISIS] Critical banking infrastructure in ${target.name} suffers catastrophic failure. Origin unknown.`;
          logType = "system";
        } else { // Traced
          actualThreat = 45;
          targetAPDamage = Math.floor(target.ap * 0.1); 
          actualLogText = `[TRACE COMPLETED] A devastating cyber attack on ${target.name} has been definitively traced to ${actor.name}!`;
          logType = "critical";
        }
      } else if (actionType === "Deploy Air Force") {
         targetMilitaryDamage = Math.floor(Math.random() * 20) + 15;
      } else if (actionType === "Launch Invasion") {
         targetMilitaryDamage = Math.floor(actor.military_strength * 0.4); // Devastating hit based on actor's power
         if (target.military_strength - targetMilitaryDamage <= 0) {
           targetAnnihilated = true;
           actualLogText = `[NATION FALLEN] The military of ${target.name} has been entirely decimated by ${actor.name}. The region has formally surrendered and is now occupied territory!`;
           logType = "critical";
         } else {
           actualLogText = `[HEAVY CASUALTIES] ${target.name} forces repel ${actor.name}'s initial invasion wave but suffer extreme military casualties.`;
         }
      }

      // Alliance Logic
      if (actionType === "Send Aid" && target.threat_level + actualThreat <= 0) {
        actualLogText = `[HISTORIC ACCORD] Following massive aid, ${actor.name} and ${target.name} have signed a Mutual Defense Pact!`;
        logType = "system";
      }

      const newLog = {
        id: Date.now() + Math.random(),
        text: actualLogText,
        type: logType,
        timestamp: new Date().toISOString()
      };

      const updatedCountries = state.countries.map(c => {
        let newThreat = c.threat_level;
        let newThreatTokens = { ...c.threatTokens };
        
        // Deduct actor AP
        if (c.id === actor.id) {
          return { ...c, ap: c.ap - effect.cost, threat_level: Math.min(100, Math.max(0, c.threat_level + 5)) };
        }

        // Target threat modification
        if (c.id === target.id) {
          newThreat = Math.min(100, Math.max(0, c.threat_level + actualThreat));
          newThreatTokens[actor.id] = (newThreatTokens[actor.id] || 0) + actualThreat;
          
          let newAlliance = c.alliance;
          if (actionType === "Send Aid" && newThreat <= 0) {
            newAlliance = actor.alliance; // Dynamic shift to allies!
          }

          return { ...c, 
            ap: Math.max(0, c.ap - targetAPDamage), 
            threat_level: newThreat, 
            threatTokens: newThreatTokens,
            alliance: newAlliance,
            military_strength: Math.max(0, c.military_strength - targetMilitaryDamage),
            isAnnihilated: targetAnnihilated
          };
        }

        // Allies of the target grow nervous. If dead, they get VERY nervous.
        if (c.alliance === target.alliance && c.id !== actor.id) {
            let allyThreat = targetAnnihilated ? 40 : (actualThreat / 2);
            newThreat = Math.min(100, Math.max(0, c.threat_level + allyThreat));
            newThreatTokens[actor.id] = (newThreatTokens[actor.id] || 0) + allyThreat;
            return { ...c, threat_level: newThreat, threatTokens: newThreatTokens };
        }
        
        return c;
      });

      return {
        ...state,
        countries: updatedCountries,
        interactionMode: 'IDLE',
        pendingAction: null,
        gameOverReason,
        logs: [newLog, ...state.logs].slice(0, 100)
      };
    }

    case ACTIONS.GAME_TICK: {
      if (state.gameOverReason || !state.playerNationId) return state;

      let newLogs = [];
      let isNuked = false;

      // 1. Give AP to everyone according to economic power
      // 2. Threat decay
      // 3. AI Actions
      const updatedCountries = state.countries.map(c => {
        if (c.isAnnihilated) return c; // Dead nations do nothing

        // Only active AI logic for non-player entities
        let nextThreat = Math.max(0, c.threat_level - 1.5); // Decay
        let nextAP = c.ap + (c.economic_power / 10);
        let updatedTokens = { ...c.threatTokens };

        // Decay tokens slightly
        Object.keys(updatedTokens).forEach(k => {
           updatedTokens[k] = Math.max(0, updatedTokens[k] - 0.5);
           if (updatedTokens[k] <= 0) delete updatedTokens[k];
        });

        if (c.id !== state.playerNationId && c.threat_level >= 80) {
           // Find highest hated enemy
           let highestHatedId = Object.keys(updatedTokens).sort((a,b) => updatedTokens[b] - updatedTokens[a])[0];
           
           if (highestHatedId && nextAP >= 150) {
              const targetCountry = state.countries.find(tc => tc.id === highestHatedId);
              if (targetCountry) {
                // If global DEFCON is 1, AI might nuke!
                const sortedThreats = [...state.countries].sort((a, b) => b.threat_level - a.threat_level).slice(0, 15);
                const globalAvg = sortedThreats.reduce((sum, cc) => sum + cc.threat_level, 0) / 15;
                const defcon = Math.max(1, 5 - Math.floor(globalAvg / 20));

                let actionName = "Send Naval Fleet";
                if (c.threat_level >= 95 && nextAP >= 500) actionName = "Launch Invasion";
                else if (c.threat_level >= 85 && nextAP >= 250) actionName = "Deploy Air Force";
                else if (defcon === 1 && c.threat_level === 100 && nextAP >= 1000 && Math.random() > 0.85) actionName = "Nuclear Strike";

                const effect = ACTION_EFFECTS[actionName];
                nextAP -= effect.cost;
                updatedTokens[highestHatedId] -= 20; // Vented anger

                newLogs.push({
                  id: Date.now() + Math.random(),
                  text: `[SAT-INTEL] ` + (effect.log ? effect.log(c, targetCountry) : `${c.name} takes action against ${targetCountry.name}`),
                  type: actionName.includes("Invasion") || actionName === "Nuclear Strike" ? "critical" : "action",
                  timestamp: new Date().toISOString()
                });

                if (actionName === "Nuclear Strike") isNuked = true;
              }
           }
        }

        return {
          ...c,
          ap: nextAP,
          threat_level: nextThreat,
          threatTokens: updatedTokens
        }
      });

      const destroyedCount = updatedCountries.filter(c => c.isAnnihilated).length;
      const ww3End = destroyedCount > (updatedCountries.length * 0.15);

      return {
        ...state,
        countries: updatedCountries,
        gameOverReason: isNuked ? "nuclear" : ww3End ? "ww3" : state.gameOverReason,
        logs: [...newLogs, ...state.logs].slice(0, 100)
      };
    }

    case ACTIONS.ADD_LIVE_NEWS:
      // Prevent duplicates by checking if the headline already exists
      if (state.logs.some(log => log.text === action.payload.text)) {
        return state;
      }
      return { ...state, logs: [action.payload, ...state.logs].slice(0, 100) };

    case 'SET_INTERACTION_MODE':
      return { ...state, interactionMode: action.payload.mode, pendingAction: action.payload.action };

    case 'CANCEL_TARGETING':
      return { ...state, interactionMode: 'IDLE', pendingAction: null };

    case 'EVALUATE_UN': {
      if (state.gameOverReason) return state;

      // Find the most aggressive nation
      const worstAggressor = state.countries.reduce((worst, c) => (c.threat_level > worst.threat_level ? c : worst), state.countries[0]);
      
      if (worstAggressor && worstAggressor.threat_level >= 95) {
        const newLog = {
          id: Date.now(),
          text: `[U.N. RESOLUTION PASSED] The United Nations unanimously condemns ${worstAggressor.name} for excessive aggression! Heavy global economic blockade imposed.`,
          type: "alert",
          timestamp: new Date().toISOString()
        };

        return {
          ...state,
          countries: state.countries.map(c => c.id === worstAggressor.id ? { ...c, ap: Math.floor(c.ap * 0.1), threat_level: 100 } : c),
          logs: [newLog, ...state.logs].slice(0, 100)
        };
      }
      return state;
    }

    default:
      return state;
  }
}
