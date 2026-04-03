import { useEffect, useRef } from 'react';
import { ACTIONS } from '../engine/simulationReducer';

export function useGameLoop(dispatch, isGameOver, isPlayerSet) {
  const tickCounter = useRef(0);

  useEffect(() => {
    // Only run game loop if commander is set and game runs
    if (isGameOver || !isPlayerSet) return;

    const interval = setInterval(() => {
      dispatch({ type: ACTIONS.GAME_TICK });
      tickCounter.current++;

      // UN Evaluates the world every 10 ticks
      if (tickCounter.current % 10 === 0) {
         dispatch({ type: 'EVALUATE_UN' });
      }
    }, 2500); // Every 2.5 seconds represents a simulation segment

    return () => clearInterval(interval);
  }, [dispatch, isGameOver, isPlayerSet]);
}
