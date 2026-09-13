/**
 * KINETICA — Guidance & Control Page (Step 6)
 * ─────────────────────────────────────────────────────────────────────────────
 * Reference tracking, deviation analysis, and closed-loop control response.
 *
 * Core Data Flow:
 *   SensorData → State Estimation (EstimatedState)
 *                           ↓
 *   Digital Twin (dynamicsManager) → UpdatedState
 *                           ↓
 *   Deviation Analysis (Tracking & Estimation Error)
 *                           ↓
 *   Guidance Decision Pipeline
 *                           ↓
 *   Simulated Control Response Model
 *                           ↓
 *   Feedback to Digital Twin (Closed Loop)
 *
 * Safe engineering validation platform:
 *   - No weapons, targeting reticles, firing indicators, or munition parameters.
 *   - Abstract closed-loop restoring response and error tracking.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGuidance } from '../hooks/useGuidance.js';
import { SCENARIOS } from '../dynamics/types.js';

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

// ─── 1. Main Trajectory View (2D / 3D Toggle) ─────────────────────────────────

function GuidanceTrajectoryView({ referencePath = [], trajectory = [], currentState, deviation, is3D, onToggle3D }) {
  const maxRangeX = 5200;
  const maxAltZ = 1000;

  const svgWidth = 740;
  const svgHeight = 310;
  const pad = { top: 24, right: 30, bottom: 42, left: 56 };
  const plotW = svgWidth - pad.left - pad.right;
  const plotH = svgHeight - pad.top - pad.bottom;

  // 2D Projection
  const toSvgX = (x) => pad.left + (Math.max(0, Math.min(x, maxRangeX)) / maxRangeX) * plotW;
  const toSvgY = (z) => pad.top + (1 - Math.max(0, Math.min(z, maxAltZ)) / maxAltZ) * plotH;

  // 3D Isometric Projection
  // X (downrange): right-down; Y (cross-range): left-down; Z (altitude): straight up
  const toIso = (x, y, z) => {
    const cx = svgWidth * 0.46;
    const cy = svgHeight * 0.62;
    const normX = (x / maxRangeX) * 360;
    const normY = ((y || 0) / 300) * 120;
    const normZ = (z / maxAltZ) * 160;

    const isoX = cx + (normX - normY) * 0.88;
    const isoY = cy + (normX + normY) * 0.32 - normZ;
    return { x: isoX, y: isoY };
  };

  const curX = currentState?.position?.x ?? 0;
  const curY = currentState?.position?.y ?? 0;
  const curZ = currentState?.position?.z ?? (referencePath[0]?.z ?? 850);

  // Closest reference point
  const closestRef = useMemo(() => {
    if (!referencePath.length) return { x: 0, y: 0, z: 850 };
    return referencePath.reduce((prev, curr) => {
      return Math.abs(curr.x - curX) < Math.abs(prev.x - curX) ? curr : prev;
    }, referencePath[0]);
  }, [referencePath, curX]);

  // 2D Polylines
  const ref2DStr = useMemo(() => {
    if (!referencePath.length) return '';
    return referencePath.map(p => `${toSvgX(p.x).toFixed(1)},${toSvgY(p.z).toFixed(1)}`).join(' ');
  }, [referencePath]);

  const sim2DStr = useMemo(() => {
    if (!trajectory.length) return '';
    return trajectory.map(p => `${toSvgX(p.x).toFixed(1)},${toSvgY(p.z).toFixed(1)}`).join(' ');
  }, [trajectory]);

  // 3D Polylines
  const ref3DStr = useMemo(() => {
    if (!referencePath.length) return '';
    return referencePath.map(p => {
      const pt = toIso(p.x, 0, p.z);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');
  }, [referencePath]);

  const sim3DStr = useMemo(() => {
    if (!trajectory.length) return '';
    return trajectory.map(p => {
      const pt = toIso(p.x, p.y, p.z);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');
  }, [trajectory]);

  const cur2D = { x: toSvgX(curX), y: toSvgY(curZ) };
  const ref2D = { x: toSvgX(closestRef.x), y: toSvgY(closestRef.z) };

  const cur3D = toIso(curX, curY, curZ);
  const ref3D = toIso(closestRef.x, 0, closestRef.z);

  const curPt = is3D ? cur3D : cur2D;
  const refPt = is3D ? ref3D : ref2D;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* 2D / 3D Toggle Button */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, display: 'flex', gap: 4, background: 'rgba(15, 32, 53, 0.85)', padding: 3, borderRadius: 6, border: '1px solid var(--border)' }}>
        <button
          className={!is3D ? 'btn-primary' : 'btn-secondary'}
          onClick={() => onToggle3D(false)}
          style={{ padding: '3px 10px', fontSize: 11, minHeight: 'auto' }}
        >
          2D View
        </button>
        <button
          className={is3D ? 'btn-primary' : 'btn-secondary'}
          onClick={() => onToggle3D(true)}
          style={{ padding: '3px 10px', fontSize: 11, minHeight: 'auto' }}
        >
          3D Perspective
        </button>
      </div>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: '100%', height: 'auto', display: 'block', background: 'rgba(11, 24, 41, 0.55)', borderRadius: 8 }}
      >
        <defs>
          <pattern id="guidanceGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
          </pattern>
        </defs>

        {!is3D ? (
          // ─── 2D Mode ────────────────────────────────────────────────────────
          <>
            <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="url(#guidanceGrid)" />

            {/* Altitude Ticks */}
            {[0, 250, 500, 750, 1000].map(z => (
              <g key={z}>
                <line x1={pad.left} y1={toSvgY(z)} x2={pad.left + plotW} y2={toSvgY(z)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <text x={pad.left - 8} y={toSvgY(z) + 3.5} fill="rgba(148,163,184,0.6)" fontSize="10" fontFamily="JetBrains Mono, monospace" textAnchor="end">
                  {z}m
                </text>
              </g>
            ))}

            {/* Downrange Ticks */}
            {[0, 1000, 2000, 3000, 4000, 5000].map(x => (
              <g key={x}>
                <line x1={toSvgX(x)} y1={pad.top} x2={toSvgX(x)} y2={pad.top + plotH} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <text x={toSvgX(x)} y={pad.top + plotH + 16} fill="rgba(148,163,184,0.6)" fontSize="10" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
                  {x}m
                </text>
              </g>
            ))}

            {/* Axes */}
            <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH} stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
            <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH} stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />

            <text x={pad.left + plotW / 2} y={pad.top + plotH + 32} fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle">
              Downrange (meters) →
            </text>
            <text x={pad.left - 36} y={pad.top + plotH / 2} fill="rgba(148,163,184,0.7)" fontSize="11" textAnchor="middle" transform={`rotate(-90 ${pad.left - 36} ${pad.top + plotH / 2})`}>
              ↑ Altitude (meters)
            </text>

            {/* Reference Path */}
            {ref2DStr && (
              <polyline points={ref2DStr} fill="none" stroke="rgba(148, 163, 184, 0.45)" strokeWidth="1.8" strokeDasharray="5 3.5" />
            )}

            {/* Simulated Path */}
            {sim2DStr && (
              <polyline points={sim2DStr} fill="none" stroke="#38BDF8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* Deviation Vector Line */}
            <line
              x1={curPt.x}
              y1={curPt.y}
              x2={refPt.x}
              y2={refPt.y}
              stroke="var(--amber)"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            {/* Reference point dot */}
            <circle cx={refPt.x} cy={refPt.y} r="3" fill="#94A3B8" />

            {/* Current State Marker */}
            <circle cx={curPt.x} cy={curPt.y} r="9" fill="rgba(56, 189, 248, 0.2)" />
            <circle cx={curPt.x} cy={curPt.y} r="4.5" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.2" />

            {/* Deviation Readout Tag */}
            <g transform={`translate(${Math.min(curPt.x + 12, pad.left + plotW - 130)}, ${Math.max(curPt.y - 28, pad.top + 8)})`}>
              <rect width="124" height="22" rx="4" fill="#0F2035" stroke="rgba(245, 158, 11, 0.5)" strokeWidth="1" />
              <text x="62" y="14.5" fill="var(--amber)" fontSize="10" fontFamily="JetBrains Mono, monospace" textAnchor="middle">
                Error: {fmt(deviation?.trackingError, 1)}m
              </text>
            </g>
          </>
        ) : (
          // ─── 3D Isometric Mode ──────────────────────────────────────────────
          <>
            {/* Isometric Ground Grid Wireframe */}
            {[0, 1500, 3000, 4500].map(x => {
              const p1 = toIso(x, -200, 0);
              const p2 = toIso(x, 200, 0);
              return <line key={`x-${x}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
            })}
            {[-200, -100, 0, 100, 200].map(y => {
              const p1 = toIso(0, y, 0);
              const p2 = toIso(5000, y, 0);
              return <line key={`y-${y}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
            })}

            {/* Altitude reference masts */}
            <line x1={toIso(0, 0, 0).x} y1={toIso(0, 0, 0).y} x2={toIso(0, 0, 1000).x} y2={toIso(0, 0, 1000).y} stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeDasharray="3 3" />
            <text x={toIso(0, 0, 1000).x - 6} y={toIso(0, 0, 1000).y} fill="rgba(148,163,184,0.6)" fontSize="10" textAnchor="end">1000m</text>

            {/* 3D Reference Path */}
            {ref3DStr && (
              <polyline points={ref3DStr} fill="none" stroke="rgba(148, 163, 184, 0.45)" strokeWidth="1.8" strokeDasharray="5 3.5" />
            )}

            {/* 3D Simulated Path */}
            {sim3DStr && (
              <polyline points={sim3DStr} fill="none" stroke="#38BDF8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* 3D Deviation Line */}
            <line x1={curPt.x} y1={curPt.y} x2={refPt.x} y2={refPt.y} stroke="var(--amber)" strokeWidth="1.5" strokeDasharray="2 2" />

            {/* Ground shadow projection */}
            <ellipse cx={toIso(curX, curY, 0).x} cy={toIso(curX, curY, 0).y} rx="12" ry="5" fill="rgba(56,189,248,0.12)" />
            <line x1={curPt.x} y1={curPt.y} x2={toIso(curX, curY, 0).x} y2={toIso(curX, curY, 0).y} stroke="rgba(56,189,248,0.15)" strokeWidth="1" strokeDasharray="2 2" />

            {/* 3D Current State Marker */}
            <circle cx={curPt.x} cy={curPt.y} r="9" fill="rgba(56, 189, 248, 0.25)" />
            <circle cx={curPt.x} cy={curPt.y} r="4.5" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1.2" />

            <text x={curPt.x + 12} y={curPt.y - 8} fill="#38BDF8" fontSize="10" fontFamily="JetBrains Mono, monospace">
              Δ: {fmt(deviation?.trackingError, 1)}m
            </text>
          </>
        )}
      </svg>

      {/* Trajectory Legend */}
      <div style={{
        marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, padding: '0 4px', fontSize: 12, color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 18, height: 2, background: '#94A3B8', borderTop: '1px dashed #94A3B8' }} />
            <span>Reference Path</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 18, height: 2.5, background: '#38BDF8', borderRadius: 2 }} />
            <span style={{ color: '#38BDF8' }}>Simulated Path</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38BDF8', border: '1.5px solid #FFFFFF' }} />
            <span>Current State</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 1.5, background: 'var(--amber)', borderTop: '1px dashed var(--amber)' }} />
            <span style={{ color: 'var(--amber)' }}>Deviation Gap</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Frame: NED Coordinate System</span>
        </div>
      </div>
    </div>
  );
}

