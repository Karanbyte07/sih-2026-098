/**
 * KINETICA — Dynamic Model Module
 * ─────────────────────────────────────────────────────────────────────────────
 * Safe engineering dynamic simulation representing the digital twin.
 *
 * Models state evolution over time:
 *   EstimatedState (Seed)
 *          ↓
 *   Dynamic Model (stepDynamicModel)
 *          ↓
 *   UpdatedState(t + Δt)
 *
 * Scenario influences:
 *   - 'nominal': small natural variation and aerodynamic damping
 *   - 'disturbance': environmental crosswind shear and vertical thermal disturbances
 *   - 'sensorNoise': propagation of estimation uncertainty with state jitter
 *
 * Do NOT add operational weapon calculations, firing solutions, or actuators.
 */

import { getEstimateValue } from '../estimation/types.js';

/**
 * Initializes an UpdatedState seeded from EstimatedState if available.
 * If EstimatedState is unavailable, returns a structured baseline with isEstimatorAvailable = false.
 *
 * @param {import('../estimation/types.js').EstimatedState|null} estimatedState
 * @param {import('./types.js').ScenarioId} [scenario='nominal']
 * @returns {import('./types.js').UpdatedState}
 */
export function initializeFromEstimatedState(estimatedState, scenario = 'nominal') {
  const isAvailable =
    estimatedState != null &&
    estimatedState.overallQuality !== 'unavailable' &&
    estimatedState.position?.z !== null;

  // Extract from EstimatedState or use clean nominal baseline
  const estX = isAvailable ? getEstimateValue(estimatedState, 'position.x') : null;
  const estY = isAvailable ? getEstimateValue(estimatedState, 'position.y') : null;
  const estZ = isAvailable ? getEstimateValue(estimatedState, 'position.z') : null;

  const estVx = isAvailable ? getEstimateValue(estimatedState, 'velocity.x') : null;
  const estVy = isAvailable ? getEstimateValue(estimatedState, 'velocity.y') : null;
  const estVz = isAvailable ? getEstimateValue(estimatedState, 'velocity.z') : null;

  const estRoll  = isAvailable ? getEstimateValue(estimatedState, 'orientation.roll') : null;
  const estPitch = isAvailable ? getEstimateValue(estimatedState, 'orientation.pitch') : null;
  const estYaw   = isAvailable ? getEstimateValue(estimatedState, 'orientation.yaw') : null;

  return {
    timestamp: Date.now(),
    simTime: 0,
    status: 'ready',
    scenario,
    position: {
      x: estX ?? 0,
      y: estY ?? 0,
      z: estZ ?? 850,
    },
    velocity: {
      x: estVx ?? 165,
      y: estVy ?? 0,
      z: estVz ?? -10.5,
    },
    acceleration: {
      x: -0.25,
      y: 0,
      z: -0.15,
    },
    orientation: {
      roll: estRoll ?? 0,
      pitch: estPitch ?? -3.6,
      yaw: estYaw ?? 0,
    },
    isEstimatorAvailable: isAvailable,
    error: null,
  };
}

/**
 * Steps the dynamic simulation forward by dt seconds.
 *
 * @param {import('./types.js').UpdatedState} currentState
 * @param {import('./types.js').ScenarioId} scenario
 * @param {number} dt Delta time in seconds (e.g. 0.05)
 * @param {import('../estimation/types.js').EstimatedState|null} [liveEstimatedState]
 * @returns {import('./types.js').UpdatedState}
 */
