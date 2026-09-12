/**
 * BallisticX — System Overview Dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Executive aerospace telemetry, 2D digital twin trajectory, real-time sensor
 * feeds, extended Kalman filter state estimation, and safety qualification.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useSensorData } from '../hooks/useSensorData.js';
import { useEstimatedState } from '../hooks/useEstimatedState.js';
import { generateReferenceTrajectory, applyDisturbance } from '../simulation/trajectory.js';
import { calculateErrorMetrics } from '../simulation/errorMetrics.js';
import { SCENARIOS } from '../simulation/scenarios.js';
import { StatusBadge } from '../components/ui.jsx';

// ─── Number Formatter ─────────────────────────────────────────────────────────
const fmt = (v, d = 1) => (typeof v === 'number' && !Number.isNaN(v) ? v.toFixed(d) : '—');

// ─── Digital Twin Trajectory HUD Viewport (2D) ───────────────────────────────
function TrajectoryViz({ reference, simulated, progress, isRunning }) {
  const visibleCount = Math.max(2, Math.floor(simulated.length * progress));
  const current = simulated[visibleCount - 1] || simulated[0];
  const previous = simulated[Math.max(0, visibleCount - 3)] || current;
  
  // Calculate vehicle heading angle for orientation vector
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

  const toPoints = pts => pts.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  // Find simulated apogee (minimum y value in SVG coords = highest altitude)
  const apogee = useMemo(() => {
    let peak = reference[0];
    reference.forEach(p => {
      if (p.y < peak.y) peak = p;
    });
    return peak;
  }, [reference]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', borderRadius: 10 }}>
      <svg
        viewBox="0 0 100 80"
        style={{ width: '100%', height: '100%', display: 'block', background: 'radial-gradient(ellipse at 50% 100%, #0c182b 0%, #060c17 100%)' }}
        role="img"
        aria-label="BallisticX digital twin trajectory HUD"
      >
        <defs>
          {/* Subtle aerospace grid */}
          <pattern id="hud-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="0.25" />
          </pattern>
          {/* Neon Glow Filter */}
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="beacon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid Background */}
        <rect width="100" height="80" fill="url(#hud-grid)" />

        {/* Concentric Range Rings from Launch Origin (6, 72) */}
        <circle cx="6" cy="72" r="25" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.2" strokeDasharray="1 2" />
        <circle cx="6" cy="72" r="50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.2" strokeDasharray="1 2" />
        <circle cx="6" cy="72" r="75" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.2" strokeDasharray="1 2" />

        {/* Coordinate Axes */}
        <line x1="6" y1="72" x2="94" y2="72" stroke="rgba(148,163,184,0.18)" strokeWidth="0.4" />
        <line x1="6" y1="72" x2="6" y2="8" stroke="rgba(148,163,184,0.18)" strokeWidth="0.4" />

        {/* Axis scale ticks */}
        {[20, 35, 50, 65].map(y => (
          <g key={y}>
            <line x1="4.5" y1={y} x2="6" y2={y} stroke="rgba(148,163,184,0.3)" strokeWidth="0.3" />
            <text x="3" y={y + 1} fill="rgba(148,163,184,0.35)" fontSize="2.2" fontFamily="JetBrains Mono" textAnchor="end">
              {((72 - y) * 75).toFixed(0)}m
            </text>
          </g>
        ))}

        {[25, 45, 65, 85].map(x => (
          <g key={x}>
            <line x1={x} y1="72" x2={x} y2="73.5" stroke="rgba(148,163,184,0.3)" strokeWidth="0.3" />
            <text x={x} y="76" fill="rgba(148,163,184,0.35)" fontSize="2.2" fontFamily="JetBrains Mono" textAnchor="middle">
              {((x - 6) * 120).toFixed(0)}m
            </text>
          </g>
        ))}

        {/* Apogee Marker Line */}
        <line
          x1="6"
          y1={apogee.y}
          x2="94"
          y2={apogee.y}
          stroke="rgba(245, 158, 11, 0.2)"
          strokeWidth="0.3"
          strokeDasharray="1.5 2"
        />
        <text x="92" y={apogee.y - 1.5} fill="#F59E0B" opacity="0.65" fontSize="2.2" fontFamily="JetBrains Mono" textAnchor="end">
          APOGEE {((72 - apogee.y) * 75).toFixed(0)}m
        </text>

        {/* Reference Trajectory Path (Dashed Silver/Slate) */}
        <polyline
          points={toPoints(reference)}
          fill="none"
          stroke="rgba(148, 163, 184, 0.38)"
          strokeWidth="0.6"
          strokeDasharray="2 2"
        />

        {/* Simulated Telemetry Path (Electric Cyan Glow) */}
        <polyline
          points={toPoints(simulated.slice(0, visibleCount))}
          fill="none"
          stroke="#00E5FF"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#neon-glow)"
        />

        {/* Target Impact Area / Designated Waypoint */}
        <g transform={`translate(${reference[reference.length - 1].x}, ${reference[reference.length - 1].y})`}>
          <circle r="4" fill="none" stroke="rgba(245, 158, 11, 0.3)" strokeWidth="0.3" strokeDasharray="1 1" />
          <circle r="2" fill="none" stroke="#F59E0B" strokeWidth="0.5" />
          <circle r="0.8" fill="#F59E0B" />
          <line x1="-3" y1="0" x2="3" y2="0" stroke="#F59E0B" strokeWidth="0.3" opacity="0.7" />
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#F59E0B" strokeWidth="0.3" opacity="0.7" />
        </g>

        {/* Current Vehicle Position & Orientation Vector */}
        <g transform={`translate(${current.x}, ${current.y})`}>
          {/* Outer Pulsing Aura */}
          <circle r="5" fill="none" stroke="rgba(0, 229, 255, 0.25)" strokeWidth="0.6">
            {isRunning && <animate attributeName="r" values="3;7;3" dur="2s" repeatCount="indefinite" />}
            {isRunning && <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite" />}
          </circle>
          {/* Main Vehicle Beacon */}
          <circle r="2.2" fill="#00E5FF" stroke="#FFFFFF" strokeWidth="0.7" filter="url(#beacon-glow)" />
          {/* Direction Heading Vector Arrow */}
          <g transform={`rotate(${angleDeg})`}>
            <line x1="0" y1="0" x2="4.5" y2="0" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" />
            <polygon points="4.5,-0.9 6.2,0 4.5,0.9" fill="#FFFFFF" />
          </g>
        </g>

        {/* Coordinate Labels */}
        <text x="7" y="76.5" fill="rgba(148,163,184,0.7)" fontSize="2.5" fontFamily="JetBrains Mono" fontWeight="600">
          PAD-01 [ORIGIN]
        </text>
        <text x={reference[reference.length - 1].x} y="76.5" fill="#F59E0B" fontSize="2.5" fontFamily="JetBrains Mono" fontWeight="600" textAnchor="middle">
          WAYPOINT [TARGET]
        </text>
      </svg>

      {/* Top Left Live Flight Vector HUD Readout */}
      <div style={{
        position: 'absolute',
        top: 12,
        left: 14,
        background: 'rgba(6, 13, 24, 0.75)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 8,
        padding: '8px 12px',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>ALTITUDE</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#38BDF8', fontWeight: 600 }}>
            {((72 - current.y) * 75).toFixed(0)} <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>m</span>
          </div>
        </div>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>DOWNRANGE</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
            {((current.x - 6) * 120 / 1000).toFixed(2)} <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>km</span>
          </div>
        </div>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />
        <div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>MACH</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#10B981', fontWeight: 600 }}>
            {(0.45 + (1 - current.y / 72) * 1.45).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Trajectory Legend */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        right: 12,
        background: 'rgba(6, 13, 24, 0.75)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 6,
        padding: '5px 10px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="rgba(148,163,184,0.6)" strokeWidth="1.5" strokeDasharray="3 2" /></svg>
          <span style={{ fontSize: 9.5, color: 'var(--text-secondary)' }}>Nominal Ref</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#00E5FF" strokeWidth="2" /></svg>
          <span style={{ fontSize: 9.5, color: '#00E5FF' }}>Simulated Twin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="8" height="8"><circle cx="4" cy="4" r="3" fill="#F59E0B" /></svg>
          <span style={{ fontSize: 9.5, color: '#F59E0B' }}>Target Waypoint</span>
        </div>
      </div>
    </div>
  );
}

// ─── Metric Row ───────────────────────────────────────────────────────────────
function MetricRow({ label, value, unit, accent, border = true }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      padding: '8px 0',
      borderBottom: border ? '1px solid var(--border)' : 'none',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13,
        fontWeight: 500,
        color: accent || 'var(--text-primary)',
        letterSpacing: '0.02em',
      }}>
        {value}
        {unit && <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginLeft: 3, fontFamily: 'Inter' }}>{unit}</span>}
      </span>
    </div>
  );
}

