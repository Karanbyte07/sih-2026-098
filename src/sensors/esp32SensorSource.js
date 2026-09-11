/**
 * KINETICA — ESP32 Sensor Source
 * ─────────────────────────────────────────────────────────────────────────────
 * Placeholder for future physical ESP32 hardware integration.
 *
 * Current state: DISCONNECTED — returns unavailable/empty SensorData.
 *
 * Implements the same SensorSource interface as SimulationSensorSource:
 *   start()    → (future) open WebSocket / Serial connection, begin receiving
 *   stop()     → (future) pause data collection
 *   reset()    → (future) reset connection state
 *   subscribe(listener)
 *   unsubscribe(listener)
 *   getLatestData() → SensorData  (empty/disconnected until hardware connected)
 *   getStatus()     → SensorSourceState
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FUTURE INTEGRATION GUIDE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Physical hardware:
 *   ESP32 (main controller)
 *   → M8N GPS module
 *   → MPU6050 IMU (accelerometer + gyroscope)
 *   → BMP280 (pressure + temperature)
 *   → LM35 (temperature)
 *   → OLED display  (local status: "SYSTEM READY", "GPS STATUS", etc.)
 *   → 4 push-buttons (sw1=Start, sw2=Stop, sw3=Page, sw4=Test)
 *   → IR receiver (external event trigger)
 *
 * Planned data flow:
 *   ESP32
 *   → Sensor acquisition firmware
 *   → JSON over WebSocket (Wi-Fi) or Serial (USB)
 *   → ESP32SensorSource.start() opens connection
 *   → Raw JSON packet → normalizeSensorData() → SensorData
 *   → subscribers notified
 *   → UI updated
 *
 * Expected raw packet format from ESP32 firmware:
 * {
 *   "ts": 1234567890,          // Unix ms from ESP32 NTP or millis()
 *   "gps": { "lat": 28.61, "lng": 77.20, "alt": 216.0, "fix": true },
 *   "imu": {
 *     "ax": 0.02, "ay": -0.01, "az": 9.80,
 *     "gx": 0.0,  "gy": 0.0,   "gz": 0.0
 *   },
 *   "bmp": { "press": 1013.2, "temp": 28.5 },
 *   "lm35": { "temp": 32.1 },
 *   "sw": [false, false, false, false],
 *   "ir": false
 * }
 *
 * IMPORTANT: Do NOT add operational control commands to this source.
 * The ESP32 is a telemetry-only device.
 *
 * Approved OLED states: "SYSTEM READY" | "SENSOR STATUS" | "GPS STATUS" | "DATA STREAM"
 */

import { createEmptySensorData } from './types.js';
import { normalizeSensorData }   from './sensorValidator.js';

export class ESP32SensorSource {
  constructor() {
    /** @type {import('./types.js').SensorData} */
    this._latestData = createEmptySensorData('esp32');
    this._status     = 'disconnected';
    this._listeners  = new Set();

    // ── Future connection placeholders ────────────────────────────────────
    this._websocket  = null;   // WebSocket instance (future)
    this._wsUrl      = null;   // e.g. 'ws://192.168.x.x:81'
  }

  // ── Public interface (mirrors SimulationSensorSource) ──────────────────────

  /**
   * (Future) Attempt to connect to the ESP32 WebSocket / Serial endpoint.
   * Currently a no-op — returns immediately in disconnected state.
   */
  start() {
    if (this._status === 'running') return;

    // ── FUTURE: open WebSocket ──────────────────────────────────────────────
    // this._wsUrl     = 'ws://esp32.local:81';
    // this._websocket = new WebSocket(this._wsUrl);
    //
    // this._websocket.onopen    = () => { this._status = 'running'; ... };
    // this._websocket.onmessage = (event) => this._handlePacket(event.data);
    // this._websocket.onclose   = () => this._handleDisconnect();
    // this._websocket.onerror   = (err) => console.error('[ESP32] WS error', err);

    console.info('[ESP32SensorSource] Hardware not connected. Staying in disconnected state.');
    // Status stays 'disconnected' until real hardware integration.
  }

  stop() {
    // ── FUTURE: close WebSocket gracefully ─────────────────────────────────
    // if (this._websocket) { this._websocket.close(); this._websocket = null; }
    this._status = 'disconnected';
    console.debug('[ESP32SensorSource] Stopped (no-op — not connected).');
  }

  reset() {
    this.stop();
    this._latestData = createEmptySensorData('esp32');
    this._notify();
  }

  /** @returns {import('./types.js').SensorData} */
  getLatestData() {
    return this._latestData;
  }

  /** @returns {import('./types.js').SensorSourceState} */
  getStatus() {
    return {
      status:          this._status,
      packetsReceived: 0,   // will be tracked in future
      lastUpdateMs:    0,
      source:          'esp32',
    };
  }

  /** @param {function(import('./types.js').SensorData): void} listener */
  subscribe(listener) {
    this._listeners.add(listener);
  }

  /** @param {function} listener */
  unsubscribe(listener) {
    this._listeners.delete(listener);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * (Future) Handle a raw JSON string received from the ESP32.
   * @param {string} rawJson
   */
  _handlePacket(rawJson) {
    try {
      const raw = JSON.parse(rawJson);

      // Map expected ESP32 packet keys to the SensorData shape
      const mapped = {
        timestamp: raw.ts ?? Date.now(),
        source:    'esp32',
        gps: {
          available:  raw.gps?.fix === true,
          latitude:   raw.gps?.lat  ?? null,
          longitude:  raw.gps?.lng  ?? null,
          altitude:   raw.gps?.alt  ?? null,
        },
        imu: {
          acceleration: { x: raw.imu?.ax ?? 0, y: raw.imu?.ay ?? 0, z: raw.imu?.az ?? 0 },
          gyroscope:    { x: raw.imu?.gx ?? 0, y: raw.imu?.gy ?? 0, z: raw.imu?.gz ?? 0 },
        },
        environmental: {
          pressure:          raw.bmp?.press ?? null,
          bmp280Temperature: raw.bmp?.temp  ?? null,
          lm35Temperature:   raw.lm35?.temp ?? null,
        },
        switches: {
          sw1: raw.sw?.[0] === true,
          sw2: raw.sw?.[1] === true,
          sw3: raw.sw?.[2] === true,
          sw4: raw.sw?.[3] === true,
        },
        ir: { active: raw.ir === true },
      };

      this._latestData = normalizeSensorData(mapped, 'running');
      this._notify();
    } catch (err) {
      console.error('[ESP32SensorSource] Failed to parse packet:', err);
    }
  }

  _handleDisconnect() {
    this._status     = 'disconnected';
    this._latestData = createEmptySensorData('esp32');
    this._notify();
    console.warn('[ESP32SensorSource] Connection lost.');
  }

  _notify() {
    const data = this._latestData;
    this._listeners.forEach(fn => {
      try { fn(data); }
      catch (err) { console.error('[ESP32SensorSource] Listener error:', err); }
    });
  }
}
