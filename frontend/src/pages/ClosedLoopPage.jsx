import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/ui';

const pipelineStages = [
  { id: 'sensor', label: 'Sensor Data', sub: 'IMU + GNSS', status: 'complete' },
  { id: 'estimation', label: 'State Estimation', sub: 'Extended Kalman Filter', status: 'active' },
  { id: 'guidance', label: 'Guidance Decision', sub: 'Proportional Navigation', status: 'idle' },
  { id: 'control', label: 'Control Response', sub: 'Fin Actuators', status: 'idle' },
  { id: 'state', label: 'Updated State', sub: '6-DoF Integration', status: 'idle' },
  { id: 'feedback', label: 'Feedback', sub: 'Loop closure', status: 'idle' },
];

export default function ClosedLoopPage() {
  const [stages, setStages] = useState(pipelineStages);
  const [activeIdx, setActiveIdx] = useState(1);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveIdx(i => {
        const next = (i + 1) % pipelineStages.length;
        setStages(pipelineStages.map((s, idx) => ({
          ...s,
          status: idx < next ? 'complete' : idx === next ? 'active' : 'idle',
        })));
        return next;
      });
    }, 1200);
    return () => clearInterval(t);
  }, []);

  const col = {
    complete: { bg: 'var(--green-muted)', border: 'rgba(34,197,94,0.3)', text: 'var(--green)', iconBg: 'var(--green)' },
    active: { bg: 'var(--accent-muted)', border: 'rgba(56,189,248,0.35)', text: 'var(--accent)', iconBg: 'var(--accent)' },
    idle: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', text: 'var(--text-muted)', iconBg: 'rgba(255,255,255,0.08)' },
  };

  return (
    <div style={{ flex: 1, padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>Closed-Loop</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Real-time guidance, navigation and control pipeline</p>
      </div>

      {/* Horizontal pipeline */}
      <div className="card" style={{ padding: 32 }}>
        <div style={{ marginBottom: 24, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Control Pipeline</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
          {stages.map((stage, i) => {
            const c = col[stage.status];
            return (
              <React.Fragment key={stage.id}>
                <div style={{
                  background: c.bg,
                  border: `1.5px solid ${c.border}`,
                  borderRadius: 10,
                  padding: '16px 20px',
                  textAlign: 'center',
                  minWidth: 140,
                  flex: '1 1 0',
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: c.iconBg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 10px',
                  }}>
                    {stage.status === 'complete' && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0B1829" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                    {stage.status === 'active' && <span className="pulse-dot" style={{ background: '#0B1829' }} />}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{stage.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{stage.sub}</div>
                </div>
                {i < stages.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', flexShrink: 0 }}>
                    <svg width="28" height="16" viewBox="0 0 28 16">
                      <line x1="0" y1="8" x2="20" y2="8" stroke={stage.status === 'complete' ? 'var(--green)' : 'rgba(255,255,255,0.1)'} strokeWidth="1.5" />
                      <polygon points="28,8 18,4 18,12" fill={stage.status === 'complete' ? 'var(--green)' : 'rgba(255,255,255,0.1)'} />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Feedback arrow at bottom */}
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1 4v6h6" /><path d="M23 20v-6h-6" /><path d="M20.5 9A9 9 0 0 0 5.2 5.2L1 10M23 14l-4.2 4.8A9 9 0 0 1 3.5 15" />
          </svg>
          Feedback loop — Updated State → Sensor Data
        </div>
      </div>

      {/* Status row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>Current Stage</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>{stages[activeIdx]?.label || '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{stages[activeIdx]?.sub}</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>Update Rate</div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 28, fontWeight: 500, color: 'var(--text-primary)' }}>1000 <span style={{ fontSize: 16, color: 'var(--text-muted)', fontFamily: 'Inter' }}>Hz</span></div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Latency: 0.82 ms end-to-end</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>Health</div>
          <StatusBadge status="healthy" label="All Systems Nominal" />
          <div style={{ marginTop: 10 }}>
            {[
              { l: 'Phase Margin', v: '54.2°' },
              { l: 'Gain Margin', v: '8.6 dB' },
            ].map(item => (
              <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.l}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-primary)' }}>{item.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
