/**
 * KINETICA — Estimator Manager
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates the full estimation pipeline:
 *
 *   SensorData (from DataSourceManager)
 *       ↓
 *   Preprocessor.process()
 *       ↓
 *   BasicEstimator.estimate()
 *       ↓
 *   EstimatedState
 *       ↓
 *   subscribers (useEstimatedState hook → UI)
 *
 * The EstimatorManager does NOT own a sensor source.
 * It subscribes to the shared DataSourceManager singleton.
 *
 * This keeps the two concerns separate:
 *   - DataSourceManager: where does the data come from?
 *   - EstimatorManager:  what do we calculate from it?
 */

import { dataSourceManager } from '../sensors/dataSourceManager.js';
import { Preprocessor }      from './preprocessor.js';
import { BasicEstimator }    from './basicEstimator.js';
import { createEmptyEstimatedState } from './types.js';

class EstimatorManager {
  constructor() {
    this._preprocessor = new Preprocessor();
    this._estimator    = new BasicEstimator('basic_filter');

    /** @type {import('./types.js').EstimatedState} */
    this._latestState  = createEmptyEstimatedState('basic_filter');

    /** @type {'ready' | 'running' | 'paused'} */
    this._status       = 'ready';

    /** @type {import('./types.js').EstimatorMode} */
    this._mode         = 'basic_filter';

    /** @type {Set<Function>} */
    this._listeners    = new Set();

    // Bound handler so we can unsubscribe cleanly
    this._sensorHandler = (sensorData) => this._onSensorData(sensorData);
  }

  // ── Public interface ────────────────────────────────────────────────────────

  start() {
    if (this._status === 'running') return;
    this._status = 'running';
    dataSourceManager.subscribe(this._sensorHandler);
    console.debug('[EstimatorManager] Started.');
  }

  pause() {
    if (this._status !== 'running') return;
    this._status = 'paused';
    dataSourceManager.unsubscribe(this._sensorHandler);
    // Update status in latest state without losing last values
    this._latestState = { ...this._latestState, estimatorStatus: 'paused' };
    this._notify();
    console.debug('[EstimatorManager] Paused.');
  }

  reset() {
    dataSourceManager.unsubscribe(this._sensorHandler);
    this._preprocessor.reset();
    this._estimator.reset();
    this._status      = 'ready';
    this._latestState = createEmptyEstimatedState(this._mode);
    this._notify();
    console.debug('[EstimatorManager] Reset.');
  }

  /**
   * Switch the estimator mode.
   * Resets internal state to avoid carry-over between modes.
   * @param {'basic_filter' | 'model_based'} mode
   */
  setMode(mode) {
    if (mode === this._mode) return;
    const wasRunning = this._status === 'running';
    this.reset();
    this._mode = mode;
    this._estimator = new BasicEstimator(mode);
    if (wasRunning) this.start();
  }

  /** @returns {import('./types.js').EstimatedState} */
  getLatestState() { return this._latestState; }

  /** @returns {'ready' | 'running' | 'paused'} */
  getStatus() { return this._status; }

  /** @returns {import('./types.js').EstimatorMode} */
  getMode() { return this._mode; }

  /** @param {function(import('./types.js').EstimatedState): void} listener */
  subscribe(listener) { this._listeners.add(listener); }

  /** @param {function} listener */
  unsubscribe(listener) { this._listeners.delete(listener); }

  // ── Private ─────────────────────────────────────────────────────────────────

  _onSensorData(sensorData) {
    if (this._status !== 'running') return;
    try {
      const meas  = this._preprocessor.process(sensorData);
      const state = this._estimator.estimate(meas);
      this._latestState = state;
      this._notify();
    } catch (err) {
      console.error('[EstimatorManager] Pipeline error:', err);
    }
  }

  _notify() {
    const s = this._latestState;
    this._listeners.forEach(fn => {
      try { fn(s); }
      catch (err) { console.error('[EstimatorManager] Listener error:', err); }
    });
  }
}

/**
 * Singleton instance — shared across the entire application.
 * @type {EstimatorManager}
 */
export const estimatorManager = new EstimatorManager();
