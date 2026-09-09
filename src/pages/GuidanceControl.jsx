import React, { useState, useEffect } from 'react';
import { KPICard, SectionHeader, StatusBadge, InfoPanel, SimpleLineChart } from '../components/ui';

const pipelineStages = [
  { id: 'sensor', label: 'Sensor Data', sub: 'IMU + GNSS', status: 'complete' },
  { id: 'estimation', label: 'State Estimation', sub: 'Extended Kalman', status: 'active' },
  { id: 'guidance', label: 'Guidance Decision', sub: 'Proportional Navigation', status: 'idle' },
  { id: 'control', label: 'Control Response', sub: 'Fin Actuators', status: 'idle' },
  { id: 'state', label: 'Updated State', sub: '6-DoF Integration', status: 'idle' },
];

function PipelineFlow({ stages }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {stages.map((stage, i) => (
        <React.Fragment key={stage.id}>
          <div
            className={`pipe-node ${stage.status === 'active' ? 'active' : stage.status === 'complete' ? 'complete' : ''}`}
            style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: stage.status === 'active' ? 'var(--accent)' : stage.status === 'complete' ? 'var(--green)' : 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {stage.status === 'complete'
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B1829" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                : stage.status === 'active'
                ? <span className="pulse-dot pulse-blue" style={{ background: '#0B1829' }} />
                : <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              }
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: stage.status === 'active' ? 'var(--accent)' : stage.status === 'complete' ? 'var(--green)' : 'var(--text-secondary)' }}>
                {stage.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{stage.sub}</div>
            </div>
          </div>
          {i < stages.length - 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
              <svg width="2" height="20" viewBox="0 0 2 20">
                <line x1="1" y1="0" x2="1" y2="20" stroke={stage.status === 'complete' ? 'var(--green)' : 'rgba(255,255,255,0.1)'} strokeWidth="1.5" />
              </svg>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function TrajectoryComparison() {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#080F1C';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    const steps = 60;
    // Reference
    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const x = 40 + t * (w - 80);
      const y = h - 40 - Math.sin(t * Math.PI) * (h - 80);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(148,163,184,0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Simulation
    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const noise = Math.sin(i * 0.8) * 8;
      const x = 40 + t * (w - 80) + noise * 0.3;
      const y = h - 40 - Math.sin(t * Math.PI) * (h - 80) + noise;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Deviation band
    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const x = 40 + t * (w - 80);
      const y = h - 40 - Math.sin(t * Math.PI) * (h - 80);
      const dev = Math.abs(Math.sin(i * 0.8)) * 6;
      i === 0 ? ctx.moveTo(x, y - dev) : ctx.lineTo(x, y - dev);
    }
    for (let i = steps - 1; i >= 0; i--) {
      const t = i / (steps - 1);
      const x = 40 + t * (w - 80);
      const y = h - 40 - Math.sin(t * Math.PI) * (h - 80);
      const dev = Math.abs(Math.sin(i * 0.8)) * 6;
      ctx.lineTo(x, y + dev);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(56,189,248,0.06)';
    ctx.fill();

    // Labels
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.font = '11px Inter';
    ctx.setLineDash([5, 3]);
    ctx.strokeStyle = 'rgba(148,163,184,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(w - 130, 20); ctx.lineTo(w - 105, 20); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText('Reference', w - 100, 24);
    ctx.strokeStyle = '#38BDF8';
    ctx.beginPath(); ctx.moveTo(w - 130, 38); ctx.lineTo(w - 105, 38); ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    ctx.fillText('Simulation', w - 100, 42);
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.fillText('Deviation', w - 100, 58);
    ctx.fillStyle = 'rgba(56,189,248,0.3)';
    ctx.fillRect(w - 130, 50, 25, 10);

  }, []);

  return <canvas ref={canvasRef} width={600} height={280} style={{ width: '100%', height: '100%', display: 'block', borderRadius: 8 }} />;
}

export default function GuidanceControl() {
  const [errorHistory] = useState(() => Array.from({ length: 40 }, (_, i) =>
    0.14 * Math.exp(-i * 0.05) + Math.sin(i * 0.3) * 0.02 + Math.random() * 0.01
  ));

  const [stages, setStages] = useState(pipelineStages);

  // Cycle through active stage
  useEffect(() => {
    let idx = 1;
    const t = setInterval(() => {
      idx = (idx + 1) % pipelineStages.length;
      setStages(pipelineStages.map((s, i) => ({
        ...s,
        status: i < idx ? 'complete' : i === idx ? 'active' : 'idle'
      })));
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ flex: 1, padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Guidance & Control"
        subtitle="Trajectory tracking and closed-loop control performance"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, flex: 1, minHeight: 0 }}>
        {/* Left: Trajectory comparison */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20, flex: 1, minHeight: 280 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Trajectory Comparison</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Reference · Simulation · Deviation band</div>
            </div>
            <div style={{ flex: 1, minHeight: 240 }}>
              <TrajectoryComparison />
            </div>
          </div>

          {/* Error chart */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Tracking Error vs. Time</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Cross-track deviation over simulation window</div>
            </div>
            <SimpleLineChart data={errorHistory} color="#2DD4BF" height={100} label="Error (m)" />
          </div>
        </div>

        {/* Right: Control pipeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Control Loop</div>
            <PipelineFlow stages={stages} />
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Loop Parameters</div>
            {[
              { l: 'Update Rate', v: '1000 Hz' },
              { l: 'Latency', v: '0.82 ms' },
              { l: 'Phase Margin', v: '54.2°' },
              { l: 'Gain Margin', v: '8.6 dB' },
            ].map(item => (
              <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.l}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-primary)' }}>{item.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <KPICard label="Tracking Error" value="0.14" unit="m" trend="↓ Converging" status="healthy" />
        <KPICard label="Response Time" value="0.82" unit="ms" trend="Within specification" status="healthy" />
        <KPICard label="Stability" value="54.2°" unit="phase margin" trend="Asymptotically stable" status="healthy" />
      </div>
    </div>
  );
}
