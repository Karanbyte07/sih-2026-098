/**
 * KINETICA — Sensor Preprocessor
 * ─────────────────────────────────────────────────────────────────────────────
 * Cleans and normalises raw SensorData before it enters the estimator.
 *
 * Responsibilities:
 *  - Validate that individual sensor readings are finite numbers
 *  - Apply a simple exponential moving average (EMA) to reduce noise
 *  - Convert GPS lat/lng to a local X/Y metric frame (relative to first fix)
 *  - Propagate sensor availability flags
 *  - Never throw — always return a safe ProcessedMeasurements object
 *
 * This module has no React dependency and no side effects.
 * It operates purely on data passed to its process() method.
 *
 * @typedef {Object} ProcessedMeasurements
 * @property {number}        timestamp
 * @property {boolean}       gpsAvailable
 * @property {number|null}   posX         Metres, local frame from initial fix
 * @property {number|null}   posY         Metres
 * @property {number|null}   posZ         Metres (altitude from GPS)
 * @property {number}        accelX       m/s² (smoothed)
 * @property {number}        accelY       m/s²
 * @property {number}        accelZ       m/s²
 * @property {number}        gyroX        °/s (smoothed)
 * @property {number}        gyroY        °/s
 * @property {number}        gyroZ        °/s
 * @property {boolean}       imuAvailable
 * @property {boolean}       envAvailable
 * @property {number|null}   pressure     hPa
 * @property {number|null}   bmpTemp      °C
 * @property {number|null}   lm35Temp     °C
 */

const DEG_TO_RAD  = Math.PI / 180;
const EARTH_RADIUS = 6_371_000; // metres

/** Exponential moving average alpha — higher = more responsive, less smooth */
const EMA_ALPHA = 0.25;

function ema(prev, next, alpha = EMA_ALPHA) {
  if (prev === null) return next;
  return alpha * next + (1 - alpha) * prev;
}

function safeNum(val, fallback = 0) {
  return typeof val === 'number' && isFinite(val) ? val : fallback;
}

export class Preprocessor {
  constructor() {
    // Reference GPS fix for local-frame conversion
    this._refLat  = null;
    this._refLng  = null;

    // Smoothed IMU values (initialise on first packet)
    this._sAccelX = null;
    this._sAccelY = null;
    this._sAccelZ = null;
    this._sGyroX  = null;
    this._sGyroY  = null;
    this._sGyroZ  = null;
  }

  reset() {
    this._refLat  = null;
    this._refLng  = null;
    this._sAccelX = null;
    this._sAccelY = null;
    this._sAccelZ = null;
    this._sGyroX  = null;
    this._sGyroY  = null;
    this._sGyroZ  = null;
  }

  /**
   * Process one SensorData frame into clean ProcessedMeasurements.
   * @param {import('../sensors/types.js').SensorData} sensorData
   * @returns {ProcessedMeasurements}
   */
  process(sensorData) {
    const ts = safeNum(sensorData?.timestamp, Date.now());

    // ── GPS ────────────────────────────────────────────────────────────────
    const gps          = sensorData?.gps;
    const gpsAvailable = gps?.available === true
                      && typeof gps.latitude  === 'number' && isFinite(gps.latitude)
                      && typeof gps.longitude === 'number' && isFinite(gps.longitude);

    let posX = null, posY = null, posZ = null;

    if (gpsAvailable) {
      // Latch the reference fix on first valid GPS reading
      if (this._refLat === null) {
        this._refLat = gps.latitude;
        this._refLng = gps.longitude;
      }
      // Convert to local Cartesian metres (flat-earth approximation — valid for small ranges)
      const dLat = (gps.latitude  - this._refLat) * DEG_TO_RAD;
      const dLng = (gps.longitude - this._refLng) * DEG_TO_RAD;
      posX = dLng * EARTH_RADIUS * Math.cos(this._refLat * DEG_TO_RAD);
      posY = dLat * EARTH_RADIUS;
      posZ = typeof gps.altitude === 'number' && isFinite(gps.altitude) ? gps.altitude : null;
    }

    // ── IMU ────────────────────────────────────────────────────────────────
    const imu          = sensorData?.imu;
    const acc          = imu?.acceleration ?? {};
    const gyr          = imu?.gyroscope    ?? {};
    const imuAvailable = typeof acc.x === 'number' && isFinite(acc.x);

    if (imuAvailable) {
      this._sAccelX = ema(this._sAccelX, safeNum(acc.x));
      this._sAccelY = ema(this._sAccelY, safeNum(acc.y));
      this._sAccelZ = ema(this._sAccelZ, safeNum(acc.z));
      this._sGyroX  = ema(this._sGyroX,  safeNum(gyr.x));
      this._sGyroY  = ema(this._sGyroY,  safeNum(gyr.y));
      this._sGyroZ  = ema(this._sGyroZ,  safeNum(gyr.z));
    }

    // ── Environmental ──────────────────────────────────────────────────────
    const env        = sensorData?.environmental ?? {};
    const envAvailable = env.pressure !== null && env.pressure !== undefined;

    return {
      timestamp:    ts,
      gpsAvailable,
      posX, posY, posZ,
      accelX: this._sAccelX ?? 0,
      accelY: this._sAccelY ?? 0,
      accelZ: this._sAccelZ ?? 0,
      gyroX:  this._sGyroX  ?? 0,
      gyroY:  this._sGyroY  ?? 0,
      gyroZ:  this._sGyroZ  ?? 0,
      imuAvailable,
      envAvailable,
      pressure: typeof env.pressure          === 'number' && isFinite(env.pressure)          ? env.pressure          : null,
      bmpTemp:  typeof env.bmp280Temperature === 'number' && isFinite(env.bmp280Temperature) ? env.bmp280Temperature : null,
      lm35Temp: typeof env.lm35Temperature   === 'number' && isFinite(env.lm35Temperature)   ? env.lm35Temperature   : null,
    };
  }
}