// ─── 4. Guidance Decision Flow Panel ──────────────────────────────────────────

function GuidanceDecisionPanel({ decision, closedLoopActive, onToggleClosedLoop }) {
  const steps = [
    { id: 'within_reference', title: 'Reference Baseline', desc: 'Corridor standard' },
    { id: 'compare_state', title: 'Compare State', desc: 'Reference vs. Estimated' },
    { id: 'deviation_detected', title: 'Deviation Check', desc: 'Tracking tolerance' },
    { id: 'correction_evaluated', title: 'Correction Evaluated', desc: 'Restoring demand' },
    { id: 'control_response', title: 'Control Response', desc: 'Closed-loop feedback' },
  ];

  // Active step index
  let activeIndex = 1;
  if (decision?.stage === 'within_reference') activeIndex = 0;
  else if (decision?.stage === 'deviation_detected') activeIndex = 2;
  else if (decision?.stage === 'correction_evaluated') activeIndex = 3;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Guidance Decision</span>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Sequential decision-flow evaluation</p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
          background: decision?.status === 'nominal' ? 'var(--green-muted)' : 'var(--amber-muted)',
          color: decision?.status === 'nominal' ? 'var(--green)' : 'var(--amber)',
        }}>
          {decision?.label || 'Within Reference'}
        </span>
      </div>

      {/* Horizontal Flow Steps */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', marginBottom: 16 }}>
        {steps.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: isCurrent ? 'var(--accent)' : isDone ? 'var(--green)' : 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: isCurrent ? '2px solid rgba(56,189,248,0.5)' : 'none',
                color: isCurrent || isDone ? '#0B1829' : 'var(--text-muted)',
                fontSize: 11, fontWeight: 700,
              }}>
                {isDone ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span style={{
                fontSize: 10, marginTop: 6, fontWeight: isCurrent ? 600 : 400,
                color: isCurrent ? 'var(--accent)' : isDone ? 'var(--text-primary)' : 'var(--text-muted)',
                textAlign: 'center',
              }}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Decision Summary Banner */}
      <div style={{
        padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: 6,
        border: '1px solid var(--border)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <span style={{ color: 'var(--text-secondary)' }}>
          {decision?.actionSummary || 'Evaluating trajectory compliance'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Closed-Loop:</span>
          <button
            onClick={() => onToggleClosedLoop(!closedLoopActive)}
            style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer',
              background: closedLoopActive ? 'var(--green-muted)' : 'rgba(255,255,255,0.05)',
              color: closedLoopActive ? 'var(--green)' : 'var(--text-muted)',
              border: `1px solid ${closedLoopActive ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
            }}
          >
            {closedLoopActive ? 'ACTIVE (FEEDBACK ON)' : 'OFF (OPEN LOOP)'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 8. Supporting Chart: Tracking Error vs Time ───────────────────────────────

function TrackingErrorChart({ errorHistory = [], height = 150 }) {
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

    if (!errorHistory || errorHistory.length < 2) {
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
      ctx.fillText('Tracking error profile will record as simulation runs', pad.left + cw / 2, pad.top + ch / 2 + 4);
      return;
    }

    const vals = errorHistory.map(d => d.error);
    const maxVal = Math.max(10, Math.max(...vals) * 1.2);
    const minVal = 0;
    const range = maxVal - minVal;

    const tMin = errorHistory[0].t;
    const tMax = errorHistory[errorHistory.length - 1].t;
    const tRange = Math.max(0.1, tMax - tMin);

    const px = (t) => pad.left + ((t - tMin) / tRange) * cw;
    const py = (v) => pad.top + (1 - (v - minVal) / range) * ch;

    // Horizontal grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = pad.top + (i / 3) * ch;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cw, y);
      ctx.stroke();

      const labelVal = maxVal - (i / 3) * range;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${labelVal.toFixed(0)}m`, pad.left - 6, y + 3.5);
    }

    // Gradient fill under error curve
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.3)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    ctx.beginPath();
    ctx.moveTo(px(errorHistory[0].t), py(errorHistory[0].error));
    for (let i = 1; i < errorHistory.length; i++) {
      ctx.lineTo(px(errorHistory[i].t), py(errorHistory[i].error));
    }
    ctx.lineTo(px(errorHistory[errorHistory.length - 1].t), pad.top + ch);
    ctx.lineTo(px(errorHistory[0].t), pad.top + ch);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line stroke
    ctx.beginPath();
    ctx.moveTo(px(errorHistory[0].t), py(errorHistory[0].error));
    for (let i = 1; i < errorHistory.length; i++) {
      ctx.lineTo(px(errorHistory[i].t), py(errorHistory[i].error));
    }
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Last point marker
    const last = errorHistory[errorHistory.length - 1];
    ctx.beginPath();
    ctx.arc(px(last.t), py(last.error), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#F59E0B';
    ctx.fill();

    // X-axis time label
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${tMin.toFixed(1)}s`, pad.left, h - 8);
    ctx.textAlign = 'right';
    ctx.fillText(`${tMax.toFixed(1)}s (Sim Time)`, pad.left + cw, h - 8);
  }, [errorHistory]);

  return (
    <canvas
      ref={canvasRef}
      width={780}
      height={height}
      style={{ width: '100%', height, display: 'block', borderRadius: 6 }}
    />
  );
}

// ─── 2. Reference vs Estimated State Comparison Panel ─────────────────────────

function ReferenceVsEstimatedPanel({ refPoint, estimatedState, dynamicState }) {
  const estPos = estimatedState?.position ?? {};
  const estVel = estimatedState?.velocity ?? {};
  const estOri = estimatedState?.orientation ?? {};

  // Reference variables
  const refPos = { x: refPoint?.x ?? 0, y: 0, z: refPoint?.z ?? 850 };
  const refVel = { x: 165, y: 0, z: -10 };
  const refOri = { roll: 0, pitch: -3.5, yaw: 0 };

  const compRows = [
    { label: 'Position X (Downrange)', ref: `${fmt(refPos.x, 0)} m`, est: estPos.x !== null ? `${fmt(estPos.x, 0)} m` : 'N/A' },
    { label: 'Position Y (Cross-range)', ref: `${fmt(refPos.y, 0)} m`, est: estPos.y !== null ? `${fmt(estPos.y, 0)} m` : 'N/A' },
    { label: 'Position Z (Altitude)', ref: `${fmt(refPos.z, 0)} m`, est: estPos.z !== null ? `${fmt(estPos.z, 0)} m` : 'N/A' },
    { label: 'Velocity Axial (Vx)', ref: `${fmt(refVel.x, 0)} m/s`, est: estVel.x !== null ? `${fmt(estVel.x, 0)} m/s` : 'N/A' },
    { label: 'Velocity Vertical (Vz)', ref: `${fmt(refVel.z, 0)} m/s`, est: estVel.z !== null ? `${fmt(estVel.z, 0)} m/s` : 'N/A' },
    { label: 'Pitch Angle', ref: `${fmt(refOri.pitch, 1)}°`, est: estOri.pitch !== null ? `${fmt(estOri.pitch, 1)}°` : 'N/A' },
  ];

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          Reference vs. Estimated State
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Comparison</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', paddingBottom: 6, borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
        <span>Variable</span>
        <span style={{ textAlign: 'right' }}>Reference</span>
        <span style={{ textAlign: 'right' }}>Estimated</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {compRows.map((r) => (
          <div
            key={r.label}
            style={{
              display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr',
              padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12, alignItems: 'center'
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
            <span style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
              {r.ref}
            </span>
            <span style={{
              textAlign: 'right', fontFamily: 'JetBrains Mono',
              color: r.est === 'N/A' ? 'var(--text-muted)' : 'var(--accent)'
            }}>
              {r.est}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 3. Deviation / Error Card ────────────────────────────────────────────────

function DeviationCard({ deviation }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Deviation Metrics</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Simulation errors</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tracking Error</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 600, color: (deviation?.trackingError ?? 0) < 15 ? 'var(--green)' : 'var(--amber)' }}>
              {fmt(deviation?.trackingError, 2)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>m</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Estimation Error</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {fmt(deviation?.estimationError, 2)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>m</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Overall Combined Error</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>
              {fmt(deviation?.overallError, 2)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>m</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 5 & 6. Control Response & Updated State Panel ─────────────────────────────

function ControlResponseAndUpdatedState({ controlResponse, dynamicState }) {
  const pos = dynamicState?.position ?? {};
  const vel = dynamicState?.velocity ?? {};
  const ori = dynamicState?.orientation ?? {};

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Control Response &amp; Updated State</span>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 4,
          background: 'var(--teal-muted)', color: 'var(--teal)'
        }}>
          Dynamic Feedback
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Correction Effort</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 600, color: 'var(--teal)' }}>
              {controlResponse?.effortPercent ?? 0}%
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>utilization</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {controlResponse?.responseType}
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Loop Response Time</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>
              {controlResponse?.responseTimeMs ?? 24}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ms</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            Simulated latency
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
        Updated Dynamic State (Active Model)
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.15)', borderRadius: 6, padding: '4px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Position (X / Y / Z)</span>
          <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
            {fmt(pos.x, 0)}m · {fmt(pos.y, 0)}m · {fmt(pos.z, 0)}m
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Velocity (Vx / Vz)</span>
          <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
            {fmt(vel.x, 1)} m/s · {fmt(vel.z, 1)} m/s
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Orientation (Pitch / Roll)</span>
          <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
            {fmt(ori.pitch, 1)}° · {fmt(ori.roll, 1)}°
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 7. Closed-Loop Visual Pipeline Diagram ───────────────────────────────────

function ClosedLoopDiagram({ isRunning }) {
  const steps = [
    { label: 'Sensor Data', sub: 'Shared Stream' },
    { label: 'State Estimation', sub: 'EstimatedState' },
    { label: 'Guidance Decision', sub: 'Tolerance Eval' },
    { label: 'Control Response', sub: 'Restoring Demand' },
    { label: 'Updated State', sub: 'Dynamic Twin' },
  ];

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          Closed-Loop Feedback Flow
        </div>
        <span style={{ fontSize: 11, color: isRunning ? 'var(--green)' : 'var(--text-muted)' }}>
          ↺ Continuous Feedback Loop
        </span>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 6, background: 'rgba(0,0,0,0.15)', padding: '10px 14px', borderRadius: 6
      }}>
        {steps.map((s, idx) => (
          <React.Fragment key={s.label}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{s.sub}</div>
            </div>
            {idx < steps.length - 1 && (
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
            )}
          </React.Fragment>
        ))}
        <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>↺</span>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function GuidanceControl() {
  const {
    dynamicState,
    estimatedState,
    refPoint,
    referencePath,
    trajectory,
    deviation,
    decision,
    controlResponse,
    errorHistory,
    status,
    scenario,
    closedLoopActive,
    start,
    pause,
    reset,
    setScenario,
    setClosedLoop,
  } = useGuidance();

  const [is3D, setIs3D] = useState(false);

  // Performance metrics:
  // 1. Tracking Error (m)
  // 2. Estimation Error (m)
  // 3. Response Time (ms)
  // 4. Stability (%)
  const trackingErr = deviation?.trackingError ?? 0;
  const estimationErr = deviation?.estimationError ?? 0.6;
  const responseTime = controlResponse?.responseTimeMs ?? 24;
  const stability = Math.max(84, Number((99.5 - Math.min(14, trackingErr * 0.12)).toFixed(1)));

  return (
    <div style={{ flex: 1, padding: 28, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Guidance &amp; Control
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Reference tracking, deviation analysis and closed-loop simulation
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
            Guidance Loop · {status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Performance Metrics (4 KPI Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="kpi-card" style={{ padding: '14px 18px' }}>
          <div className="section-title" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Tracking Error
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
            <span className="kpi-value mono" style={{ fontSize: 20, color: trackingErr < 15 ? 'var(--green)' : 'var(--amber)' }}>
              {fmt(trackingErr, 2)}
            </span>
            <span className="kpi-unit">m</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Corridor deviation
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '14px 18px' }}>
          <div className="section-title" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Estimation Error
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
            <span className="kpi-value mono" style={{ fontSize: 20, color: 'var(--accent)' }}>
              {fmt(estimationErr, 2)}
            </span>
            <span className="kpi-unit">m</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Sensor / filter residual
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '14px 18px' }}>
          <div className="section-title" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Response Time
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
            <span className="kpi-value mono" style={{ fontSize: 20, color: 'var(--teal)' }}>
              {responseTime}
            </span>
            <span className="kpi-unit">ms</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Simulated loop latency
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '14px 18px' }}>
          <div className="section-title" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Stability Margin
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 4 }}>
            <span className="kpi-value mono" style={{ fontSize: 20, color: 'var(--green)' }}>
              {fmt(stability, 1)}
            </span>
            <span className="kpi-unit">%</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Closed-loop damping
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Trajectory + Tracking Error Chart; Right = Decisions + State Comp + Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 1. Main Trajectory View */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Guidance Simulation</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Reference path tracking and trajectory correction
                </p>
              </div>
            </div>

            <GuidanceTrajectoryView
              referencePath={referencePath}
              trajectory={trajectory}
              currentState={dynamicState}
              deviation={deviation}
              is3D={is3D}
              onToggle3D={setIs3D}
            />
          </div>

          {/* 8. Supporting Chart: Tracking Error vs Time */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Tracking Error vs. Time</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Live deviation progression throughout simulation
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)' }} />
                <span style={{ fontSize: 12, color: 'var(--amber)', fontFamily: 'JetBrains Mono' }}>
                  Current: {fmt(trackingErr, 2)} m
                </span>
              </div>
            </div>

            <TrackingErrorChart errorHistory={errorHistory} height={160} />
          </div>

          {/* 7. Closed-Loop Flow Diagram */}
          <ClosedLoopDiagram isRunning={status === 'running'} />
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 10. Simulation Controls */}
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
                onChange={(e) => setScenario(e.target.value)}
                disabled={status === 'running'}
                style={{ width: '100%', fontSize: 12, padding: '7px 10px' }}
              >
                {SCENARIOS.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-primary"
                onClick={start}
                disabled={status === 'running'}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 4 20 12 6 20 6 4" />
                </svg>
                Run
              </button>

              <button
                className="btn-secondary"
                onClick={pause}
                disabled={status !== 'running'}
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
                onClick={reset}
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

          {/* 4. Guidance Decision Panel */}
          <GuidanceDecisionPanel
            decision={decision}
            closedLoopActive={closedLoopActive}
            onToggleClosedLoop={setClosedLoop}
          />

          {/* 3. Deviation Metrics */}
          <DeviationCard deviation={deviation} />

          {/* 5 & 6. Control Response & Updated State */}
          <ControlResponseAndUpdatedState
            controlResponse={controlResponse}
            dynamicState={dynamicState}
          />

          {/* 2. Reference vs Estimated State */}
          <ReferenceVsEstimatedPanel
            refPoint={refPoint}
            estimatedState={estimatedState}
            dynamicState={dynamicState}
          />
        </div>
      </div>
    </div>
  );
}
