/**
 * KINETICA — Sensor Validator
 * ─────────────────────────────────────────────────────────────────────────────
 * Normalizes and validates raw sensor readings before they reach the UI.
 *
 * Pipeline:
 *   Raw Source Data
 *         ↓
 *     normalize()
 *         ↓
 *     validate()
 *         ↓
 *     SensorData  (clean, safe, UI-ready)
 *         ↓
 *     UI Components
 *
 * Design rules:
 * - Never let NaN, Infinity, or undefined reach the UI.
 * - Invalid values are replaced with null (for nullable fields) or 0 (for numeric).
 * - Quality flags reflect the actual state of the data.
 * - This module has no React dependency and no side effects.
 */

import { createEmptySensorData } from './types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the value if it is a finite number, otherwise returns fallback. */
function safeNum(val, fallback = 0) {
  return typeof val === 'number' && isFinite(val) ? val : fallback;
}

/** Returns the value if it is a finite number, otherwise returns null. */
function safeNullNum(val) {
  return typeof val === 'number' && isFinite(val) ? val : null;
}

/** Returns true only when val is a finite number. */
function isValidNum(val) {
  return typeof val === 'number' && isFinite(val);
}

// ─── GPS validation ───────────────────────────────────────────────────────────
function validateGps(raw) {
  if (!raw) return createEmptySensorData().gps;

  const lat = safeNullNum(raw.latitude  ?? raw.lat);
  const lng = safeNullNum(raw.longitude ?? raw.lng ?? raw.lon);
  const alt = safeNullNum(raw.altitude  ?? raw.alt);

  const available = lat !== null && lng !== null;

  return { available, latitude: lat, longitude: lng, altitude: alt };
}

// ─── IMU validation ───────────────────────────────────────────────────────────
function validateImu(raw) {
  if (!raw) return createEmptySensorData().imu;

  // Support both flat (accelX) and nested (acceleration.x) shapes
  const ax = raw.acceleration?.x ?? raw.accelX ?? 0;
  const ay = raw.acceleration?.y ?? raw.accelY ?? 0;
  const az = raw.acceleration?.z ?? raw.accelZ ?? 0;
  const gx = raw.gyroscope?.x   ?? raw.gyroX  ?? 0;
  const gy = raw.gyroscope?.y   ?? raw.gyroY  ?? 0;
  const gz = raw.gyroscope?.z   ?? raw.gyroZ  ?? 0;

  return {
    acceleration: {
      x: safeNum(ax),
      y: safeNum(ay),
      z: safeNum(az),
    },
    gyroscope: {
      x: safeNum(gx),
      y: safeNum(gy),
      z: safeNum(gz),
    },
  };
}

// ─── Environmental validation ─────────────────────────────────────────────────
function validateEnvironmental(rawPressure, rawTemperature) {
  // Support both old flat shape (pressure.pressure, temperature.temperature)
  // and new shape (environmental.pressure, etc.)
  const env = rawPressure ?? {};
  const tmp = rawTemperature ?? {};

  const pressure         = safeNullNum(env.pressure          ?? env.environmental?.pressure);
  const bmp280Temp       = safeNullNum(env.temperature       ?? env.environmental?.bmp280Temperature ?? env.bmp280Temperature);
  const lm35Temp         = safeNullNum(tmp.temperature       ?? tmp.environmental?.lm35Temperature   ?? tmp.lm35Temperature);

  return { pressure, bmp280Temperature: bmp280Temp, lm35Temperature: lm35Temp };
}

// ─── Quality assessment ───────────────────────────────────────────────────────
function assessQuality(gps, imu, env, streamStatus) {
  const gpsQuality = gps.available
    ? (isValidNum(gps.latitude) && isValidNum(gps.longitude) ? 'good' : 'degraded')
    : 'unavailable';

  const imuQuality =
    isValidNum(imu.acceleration.x) && isValidNum(imu.gyroscope.x) ? 'good' : 'unavailable';

  const envQuality =
    env.pressure !== null || env.bmp280Temperature !== null || env.lm35Temperature !== null
      ? 'good'
      : 'unavailable';

  /** @type {import('./types.js').StreamQualityValue} */
  const stream = streamStatus === 'running'  ? 'good'
               : streamStatus === 'paused'   ? 'paused'
               : 'disconnected';

  return { gps: gpsQuality, imu: imuQuality, environmental: envQuality, stream };
}

// ─── Main normalizer ──────────────────────────────────────────────────────────

/**
 * Normalizes and validates raw data from any sensor source into a clean SensorData object.
 * Handles both the old flat shape (accelX, fixStatus, etc.) and the new nested shape.
 *
 * @param {object} raw          - Raw object from SimulationSensorSource or ESP32SensorSource
 * @param {string} [streamStatus='ready'] - Current stream state for quality assessment
 * @returns {import('./types.js').SensorData}
 */
export function normalizeSensorData(raw, streamStatus = 'ready') {
  if (!raw || typeof raw !== 'object') {
    console.warn('[KINETICA/validator] Received invalid raw sensor data, using empty fallback.');
    return createEmptySensorData();
  }

  const source = raw.source === 'esp32' ? 'esp32' : 'simulation';
  const timestamp = isValidNum(raw.timestamp) ? raw.timestamp : Date.now();

  // GPS — support both raw.gps and root-level fields
  const gps = validateGps(raw.gps ?? raw);

  // IMU — support both raw.imu and root-level fields
  const imu = validateImu(raw.imu ?? raw);

  // Environmental — support old shape (raw.pressure + raw.temperature) and new shape
  const environmental = validateEnvironmental(
    raw.environmental ?? raw.pressure,
    raw.environmental ? null : raw.temperature
  );

  // Switches — safe defaults
  const sw = raw.switches ?? {};
  const switches = {
    sw1: sw.sw1 === true,
    sw2: sw.sw2 === true,
    sw3: sw.sw3 === true,
    sw4: sw.sw4 === true,
  };

  // IR
  const ir = { active: raw.ir?.active === true || raw.ir?.status === 'event' };

  // Quality
  const quality = assessQuality(gps, imu, environmental, streamStatus);

  return { timestamp, source, gps, imu, environmental, switches, ir, quality };
}
