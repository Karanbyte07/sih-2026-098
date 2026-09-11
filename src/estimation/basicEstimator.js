/**
 * KINETICA — Basic Estimator
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts ProcessedMeasurements into an EstimatedState.
 *
 * Two operating modes:
 *
 *   basic_filter:
 *     - Position from GPS (smoothed)
 *     - Velocity from finite-difference of GPS position
 *     - Orientation angles inferred from IMU gyroscope integration
 *     - Uncertainty from GPS availability and measurement scatter
 *
 *   model_based:
 *     - Same foundation as basic_filter
 *     - Additionally uses IMU acceleration for dead-reckoning when GPS is briefly lost
 *     - Marked as a basic model-based approach (not a full EKF)
 *
 * IMPORTANT:
 *   These are transparent, honest estimators — not full navigation-grade solutions.
 *   Values clearly reflect what the sensors can actually provide.
 *   Fields are set to null when data is insufficient.
 *
 * Do NOT add weapon-related calculations.
 * This module is for sensor fusion and engineering validation only.
 */

import { createEmptyEstimatedState } from './types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeNum(val, fallback = 0) {
  return typeof val === 'number' && isFinite(val) ? val : fallback;
}

/** Light EMA with configurable alpha */
function ema(prev, next, alpha = 0.2) {
  if (prev === null) return next;
  return alpha * next + (1 - alpha) * prev;
}

// ─── BasicEstimator ───────────────────────────────────────────────────────────

export class BasicEstimator {
  /**
   * @param {'basic_filter' | 'model_based'} mode
   */
  constructor(mode = 'basic_filter') {
    this._mode = mode;
    this._reset();
  }

  reset() { this._reset(); }

  _reset() {
    // Previous processed measurements for finite-difference velocity
    this._prevMeas   = null;
    this._prevTs     = null;

    // Smoothed position
    this._sPosX      = null;
    this._sPosY      = null;
    this._sPosZ      = null;

    // Smoothed velocity
    this._sVelX      = null;
    this._sVelY      = null;
    this._sVelZ      = null;

    // Integrated orientation from gyroscope (degrees)
    this._roll       = 0;
    this._pitch      = 0;
    this._yaw        = 0;

    // Position scatter tracking for RMSE-like uncertainty
    this._posHistory  = []; // last N positions for variance
    this._histLen     = 20;

    // Dead-reckoning state (model_based only)
    this._drPosX     = null;
    this._drPosY     = null;
  }

