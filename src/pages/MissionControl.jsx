import React, { useEffect, useMemo, useState } from 'react';
import { applyDisturbance, generateReferenceTrajectory } from '../simulation/trajectory';
import { calculateErrorMetrics } from '../simulation/errorMetrics';
import { estimateState } from '../simulation/stateEstimator';
import { SCENARIOS } from '../simulation/scenarios';
import './MissionControl.css';

const INITIAL_PROGRESS = 0.56;

function Icon({ name, size = 16 }) {
  const paths = { play: <polygon points="6 4 20 12 6 20 6 4" />, reset: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></> };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function TrajectoryView({ reference, simulated, progress }) {
  const visibleCount = Math.max(2, Math.floor(simulated.length * progress));
  const toPoints = (points) => points.map(({ x, y }) => `${x},${y}`).join(' ');
  const current = simulated[visibleCount - 1];
  return <div className="trajectory-wrap"><svg className="trajectory-svg" viewBox="0 0 100 86" role="img" aria-label="Intended and simulated trajectory">
    <defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(148,163,184,.12)" strokeWidth=".22" /></pattern></defs>
    <rect width="100" height="86" fill="url(#grid)" /><line x1="7" y1="78" x2="93" y2="78" stroke="rgba(148,163,184,.25)" strokeWidth=".25" /><line x1="7" y1="78" x2="7" y2="13" stroke="rgba(148,163,184,.25)" strokeWidth=".25" />
    <polyline points={toPoints(reference)} fill="none" stroke="#8292a8" strokeWidth=".65" strokeDasharray="2.2 1.8" /><polyline points={toPoints(simulated.slice(0, visibleCount))} fill="none" stroke="#35b7e8" strokeWidth=".95" strokeLinecap="round" />
    <circle cx={reference[reference.length - 1].x} cy={reference[reference.length - 1].y} r="1.35" fill="#f2b84b" /><circle cx={current.x} cy={current.y} r="2.2" fill="#35b7e8" stroke="#d7f5ff" strokeWidth=".55" /><circle cx={current.x} cy={current.y} r="4.2" fill="none" stroke="rgba(53,183,232,.25)" strokeWidth=".55" />
    <text x="8" y="84" className="axis-label">START</text><text x="86" y="84" className="axis-label">TARGET</text>
  </svg><div className="trajectory-legend"><span><i className="legend-line intended" />Intended Trajectory</span><span><i className="legend-line simulated" />Simulated Trajectory</span><span><i className="legend-dot current" />Current State</span><span><i className="legend-dot reference" />Reference Point</span></div></div>;
}

function StatusRow({ label, value, warning = false }) { return <div className="status-row"><span>{label}</span><strong className={warning ? 'is-warning' : ''}>{value}</strong></div>; }
function Metric({ label, value, unit }) { return <div className="metric"><span>{label}</span><strong>{value} <small>{unit}</small></strong></div>; }

export default function MissionControl() {
  const reference = useMemo(() => generateReferenceTrajectory(), []);
  const [scenario, setScenario] = useState('nominal');
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
  const [runState, setRunState] = useState('Ready');
  const simulated = useMemo(() => applyDisturbance(reference, scenario), [reference, scenario]);
  const state = useMemo(() => estimateState(simulated, progress, scenario), [simulated, progress, scenario]);
  const errors = useMemo(() => calculateErrorMetrics(reference, simulated, progress), [reference, simulated, progress]);
  const isFault = scenario === 'systemFault';

  useEffect(() => {
    if (runState !== 'Running') return undefined;
    const timer = window.setInterval(() => setProgress((current) => { if (current >= 1) { setRunState('Complete'); return 1; } return Math.min(1, current + 0.012); }), 80);
    return () => window.clearInterval(timer);
  }, [runState]);

  const runSimulation = () => { setProgress(0); setRunState('Running'); };
  const resetSimulation = () => { setProgress(INITIAL_PROGRESS); setRunState('Ready'); };

  return <div className="mission-page"><div className="page-heading"><div><h1>Mission Control</h1><p>Digital Twin &amp; Simulation Overview</p></div><span className="demo-label">DEMO / SIMULATION VALUES</span></div>
    <div className="dashboard-grid">
      <section className="panel twin-panel"><div className="panel-heading"><div><h2>Digital Twin</h2><p>Simulation Environment</p></div><div className="view-toggle"><button className="active">2D</button><button disabled>3D</button></div></div><TrajectoryView reference={reference} simulated={simulated} progress={progress} /></section>
      <section className="panel status-panel"><div className="panel-heading"><h2>System Status</h2><span className={`health-pill ${isFault ? 'warning' : ''}`}><span className="status-dot" />{isFault ? 'Warning' : 'Healthy'}</span></div><div className="status-list"><StatusRow label="Simulation" value={runState} /><StatusRow label="Sensor Model" value="Connected" /><StatusRow label="State Estimator" value={isFault ? 'Uncertain' : 'Ready'} warning={isFault} /><StatusRow label="Current Scenario" value={SCENARIOS.find((item) => item.id === scenario).label} /></div></section>
      <section className="panel state-panel"><div className="panel-heading"><h2>Estimated State</h2><span className="panel-caption">Current solution</span></div><div className="state-groups"><div><h3>Position</h3><div className="state-values"><span><b>X</b>{state.position.x.toFixed(1)} m</span><span><b>Y</b>{state.position.y.toFixed(1)} m</span><span><b>Z</b>{state.position.z.toFixed(1)} m</span></div></div><div><h3>Velocity</h3><div className="single-value">{state.velocity.toFixed(1)} <small>m/s</small></div></div><div><h3>Orientation</h3><div className="state-values"><span><b>Roll</b>{state.orientation.roll.toFixed(1)}°</span><span><b>Pitch</b>{state.orientation.pitch.toFixed(1)}°</span><span><b>Yaw</b>{state.orientation.yaw.toFixed(1)}°</span></div></div></div></section>
      <section className="panel metrics-panel"><div className="panel-heading"><h2>Error Metrics</h2><span className="panel-caption">Live calculation</span></div><div className="metrics-list"><Metric label="Tracking Error" value={errors.tracking.toFixed(1)} unit="m" /><Metric label="Estimation Error" value={errors.estimation.toFixed(1)} unit="m" /><Metric label="RMSE" value={errors.rmse.toFixed(1)} unit="m" /><Metric label="Model Confidence" value={state.uncertainty.toFixed(1)} unit="%" /></div></section>
    </div>
    <section className="panel simulation-panel"><div><h2>Simulation</h2><p>Choose a synthetic test condition and run the model.</p></div><label className="scenario-select">Scenario<select value={scenario} onChange={(event) => { setScenario(event.target.value); setProgress(INITIAL_PROGRESS); setRunState('Ready'); }}>{SCENARIOS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><div className="simulation-actions"><span className={`simulation-state ${runState.toLowerCase()}`}><span className="status-dot" />{runState}{runState === 'Running' && <small> · T+{(progress * 12).toFixed(1)}s</small>}</span><button className="btn-secondary" onClick={resetSimulation}><Icon name="reset" />Reset</button><button className="btn-primary" onClick={runSimulation} disabled={runState === 'Running'}><Icon name="play" />Run Simulation</button></div></section>
  </div>;
}