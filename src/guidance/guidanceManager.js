/**
 * KINETICA — Guidance Manager (Singleton)
 * ─────────────────────────────────────────────────────────────────────────────
 * Coordinates the Reference Tracking and Closed-Loop Control Response simulation.
 *
 * Architecture:
 *   SensorData → State Estimation (EstimatedState)
 *                           ↓
 *   Digital Twin (dynamicsManager) → UpdatedState
 *                           ↓
 *   calculateDeviation() → evaluateDeviation() → simulateResponse()
 *                           ↓
 *   Control Response Model → Feedback to dynamicsManager
 *
 * Consumes the existing dynamicsManager and estimatorManager.
 * Zero duplicate simulation engines.
 */

import { dynamicsManager } from '../dynamics/dynamicsManager.js';
import { estimatorManager } from '../estimation/estimatorManager.js';
import { calculateDeviation, evaluateDeviation, simulateResponse } from './guidanceModel.js';

const MAX_ERROR_HISTORY = 100;

class GuidanceManager {
  constructor() {
    this._subscribers = new Set();
    this._closedLoopActive = true;
    this._errorHistory = [];

    // Cache latest states
    this._dynamicState = dynamicsManager.getState();
    this._estimatedState = estimatorManager.getLatestState();
    this._referencePath = dynamicsManager.getReferencePath();
    this._trajectory = dynamicsManager.getTrajectory();

    // Initial evaluation
    const refPoint = this._findRefPoint(this._dynamicState?.position?.x ?? 0);
    this._deviation = calculateDeviation(refPoint, this._dynamicState, this._estimatedState);
    this._decision = evaluateDeviation(this._deviation);
    this._controlResponse = simulateResponse(this._decision, this._deviation, this._closedLoopActive);

    this._initListeners();
    this._setupDynamicsFeedback();
  }

  _initListeners() {
    // Listen to dynamics updates
    dynamicsManager.subscribe((dynState, traj) => {
      this._dynamicState = dynState;
      this._trajectory = traj;
      this._updateGuidance();
    });

    // Listen to estimation updates
    estimatorManager.subscribe((estState) => {
      this._estimatedState = estState;
      this._updateGuidance();
    });
  }

  _setupDynamicsFeedback() {
    // Provide closed-loop corrective acceleration to dynamicsManager
    dynamicsManager.setControlProvider((state) => {
      if (!this._closedLoopActive) return null;
      const refPoint = this._findRefPoint(state?.position?.x ?? 0);
      const dev = calculateDeviation(refPoint, state, this._estimatedState);
      const dec = evaluateDeviation(dev);
      const resp = simulateResponse(dec, dev, true);
      return {
        accelCorrectionY: resp.accelCorrectionY,
        accelCorrectionZ: resp.accelCorrectionZ,
      };
    });
  }

  _findRefPoint(x) {
    if (!this._referencePath || !this._referencePath.length) {
      return { x: 0, y: 0, z: 850 };
    }
    // Interpolate or find closest point in reference trajectory
    let closest = this._referencePath[0];
    let minDiff = Infinity;
    for (const pt of this._referencePath) {
      const diff = Math.abs(pt.x - x);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }
    return closest;
  }

  _updateGuidance() {
    const curX = this._dynamicState?.position?.x ?? 0;
    const refPoint = this._findRefPoint(curX);

    this._deviation = calculateDeviation(refPoint, this._dynamicState, this._estimatedState);
    this._decision = evaluateDeviation(this._deviation);
    this._controlResponse = simulateResponse(this._decision, this._deviation, this._closedLoopActive);

    // Track error history if running
    if (dynamicsManager.getStatus() === 'running') {
      this._errorHistory.push({
        t: this._dynamicState.simTime,
        error: this._deviation.trackingError,
        estError: this._deviation.estimationError,
        refZ: refPoint.z,
        simZ: this._dynamicState.position.z ?? refPoint.z,
      });

      if (this._errorHistory.length > MAX_ERROR_HISTORY) {
        this._errorHistory.shift();
      }
    } else if (dynamicsManager.getStatus() === 'ready' && this._errorHistory.length > 0) {
      this._errorHistory = [];
    }

    this._notify();
  }

  // ─── Public Getters ─────────────────────────────────────────────────────────

  getDynamicState() {
    return this._dynamicState;
  }

  getEstimatedState() {
    return this._estimatedState;
  }

  getReferencePath() {
    return this._referencePath;
  }

  getCurrentRefPoint() {
    return this._findRefPoint(this._dynamicState?.position?.x ?? 0);
  }

  getTrajectory() {
    return this._trajectory;
  }

  getDeviation() {
    return this._deviation;
  }

  getDecision() {
    return this._decision;
  }

  getControlResponse() {
    return this._controlResponse;
  }

  getErrorHistory() {
    return this._errorHistory;
  }

  getStatus() {
    return dynamicsManager.getStatus();
  }

  getScenario() {
    return dynamicsManager.getScenario();
  }

  isClosedLoopActive() {
    return this._closedLoopActive;
  }

  // ─── Controls ──────────────────────────────────────────────────────────────

  start() {
    dynamicsManager.start();
  }

  pause() {
    dynamicsManager.pause();
  }

  reset() {
    this._errorHistory = [];
    dynamicsManager.reset();
  }

  setScenario(scenario) {
    dynamicsManager.setScenario(scenario);
  }

  setClosedLoop(active) {
    this._closedLoopActive = active;
    this._updateGuidance();
  }

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  subscribe(listener) {
    this._subscribers.add(listener);
    listener(this._getSnapshot());
  }

  unsubscribe(listener) {
    this._subscribers.delete(listener);
  }

  _getSnapshot() {
    return {
      dynamicState: this._dynamicState,
      estimatedState: this._estimatedState,
      refPoint: this.getCurrentRefPoint(),
      referencePath: this._referencePath,
      trajectory: this._trajectory,
      deviation: this._deviation,
      decision: this._decision,
      controlResponse: this._controlResponse,
      errorHistory: this._errorHistory,
      status: dynamicsManager.getStatus(),
      scenario: dynamicsManager.getScenario(),
      closedLoopActive: this._closedLoopActive,
    };
  }

  _notify() {
    const snapshot = this._getSnapshot();
    for (const listener of this._subscribers) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('[GuidanceManager] Subscriber error:', err);
      }
    }
  }
}

export const guidanceManager = new GuidanceManager();
