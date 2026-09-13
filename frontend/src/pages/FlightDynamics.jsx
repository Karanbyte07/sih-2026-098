/**
 * KINETICA — Flight Dynamics Page (Step 5: Digital Twin Layer)
 * ─────────────────────────────────────────────────────────────────────────────
 * Visualizes how the estimated system state evolves over time in a controlled
 * safe dynamic simulation.
 *
 * Core Data Flow:
 *   SensorData → State Estimation → EstimatedState → Flight Dynamics (Dynamic Model) → UpdatedState
 *
 * Safe engineering validation platform:
 *   - No weapons, targeting, actuation, or explosive parameters.
 *   - Pure kinematic / dynamic state propagation with synthetic scenario perturbations.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDynamics } from '../hooks/useDynamics.js';
import { useEstimatedState } from '../hooks/useEstimatedState.js';
import { SCENARIOS, EVOLUTION_VARIABLES, getUpdatedStateValue } from '../dynamics/types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(val, decimals = 2) {
  if (val === null || val === undefined || (typeof val === 'number' && !isFinite(val))) {
    return 'N/A';
  }
  if (typeof val === 'number') {
    return val.toFixed(decimals);
  }
  return String(val);
}

// ─── Canvas Line Chart for State Evolution ────────────────────────────────────

function StateEvolutionChartCanvas({ history, channelKey, color = '#38BDF8', unit = '', height = 150 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const pad = { top: 12, right: 16, bottom: 26, left: 52 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    // Background
    ctx.fillStyle = 'rgba(11, 24, 41, 0.4)';
    ctx.fillRect(pad.left, pad.top, cw, ch);

    if (!history || history.length < 2) {
      // Empty state display
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 3; i++) {
        const y = pad.top + (i / 3) * ch;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(pad.left + cw, y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Awaiting dynamic simulation data — click [Run]', pad.left + cw / 2, pad.top + ch / 2 + 4);
      return;
    }

    const dataPoints = history.map(item => ({
      val: getUpdatedStateValue(item, channelKey) ?? 0,
      t: item.simTime ?? 0,
    }));

    const vals = dataPoints.map(d => d.val);
    let min = Math.min(...vals);
    let max = Math.max(...vals);

    if (Math.abs(max - min) < 0.001) {
      min -= 1;
      max += 1;
    } else {
      const margin = (max - min) * 0.12;
      min -= margin;
      max += margin;
    }
    const range = max - min;

    const tMin = dataPoints[0].t;
    const tMax = dataPoints[dataPoints.length - 1].t;
    const tRange = Math.max(0.1, tMax - tMin);

    const px = (t) => pad.left + ((t - tMin) / tRange) * cw;
    const py = (v) => pad.top + (1 - (v - min) / range) * ch;

    // Horizontal grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (i / gridLines) * ch;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cw, y);
      ctx.stroke();

      // Y-axis label
      const val = max - (i / gridLines) * range;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(1), pad.left - 6, y + 3.5);
    }

    // Gradient fill under curve
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    grad.addColorStop(0, color + '33');
    grad.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(px(dataPoints[0].t), py(dataPoints[0].val));
    for (let i = 1; i < dataPoints.length; i++) {
      ctx.lineTo(px(dataPoints[i].t), py(dataPoints[i].val));
    }
    ctx.lineTo(px(dataPoints[dataPoints.length - 1].t), pad.top + ch);
    ctx.lineTo(px(dataPoints[0].t), pad.top + ch);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line stroke
    ctx.beginPath();
    ctx.moveTo(px(dataPoints[0].t), py(dataPoints[0].val));
    for (let i = 1; i < dataPoints.length; i++) {
      ctx.lineTo(px(dataPoints[i].t), py(dataPoints[i].val));
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Current point dot at end
    const last = dataPoints[dataPoints.length - 1];
    const lastPx = px(last.t);
    const lastPy = py(last.val);
    ctx.beginPath();
    ctx.arc(lastPx, lastPy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lastPx, lastPy, 7.5, 0, Math.PI * 2);
    ctx.strokeStyle = color + '66';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // X-axis time label
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${tMin.toFixed(1)}s`, pad.left, h - 8);
    ctx.textAlign = 'right';
    ctx.fillText(`${tMax.toFixed(1)}s (Sim Time)`, pad.left + cw, h - 8);

    // Unit tag
    if (unit) {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.65)';
      ctx.fillText(unit, 6, pad.top + 10);
    }
  }, [history, channelKey, color, unit]);

  return (
    <canvas
      ref={canvasRef}
      width={780}
      height={height}
      style={{ width: '100%', height, display: 'block', borderRadius: 6 }}
    />
  );
}

// ─── 2D Digital Twin Trajectory View (SVG) ────────────────────────────────────

function DynamicTwinView({ referencePath = [], trajectory = [], currentState }) {
  // Coordinate space bounds:
  // X: 0 to 5200 meters (downrange)
  // Z: 0 to 1000 meters (altitude)
  const maxRangeX = 5200;
  const maxAltZ = 1000;

  const svgWidth = 740;
  const svgHeight = 310;
  const pad = { top: 24, right: 30, bottom: 42, left: 56 };
  const plotW = svgWidth - pad.left - pad.right;
  const plotH = svgHeight - pad.top - pad.bottom;

  const toSvgX = (x) => pad.left + (Math.max(0, Math.min(x, maxRangeX)) / maxRangeX) * plotW;
  const toSvgY = (z) => pad.top + (1 - Math.max(0, Math.min(z, maxAltZ)) / maxAltZ) * plotH;

  // Reference corridor polyline
  const refPointsStr = useMemo(() => {
    if (!referencePath.length) return '';
    return referencePath.map(p => `${toSvgX(p.x).toFixed(1)},${toSvgY(p.z).toFixed(1)}`).join(' ');
  }, [referencePath]);

  // Simulated path polyline
  const simPointsStr = useMemo(() => {
    if (!trajectory.length) return '';
    return trajectory.map(p => `${toSvgX(p.x).toFixed(1)},${toSvgY(p.z).toFixed(1)}`).join(' ');
  }, [trajectory]);

  // Current state point
  const curX = currentState?.position?.x ?? 0;
  const curZ = currentState?.position?.z ?? (referencePath[0]?.z ?? 850);
  const curSvgX = toSvgX(curX);
  const curSvgY = toSvgY(curZ);

  // X ticks: 0, 1000, 2000, 3000, 4000, 5000 m
  const xTicks = [0, 1000, 2000, 3000, 4000, 5000];
  // Z ticks: 0, 250, 500, 750, 1000 m
  const zTicks = [0, 250, 500, 750, 1000];

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: '100%', height: 'auto', display: 'block', background: 'rgba(11, 24, 41, 0.45)', borderRadius: 8 }}
      >
        <defs>
          <pattern id="twinGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Background Grid Pattern */}
        <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="url(#twinGrid)" />

        {/* Horizontal Grid lines and Altitude labels */}
        {zTicks.map(z => {
          const yPos = toSvgY(z);
          return (
            <g key={z}>
              <line
                x1={pad.left}
                y1={yPos}
                x2={pad.left + plotW}
                y2={yPos}
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth="1"
              />
              <text
                x={pad.left - 8}
                y={yPos + 3.5}
                fill="rgba(148, 163, 184, 0.6)"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="end"
              >
                {z}m
              </text>
            </g>
          );
        })}

        {/* Vertical Grid lines and Downrange labels */}
        {xTicks.map(x => {
          const xPos = toSvgX(x);
          return (
            <g key={x}>
              <line
                x1={xPos}
                y1={pad.top}
                x2={xPos}
                y2={pad.top + plotH}
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth="1"
              />
              <text
                x={xPos}
                y={pad.top + plotH + 16}
                fill="rgba(148, 163, 184, 0.6)"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
              >
                {x}m
              </text>
            </g>
          );
        })}

        {/* Coordinate Axes */}
        <line
          x1={pad.left}
          y1={pad.top + plotH}
          x2={pad.left + plotW}
          y2={pad.top + plotH}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.2"
        />
        <line
          x1={pad.left}
          y1={pad.top}
          x2={pad.left}
          y2={pad.top + plotH}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.2"
        />

        {/* Axis Labels */}
        <text
          x={pad.left + plotW / 2}
          y={pad.top + plotH + 32}
          fill="rgba(148, 163, 184, 0.7)"
          fontSize="11"
          fontFamily="Inter, sans-serif"
          textAnchor="middle"
        >
          Downrange X (meters) →
        </text>
        <text
          x={pad.left - 36}
          y={pad.top + plotH / 2}
          fill="rgba(148, 163, 184, 0.7)"
          fontSize="11"
          fontFamily="Inter, sans-serif"
          textAnchor="middle"
          transform={`rotate(-90 ${pad.left - 36} ${pad.top + plotH / 2})`}
        >
          ↑ Altitude Z (meters)
        </text>

        {/* Reference Flight Path (Dashed gray) */}
        {refPointsStr && (
          <polyline
            points={refPointsStr}
            fill="none"
            stroke="rgba(148, 163, 184, 0.4)"
            strokeWidth="1.6"
            strokeDasharray="4 3"
          />
        )}

        {/* Simulated Flight Path (Solid cyan) */}
        {simPointsStr && (
          <polyline
            points={simPointsStr}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Origin Marker */}
        <circle cx={toSvgX(0)} cy={toSvgY(850)} r="3" fill="#94A3B8" />

        {/* Target Horizon Marker */}
        <circle cx={toSvgX(5200)} cy={toSvgY(0)} r="4" fill="#22C55E" />

        {/* Current State Marker (Pulsing halo and center) */}
        <circle
          cx={curSvgX}
          cy={curSvgY}
          r="10"
          fill="rgba(56, 189, 248, 0.18)"
        />
        <circle
          cx={curSvgX}
          cy={curSvgY}
          r="4.5"
          fill="#38BDF8"
          stroke="#FFFFFF"
          strokeWidth="1.2"
        />

        {/* Floating Readout Pill next to Marker */}
        <g transform={`translate(${Math.min(curSvgX + 10, pad.left + plotW - 130)}, ${Math.max(curSvgY - 26, pad.top + 8)})`}>
          <rect
            width="122"
            height="22"
            rx="4"
            fill="#0F2035"
            stroke="rgba(56, 189, 248, 0.4)"
            strokeWidth="1"
          />
          <text
            x="61"
            y="14.5"
            fill="#38BDF8"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
            textAnchor="middle"
          >
            X: {curX.toFixed(0)}m · Z: {curZ.toFixed(0)}m
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div style={{
        marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, padding: '0 4px', fontSize: 12, color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 18, height: 2, background: '#94A3B8', borderTop: '1px dashed #94A3B8' }} />
            <span>Reference Corridor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 18, height: 2.5, background: '#38BDF8', borderRadius: 2 }} />
            <span style={{ color: '#38BDF8' }}>Simulated Trajectory</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38BDF8', border: '1.5px solid #FFFFFF' }} />
            <span>Current State Marker</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Coordinate System: Local ENU (East-North-Up)</span>
        </div>
      </div>
    </div>
  );
}

