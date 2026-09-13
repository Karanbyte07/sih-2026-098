/**
 * KINETICA — useDynamics React Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Single entry point for React components consuming the Digital Twin
 * dynamic simulation layer.
 *
 * Provides:
 *   - state: current UpdatedState (position, velocity, acceleration, orientation, simTime)
 *   - status: 'ready' | 'running' | 'paused' | 'complete' | 'error'
 *   - scenario: 'nominal' | 'disturbance' | 'sensorNoise'
 *   - trajectory: 2D/3D points array for trajectory rendering
 *   - referencePath: precalculated nominal reference trajectory
 *   - history: bounded buffer of past states for chart plotting
 *   - isEstimatorAvailable: true if State Estimation is currently feeding input
 *   - start: start/resume dynamic simulation
 *   - pause: freeze simulation
 *   - reset: restore initial conditions and clear buffers
 *   - setScenario: switch active scenario
 */

import { useState, useEffect, useCallback } from 'react';
import { dynamicsManager } from '../dynamics/dynamicsManager.js';

export function useDynamics() {
  const [state, setState] = useState(() => dynamicsManager.getState());
  const [status, setStatus] = useState(() => dynamicsManager.getStatus());
  const [scenario, setScenarioState] = useState(() => dynamicsManager.getScenario());
  const [trajectory, setTrajectory] = useState(() => dynamicsManager.getTrajectory());
  const [history, setHistory] = useState(() => dynamicsManager.getHistory());
  const [referencePath] = useState(() => dynamicsManager.getReferencePath());

  useEffect(() => {
    const onUpdate = (nextState, nextTrajectory, nextHistory) => {
      setState(nextState);
      setStatus(dynamicsManager.getStatus());
      setScenarioState(dynamicsManager.getScenario());
      setTrajectory([...nextTrajectory]);
      setHistory([...nextHistory]);
    };

    dynamicsManager.subscribe(onUpdate);
    return () => dynamicsManager.unsubscribe(onUpdate);
  }, []);

  const start = useCallback(() => {
    dynamicsManager.start();
    setStatus(dynamicsManager.getStatus());
  }, []);

  const pause = useCallback(() => {
    dynamicsManager.pause();
    setStatus(dynamicsManager.getStatus());
  }, []);

  const reset = useCallback(() => {
    dynamicsManager.reset();
    setState(dynamicsManager.getState());
    setStatus(dynamicsManager.getStatus());
    setTrajectory([]);
    setHistory([]);
  }, []);

  const setScenario = useCallback((newScenario) => {
    dynamicsManager.setScenario(newScenario);
    setScenarioState(newScenario);
  }, []);

  return {
    state,
    status,
    scenario,
    trajectory,
    referencePath,
    history,
    isEstimatorAvailable: state?.isEstimatorAvailable ?? dynamicsManager.isEstimatorAvailable(),
    start,
    pause,
    reset,
    setScenario,
  };
}
