/**
 * KINETICA — Data Source Manager
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages which sensor source is currently active and provides a
 * single subscription point for the rest of the application.
 *
 * The UI should import DataSourceManager (this module) — NOT the individual
 * source classes. This keeps the frontend decoupled from the specific source.
 *
 * Architecture:
 *
 *   SimulationSensorSource  ──┐
 *                              ├──►  DataSourceManager  ──►  useSensorData hook  ──►  UI
 *   ESP32SensorSource       ──┘
 *
 * Usage:
 *   import { dataSourceManager } from './dataSourceManager.js';
 *
 *   dataSourceManager.setSource('simulation');
 *   dataSourceManager.start();
 *   dataSourceManager.subscribe(data => console.log(data));
 *   dataSourceManager.stop();
 *   dataSourceManager.setSource('esp32');
 *   dataSourceManager.start(); // will show disconnected state
 */

import { SimulationSensorSource } from './simulationSensorSource.js';
import { ESP32SensorSource }      from './esp32SensorSource.js';
import { createEmptySensorData }  from './types.js';

class DataSourceManager {
  constructor() {
    this._sources = {
      simulation: new SimulationSensorSource(),
      esp32:      new ESP32SensorSource(),
    };

    /** @type {'simulation' | 'esp32'} */
    this._activeName = 'simulation';

    /** @type {Set<Function>} */
    this._listeners = new Set();

    // Wire the initial (simulation) source to bubble up to our listeners
    this._boundHandler = (data) => this._onData(data);
    this._activeSource.subscribe(this._boundHandler);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  /** @returns {'simulation' | 'esp32'} */
  get sourceName() { return this._activeName; }

  get _activeSource() { return this._sources[this._activeName]; }

  // ── Source switching ─────────────────────────────────────────────────────────

  /**
   * Switch the active data source.
   * Automatically stops the old source and subscribes to the new one.
   *
   * @param {'simulation' | 'esp32'} name
   */
  setSource(name) {
    if (name === this._activeName) return;
    if (!this._sources[name]) {
      console.error(`[DataSourceManager] Unknown source: ${name}`);
      return;
    }

    console.info(`[DataSourceManager] Switching source: ${this._activeName} → ${name}`);

    // Stop and unsubscribe from old source
    this._activeSource.stop();
    this._activeSource.unsubscribe(this._boundHandler);

    // Switch
    this._activeName = name;

    // Subscribe to new source (but do NOT auto-start; caller must call start())
    this._activeSource.subscribe(this._boundHandler);

    // Notify listeners immediately with the new source's current data
    this._onData(this._activeSource.getLatestData());
  }

  // ── Stream control ───────────────────────────────────────────────────────────

  start()  { this._activeSource.start();  }
  stop()   { this._activeSource.stop();   }
  reset()  { this._activeSource.reset();  }

  // ── Data access ──────────────────────────────────────────────────────────────

  /** @returns {import('./types.js').SensorData} */
  getLatestData() {
    return this._activeSource.getLatestData() ?? createEmptySensorData(this._activeName);
  }

  /** @returns {import('./types.js').SensorSourceState} */
  getStatus() {
    return this._activeSource.getStatus();
  }

  // ── Pub/sub ──────────────────────────────────────────────────────────────────

  /**
   * @param {function(import('./types.js').SensorData): void} listener
   */
  subscribe(listener) {
    this._listeners.add(listener);
  }

  /** @param {function} listener */
  unsubscribe(listener) {
    this._listeners.delete(listener);
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _onData(data) {
    this._listeners.forEach(fn => {
      try { fn(data); }
      catch (err) { console.error('[DataSourceManager] Listener error:', err); }
    });
  }
}

/**
 * Singleton instance — shared across the entire application.
 * Import and use this directly; do not create multiple instances.
 *
 * @type {DataSourceManager}
 */
export const dataSourceManager = new DataSourceManager();