// ─── Current State Card ───────────────────────────────────────────────────────

function CurrentStateCard({ state }) {
  const pos = state?.position ?? {};
  const vel = state?.velocity ?? {};
  const acc = state?.acceleration ?? {};
  const ori = state?.orientation ?? {};
  const simTime = state?.simTime ?? 0;

  const sections = [
    {
      title: 'Position',
      rows: [
        { label: 'X (Downrange)', val: pos.x, unit: 'm' },
        { label: 'Y (Cross-range)', val: pos.y, unit: 'm' },
        { label: 'Z (Altitude)', val: pos.z, unit: 'm' },
      ],
    },
    {
      title: 'Velocity',
      rows: [
        { label: 'X (Axial)', val: vel.x, unit: 'm/s' },
        { label: 'Y (Lateral)', val: vel.y, unit: 'm/s' },
        { label: 'Z (Vertical)', val: vel.z, unit: 'm/s' },
      ],
    },
    {
      title: 'Acceleration',
      rows: [
        { label: 'X (Axial)', val: acc.x, unit: 'm/s²' },
        { label: 'Y (Lateral)', val: acc.y, unit: 'm/s²' },
        { label: 'Z (Normal)', val: acc.z, unit: 'm/s²' },
      ],
    },
    {
      title: 'Orientation',
      rows: [
        { label: 'Roll', val: ori.roll, unit: '°' },
        { label: 'Pitch', val: ori.pitch, unit: '°' },
        { label: 'Yaw', val: ori.yaw, unit: '°' },
      ],
    },
  ];

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Current State</span>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Supported model variables</p>
        </div>
        <div style={{
          padding: '3px 9px', borderRadius: 100, background: 'var(--accent-muted)',
          border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', gap: 5
        }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>T:</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
            {fmt(simTime, 2)} s
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sections.map(sec => (
          <div key={sec.title}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6
            }}>
              {sec.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.15)', borderRadius: 6, padding: '4px 10px' }}>
              {sec.rows.map(r => (
                <div key={r.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 0', borderBottom: '1px solid var(--border)'
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.label}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{
                      fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 500,
                      color: r.val === null ? 'var(--text-muted)' : 'var(--text-primary)'
                    }}>
                      {fmt(r.val)}
                    </span>
                    {r.val !== null && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{r.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Model Status Card ────────────────────────────────────────────────────────

function ModelStatusCard({ status, isEstimatorAvailable }) {
  const statusConfig = {
    ready: { label: 'Ready', color: 'var(--accent)', bg: 'var(--accent-muted)', dot: 'pulse-blue' },
    running: { label: 'Running', color: 'var(--green)', bg: 'var(--green-muted)', dot: 'pulse-green' },
    paused: { label: 'Paused', color: 'var(--amber)', bg: 'var(--amber-muted)', dot: 'pulse-amber' },
    complete: { label: 'Complete', color: 'var(--green)', bg: 'var(--green-muted)', dot: null },
    error: { label: 'Model Error', color: 'var(--red)', bg: 'var(--red-muted)', dot: 'pulse-amber' },
  }[status] || { label: status, color: 'var(--text-muted)', bg: 'var(--border)', dot: null };

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Model Status</span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
          background: statusConfig.bg, color: statusConfig.color, display: 'inline-flex', alignItems: 'center', gap: 5
        }}>
          {statusConfig.dot && <span className={`pulse-dot ${statusConfig.dot}`} />}
          {statusConfig.label}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Input</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isEstimatorAvailable ? 'var(--green)' : 'var(--amber)'
            }} />
            <span style={{ fontSize: 12, color: isEstimatorAvailable ? 'var(--green)' : 'var(--amber)', fontWeight: 500 }}>
              {isEstimatorAvailable ? 'Estimated State (Live)' : 'Default Reference Baseline'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Output</span>
          <span style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>Updated State</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Update Mode</span>
          <span style={{ fontSize: 12, color: status === 'running' ? 'var(--green)' : 'var(--text-muted)' }}>
            {status === 'running' ? 'Continuous (20 Hz)' : 'Paused'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Simulation Controls Card ─────────────────────────────────────────────────

function SimulationControlsCard({ status, scenario, onStart, onPause, onReset, onSetScenario }) {
  const isRunning = status === 'running';

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
        Simulation Controls
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          Scenario
        </label>
        <select
          className="k-select"
          value={scenario}
          onChange={(e) => onSetScenario(e.target.value)}
          disabled={isRunning}
          style={{ width: '100%', fontSize: 12, padding: '7px 10px' }}
        >
          {SCENARIOS.map((sc) => (
            <option key={sc.id} value={sc.id}>
              {sc.label}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {SCENARIOS.find(s => s.id === scenario)?.description}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="btn-primary"
          onClick={onStart}
          disabled={isRunning}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6 4 20 12 6 20 6 4" />
          </svg>
          Run
        </button>

        <button
          className="btn-secondary"
          onClick={onPause}
          disabled={!isRunning}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="4" width="4" height="16" rx="1" />
            <rect x="15" y="4" width="4" height="16" rx="1" />
          </svg>
          Pause
        </button>

        <button
          className="btn-secondary"
          onClick={onReset}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
          Reset
        </button>
      </div>
    </div>
  );
}

// ─── Main Flight Dynamics Page Component ──────────────────────────────────────

export default function FlightDynamics() {
  const {
    state,
    status,
    scenario,
    trajectory,
    referencePath,
    history,
    isEstimatorAvailable,
    start,
    pause,
    reset,
    setScenario,
  } = useDynamics();

  const { estimatedState } = useEstimatedState();

  // Selected variable for State Evolution Chart
  const [selectedVarId, setSelectedVarId] = useState('position');
  const activeVar = EVOLUTION_VARIABLES.find(v => v.id === selectedVarId) || EVOLUTION_VARIABLES[0];
  const [selectedChannelKey, setSelectedChannelKey] = useState('position.z');

  // When variable changes, default to its first channel
  const handleVarChange = (varId) => {
    setSelectedVarId(varId);
    const v = EVOLUTION_VARIABLES.find(item => item.id === varId);
    if (v && v.channels.length > 0) {
      setSelectedChannelKey(v.channels[0].key);
    }
  };

  const activeChannel = activeVar.channels.find(c => c.key === selectedChannelKey) || activeVar.channels[0];

  // Calculate 3-4 supporting metrics:
  // 1. Simulation Time
  // 2. Current Altitude (Z)
  // 3. Current Velocity Magnitude (|V|)
  // 4. Trajectory Deviation (distance from reference path at current X)
  const altitude = state?.position?.z ?? 850;
  const vx = state?.velocity?.x ?? 0;
  const vy = state?.velocity?.y ?? 0;
  const vz = state?.velocity?.z ?? 0;
  const speedMagnitude = Math.sqrt(vx * vx + vy * vy + vz * vz);

  // Path deviation from reference
  const curX = state?.position?.x ?? 0;
  const nominalRefPoint = referencePath.reduce((prev, curr) => {
    return Math.abs(curr.x - curX) < Math.abs(prev.x - curX) ? curr : prev;
  }, referencePath[0] || { x: 0, z: 850 });
  const deviationMeters = Math.abs(altitude - (nominalRefPoint?.z ?? altitude));

  return (
    <div style={{ flex: 1, padding: 28, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Flight Dynamics
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Digital Twin &amp; System Behaviour
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 12, padding: '4px 12px', borderRadius: 100,
            background: status === 'running' ? 'var(--green-muted)' : 'var(--border)',
            color: status === 'running' ? 'var(--green)' : 'var(--text-secondary)',
            border: `1px solid ${status === 'running' ? 'rgba(34,197,94,0.3)' : 'var(--border-strong)'}`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: status === 'running' ? 'var(--green)' : 'var(--text-muted)',
              animation: status === 'running' ? 'pulse-dot 2s ease-in-out infinite' : 'none'
            }} />
            Digital Twin · {status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Architecture Data Flow Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        background: 'rgba(15, 32, 53, 0.6)', border: '1px solid var(--border)',
        borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap',
      }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
          Pipeline
        </span>
        <span style={{ color: 'var(--border-strong)' }}>│</span>

        <span style={{ color: isEstimatorAvailable ? 'var(--green)' : 'var(--text-muted)' }}>
          EstimatedState
        </span>
        <span style={{ color: 'var(--text-muted)' }}>→</span>

        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
          Dynamic Model
        </span>
        <span style={{ color: 'var(--text-muted)' }}>→</span>

        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
          Updated State
        </span>
        <span style={{ color: 'var(--text-muted)' }}>→</span>

        <span>Simulation over Time</span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 4,
            background: isEstimatorAvailable ? 'var(--green-muted)' : 'var(--amber-muted)',
            color: isEstimatorAvailable ? 'var(--green)' : 'var(--amber)',
          }}>
            {isEstimatorAvailable ? 'Estimator Coupled' : 'Default Seed'}
          </span>
        </div>
      </div>

      {/* Estimator notice if unavailable */}
      {!isEstimatorAvailable && (
        <div style={{
          padding: '10px 14px', background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, color: 'var(--amber)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              <strong>Estimator data unavailable:</strong> State Estimation has not provided active live states. The Digital Twin is ready using a safe baseline trajectory.
            </span>
          </div>
        </div>
      )}

      {/* Error Banner if dynamic simulation fails */}
      {status === 'error' && (
        <div style={{
          padding: '12px 16px', background: 'var(--red-muted)',
          border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 13, color: 'var(--red)'
        }}>
          <span>Model Error: {state?.error || 'Unknown simulation fault'}</span>
          <button className="btn-secondary" onClick={reset} style={{ padding: '4px 12px', fontSize: 12 }}>
            Reset Model
          </button>
        </div>
      )}

      {/* 3-4 Supporting KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="kpi-card" style={{ padding: '14px 18px' }}>
          <div className="section-title" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Simulation Time
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
            <span className="kpi-value mono" style={{ fontSize: 20 }}>{fmt(state?.simTime, 2)}</span>
            <span className="kpi-unit">s</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Elapsed integration
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '14px 18px' }}>
          <div className="section-title" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Current Altitude (Z)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
            <span className="kpi-value mono" style={{ fontSize: 20, color: 'var(--accent)' }}>{fmt(altitude, 1)}</span>
            <span className="kpi-unit">m</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Downrange: {fmt(curX, 0)} m
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '14px 18px' }}>
          <div className="section-title" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Velocity Magnitude
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
            <span className="kpi-value mono" style={{ fontSize: 20, color: 'var(--teal)' }}>{fmt(speedMagnitude, 1)}</span>
            <span className="kpi-unit">m/s</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Axial: {fmt(vx, 1)} m/s
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '14px 18px' }}>
          <div className="section-title" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Path Deviation
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
            <span className="kpi-value mono" style={{
              fontSize: 20,
              color: deviationMeters < 50 ? 'var(--green)' : 'var(--amber)'
            }}>
              ±{fmt(deviationMeters, 1)}
            </span>
            <span className="kpi-unit">m</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            vs. Reference Corridor
          </div>
        </div>
      </div>

      {/* Main Content Layout: Left = Viz + Chart, Right = Current State + Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left Column: 1 Main Digital Twin Viz + 1 State Evolution Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 1. Main Digital Twin View */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Digital Twin</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Dynamic System Model (2D Kinematics)</p>
              </div>
              <div style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)'
              }}>
                Points: {trajectory.length}
              </div>
            </div>

            <DynamicTwinView
              referencePath={referencePath}
              trajectory={trajectory}
              currentState={state}
            />
          </div>

          {/* 4. State Evolution Chart (ONE Chart) */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>State Evolution</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Selected variable evolution over time
                </p>
              </div>

              {/* Variable and Channel Selectors */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  className="k-select"
                  value={selectedVarId}
                  onChange={(e) => handleVarChange(e.target.value)}
                  style={{ fontSize: 12, padding: '5px 10px' }}
                >
                  {EVOLUTION_VARIABLES.map(v => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>

                <select
                  className="k-select"
                  value={selectedChannelKey}
                  onChange={(e) => setSelectedChannelKey(e.target.value)}
                  style={{ fontSize: 12, padding: '5px 10px' }}
                >
                  {activeVar.channels.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <StateEvolutionChartCanvas
              history={history}
              channelKey={activeChannel.key}
              color={activeChannel.color}
              unit={activeChannel.unit}
              height={160}
            />

            <div style={{
              marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: 12, color: 'var(--text-muted)'
            }}>
              <span>Variable: <strong style={{ color: 'var(--text-primary)' }}>{activeChannel.label}</strong></span>
              <span style={{ fontFamily: 'JetBrains Mono', color: activeChannel.color }}>
                Current: {fmt(getUpdatedStateValue(state, activeChannel.key))} {activeChannel.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: 2. Current State + 3. Model Status + 5. Simulation Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 3. Model Status */}
          <ModelStatusCard
            status={status}
            isEstimatorAvailable={isEstimatorAvailable}
          />

          {/* 5. Simulation Controls */}
          <SimulationControlsCard
            status={status}
            scenario={scenario}
            onStart={start}
            onPause={pause}
            onReset={reset}
            onSetScenario={setScenario}
          />

          {/* 2. Current State */}
          <CurrentStateCard state={state} />
        </div>
      </div>
    </div>
  );
}
