/**
 * KINETICA — State Estimation Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays the estimation pipeline and its output.
 *
 * Data flow on this page:
 *   DataSourceManager (SensorData)
 *       ↓ [shared with Mission Control + Live Sensor Data]
 *   EstimatorManager
 *       ↓
 *   EstimatedState
 *       ↓
 *   This component (via useEstimatedState + useSensorData hooks)
 *
 * This component does NOT own or generate sensor data.
 * It only visualises the estimation pipeline.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useEstimatedState } from '../hooks/useEstimatedState.js';
import { useSensorData }     from '../hooks/useSensorData.js';
import { ESTIMATION_CHANNELS, getEstimateValue } from '../estimation/types.js';
import { getChannelValue }   from '../sensors/types.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_LEN = 80;

// ─── Formatting ───────────────────────────────────────────────────────────────
function fmt(val, decimals = 3) {
  if (val === null || val === undefined || (typeof val === 'number' && !isFinite(val))) return 'N/A';
  if (typeof val === 'number') return val.toFixed(decimals);
  return String(val);
}

function qualityColor(q) {
  switch (q) {
    case 'good':        return 'var(--green)';
    case 'degraded':    return 'var(--amber)';
    case 'insufficient':return 'var(--amber)';
    default:            return 'var(--text-muted)';
  }
}

function qualityLabel(q) {
  switch (q) {
    case 'good':         return 'Good';
    case 'degraded':     return 'Degraded';
    case 'insufficient': return 'Insufficient Data';
    case 'unavailable':  return 'Unavailable';
    default:             return 'Unknown';
  }
}

// ─── Tiny components ──────────────────────────────────────────────────────────

function Card({ title, badge, children, style }) {
  return (
    <div className="card" style={{ padding: 20, ...style }}>
      {(title || badge) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          {title && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>}
          {badge}
        </div>
      )}
      {children}
    </div>
  );
}

function Row({ label, value, unit, quality }) {
  const color = quality ? qualityColor(quality) : 'var(--text-primary)';
  const display = value === null || value === undefined ? 'N/A' : fmt(value);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 500, color: display === 'N/A' ? 'var(--text-muted)' : color }}>
          {display}
        </span>
        {unit && display !== 'N/A' && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

function StatusDot({ ok, pulse = true }) {
  return (
    <span style={{
      width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
      background: ok ? 'var(--green)' : 'var(--text-muted)',
      animation: ok && pulse ? 'pulse-dot 2s ease-in-out infinite' : 'none',
      flexShrink: 0,
    }} />
  );
}

function QualityBadge({ quality }) {
  const bg    = quality === 'good' ? 'var(--green-muted)' : quality === 'degraded' ? 'var(--amber-muted)' : 'var(--border)';
  const color = quality === 'good' ? 'var(--green)'       : quality === 'degraded' ? 'var(--amber)'       : 'var(--text-muted)';
  const border= quality === 'good' ? 'rgba(34,197,94,0.25)'  : quality === 'degraded' ? 'rgba(245,158,11,0.25)' : 'var(--border-strong)';
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 100,
      background: bg, color, border: `1px solid ${border}`,
    }}>
      {qualityLabel(quality)}
    </span>
  );
}

// ─── Sensor Inputs Card ───────────────────────────────────────────────────────
function SensorInputsCard({ sensorData }) {
  const q = sensorData?.quality ?? {};
  const sensors = [
    { label: 'GPS (M8N)',  ok: q.gps           === 'good' },
    { label: 'MPU6050',   ok: q.imu           === 'good' },
    { label: 'BMP280',    ok: q.environmental === 'good' },
    { label: 'LM35',      ok: q.environmental === 'good' },
  ];
  return (
    <Card title="Sensor Inputs">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sensors.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusDot ok={s.ok} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: 12, color: s.ok ? 'var(--green)' : 'var(--text-muted)' }}>
              {s.ok ? 'Available' : 'Unavailable'}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Estimation Pipeline ──────────────────────────────────────────────────────
function EstimationPipeline({ estimatorStatus }) {
  const running = estimatorStatus === 'running';

  const steps = [
    { id: 'raw',    label: 'Sensor Measurements', desc: 'GPS · IMU · Env' },
    { id: 'pre',    label: 'Preprocessing',        desc: 'EMA smoothing · GPS→local frame' },
    { id: 'est',    label: 'State Estimation',     desc: 'Basic Filter / Model-Based' },
    { id: 'out',    label: 'Estimated State',      desc: 'Position · Velocity · Orientation' },
  ];

  // Cycle through active step while running
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    if (!running) { setActiveStep(0); return; }
    const t = setInterval(() => setActiveStep(s => (s + 1) % steps.length), 800);
    return () => clearInterval(t);
  }, [running, steps.length]);

  return (
    <Card title="Estimation Pipeline">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {steps.map((step, i) => {
          const isActive = running && i === activeStep;
          const isDone   = running && i < activeStep;
          return (
            <React.Fragment key={step.id}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '11px 14px', borderRadius: 8,
                background: isActive ? 'var(--accent-muted)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(56,189,248,0.25)' : 'transparent'}`,
                transition: 'all 0.3s ease',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'var(--accent)'
                            : isDone   ? 'var(--green-muted)'
                            : 'var(--card-elevated)',
                  border: `1px solid ${isActive ? 'var(--accent)' : isDone ? 'rgba(34,197,94,0.3)' : 'var(--border-strong)'}`,
                  fontSize: 12, fontWeight: 700,
                  color: isActive ? '#0B1829' : isDone ? 'var(--green)' : 'var(--text-muted)',
                }}>
                  {isDone ? '✓' : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{step.desc}</div>
                </div>
                {isActive && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
                    animation: 'pulse-dot 1s ease-in-out infinite' }} />
                )}
              </div>
              {i < steps.length - 1 && (
                <div style={{ display: 'flex', paddingLeft: 27 }}>
                  <div style={{ width: 1, height: 12, background: 'var(--border)' }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Estimated State Card ─────────────────────────────────────────────────────
function EstimatedStateCard({ estimatedState }) {
  const pos = estimatedState?.position   ?? {};
  const vel = estimatedState?.velocity   ?? {};
  const ori = estimatedState?.orientation ?? {};

  return (
    <Card
      title="Estimated State"
      badge={<QualityBadge quality={estimatedState?.overallQuality ?? 'unavailable'} />}
    >
      {/* Position */}
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
        Position (local frame)
      </div>
      <Row label="X" value={pos.x} unit="m" quality={pos.quality} />
      <Row label="Y" value={pos.y} unit="m" quality={pos.quality} />
      <Row label="Z (Altitude)" value={pos.z !== null ? Number(pos.z).toFixed(1) : null} unit="m" quality={pos.quality} />

      {/* Velocity */}
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 16, marginBottom: 4 }}>
        Velocity
      </div>
      <Row label="Vx" value={vel.x} unit="m/s" quality={vel.quality} />
      <Row label="Vy" value={vel.y} unit="m/s" quality={vel.quality} />
      <Row label="Vz" value={null}  unit="m/s" quality="unavailable" />

      {/* Orientation */}
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 16, marginBottom: 4 }}>
        Orientation (gyro-integrated)
      </div>
      <Row label="Roll"  value={ori.roll}  unit="°" quality={ori.quality} />
      <Row label="Pitch" value={ori.pitch} unit="°" quality={ori.quality} />
      <Row label="Yaw"   value={ori.yaw}   unit="°" quality={ori.quality} />
    </Card>
  );
}

