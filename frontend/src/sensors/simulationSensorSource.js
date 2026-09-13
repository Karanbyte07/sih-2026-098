/**
 * KINETICA — Simulation Sensor Source
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates synthetic SensorData that mimics the ESP32 prototype hardware.
 * All values are clearly labelled source: 'simulation'.
 *
 * Implements the SensorSource interface:
 *   start()    → begins periodic data generation
 *   stop()     → pauses generation, retains last values
 *   reset()    → clears state, returns to initial values
 *   subscribe(listener: (SensorData) => void) → register a listener
 *   unsubscribe(listener)
 *   getLatestData() → SensorData
 *   getStatus()     → SensorSourceState
 *
 * Sensor hardware simulated:
 *   - M8N GPS   → latitude, longitude, altitude
 *   - MPU6050   → acceleration (x/y/z), gyroscope (x/y/z)
 *   - BMP280    → pressure (hPa), temperature (°C)
 *   - LM35      → temperature (°C)
 *   - 4 switches (always open in simulation)
 *   - IR receiver (always ready in simulation)
 *
 * Do NOT add weapon-related, targeting, or actuator values.
 * This source produces telemetry only.
 */

import { normalizeSensorData } from './sensorValidator.js';

// ─── Physics / noise helpers ──────────────────────────────────────────────────

/** Gaussian-ish noise: amplitude in ± range */
const noise = (amp) => (Math.random() - 0.5) * 2 * amp;

/** Slow sinusoidal drift */
const drift = (t, freq, amp) => Math.sin(t * freq) * amp;

// ─── Stationary prototype baseline values ─────────────────────────────────────
// Realistic for an ESP32 prototype sitting on a desk in New Delhi.
const BASE = Object.freeze({
  lat:      28.6139,    // °  (New Delhi)
  lng:      77.2090,    // °
  alt:      216.0,      // m  ASL
  ax:       0.02,       // m/s²  slight tilt on X
  ay:      -0.01,       // m/s²
  az:       9.80,       // m/s²  gravity
  gx:       0.0,        // °/s
  gy:       0.0,
  gz:       0.0,
  press:    1013.25,    // hPa
  bmpT:     28.5,       // °C
  lm35T:    32.1,       // °C  (warmer near ESP32 chip)
});

const TICK_INTERVAL_MS = 250; // 4 Hz update rate

// ─── SimulationSensorSource ───────────────────────────────────────────────────

export class SimulationSensorSource {
  constructor() {
    /** @type {import('./types.js').SensorData|null} */
    this._latestData  = null;

    /** @type {import('./types.js').StreamStatus} */
    this._status      = 'ready';

    this._packetsReceived = 0;
    this._elapsedSec      = 0;
    this._lastTickMs      = 0;
    this._intervalId      = null;

    /** @type {Set<Function>} */
    this._listeners   = new Set();

    // Initialise with a clean ready-state snapshot
    this._latestData = this._buildReadyState();
  }

  // ── Public interface ────────────────────────────────────────────────────────

  start() {
    if (this._status === 'running') return;
    this._status     = 'running';
    this._lastTickMs = Date.now();
    this._intervalId = setInterval(() => this._tick(), TICK_INTERVAL_MS);
    console.debug('[SimulationSensorSource] Stream started.');
  }

  stop() {
    if (this._status !== 'running') return;
    this._status = 'paused';
    clearInterval(this._intervalId);
    this._intervalId = null;
    console.debug('[SimulationSensorSource] Stream paused.');
  }

  reset() {
    clearInterval(this._intervalId);
    this._intervalId      = null;
    this._status          = 'ready';
    this._packetsReceived = 0;
    this._elapsedSec      = 0;
    this._lastTickMs      = 0;
    this._latestData      = this._buildReadyState();
    this._notify();
    console.debug('[SimulationSensorSource] Reset to initial state.');
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
      lastUpdateMs:    this._lastTickMs ? Date.now() - this._lastTickMs : 0,
      source:          'simulation',
    };
  }

  /**
   * Register a callback that fires whenever new SensorData is available.
   * @param {function(import('./types.js').SensorData): void} listener
   */
  subscribe(listener) {
    this._listeners.add(listener);
  }

  /** @param {function} listener */
  unsubscribe(listener) {
    this._listeners.delete(listener);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  _tick() {
    const now      = Date.now();
    const dtSec    = Math.min((now - this._lastTickMs) / 1000, 1.0); // cap at 1s
    this._elapsedSec  += dtSec;
    this._lastTickMs   = now;
    this._packetsReceived += 1;

    const t = this._elapsedSec;

    // Build raw data in the NEW nested SensorData shape
    const raw = {
      timestamp: now,
      source: 'simulation',

      gps: {
        available:  true,
        latitude:   BASE.lat + drift(t, 0.03, 0.00004) + noise(0.000008),
        longitude:  BASE.lng + drift(t, 0.02, 0.00003) + noise(0.000006),
        altitude:   BASE.alt + drift(t, 0.10, 0.8)     + noise(0.15),
      },

      imu: {
        acceleration: {
          x: BASE.ax + drift(t, 0.8, 0.12) + noise(0.04),
          y: BASE.ay + drift(t, 1.1, 0.09) + noise(0.03),
          z: BASE.az + drift(t, 0.3, 0.08) + noise(0.025),
        },
        gyroscope: {
          x: BASE.gx + drift(t, 1.4, 0.6)  + noise(0.15),
          y: BASE.gy + drift(t, 0.9, 0.5)  + noise(0.12),
          z: BASE.gz + drift(t, 0.5, 0.3)  + noise(0.08),
        },
      },

      environmental: {
        pressure:          BASE.press + drift(t, 0.05, 0.4) + noise(0.05),
        bmp280Temperature: BASE.bmpT  + drift(t, 0.04, 0.3) + noise(0.05),
        lm35Temperature:   BASE.lm35T + drift(t, 0.03, 0.2) + noise(0.04),
      },

      switches: { sw1: false, sw2: false, sw3: false, sw4: false },
      ir:       { active: false },
    };

    // Validate and normalise before sending to subscribers
    this._latestData = normalizeSensorData(raw, 'running');
    this._notify();
  }

  _buildReadyState() {
    return normalizeSensorData({
      timestamp: Date.now(),
      source: 'simulation',
      gps: {
        available:  true,
        latitude:   BASE.lat,
        longitude:  BASE.lng,
        altitude:   BASE.alt,
      },
      imu: {
        acceleration: { x: BASE.ax, y: BASE.ay, z: BASE.az },
        gyroscope:    { x: BASE.gx, y: BASE.gy, z: BASE.gz },
      },
      environmental: {
        pressure:          BASE.press,
        bmp280Temperature: BASE.bmpT,
        lm35Temperature:   BASE.lm35T,
      },
      switches: { sw1: false, sw2: false, sw3: false, sw4: false },
      ir:       { active: false },
    }, 'ready');
  }

  _notify() {
    const data = this._latestData;
    this._listeners.forEach(fn => {
      try { fn(data); }
      catch (err) { console.error('[SimulationSensorSource] Listener error:', err); }
    });
  }
}
