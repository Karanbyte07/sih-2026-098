/**
 * KINETICA — ESP32 Sensor Source
 * ─────────────────────────────────────────────────────────────────────────────
 * Connects to the Python FastAPI backend WebSocket at ws://localhost:8000/ws.
 *
 * The backend broadcasts a processed packet every time a sensor frame arrives
 * (either from real ESP32 hardware over serial, or from the demo state machine
 * when hardware is absent).
 *
 * Backend packet shape:
 * {
 *   connected:       boolean,         // whether ESP32 serial is live
 *   source:          string,          // "USB_SERIAL" | "MANUAL" | "DEMO"
 *   timestamp:       number,          // unix seconds from the ESP32
 *   sensors: {
 *     imu:    { ax, ay, az, gx, gy, gz },
 *     bmp280: { pressure, temperature },
 *     lm35:   { temperature },
 *     gps:    { fix, latitude, longitude, satellites }
 *   },
 *   health:          { imu, bmp280, lm35, gps },   // per-sensor boolean
 *   ai:              { status, ... },
 *   estimated_state: { quality, orientation, environment, position },
 *   guidance:        { mode, recommendation, physical_action, reason },
 *   analytics:       { sensor_health_score, anomaly, model_deviation, deviation_magnitude },
 *   deviation:       { magnitude, status, values }
 * }
 *
 * This source implements the same interface as SimulationSensorSource so the
 * DataSourceManager can swap between them transparently.
 */

import { createEmptySensorData } from './types.js';
import { normalizeSensorData }   from './sensorValidator.js';

const WS_URL               = 'ws://localhost:8000/ws';
const RECONNECT_BASE_MS    = 1_000;
const RECONNECT_MAX_MS     = 16_000;
const RECONNECT_MULTIPLIER = 2;

export class ESP32SensorSource {
  constructor() {
    /** @type {import('./types.js').SensorData} */
    this._latestData = createEmptySensorData('esp32');

    /** @type {'ready' | 'running' | 'disconnected'} */
    this._status = 'disconnected';

    /** @type {Set<Function>} */
    this._listeners = new Set();

    /** @type {WebSocket | null} */
    this._ws = null;

    /** @type {ReturnType<typeof setTimeout> | null} */
    this._reconnectTimer = null;

    this._reconnectDelay = RECONNECT_BASE_MS;
    this._packetsReceived = 0;
    this._intentionallyStopped = false;

    /**
     * The full backend payload (estimated_state, analytics, guidance, etc.)
     * is stored here so useBackendData() can read it without polluting SensorData.
     * @type {object | null}
     */
    this._lastBackendPayload = null;
  }

  // ── Public interface ────────────────────────────────────────────────────────

  start() {
    if (this._ws && (this._ws.readyState === WebSocket.OPEN || this._ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this._intentionallyStopped = false;
    this._connect();
  }

  stop() {
    this._intentionallyStopped = true;
    this._clearReconnect();
    if (this._ws) {
      this._ws.onclose = null; // prevent reconnect loop on deliberate close
      this._ws.close();
      this._ws = null;
    }
    this._status = 'disconnected';
    this._notify();
  }

  reset() {
    this.stop();
    this._packetsReceived = 0;
    this._lastBackendPayload = null;
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
      packetsReceived: this._packetsReceived,
      lastUpdateMs:    0,
      source:          'esp32',
    };
  }

  /**
   * Returns the full backend payload (estimated_state, analytics, guidance, etc.)
   * Updated on every WebSocket message. Returns null before first message.
   * @returns {object | null}
   */
  getBackendPayload() {
    return this._lastBackendPayload;
  }

  /** @param {function(import('./types.js').SensorData): void} listener */
  subscribe(listener) {
    this._listeners.add(listener);
  }

  /** @param {function} listener */
  unsubscribe(listener) {
    this._listeners.delete(listener);
  }

  // ── Private — WebSocket lifecycle ───────────────────────────────────────────

  _connect() {
    try {
      this._ws = new WebSocket(WS_URL);
    } catch (err) {
      console.error('[ESP32SensorSource] Failed to create WebSocket:', err);
      this._scheduleReconnect();
      return;
    }

    this._ws.onopen = () => {
      console.info('[ESP32SensorSource] Connected to backend at', WS_URL);
      this._status = 'running';
      this._reconnectDelay = RECONNECT_BASE_MS; // reset back-off
      this._notify();
    };

    this._ws.onmessage = (event) => {
      this._handlePacket(event.data);
    };

    this._ws.onerror = (err) => {
      console.warn('[ESP32SensorSource] WebSocket error:', err);
    };

    this._ws.onclose = () => {
      console.warn('[ESP32SensorSource] Connection closed.');
      this._status = 'disconnected';
      this._ws = null;
      this._notify();
      if (!this._intentionallyStopped) {
        this._scheduleReconnect();
      }
    };
  }

  _scheduleReconnect() {
    this._clearReconnect();
    console.info(`[ESP32SensorSource] Reconnecting in ${this._reconnectDelay}ms…`);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (!this._intentionallyStopped) this._connect();
    }, this._reconnectDelay);
    // Exponential back-off capped at max
    this._reconnectDelay = Math.min(this._reconnectDelay * RECONNECT_MULTIPLIER, RECONNECT_MAX_MS);
  }

  _clearReconnect() {
    if (this._reconnectTimer !== null) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  // ── Private — Packet processing ─────────────────────────────────────────────

  /**
   * Parse the backend broadcast and update _latestData and _lastBackendPayload.
   * @param {string} rawJson
   */
  _handlePacket(rawJson) {
    let payload;
    try {
      payload = JSON.parse(rawJson);
    } catch (err) {
      console.error('[ESP32SensorSource] Failed to parse packet:', err);
      return;
    }

    // Store the full backend payload for useBackendData()
    this._lastBackendPayload = payload;
    this._packetsReceived++;

    // ── Map backend sensors → frontend SensorData shape ────────────────────
    const s    = payload.sensors ?? {};
    const imu  = s.imu   ?? {};
    const bmp  = s.bmp280 ?? {};
    const lm   = s.lm35   ?? {};
    const gps  = s.gps    ?? {};

    const mapped = {
      timestamp: typeof payload.timestamp === 'number'
        ? payload.timestamp * 1000   // backend sends unix seconds; frontend wants ms
        : Date.now(),
      source: 'esp32',

      gps: {
        available:  gps.fix === true,
        latitude:   gps.latitude   ?? null,
        longitude:  gps.longitude  ?? null,
        altitude:   gps.altitude   ?? null,   // not in current backend schema; safe fallback
      },

      imu: {
        acceleration: { x: imu.ax ?? 0, y: imu.ay ?? 0, z: imu.az ?? 0 },
        gyroscope:    { x: imu.gx ?? 0, y: imu.gy ?? 0, z: imu.gz ?? 0 },
      },

      environmental: {
        pressure:          bmp.pressure    ?? null,
        bmp280Temperature: bmp.temperature ?? null,
        lm35Temperature:   lm.temperature  ?? null,
      },

      // ESP32 switches & IR are not in the backend schema yet — safe defaults
      switches: { sw1: false, sw2: false, sw3: false, sw4: false },
      ir:       { active: false },
    };

    this._latestData = normalizeSensorData(mapped, 'running');
    this._notify();
  }

  _notify() {
    const data = this._latestData;
    this._listeners.forEach(fn => {
      try { fn(data); }
      catch (err) { console.error('[ESP32SensorSource] Listener error:', err); }
    });
  }
}
