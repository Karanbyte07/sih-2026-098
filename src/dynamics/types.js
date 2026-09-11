/**
 * KINETICA — Dynamics Types
 * ─────────────────────────────────────────────────────────────────────────────
 * Type definitions for the Flight Dynamics (Digital Twin) simulation layer.
 *
 * Architecture:
 *   SensorData
 *       ↓
 *   State Estimation
 *       ↓
 *   EstimatedState
 *       ↓
 *   Flight Dynamics (Dynamic Model)
 *       ↓
 *   UpdatedState (this output)
 *       ↓
 *   Guidance & Control (future)
 *       ↓
 *   Analytics (future)
 *
 * Safe engineering simulation only.
 * No weapon, targeting, actuation, or explosive parameters.
 *
 * @typedef {'ready' | 'running' | 'paused' | 'complete' | 'error'} DynamicModelStatus
 * @typedef {'nominal' | 'disturbance' | 'sensorNoise'} ScenarioId
 *
 * @typedef {Object} Vector3D
 * @property {number|null} x
 * @property {number|null} y
 * @property {number|null} z
 *
 * @typedef {Object} OrientationEuler
 * @property {number|null} roll   Degrees
 * @property {number|null} pitch  Degrees
 * @property {number|null} yaw    Degrees
 *
 * @typedef {Object} UpdatedState
 * @property {number}             timestamp         Wall clock time (ms)
 * @property {number}             simTime           Simulation elapsed time (seconds)
 * @property {DynamicModelStatus} status            Model execution status
 * @property {ScenarioId}         scenario          Active scenario
 * @property {Vector3D}           position          Position in meters (X: Downrange, Y: Cross-range, Z: Altitude)
 * @property {Vector3D}           velocity          Velocity in m/s (Vx, Vy, Vz)
 * @property {Vector3D}           acceleration      Acceleration in m/s² (Ax, Ay, Az)
 * @property {OrientationEuler}   orientation       Attitude in degrees (roll, pitch, yaw)
 * @property {boolean}            isEstimatorAvailable True if seed data was provided by EstimatedState
 * @property {string|null}        error             Error message if status === 'error'
 */

export const SCENARIOS = [
  {
    id: 'nominal',
    label: 'Nominal',
    description: 'Small natural aerodynamic variations and smooth trajectory',
  },
  {
    id: 'disturbance',
    label: 'Environmental Disturbance',
    description: 'Crosswind gusts and thermal updraft perturbations',
  },
  {
    id: 'sensorNoise',
    label: 'Sensor Uncertainty',
    description: 'Propagation of state estimation uncertainty and noise variance',
  },
];

/**
 * Variables supported by the dynamic model for State Evolution charting.
 */
export const EVOLUTION_VARIABLES = [
  {
    id: 'position',
    label: 'Position',
    unit: 'm',
    channels: [
      { key: 'position.z', label: 'Altitude (Z)', unit: 'm', color: '#38BDF8' },
      { key: 'position.x', label: 'Downrange (X)', unit: 'm', color: '#2DD4BF' },
      { key: 'position.y', label: 'Cross-range (Y)', unit: 'm', color: '#A78BFA' },
    ],
  },
  {
    id: 'velocity',
    label: 'Velocity',
    unit: 'm/s',
    channels: [
      { key: 'velocity.x', label: 'Axial Velocity (Vx)', unit: 'm/s', color: '#38BDF8' },
      { key: 'velocity.z', label: 'Vertical Velocity (Vz)', unit: 'm/s', color: '#22C55E' },
      { key: 'velocity.y', label: 'Lateral Velocity (Vy)', unit: 'm/s', color: '#F59E0B' },
    ],
  },
  {
    id: 'acceleration',
    label: 'Acceleration',
    unit: 'm/s²',
    channels: [
      { key: 'acceleration.x', label: 'Axial Accel (Ax)', unit: 'm/s²', color: '#38BDF8' },
      { key: 'acceleration.z', label: 'Vertical Accel (Az)', unit: 'm/s²', color: '#22C55E' },
      { key: 'acceleration.y', label: 'Lateral Accel (Ay)', unit: 'm/s²', color: '#EF4444' },
    ],
  },
  {
    id: 'orientation',
    label: 'Orientation',
    unit: '°',
    channels: [
      { key: 'orientation.pitch', label: 'Pitch', unit: '°', color: '#38BDF8' },
      { key: 'orientation.yaw', label: 'Yaw', unit: '°', color: '#F59E0B' },
      { key: 'orientation.roll', label: 'Roll', unit: '°', color: '#A78BFA' },
    ],
  },
];

/**
 * Safely extracts a numeric value from an UpdatedState object by dot-path.
 * @param {UpdatedState|null} state
 * @param {string} path  e.g. 'position.z', 'velocity.x'
 * @returns {number|null}
 */
export function getUpdatedStateValue(state, path) {
  if (!state) return null;
  const parts = path.split('.');
  let curr = state;
  for (const part of parts) {
    if (curr == null || typeof curr !== 'object') return null;
    curr = curr[part];
  }
  return typeof curr === 'number' && isFinite(curr) ? curr : null;
}

/**
 * Creates a clean default UpdatedState.
 * @param {ScenarioId} [scenario='nominal']
 * @param {boolean} [isEstimatorAvailable=false]
 * @returns {UpdatedState}
 */
export function createDefaultUpdatedState(scenario = 'nominal', isEstimatorAvailable = false) {
  return {
    timestamp: Date.now(),
    simTime: 0,
    status: 'ready',
    scenario,
    position: {
      x: isEstimatorAvailable ? 0 : null,
      y: isEstimatorAvailable ? 0 : null,
      z: isEstimatorAvailable ? 1200 : null,
    },
    velocity: {
      x: isEstimatorAvailable ? 180 : null,
      y: isEstimatorAvailable ? 0 : null,
      z: isEstimatorAvailable ? -12 : null,
    },
    acceleration: {
      x: isEstimatorAvailable ? -0.5 : null,
      y: isEstimatorAvailable ? 0 : null,
      z: isEstimatorAvailable ? -0.2 : null,
    },
    orientation: {
      roll: isEstimatorAvailable ? 0 : null,
      pitch: isEstimatorAvailable ? -3.8 : null,
      yaw: isEstimatorAvailable ? 0 : null,
    },
    isEstimatorAvailable,
    error: null,
  };
}