// ─── Estimation Quality Card ──────────────────────────────────────────────────
function EstimationQualityCard({ estimatedState, estimatorStatus }) {
  const unc = estimatedState?.uncertainty ?? {};

  const statusLabel = estimatorStatus === 'running' ? 'Running'
                    : estimatorStatus === 'paused'  ? 'Paused'
                    : 'Ready';
  const statusOk    = estimatorStatus === 'running';

  return (
    <Card title="Estimation Quality">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusDot ok={statusOk} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>Estimator Status</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: statusOk ? 'var(--green)' : 'var(--text-muted)' }}>
            {statusLabel}
          </span>
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Overall Quality</span>
          <QualityBadge quality={estimatedState?.overallQuality ?? 'unavailable'} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Uncertainty Level</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: unc.level === 'low' ? 'var(--green)' : unc.level === 'medium' ? 'var(--amber)' : unc.level === 'high' ? 'var(--red)' : 'var(--text-muted)' }}>
            {unc.level === 'unknown' ? 'Unknown' : unc.level === 'low' ? 'Low' : unc.level === 'medium' ? 'Medium' : 'High'}
          </span>
        </div>

        {unc.positionRmse !== null && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Position RMSE</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-secondary)' }}>
              {unc.positionRmse.toFixed(3)} m
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Measured vs Estimated Chart ──────────────────────────────────────────────
function DualLineChart({ measuredData, estimatedData, color1 = '#38BDF8', color2 = '#22C55E', height = 180, unit = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const pad = { top: 12, right: 16, bottom: 28, left: 52 };
    const cw = w - pad.left - pad.right, ch = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const allVals = [...measuredData, ...estimatedData].filter(v => isFinite(v));
    if (allVals.length < 2) return;

    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const range = max - min || 1;

    const px = (i, len) => pad.left + (i / (len - 1)) * cw;
    const py = (v) => pad.top + (1 - (v - min) / range) * ch;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * ch;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.55)';
      ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText((max - (i / 4) * range).toFixed(2), pad.left - 6, y + 3);
    }

    // Draw each series
    const drawLine = (data, color, dashed = false) => {
      if (data.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(px(0, data.length), py(data[0]));
      for (let i = 1; i < data.length; i++) {
        const cpx = (px(i - 1, data.length) + px(i, data.length)) / 2;
        ctx.bezierCurveTo(cpx, py(data[i - 1]), cpx, py(data[i]), px(i, data.length), py(data[i]));
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 1.5 : 2;
      if (dashed) ctx.setLineDash([5, 4]);
      else ctx.setLineDash([]);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawLine(measuredData,  color1, false);  // measured: solid
    drawLine(estimatedData, color2, true);   // estimated: dashed

    // Labels
    ctx.fillStyle = 'rgba(148,163,184,0.4)';
    ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('← Time', pad.left + cw / 2, h - 6);
    if (unit) { ctx.textAlign = 'left'; ctx.fillText(unit, 2, pad.top + 10); }
  }, [measuredData, estimatedData, color1, color2, unit]);

  return (
    <canvas ref={canvasRef} width={900} height={height}
      style={{ width: '100%', height, display: 'block' }} />
  );
}

