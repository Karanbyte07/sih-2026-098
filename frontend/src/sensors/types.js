/**
 * KINETICA — Sensor Data Types
 * ─────────────────────────────────────────────────────────────────────────────
 * Central type definitions for the common SensorData structure.
 * All sensor sources (simulation, ESP32 hardware) produce this same shape.
 * All UI components consume this same shape.
 *
 * Physical prototype hardware:
 *   - ESP32 (main controller)
 *   - M8N GPS module
 *   - MPU6050 IMU (accelerometer + gyroscope)
 *   - BMP280 (pressure + temperature)
 *   - LM35 (temperature)
 *   - OLED display (0.96")
 *   - 4 push-button inputs
 *   - IR receiver
 *   - 2000 mAh battery
 *
 * This file is intentionally framework-agnostic.
 * No React imports. No side-effects.
 *
 * TypeScript-equivalent definitions (as JSDoc for JavaScript projects):
 *
 * @typedef {'simulation' | 'esp32'} DataSourceName
 *
 * @typedef {Object} GpsData
 * @property {boolean}  available
 * @property {number|null} latitude    Decimal degrees
 * @property {number|null} longitude   Decimal degrees
 * @property {number|null} altitude    Meters above sea level
 *
 * @typedef {Object} Vector3
 * @property {number} x
 * @property {number} y
 * @property {number} z
 *
 * @typedef {Object} ImuData    MPU6050
 * @property {Vector3} acceleration  m/s²
 * @property {Vector3} gyroscope     °/s
 *
 * @typedef {Object} EnvironmentalData
 * @property {number|null} pressure           BMP280, hPa
 * @property {number|null} bmp280Temperature  BMP280, °C
 * @property {number|null} lm35Temperature    LM35, °C
 *
 * @typedef {Object} SwitchInputs
 * @property {boolean} sw1
 * @property {boolean} sw2
 * @property {boolean} sw3
 * @property {boolean} sw4
 *
 * @typedef {Object} IrData
 * @property {boolean} active
 *
 * @typedef {'good' | 'degraded' | 'unavailable'} SensorQualityValue
 * @typedef {'good' | 'paused' | 'disconnected'}  StreamQualityValue
 *
 * @typedef {Object} DataQuality
 * @property {SensorQualityValue} gps
 * @property {SensorQualityValue} imu
 * @property {SensorQualityValue} environmental
 * @property {StreamQualityValue} stream
 *
 * @typedef {Object} SensorData
 * @property {number}          timestamp    Unix ms
 * @property {DataSourceName}  source       Origin of this reading
 * @property {GpsData}         gps
 * @property {ImuData}         imu
 * @property {EnvironmentalData} environmental
 * @property {SwitchInputs}    switches
 * @property {IrData}          ir
 * @property {DataQuality}     quality
 *
 * @typedef {'ready' | 'running' | 'paused' | 'disconnected'} StreamStatus
 *
 * @typedef {Object} SensorSourceState
 * @property {StreamStatus}  status
 * @property {number}        packetsReceived
 * @property {number}        lastUpdateMs     ms since last packet (0 when live)
 * @property {DataSourceName} source
 */

// ─── Chart channel registry ────────────────────────────────────────────────
// Maps dot-notation path in SensorData → human-readable label for chart dropdown.
// Update this list if SensorData shape changes.

/**
 * @type {Array<{key: string, label: string, unit: string}>}
 */
export const STREAM_CHANNELS = [
  { key: 'imu.acceleration.x',        label: 'Acceleration X',      unit: 'm/s²' },
  { key: 'imu.acceleration.y',        label: 'Acceleration Y',      unit: 'm/s²' },
  { key: 'imu.acceleration.z',        label: 'Acceleration Z',      unit: 'm/s²' },
  { key: 'imu.gyroscope.x',           label: 'Gyroscope X',         unit: '°/s'  },
  { key: 'imu.gyroscope.y',           label: 'Gyroscope Y',         unit: '°/s'  },
  { key: 'imu.gyroscope.z',           label: 'Gyroscope Z',         unit: '°/s'  },
  { key: 'environmental.bmp280Temperature', label: 'BMP280 Temperature', unit: '°C'  },
  { key: 'environmental.pressure',    label: 'BMP280 Pressure',     unit: 'hPa'  },
  { key: 'environmental.lm35Temperature',   label: 'LM35 Temperature',  unit: '°C'  },
];

/**
 * Safely read a nested value from SensorData using a dot-notation path.
 * Returns 0 (not NaN, not undefined) when the path is not found.
 *
 * @param {SensorData} data
 * @param {string} key  e.g. 'imu.acceleration.x'
 * @returns {number}
 */
export function getChannelValue(data, key) {
  const val = key
    .split('.')
    .reduce((obj, k) => (obj != null && obj[k] !== undefined ? obj[k] : undefined), data);

  if (typeof val !== 'number' || !isFinite(val)) return 0;
  return val;
}

/**
 * Returns a SensorData object with all values set to safe "unavailable" defaults.
 * Used as the initial state and as a fallback when the source is disconnected.
 *
 * @param {DataSourceName} [source='simulation']
 * @returns {SensorData}
 */
export function createEmptySensorData(source = 'simulation') {
  return {
    timestamp: Date.now(),
    source,

    gps: {
      available:  false,
      latitude:   null,
      longitude:  null,
      altitude:   null,
    },

    imu: {
      acceleration: { x: 0, y: 0, z: 0 },
      gyroscope:    { x: 0, y: 0, z: 0 },
    },

    environmental: {
      pressure:          null,
      bmp280Temperature: null,
      lm35Temperature:   null,
    },

    switches: { sw1: false, sw2: false, sw3: false, sw4: false },

    ir: { active: false },

    quality: {
      gps:           'unavailable',
      imu:           'unavailable',
      environmental: 'unavailable',
      stream:        'disconnected',
    },
  };
}