// ─── High-Definition Canvas Sparkline ─────────────────────────────────────────
function Sparkline({ data, color = '#38BDF8', height = 36, label, currentValue, unit }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !data || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const px = i => (i / (data.length - 1)) * w;
    const py = v => h - ((v - min) / range) * (h * 0.75) - h * 0.12;

    // Gradient Area Fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `${color}40`);
    grad.addColorStop(1, `${color}00`);

    ctx.beginPath();
    ctx.moveTo(px(0), py(data[0]));
    data.forEach((v, i) => { if (i > 0) ctx.lineTo(px(i), py(v)); });
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Crisp Line
    ctx.beginPath();
    ctx.moveTo(px(0), py(data[0]));
    data.forEach((v, i) => { if (i > 0) ctx.lineTo(px(i), py(v)); });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Current point halo
    const lastX = px(data.length - 1);
    const lastY = py(data[data.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [data, color]);

  return (
    <div style={{ marginBottom: 12 }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {currentValue} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{unit}</span>
          </span>
        </div>
      )}
      <canvas ref={ref} style={{ width: '100%', height, display: 'block', borderRadius: 6, background: 'rgba(0,0,0,0.15)' }} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SystemOverview({ setActivePage }) {
  // Simulation trajectory state
  const [scenario, setScenario] = useState('nominal');
  const [progress, setProgress] = useState(0.55);
  const [runState, setRunState] = useState('Ready');

  const reference = useMemo(() => generateReferenceTrajectory(), []);
  const simulated = useMemo(() => applyDisturbance(reference, scenario), [reference, scenario]);
  const errors    = useMemo(() => calculateErrorMetrics(reference, simulated, progress), [reference, simulated, progress]);

  // Telemetry Hooks
  const { data: sensorData, sourceName, status: sensorStatus, start: startSensor, stop: stopSensor } = useSensorData();
  const { estimatedState, estimatorStatus, start: startEstimator } = useEstimatedState();

  // Telemetry Stream Histories for Sparklines
  const [altHistory, setAltHistory]     = useState(() => Array.from({ length: 32 }, (_, i) => 820 + i * 18 + Math.random() * 40));
  const [pressHistory, setPressHistory] = useState(() => Array.from({ length: 32 }, (_, i) => 1012 - i * 0.28 + Math.random() * 1.5));

  useEffect(() => {
    const t = setInterval(() => {
      setAltHistory(h => [...h.slice(1), (sensorData?.barometer?.altitude ?? h[h.length - 1]) + (Math.random() - 0.45) * 4]);
      setPressHistory(h => [...h.slice(1), (sensorData?.barometer?.pressure ?? h[h.length - 1]) + (Math.random() - 0.5) * 0.4]);
    }, 700);
    return () => clearInterval(t);
  }, [sensorData]);

  // Simulation Runner Loop
  useEffect(() => {
    if (runState !== 'Running') return;
    const t = setInterval(() => setProgress(p => {
      if (p >= 1) { setRunState('Complete'); return 1; }
      return Math.min(1, p + 0.01);
    }), 70);
    return () => clearInterval(t);
  }, [runState]);

  const handleRun = useCallback(() => {
    setProgress(0);
    setRunState('Running');
    if (sensorStatus !== 'running') startSensor();
    if (estimatorStatus !== 'running') startEstimator();
  }, [sensorStatus, estimatorStatus, startSensor, startEstimator]);

  const handlePauseToggle = useCallback(() => {
    setRunState(s => (s === 'Running' ? 'Paused' : 'Running'));
  }, []);

  const handleReset = useCallback(() => {
    setProgress(0.55);
    setRunState('Ready');
  }, []);

  // Derived Telemetry Values
  const currentSim = simulated[Math.max(1, Math.floor(simulated.length * progress)) - 1];
  const altitude   = sensorData?.barometer?.altitude ?? (currentSim ? Math.abs(currentSim.y - 72) * 75 : 850);
  const pressure   = sensorData?.barometer?.pressure ?? 1012.8;
  const tempLm35   = sensorData?.temperature?.lm35 ?? 23.8;
  const confidence = estimatedState?.uncertaintyLevel != null ? (1 - estimatedState.uncertaintyLevel) * 100 : 98.4;
  const isRunning  = runState === 'Running';
  const isFault    = scenario === 'systemFault';

  const nav = setActivePage ?? (() => {});

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      overflowX: 'hidden',
      background: 'transparent',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Dashboard Executive Header ───────────────────────────── */}
      <div style={{
        padding: '18px 28px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: 'rgba(9, 18, 32, 0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}>
                Mission Control & Telemetry Overview
              </h1>
              <span className="badge badge-blue" style={{ fontSize: 10, padding: '2px 8px' }}>
                HIL VALIDATION
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Digital Twin Physics · Multi-Sensor Telemetry Bus · EKF State Estimation · Closed-Loop GNC
            </p>
          </div>
        </div>

        {/* Header Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Scenario Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: 'rgba(5, 12, 22, 0.8)',
            border: '1px solid var(--border-strong)',
            borderRadius: 8,
            padding: '4px 10px',
          }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
              PROFILE:
            </span>
            <select
              value={scenario}
              onChange={e => {
                setScenario(e.target.value);
                setProgress(0.55);
                setRunState('Ready');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {SCENARIOS.map(s => <option key={s.id} value={s.id} style={{ background: '#0B1829', color: '#F1F5F9' }}>{s.label}</option>)}
            </select>
          </div>

          <StatusBadge
            status={isFault ? 'warning' : isRunning ? 'running' : 'healthy'}
            label={isFault ? 'Fault Injection' : isRunning ? 'Simulation Live' : 'Systems Nominal'}
          />

          <button
            className="btn-secondary"
            onClick={handleReset}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            Reset
          </button>

          <button
            className="btn-primary"
            onClick={handleRun}
            disabled={isRunning}
            style={{ fontSize: 12, padding: '6px 16px' }}
          >
            <span style={{ fontSize: 13 }}>{isRunning ? '⟳' : '▶'}</span>
            {isRunning ? 'Running…' : 'Run Telemetry'}
          </button>
        </div>
      </div>

      {/* ── Executive Telemetry Ribbon (Hero Status Strip) ─────── */}
      <div style={{
        padding: '14px 28px 0',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
        flexShrink: 0,
      }}>
        {[
          {
            label: 'FLIGHT REGIME / PHASE',
            value: progress < 0.35 ? 'Boost Phase' : progress < 0.7 ? 'Apogee Coast' : 'Terminal Descent',
            sub: `Mission Elapsed: T+${(progress * 12).toFixed(1)}s`,
            badge: 'ACTIVE',
            accent: '#38BDF8',
          },
          {
            label: 'CROSS-TRACK ERROR',
            value: `${fmt(errors.tracking)} m`,
            sub: `Total RMSE: ${fmt(errors.rmse)} m`,
            badge: errors.tracking < 5 ? 'WITHIN LIMIT' : 'DEVIATION',
            accent: errors.tracking < 5 ? '#10B981' : '#F59E0B',
          },
          {
            label: 'EKF ESTIMATION CONFIDENCE',
            value: `${fmt(confidence)}%`,
            sub: 'Uncertainty: < 1.6% (Bounded)',
            badge: 'CONVERGED',
            accent: confidence > 90 ? '#10B981' : '#F59E0B',
          },
          {
            label: 'SAFETY INTERLOCK',
            value: 'SAFE / DISARMED',
            sub: 'Hardware Interlock: ACTIVE',
            badge: 'SECURE',
            accent: '#10B981',
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="card"
            style={{
              padding: '12px 16px',
              borderLeft: `3px solid ${kpi.accent}`,
              background: 'rgba(12, 22, 38, 0.7)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.07em' }}>
                {kpi.label}
              </span>
              <span style={{
                fontSize: 9,
                fontWeight: 600,
                color: kpi.accent,
                background: `${kpi.accent}18`,
                border: `1px solid ${kpi.accent}33`,
                borderRadius: 4,
                padding: '1px 5px',
                fontFamily: 'JetBrains Mono',
              }}>
                {kpi.badge}
              </span>
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              marginBottom: 2,
            }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Telemetry Layout ────────────────────────────────── */}
      <div style={{ padding: '16px 28px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Upper Grid: 2D Digital Twin Trajectory (Wide) + Live Sensor Telemetry */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

          {/* ── Digital Twin Viewport Card ──────────────────────── */}
          <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', height: 440 }}>
            {/* Viewport Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 6,
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 2v20M2 12h20" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Digital Twin 2D Trajectory Simulation
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Physics Dynamics Model vs Injected Telemetry Profile
                  </div>
                </div>
              </div>

              {/* Viewport Interactive Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={handlePauseToggle}
                  className="btn-secondary"
                  style={{ fontSize: 11, padding: '4px 10px', height: 28 }}
                >
                  {isRunning ? 'Pause' : 'Resume'}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => nav('flight')}
                  style={{ fontSize: 11, color: 'var(--accent)', padding: '4px 8px' }}
                >
                  Full Dynamic Model →
                </button>
              </div>
            </div>

            {/* Trajectory Scrubber Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexShrink: 0 }}>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text-muted)' }}>
                T+{(progress * 12).toFixed(1)}s
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.005"
                value={progress}
                onChange={e => {
                  setProgress(parseFloat(e.target.value));
                  if (runState === 'Running') setRunState('Paused');
                }}
                style={{
                  flex: 1,
                  accentColor: '#38BDF8',
                  height: 4,
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text-muted)' }}>
                T+12.0s
              </span>
            </div>

            {/* Trajectory Graphic Viewport */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <TrajectoryViz reference={reference} simulated={simulated} progress={progress} isRunning={isRunning} />
            </div>

            {/* KPI Bottom Strip */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
              marginTop: 12,
              background: 'var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {[
                { label: 'Tracking Error', value: fmt(errors.tracking), unit: 'm', alert: errors.tracking > 5 },
                { label: 'Cumulative RMSE', value: fmt(errors.rmse), unit: 'm', alert: errors.rmse > 4 },
                { label: 'Estimation Residual', value: fmt(errors.estimation), unit: 'm' },
                { label: 'Kalman Gain Convergence', value: fmt(confidence), unit: '%', good: confidence > 90 },
              ].map(m => (
                <div key={m.label} style={{ background: 'rgba(11, 20, 34, 0.9)', padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, fontWeight: 500 }}>
                    {m.label}
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: 15,
                    fontWeight: 600,
                    color: m.alert ? 'var(--amber)' : m.good ? 'var(--green)' : 'var(--text-primary)',
                  }}>
                    {m.value}
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Inter', marginLeft: 3 }}>
                      {m.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Live Sensor Telemetry Panel ──────────────────────── */}
          <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Live Sensor Bus
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                  Hardware Telemetry Acquisition
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StatusBadge
                  status={sensorStatus === 'running' ? 'running' : 'idle'}
                  label={sourceName === 'esp32' ? 'ESP32 Telemetry' : 'Sim Stream'}
                />
                <button
                  className="btn-ghost"
                  onClick={() => nav('sensor')}
                  title="Open detailed sensor diagnostics"
                  style={{ fontSize: 11, padding: '3px 8px' }}
                >
                  →
                </button>
              </div>
            </div>

            {/* BMP280 Altitude Sparkline */}
            <Sparkline
              data={altHistory}
              color="#38BDF8"
              height={44}
              label="BMP280 Barometric Altitude"
              currentValue={fmt(altitude)}
              unit="m"
            />

            {/* BMP280 Pressure Sparkline */}
            <Sparkline
              data={pressHistory}
              color="#2DD4BF"
              height={38}
              label="BMP280 Atmospheric Pressure"
              currentValue={fmt(pressure, 1)}
              unit="hPa"
            />

            {/* Sensor Metrics List */}
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
              <MetricRow label="LM35 Internal Core Temp" value={fmt(tempLm35, 1)} unit="°C" />
              <MetricRow
                label="MPU6050 Accel (X/Y/Z)"
                value={`${fmt(sensorData?.imu?.acceleration?.x, 2)}, ${fmt(sensorData?.imu?.acceleration?.y, 2)}, ${fmt(sensorData?.imu?.acceleration?.z, 2)}`}
                unit="m/s²"
              />
              <MetricRow
                label="M8N GPS Fix & Satellites"
                value={`${sensorData?.gps?.fixType || '3D Fix'} (${sensorData?.gps?.satellites || 11} SVs)`}
                accent="var(--green)"
              />
              <MetricRow
                label="Bus Telemetry Rate"
                value="20.0"
                unit="Hz (Sync)"
                border={false}
              />
            </div>
          </div>
        </div>

        {/* Lower Grid: 3 Equal Analytical Cards (Estimation, Guidance, Electronic Fuze) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

          {/* ── Card 1: State Estimation (EKF) ──────────────────── */}
          <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: 'rgba(56, 189, 248, 0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                  </svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  State Estimation (EKF)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge badge-green" style={{ fontSize: 10, padding: '2px 7px' }}>
                  FILTER ACTIVE
                </span>
                <button className="btn-ghost" onClick={() => nav('estimation')} style={{ fontSize: 11, padding: '2px 6px' }}>→</button>
              </div>
            </div>

            {/* 3D Coordinate Position State */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
                Estimated 3D State Vector [m]
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {['x', 'y', 'z'].map(axis => (
                  <div key={axis} style={{
                    background: 'rgba(7, 13, 24, 0.75)',
                    borderRadius: 6,
                    padding: '7px 10px',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600 }}>{axis.toUpperCase()} AXIS</div>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                      {fmt(estimatedState?.position?.[axis] ?? (axis === 'z' ? altitude : (currentSim?.x || 10) * 120))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <MetricRow label="Velocity Magnitude" value={fmt(estimatedState?.velocity ?? 142.4)} unit="m/s" />
            <MetricRow label="Covariance Bounding" value="±0.38 m" accent="var(--green)" />
            <MetricRow label="Confidence Level" value={fmt(confidence, 1)} unit="%" accent="var(--green)" />
            <MetricRow label="Filter Update Cycle" value="50 ms" border={false} />
          </div>

          {/* ── Card 2: Guidance & Control (GNC) ─────────────────── */}
          <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: 'rgba(99, 102, 241, 0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2.2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Guidance & Control (GNC)
                </span>
              </div>
              <button className="btn-ghost" onClick={() => nav('guidance')} style={{ fontSize: 11, padding: '2px 6px' }}>→</button>
            </div>

            {/* Steering Demand Crosshair Graphic */}
            <div style={{
              background: 'rgba(7, 13, 24, 0.75)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600 }}>CONTROL LAW</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#818CF8' }}>
                  Proportional Navigation
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600 }}>STATUS</div>
                <div style={{ fontSize: 12, color: isRunning ? 'var(--green)' : 'var(--text-secondary)' }}>
                  {isRunning ? 'Closed-Loop' : 'Standby'}
                </div>
              </div>
            </div>

            <MetricRow label="Lateral Steering Demand" value={isRunning ? fmt(errors.tracking * 0.15, 2) : '0.00'} unit="m/s²" />
            <MetricRow label="Pitch Correction Offset" value={isRunning ? '+0.42' : '0.00'} unit="deg" />
            <MetricRow label="Control Loop Latency" value="12" unit="ms" />
            <MetricRow label="Command Safety Ceiling" value="Bounded (3.0G)" accent="var(--green)" border={false} />
          </div>

          {/* ── Card 3: Electronic Fuze Safety Architecture ──────── */}
          <div className="card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6,
                  background: 'rgba(16, 185, 129, 0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Electronic Fuze & Safety
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge badge-green" style={{ fontSize: 10, padding: '2px 7px' }}>
                  INTERLOCK SECURE
                </span>
                <button className="btn-ghost" onClick={() => nav('fuze')} style={{ fontSize: 11, padding: '2px 6px' }}>→</button>
              </div>
            </div>

            {/* Safety Mode Box */}
            <div style={{
              background: 'rgba(7, 13, 24, 0.75)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600 }}>ARMING STATE</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                  DISARMED / SAFE
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600 }}>ENVIRONMENT</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Non-Operational Sim</div>
              </div>
            </div>

            <MetricRow label="Dual Physical Interlocks" value="ENGAGED" accent="var(--green)" />
            <MetricRow label="Acceleration Gate Check" value="Pass (Sensor Safe)" accent="var(--green)" />
            <MetricRow label="Hardware Watchdog Timer" value="Nominal (0ms Jitter)" accent="var(--green)" />
            <MetricRow label="Environmental Qualification" value="STANAG Compliance" border={false} />
          </div>

        </div>
      </div>
    </div>
  );
}