function MeasurementEstimateChart({ sensorData, estimatedState, estimatorStatus }) {
  const [channel, setChannel] = useState('position.z');
  const [measBuf, setMeasBuf]  = useState(() => Array(CHART_LEN).fill(0));
  const [estBuf,  setEstBuf]   = useState(() => Array(CHART_LEN).fill(0));

  const ch = ESTIMATION_CHANNELS.find(c => c.key === channel);

  useEffect(() => {
    if (estimatorStatus !== 'running') return;

    // Measured value from SensorData
    const measVal = ch?.measuredPath
      ? getChannelValue(sensorData, ch.measuredPath)
      : 0;

    // Estimated value from EstimatedState
    const estVal = getEstimateValue(estimatedState, channel);

    setMeasBuf(prev => [...prev.slice(1), measVal]);
    setEstBuf(prev =>  [...prev.slice(1), estVal ?? 0]);
  }, [sensorData, estimatedState, estimatorStatus, channel, ch]);

  // Reset buffers when channel changes
  useEffect(() => {
    setMeasBuf(Array(CHART_LEN).fill(0));
    setEstBuf(Array(CHART_LEN).fill(0));
  }, [channel]);

  return (
    <Card title="Measured vs Estimated" badge={
      estimatorStatus === 'running' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', animation: 'pulse-dot 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 12, color: 'var(--green)' }}>Live</span>
        </div>
      )
    }>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 18, height: 2, background: '#38BDF8', borderRadius: 2 }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Measured</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 18, height: 0, borderTop: '2px dashed #22C55E' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Estimated</span>
          </div>
        </div>
        <select className="k-select" value={channel} onChange={e => setChannel(e.target.value)}
          id="est-chart-channel" style={{ fontSize: 12, padding: '6px 10px' }}>
          {ESTIMATION_CHANNELS.map(c => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </div>
      <DualLineChart
        measuredData={measBuf}
        estimatedData={estBuf}
        color1="#38BDF8"
        color2="#22C55E"
        height={170}
        unit={ch?.unit ?? ''}
      />
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
        <span>Channel: {ch?.label}</span>
        <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>
          Est: {fmt(getEstimateValue(estimatedState, channel))} {ch?.unit}
        </span>
      </div>
    </Card>
  );
}

