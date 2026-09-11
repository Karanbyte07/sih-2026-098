/**
 * KINETICA — Guidance Simulation Logic
 * ─────────────────────────────────────────────────────────────────────────────
 * Safe engineering guidance & control response simulation.
 *
 * Core computation:
 *   1. calculateDeviation(referencePoint, currentState, estimatedState)
 *   2. evaluateDeviation(deviation)
 *   3. simulateResponse(guidanceDecision, deviation)
 *
 * Abstract simulation variables only.
 * No real weapon guidance laws, firing solutions, or actuator hardware commands.
 */

/**
 * Calculates tracking and estimation deviations against reference corridor.
 *
 * @param {{x: number, y: number, z: number}} refPoint
 * @param {import('../dynamics/types.js').UpdatedState} currentState
 * @param {import('../estimation/types.js').EstimatedState|null} estimatedState
 * @returns {import('./types.js').DeviationMetrics}
 */
export function calculateDeviation(refPoint, currentState, estimatedState) {
  const curPos = currentState?.position ?? { x: 0, y: 0, z: 850 };
  const curVel = currentState?.velocity ?? { x: 165, y: 0, z: -10 };

  const refX = refPoint?.x ?? curPos.x ?? 0;
  const refY = refPoint?.y ?? 0;
  const refZ = refPoint?.z ?? 850;

  const deltaX = (curPos.x ?? 0) - refX;
  const deltaY = (curPos.y ?? 0) - refY;
  const deltaZ = (curPos.z ?? 850) - refZ;

  // Tracking error is cross-track and vertical deviation from corridor
  const trackingError = Math.hypot(deltaY, deltaZ);

  // Estimation error: discrepancy between estimated position and simulated state
  let estimationError = 0.6; // nominal baseline
  if (estimatedState && estimatedState.position?.z !== null) {
    const estZ = estimatedState.position.z;
    const estX = estimatedState.position.x ?? curPos.x;
    estimationError = Math.hypot((estX - (curPos.x ?? 0)) * 0.1, (estZ - (curPos.z ?? 0)));
  }

  const overallError = Math.hypot(trackingError, estimationError);

  return {
    trackingError: Number(trackingError.toFixed(2)),
    estimationError: Number(estimationError.toFixed(2)),
    overallError: Number(overallError.toFixed(2)),
    deltaX: Number(deltaX.toFixed(2)),
    deltaY: Number(deltaY.toFixed(2)),
    deltaZ: Number(deltaZ.toFixed(2)),
    deltaVx: Number(((curVel.x ?? 0) - 165).toFixed(2)),
    deltaVy: Number((curVel.y ?? 0).toFixed(2)),
    deltaVz: Number(((curVel.z ?? 0) - (-10)).toFixed(2)),
  };
}

/**
 * Evaluates deviation to produce an abstract guidance decision.
 *
 * @param {import('./types.js').DeviationMetrics} deviation
 * @returns {import('./types.js').GuidanceDecision}
 */
export function evaluateDeviation(deviation) {
  const err = deviation.trackingError;

  if (err < 4.0) {
    return {
      stage: 'within_reference',
      label: 'Within Reference',
      status: 'nominal',
      actionSummary: 'Trajectory conforms to nominal reference corridor (±5m tolerance)',
      correctiveEffort: Number((-deviation.deltaZ * 0.02).toFixed(3)),
    };
  } else if (err < 18.0) {
    return {
      stage: 'deviation_detected',
      label: 'Deviation Detected',
      status: 'correcting',
      actionSummary: 'Cross-track deviation identified; evaluating corrective restoring demand',
      correctiveEffort: Number((-deviation.deltaZ * 0.05).toFixed(3)),
    };
  } else {
    return {
      stage: 'correction_evaluated',
      label: 'Correction Evaluated',
      status: 'correcting',
      actionSummary: 'Environmental perturbation active; closed-loop restoring response engaged',
      correctiveEffort: Number(Math.max(-1.0, Math.min(1.0, -deviation.deltaZ * 0.08)).toFixed(3)),
    };
  }
}

/**
 * Simulates a generic system control response based on guidance decision.
 *
 * @param {import('./types.js').GuidanceDecision} decision
 * @param {import('./types.js').DeviationMetrics} deviation
 * @param {boolean} [closedLoopActive=true]
 * @returns {import('./types.js').ControlResponse}
 */
export function simulateResponse(decision, deviation, closedLoopActive = true) {
  const kP = 0.12;
  const kD = 0.18;

  // Corrective accelerations to gently restore altitude and lateral position
  let accelCorrectionZ = -kP * deviation.deltaZ - kD * deviation.deltaVz;
  let accelCorrectionY = -kP * deviation.deltaY - kD * deviation.deltaVy;

  // Clamped to safe abstract limits
  accelCorrectionZ = Math.max(-2.2, Math.min(2.2, accelCorrectionZ));
  accelCorrectionY = Math.max(-1.8, Math.min(1.8, accelCorrectionY));

  const effortPercent = Math.min(100, Math.max(4, Math.round(deviation.trackingError * 2.5)));

  return {
    responseTimeMs: 24, // simulated loop latency
    effortPercent,
    accelCorrectionY: Number(accelCorrectionY.toFixed(3)),
    accelCorrectionZ: Number(accelCorrectionZ.toFixed(3)),
    responseType: deviation.trackingError < 5.0 ? 'Nominal Glide Trim' : 'Proportional Restoring Response',
    closedLoopActive,
  };
}
