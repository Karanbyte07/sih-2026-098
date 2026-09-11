/**
 * KINETICA — Estimation Types
 * ─────────────────────────────────────────────────────────────────────────────
 * Type definitions for the State Estimation pipeline.
 *
 * Pipeline:
 *   SensorData
 *       ↓
 *   Preprocessor  (cleans, validates, scales raw measurements)
 *       ↓
 *   Estimator     (fuses measurements into a consistent state)
 *       ↓
 *   EstimatedState  (this output)
 *       ↓
 *   Digital Twin / Analytics
 *
 * Do NOT add weapon, targeting, actuation, or explosive values.
 * This module is for sensor fusion and engineering validation only.
 *
 * @typedef {'good' | 'degraded' | 'insufficient' | 'unavailable'} EstimateQuality
 * @typedef {'ready' | 'running' | 'paused'} EstimatorStatus
 * @typedef {'basic_filter' | 'model_based'} EstimatorMode
 *
 * @typedef {Object} PositionEstimate
 * @property {number|null} x          Meters (relative to initial GPS fix)
 * @property {number|null} y          Meters
 * @property {number|null} z          Meters (altitude, from GPS)
 * @property {EstimateQuality} quality
 *
 * @typedef {Object} VelocityEstimate
 * @property {number|null} x          m/s
 * @property {number|null} y          m/s
 * @property {number|null} z          m/s
 * @property {EstimateQuality} quality
 *
 * @typedef {Object} OrientationEstimate
 * @property {number|null} roll        Degrees
 * @property {number|null} pitch       Degrees
 * @property {number|null} yaw         Degrees
 * @property {EstimateQuality} quality
 *
 * @typedef {Object} UncertaintyEstimate
 * @property {'low' | 'medium' | 'high' | 'unknown'} level
 * @property {number|null} positionRmse    Meters (rough estimate only)
 */

/**
 * @typedef {Object} EstimatedState
 * @property {number}              timestamp
 * @property {EstimatorMode}       mode
 * @property {EstimatorStatus}     estimatorStatus
 * @property {PositionEstimate}    position
 * @property {VelocityEstimate}    velocity
 * @property {OrientationEstimate} orientation
 * @property {UncertaintyEstimate} uncertainty
 * @property {EstimateQuality}     overallQuality
 * @property {string}              lastUpdateLabel   Human-readable update time
 */

/**
 * Create an empty EstimatedState (used as initial/fallback value).
 * @param {EstimatorMode} [mode='basic_filter']
 * @returns {EstimatedState}
 */
export function createEmptyEstimatedState(mode = 'basic_filter') {
  return {
    timestamp:       Date.now(),
    mode,
    estimatorStatus: 'ready',

    position: {
      x: null, y: null, z: null,
      quality: 'unavailable',
    },

    velocity: {
      x: null, y: null, z: null,
      quality: 'unavailable',
    },

    orientation: {
      roll: null, pitch: null, yaw: null,
      quality: 'unavailable',
    },

    uncertainty: {
      level:        'unknown',
      positionRmse: null,
    },

    overallQuality:  'unavailable',
    lastUpdateLabel: '—',
  };
}

/**
 * State variable channel descriptors for the Measured vs Estimated chart.
 * @type {Array<{key: string, label: string, unit: string, measuredPath: string}>}
 */
export const ESTIMATION_CHANNELS = [
  { key: 'position.z',       label: 'Altitude (Z)',     unit: 'm',    measuredPath: 'gps.altitude' },
  { key: 'position.x',       label: 'Position X',       unit: 'm',    measuredPath: null },
  { key: 'position.y',       label: 'Position Y',       unit: 'm',    measuredPath: null },
  { key: 'velocity.x',       label: 'Velocity X',       unit: 'm/s',  measuredPath: 'imu.acceleration.x' },
  { key: 'velocity.y',       label: 'Velocity Y',       unit: 'm/s',  measuredPath: 'imu.acceleration.y' },
  { key: 'orientation.roll', label: 'Roll',             unit: '°',    measuredPath: 'imu.gyroscope.x' },
  { key: 'orientation.pitch',label: 'Pitch',            unit: '°',    measuredPath: 'imu.gyroscope.y' },
];

/**
 * Read a value from EstimatedState using dot-notation.
 * Returns null (not NaN) when the path is invalid.
 * @param {EstimatedState} state
 * @param {string} key e.g. 'position.z'
 * @returns {number|null}
 */
export function getEstimateValue(state, key) {
  const val = key
    .split('.')
    .reduce((obj, k) => (obj != null && obj[k] !== undefined ? obj[k] : undefined), state);
  if (typeof val === 'number' && isFinite(val)) return val;
  return null;
}