export function stepDynamicModel(currentState, scenario, dt, liveEstimatedState = null, controlCorrection = null) {
  if (!currentState || currentState.status === 'error') {
    return {
      ...(currentState || {}),
      status: 'error',
      error: 'Invalid state passed to dynamic model',
    };
  }

  const simTime = currentState.simTime + dt;
  const curPos = currentState.position;
  const curVel = currentState.velocity;

  // Safe checks for NaN/null
  const pX = curPos.x ?? 0;
  const pY = curPos.y ?? 0;
  const pZ = curPos.z ?? 0;
  const vX = curVel.x ?? 150;
  const vY = curVel.y ?? 0;
  const vZ = curVel.z ?? -10;

  // Aerodynamic drag and natural damping acceleration
  let aX = -0.008 * vX;
  let aY = -0.035 * vY;
  // Natural glide / aerodynamic lift balance:
  let aZ = -0.22 - 0.015 * vZ;

  // Closed-loop simulated control response feedback (restoring demand)
  if (controlCorrection) {
    if (typeof controlCorrection.accelCorrectionY === 'number') {
      aY += controlCorrection.accelCorrectionY;
    }
    if (typeof controlCorrection.accelCorrectionZ === 'number') {
      aZ += controlCorrection.accelCorrectionZ;
    }
  }

  // Scenario-specific synthetic disturbances
  switch (scenario) {
    case 'nominal': {
      // Small natural variation
      const wobbleX = 0.04 * Math.sin(simTime * 0.6);
      const wobbleY = 0.08 * Math.sin(simTime * 0.4);
      const wobbleZ = 0.05 * Math.cos(simTime * 0.5);
      aX += wobbleX;
      aY += wobbleY;
      aZ += wobbleZ;
      break;
    }

    case 'disturbance': {
      // Environmental disturbance: crosswind shear and thermal updraft
      const crosswind = 2.4 * Math.sin(simTime * 0.8) + 1.1 * Math.cos(simTime * 1.6);
      const thermalGust = 1.3 * Math.sin(simTime * 0.45);
      aY += crosswind;
      aZ += thermalGust;
      aX -= 0.12 * Math.abs(Math.sin(simTime * 0.7));
      break;
    }

    case 'sensorNoise': {
      // Sensor uncertainty propagation: high frequency jitter on state derivatives
      const jitterX = (Math.sin(simTime * 8.0) + (Math.random() - 0.5)) * 0.5;
      const jitterY = (Math.cos(simTime * 6.5) + (Math.random() - 0.5)) * 0.8;
      const jitterZ = (Math.sin(simTime * 7.2) + (Math.random() - 0.5)) * 0.6;
      aX += jitterX;
      aY += jitterY;
      aZ += jitterZ;
      break;
    }

    default:
      break;
  }

  // Numerical integration (Euler / kinematic step)
  const nextVx = Math.max(15, vX + aX * dt);
  const nextVy = vY + aY * dt;
  const nextVz = vZ + aZ * dt;

  const nextPx = pX + nextVx * dt;
  const nextPy = pY + nextVy * dt;
  const nextPz = Math.max(0, pZ + nextVz * dt);

  // Compute orientation aligned with velocity vector
  const pitchRad = Math.atan2(nextVz, nextVx);
  let nextPitch = pitchRad * (180 / Math.PI);
  let nextYaw = Math.atan2(nextVy, nextVx) * (180 / Math.PI);
  let nextRoll = Math.atan(aY / 9.81) * (180 / Math.PI);

  if (scenario === 'disturbance') {
    nextRoll += 2.5 * Math.sin(simTime * 1.1);
    nextPitch += 0.8 * Math.cos(simTime * 0.9);
  } else if (scenario === 'sensorNoise') {
    nextPitch += (Math.random() - 0.5) * 0.4;
    nextYaw += (Math.random() - 0.5) * 0.5;
  }

  // Check if simulation trajectory has completed (reached ground or max horizon)
  const isComplete = nextPz <= 0 || nextPx >= 6000;
  const status = isComplete ? 'complete' : 'running';

  return {
    timestamp: Date.now(),
    simTime: Number(simTime.toFixed(3)),
    status,
    scenario,
    position: {
      x: Number(nextPx.toFixed(2)),
      y: Number(nextPy.toFixed(2)),
      z: Number(nextPz.toFixed(2)),
    },
    velocity: {
      x: Number(nextVx.toFixed(2)),
      y: Number(nextVy.toFixed(2)),
      z: Number(nextVz.toFixed(2)),
    },
    acceleration: {
      x: Number(aX.toFixed(3)),
      y: Number(aY.toFixed(3)),
      z: Number(aZ.toFixed(3)),
    },
    orientation: {
      roll: Number(nextRoll.toFixed(2)),
      pitch: Number(nextPitch.toFixed(2)),
      yaw: Number(nextYaw.toFixed(2)),
    },
    isEstimatorAvailable: currentState.isEstimatorAvailable,
    error: null,
  };
}