// ─── Estimator Controls ───────────────────────────────────────────────────────
function EstimatorControls({ estimatorStatus, estimatorMode, sensorStatus, onStart, onPause, onReset, onSetMode }) {
  const canStart = estimatorStatus !== 'running' && sensorStatus === 'running';
  const canPause = estimatorStatus === 'running';

  return (
    <Card title="Estimator Controls">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Estimator Method</div>
          <select className="k-select" value={estimatorMode} onChange={e => onSetMode(e.target.value)}
            id="estimator-mode-select" style={{ fontSize: 12, width: '100%' }}>
            <option value="basic_filter">Basic Filter</option>
            <option value="model_based">Model-Based Estimate</option>
          </select>
        </div>
      </div>

      {sensorStatus !== 'running' && (
        <div style={{ marginBottom: 14, padding: '8px 12px', background: 'var(--amber-muted)', borderRadius: 6, fontSize: 12, color: 'var(--amber)' }}>
          Start the sensor stream first (Live Sensor Data page) before running estimation.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-primary" onClick={onStart} disabled={!canStart} id="est-start-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
          Start Estimation
        </button>
        <button className="btn-secondary" onClick={onPause} disabled={!canPause} id="est-pause-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="4" width="4" height="16" rx="1" /><rect x="15" y="4" width="4" height="16" rx="1" />
          </svg>
          Pause
        </button>
        <button className="btn-secondary" onClick={onReset} id="est-reset-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
          </svg>
          Reset
        </button>
      </div>

      {estimatorStatus === 'running' && (
        <div style={{ marginTop: 14, display: 'flex', gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Method</div>
            <div style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>
              {estimatorMode === 'model_based' ? 'Model-Based' : 'Basic Filter'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Pipeline</div>
            <div style={{ fontSize: 12, color: 'var(--green)' }}>
              Preprocessor → Estimator
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StateEstimation() {
  const { data: sensorData, status: sensorStatus, sourceName } = useSensorData();
  const {
    estimatedState, estimatorStatus, estimatorMode,
    start, pause, reset, setMode,
  } = useEstimatedState();

  const statusRunning = estimatorStatus === 'running';

  return (
    <div id="state-estimation-page" style={{
      flex: 1, padding: '28px 32px', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            State Estimation
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Sensor fusion and estimated system state
          </p>
        </div>

        {/* Estimator status badge */}
        <div className="card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Estimator</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {estimatorMode === 'model_based' ? 'Model-Based' : 'Basic Filter'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusDot ok={statusRunning} />
            <span style={{ fontSize: 12, fontWeight: 500, color: statusRunning ? 'var(--green)' : 'var(--text-muted)' }}>
              {estimatorStatus === 'running' ? 'Running' : estimatorStatus === 'paused' ? 'Paused' : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Data flow note ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {[
          { label: `Sensor Data (${sourceName === 'simulation' ? 'Simulation' : 'ESP32'})`, accent: true },
          null,
          { label: 'Preprocessing' },
          null,
          { label: 'State Estimation', running: statusRunning },
          null,
          { label: 'Estimated State', accent: statusRunning },
        ].map((item, i) =>
          item === null ? (
            <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ) : (
            <div key={i} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12,
              background: item.running ? 'var(--accent-muted)' : 'var(--card-elevated)',
              border: `1px solid ${item.running ? 'rgba(56,189,248,0.3)' : 'var(--border-strong)'}`,
              color: item.accent ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: item.accent ? 600 : 400,
            }}>
              {item.label}
            </div>
          )
        )}
      </div>

      {/* ── Row 1: Sensor Inputs + Pipeline + Quality ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 220px', gap: 16, alignItems: 'start' }}>
        <SensorInputsCard sensorData={sensorData} />
        <EstimationPipeline estimatorStatus={estimatorStatus} />
        <EstimationQualityCard estimatedState={estimatedState} estimatorStatus={estimatorStatus} />
      </div>

      {/* ── Row 2: Estimated State + Controls ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        <EstimatedStateCard estimatedState={estimatedState} />
        <EstimatorControls
          estimatorStatus={estimatorStatus}
          estimatorMode={estimatorMode}
          sensorStatus={sensorStatus}
          onStart={start}
          onPause={pause}
          onReset={reset}
          onSetMode={setMode}
        />
      </div>

      {/* ── Measured vs Estimated chart ───────────────────────────────────── */}
      <MeasurementEstimateChart
        sensorData={sensorData}
        estimatedState={estimatedState}
        estimatorStatus={estimatorStatus}
      />

      {/* ── Downstream note ───────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 16, borderColor: 'rgba(56,189,248,0.15)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Downstream Pipeline
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {['Estimated State', 'Digital Twin', 'Guidance / Control', 'Analytics'].map((label, i, arr) => (
            <React.Fragment key={label}>
              <div style={{ padding: '5px 12px', borderRadius: 6, background: i === 0 ? 'var(--accent-muted)' : 'var(--card-elevated)', border: `1px solid ${i === 0 ? 'rgba(56,189,248,0.25)' : 'var(--border-strong)'}`, fontSize: 12, color: i === 0 ? 'var(--accent)' : 'var(--text-secondary)' }}>
                {label}
              </div>
              {i < arr.length - 1 && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

    </div>
  );
}