  /**
   * Produce an EstimatedState from one ProcessedMeasurements frame.
   * @param {import('./preprocessor.js').ProcessedMeasurements} meas
   * @returns {import('./types.js').EstimatedState}
   */
  estimate(meas) {
    const ts      = meas.timestamp;
    const dtMs    = this._prevTs !== null ? Math.min(ts - this._prevTs, 2000) : 250; // cap at 2 s
    const dtSec   = dtMs / 1000;

    // ── Position ───────────────────────────────────────────────────────────
    let posX = null, posY = null, posZ = null;
    let posQuality = 'unavailable';

    if (meas.gpsAvailable && meas.posX !== null) {
      // Smooth GPS position
      this._sPosX = ema(this._sPosX, meas.posX, 0.3);
      this._sPosY = ema(this._sPosY, meas.posY, 0.3);
      this._sPosZ = meas.posZ !== null ? ema(this._sPosZ, meas.posZ, 0.3) : this._sPosZ;

      // Dead-reckoning seed (model_based)
      this._drPosX = this._sPosX;
      this._drPosY = this._sPosY;

      posX = this._sPosX;
      posY = this._sPosY;
      posZ = this._sPosZ;
      posQuality = 'good';

      // Track scatter for uncertainty
      this._posHistory.push([meas.posX, meas.posY]);
      if (this._posHistory.length > this._histLen) this._posHistory.shift();

    } else if (this._mode === 'model_based' && this._drPosX !== null && meas.imuAvailable) {
      // Dead-reckoning: integrate filtered acceleration as rough proxy
      // This is clearly labelled as model-based extrapolation, not GPS
      const ax = safeNum(meas.accelX);
      const ay = safeNum(meas.accelY);
      this._drPosX = (this._drPosX ?? 0) + 0.5 * ax * dtSec * dtSec;
      this._drPosY = (this._drPosY ?? 0) + 0.5 * ay * dtSec * dtSec;
      posX = this._drPosX;
      posY = this._drPosY;
      posZ = this._sPosZ;
      posQuality = 'degraded'; // clearly degraded without GPS
    }

    // ── Velocity (finite-difference of smoothed GPS) ───────────────────────
    let velX = null, velY = null, velZ = null;
    let velQuality = 'unavailable';

    if (this._sPosX !== null && this._prevMeas?.posX !== null && dtSec > 0 && dtSec < 5) {
      const rawVX = (this._sPosX - (this._prevMeas.posX ?? this._sPosX)) / dtSec;
      const rawVY = (this._sPosY - (this._prevMeas.posY ?? this._sPosY)) / dtSec;

      this._sVelX = ema(this._sVelX, rawVX, 0.15);
      this._sVelY = ema(this._sVelY, rawVY, 0.15);

      velX = this._sVelX;
      velY = this._sVelY;
      velZ = null; // vertical velocity not reliable from this approach
      velQuality = meas.gpsAvailable ? 'good' : 'degraded';
    }

    // ── Orientation (gyroscope integration) ───────────────────────────────
    let roll = null, pitch = null, yaw = null;
    let oriQuality = 'unavailable';

    if (meas.imuAvailable && dtSec > 0 && dtSec < 5) {
      this._roll  += meas.gyroX * dtSec;
      this._pitch += meas.gyroY * dtSec;
      this._yaw   += meas.gyroZ * dtSec;

      // Wrap to ±180°
      this._roll  = ((this._roll  + 180) % 360) - 180;
      this._pitch = ((this._pitch + 180) % 360) - 180;
      this._yaw   = ((this._yaw   + 180) % 360) - 180;

      roll  = this._roll;
      pitch = this._pitch;
      yaw   = this._yaw;
      // Gyro-only integration drifts — mark as degraded
      oriQuality = 'degraded';
    }

    // ── Uncertainty ────────────────────────────────────────────────────────
    let uncertainty = { level: 'unknown', positionRmse: null };

    if (this._posHistory.length >= 5) {
      const meanX = this._posHistory.reduce((s, [x]) => s + x, 0) / this._posHistory.length;
      const meanY = this._posHistory.reduce((s, [, y]) => s + y, 0) / this._posHistory.length;
      const varX  = this._posHistory.reduce((s, [x]) => s + (x - meanX) ** 2, 0) / this._posHistory.length;
      const varY  = this._posHistory.reduce((s, [, y]) => s + (y - meanY) ** 2, 0) / this._posHistory.length;
      const rmse  = Math.sqrt(varX + varY);

      uncertainty = {
        level:        rmse < 0.5 ? 'low' : rmse < 2.0 ? 'medium' : 'high',
        positionRmse: parseFloat(rmse.toFixed(3)),
      };
    }

    // ── Overall quality ────────────────────────────────────────────────────
    const overallQuality =
        posQuality === 'good'  ? 'good'
      : posQuality === 'degraded' ? 'degraded'
      : meas.imuAvailable     ? 'degraded'
      : 'unavailable';

    // ── Store state for next tick ──────────────────────────────────────────
    this._prevMeas = meas;
    this._prevTs   = ts;

    // ── Build EstimatedState ───────────────────────────────────────────────
    return {
      timestamp:       ts,
      mode:            this._mode,
      estimatorStatus: 'running',

      position: { x: posX, y: posY, z: posZ, quality: posQuality },
      velocity: { x: velX, y: velY, z: velZ, quality: velQuality },
      orientation: { roll, pitch, yaw, quality: oriQuality },
      uncertainty,
      overallQuality,
      lastUpdateLabel: 'just now',
    };
  }
}
