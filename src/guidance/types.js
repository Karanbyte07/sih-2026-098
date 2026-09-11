/**
 * KINETICA — Guidance & Control Types
 * ─────────────────────────────────────────────────────────────────────────────
 * Type definitions for the Reference Tracking and Closed-Loop Control Response module.
 *
 * Pipeline:
 *   Reference State + Estimated State
 *             ↓
 *      Deviation / Error
 *             ↓
 *      Guidance Decision
 *             ↓
 *   Simulated Control Response
 *             ↓
 *       Updated State
 *             ↓
 *    Feedback to Digital Twin (Closed Loop)
 *
 * Safe engineering validation only.
 * No weapons, targeting, firing, or munition parameters.
 */

/**
 * @typedef {'within_reference' | 'deviation_detected' | 'correction_evaluated' | 'updated_state'} GuidanceStageId
 *
 * @typedef {Object} DeviationMetrics
 * @property {number} trackingError    Distance from reference corridor (meters)
 * @property {number} estimationError  Uncertainty / sensor discrepancy (meters)
 * @property {number} overallError     Combined error norm (meters)
 * @property {number} deltaX           Downrange difference (meters)
 * @property {number} deltaY           Cross-range difference (meters)
 * @property {number} deltaZ           Altitude difference (meters)
 * @property {number} deltaVx          Axial velocity difference (m/s)
 * @property {number} deltaVy          Lateral velocity difference (m/s)
 * @property {number} deltaVz          Vertical velocity difference (m/s)
 *
 * @typedef {Object} GuidanceDecision
 * @property {GuidanceStageId} stage   Current step in the decision pipeline
 * @property {string} label            Human-readable stage label
 * @property {string} status           'nominal' | 'correcting' | 'converged'
 * @property {string} actionSummary    Summary of simulated guidance response
 * @property {number} correctiveEffort Normalized corrective demand (-1.0 to +1.0)
 *
 * @typedef {Object} ControlResponse
 * @property {number} responseTimeMs   Simulated loop latency / response delay (ms)
 * @property {number} effortPercent    Simulated control authority utilization (0 - 100%)
 * @property {number} accelCorrectionY Corrective acceleration Y (m/s²)
 * @property {number} accelCorrectionZ Corrective acceleration Z (m/s²)
 * @property {string} responseType     Abstract response mode description
 * @property {boolean} closedLoopActive Whether feedback is actively steering digital twin
 */

export const GUIDANCE_STAGES = [
  { id: 'within_reference', label: 'Reference Baseline', sub: 'Corridor Definition' },
  { id: 'compare_state', label: 'Compare State', sub: 'State vs. Reference' },
  { id: 'deviation_detected', label: 'Deviation Detected', sub: 'Tracking Error Check' },
  { id: 'correction_evaluated', label: 'Correction Evaluated', sub: 'Restoring Computation' },
  { id: 'control_response', label: 'Control Response', sub: 'Closed-Loop Feedback' },
];
