/**
 * KINETICA — Dynamics Manager (Singleton)
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the Digital Twin dynamic simulation lifecycle, state propagation,
 * trajectory history, and subscriptions.
 *
 * Data Flow:
 *   estimatorManager (EstimatedState)
 *          ↓
 *   dynamicsManager.start()
 *          ↓
 *   requestAnimationFrame loop → dynamicModel.stepDynamicModel()
 *          ↓
 *   UpdatedState & Trajectory Buffer
 *          ↓
 *   subscribers (useDynamics hook → FlightDynamics UI)
 *
 * Cleanly stops loop on pause, reset, or window blur.
 * Keeps memory bounded (max history length).
 */

import { estimatorManager } from '../estimation/estimatorManager.js';
import { initializeFromEstimatedState, stepDynamicModel } from './dynamicModel.js';
import { createDefaultUpdatedState } from './types.js';

const MAX_HISTORY_POINTS = 100;
const SIM_DT = 0.05; // 50ms simulation delta time
const FRAME_INTERVAL_MS = 50; // ~20 Hz simulation updates

/**
 * Pre-generates the nominal reference trajectory for visualization.
 * Downrange X from 0 to 5200 m, Altitude Z descending from 850 m to 0 m.
 */
function generateReferencePath(count = 60) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const x = t * 5200;
    // Smooth glide corridor profile: Z(t) = 850 * (1 - t^1.3)
    const z = Math.max(0, 850 * (1 - Math.pow(t, 1.25)));
    points.push({ x: Number(x.toFixed(1)), y: 0, z: Number(z.toFixed(1)), t });
  }
  return points;
}

class DynamicsManager {
  constructor() {
    /** @type {import('./types.js').DynamicModelStatus} */
    this._status = 'ready';

    /** @type {import('./types.js').ScenarioId} */
    this._scenario = 'nominal';

    /** @type {import('./types.js').UpdatedState} */
    this._state = createDefaultUpdatedState('nominal', false);

    /** @type {Array<{x: number, y: number, z: number, simTime: number}>} */
    this._trajectory = [];

    /** @type {Array<import('./types.js').UpdatedState>} */
    this._history = [];

    /** @type {Array<{x: number, y: number, z: number, t: number}>} */
    this._referencePath = generateReferencePath(60);

    /** @type {Set<Function>} */
    this._subscribers = new Set();

    this._animFrameId = null;
    this._lastFrameTime = 0;
    this._controlProvider = null;

    // Cache latest estimated state
    this._latestEstimatedState = estimatorManager.getLatestState();
    this._estimatorUnsub = null;
    this._initEstimatorListener();
  }

  _initEstimatorListener() {
    const onEstUpdate = (est) => {
      this._latestEstimatedState = est;
      const isAvail = est != null && est.overallQuality !== 'unavailable' && est.position?.z !== null;
      this._state = {
        ...this._state,
        isEstimatorAvailable: isAvail,
      };
      this._notify();
    };
    estimatorManager.subscribe(onEstUpdate);
    this._estimatorUnsub = () => estimatorManager.unsubscribe(onEstUpdate);
  }

  // ─── Public Getters ─────────────────────────────────────────────────────────

  getStatus() {
    return this._status;
  }

  getScenario() {
    return this._scenario;
  }

  getState() {
    return this._state;
  }

  getTrajectory() {
    return this._trajectory;
  }

  getReferencePath() {
    return this._referencePath;
  }

  getHistory() {
    return this._history;
  }

  isEstimatorAvailable() {
    const est = this._latestEstimatedState || estimatorManager.getLatestState();
    return est != null && est.overallQuality !== 'unavailable' && est.position?.z !== null;
  }

  // ─── Controls ──────────────────────────────────────────────────────────────

  /**
   * Starts or resumes the dynamic simulation loop.
   */
  start() {
    if (this._status === 'running') return;

    if (this._status === 'ready' || this._status === 'complete' || this._status === 'error') {
      const est = estimatorManager.getLatestState();
      this._state = initializeFromEstimatedState(est, this._scenario);
      this._trajectory = [
        {
          x: this._state.position.x ?? 0,
          y: this._state.position.y ?? 0,
          z: this._state.position.z ?? 850,
          simTime: 0,
        },
      ];
      this._history = [this._state];
    }

    this._status = 'running';
    this._state.status = 'running';
    this._lastFrameTime = performance.now();
    this._loop();
    this._notify();
  }

  /**
   * Freezes the dynamic simulation and retains current state.
   */
  pause() {
    if (this._status !== 'running') return;
    this._status = 'paused';
    this._state.status = 'paused';
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    this._notify();
  }

  /**
   * Resets the simulation to initial state, clears trajectory & chart history, resets timer.
   */
  reset() {
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    this._status = 'ready';
    const est = estimatorManager.getLatestState();
    this._state = initializeFromEstimatedState(est, this._scenario);
    this._trajectory = [];
    this._history = [];
    this._notify();
  }

  /**
   * Sets active simulation scenario.
   * @param {import('./types.js').ScenarioId} scenario
   */
  setScenario(scenario) {
    if (this._scenario === scenario) return;
    this._scenario = scenario;
    this._state = {
      ...this._state,
      scenario,
    };
    this._notify();
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  subscribe(listener) {
    this._subscribers.add(listener);
    // Push immediate current state to new subscriber
    listener(this._state, this._trajectory, this._history);
  }

  unsubscribe(listener) {
    this._subscribers.delete(listener);
  }

  _notify() {
    for (const listener of this._subscribers) {
      try {
        listener(this._state, this._trajectory, this._history);
      } catch (err) {
        console.error('[DynamicsManager] Subscriber error:', err);
      }
    }
  }

  /**
   * Register a simulated control response provider for closed-loop guidance feedback.
   * @param {((state: import('./types.js').UpdatedState) => {accelCorrectionY?: number, accelCorrectionZ?: number}|null)|null} providerFn
   */
  setControlProvider(providerFn) {
    this._controlProvider = providerFn;
  }

  // ─── Internal Simulation Loop ──────────────────────────────────────────────

  _loop = () => {
    if (this._status !== 'running') return;

    const now = performance.now();
    const elapsed = now - this._lastFrameTime;

    if (elapsed >= FRAME_INTERVAL_MS) {
      this._lastFrameTime = now;
      try {
        const controlCorrection = this._controlProvider ? this._controlProvider(this._state) : null;

        const nextState = stepDynamicModel(
          this._state,
          this._scenario,
          SIM_DT,
          this._latestEstimatedState,
          controlCorrection
        );

        this._state = nextState;

        // Append to trajectory
        this._trajectory.push({
          x: nextState.position.x ?? 0,
          y: nextState.position.y ?? 0,
          z: nextState.position.z ?? 0,
          simTime: nextState.simTime,
        });

        // Append to bounded chart history
        this._history.push(nextState);
        if (this._history.length > MAX_HISTORY_POINTS) {
          this._history.shift();
        }

        if (nextState.status === 'complete') {
          this._status = 'complete';
          if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
            this._animFrameId = null;
          }
          this._notify();
          return;
        }

        this._notify();
      } catch (err) {
        console.error('[DynamicsManager] Model step error:', err);
        this._status = 'error';
        this._state.status = 'error';
        this._state.error = err.message || 'Dynamic model calculation fault';
        this._notify();
        return;
      }
    }

    this._animFrameId = requestAnimationFrame(this._loop);
  };
}

export const dynamicsManager = new DynamicsManager();
