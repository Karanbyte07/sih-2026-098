/**
 * KINETICA — useGuidance React Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * React entry point for Guidance & Control closed-loop simulation state.
 *
 * Consumes guidanceManager (which bridges dynamicsManager and estimatorManager).
 */

import { useState, useEffect, useCallback } from 'react';
import { guidanceManager } from '../guidance/guidanceManager.js';

export function useGuidance() {
  const [data, setData] = useState(() => ({
    dynamicState: guidanceManager.getDynamicState(),
    estimatedState: guidanceManager.getEstimatedState(),
    refPoint: guidanceManager.getCurrentRefPoint(),
    referencePath: guidanceManager.getReferencePath(),
    trajectory: guidanceManager.getTrajectory(),
    deviation: guidanceManager.getDeviation(),
    decision: guidanceManager.getDecision(),
    controlResponse: guidanceManager.getControlResponse(),
    errorHistory: guidanceManager.getErrorHistory(),
    status: guidanceManager.getStatus(),
    scenario: guidanceManager.getScenario(),
    closedLoopActive: guidanceManager.isClosedLoopActive(),
  }));

  useEffect(() => {
    const onUpdate = (snapshot) => {
      setData({
        ...snapshot,
        trajectory: [...snapshot.trajectory],
        errorHistory: [...snapshot.errorHistory],
      });
    };

    guidanceManager.subscribe(onUpdate);
    return () => guidanceManager.unsubscribe(onUpdate);
  }, []);

  const start = useCallback(() => guidanceManager.start(), []);
  const pause = useCallback(() => guidanceManager.pause(), []);
  const reset = useCallback(() => guidanceManager.reset(), []);
  const setScenario = useCallback((sc) => guidanceManager.setScenario(sc), []);
  const setClosedLoop = useCallback((active) => guidanceManager.setClosedLoop(active), []);

  return {
    ...data,
    start,
    pause,
    reset,
    setScenario,
    setClosedLoop,
  };
}
