/**
 * KINETICA — useEstimatedState React Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Single entry point for React components that need estimated state data.
 *
 * Components should NEVER import estimatorManager directly.
 * They should use this hook exclusively.
 *
 * Returns:
 *   estimatedState  — latest EstimatedState from the active estimator
 *   estimatorStatus — 'ready' | 'running' | 'paused'
 *   estimatorMode   — 'basic_filter' | 'model_based'
 *   start           — begin estimation
 *   pause           — pause estimation
 *   reset           — reset estimator to initial state
 *   setMode         — switch estimator mode
 *
 * NOTE: The estimator only produces output when the sensor stream is ALSO running.
 * Start the sensor stream first (via useSensorData().start()), then start estimation.
 */

import { useState, useEffect, useCallback } from 'react';
import { estimatorManager } from '../estimation/estimatorManager.js';

export function useEstimatedState() {
  const [estimatedState, setEstimatedState] = useState(
    () => estimatorManager.getLatestState()
  );
  const [estimatorStatus, setEstimatorStatus] = useState(
    () => estimatorManager.getStatus()
  );
  const [estimatorMode, setEstimatorModeState] = useState(
    () => estimatorManager.getMode()
  );

  useEffect(() => {
    const listener = (state) => {
      setEstimatedState(state);
      setEstimatorStatus(estimatorManager.getStatus());
    };
    estimatorManager.subscribe(listener);
    return () => estimatorManager.unsubscribe(listener);
  }, []);

  const start = useCallback(() => {
    estimatorManager.start();
    setEstimatorStatus(estimatorManager.getStatus());
  }, []);

  const pause = useCallback(() => {
    estimatorManager.pause();
    setEstimatorStatus(estimatorManager.getStatus());
  }, []);

  const reset = useCallback(() => {
    estimatorManager.reset();
    setEstimatedState(estimatorManager.getLatestState());
    setEstimatorStatus(estimatorManager.getStatus());
  }, []);

  const setMode = useCallback((mode) => {
    estimatorManager.setMode(mode);
    setEstimatorModeState(estimatorManager.getMode());
    setEstimatorStatus(estimatorManager.getStatus());
  }, []);

  return {
    /** @type {import('../estimation/types.js').EstimatedState} */
    estimatedState,

    /** @type {'ready' | 'running' | 'paused'} */
    estimatorStatus,

    /** @type {'basic_filter' | 'model_based'} */
    estimatorMode,

    start,
    pause,
    reset,
    setMode,
  };
}
