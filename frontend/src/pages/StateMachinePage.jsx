import React, { useState, useEffect } from 'react';
import { StatusBadge } from '../components/ui';

const states = [
  { id: 'init', label: 'Initialization', status: 'complete' },
  { id: 'check', label: 'Self Check', status: 'complete' },
  { id: 'mode', label: 'Mode Selection', status: 'complete' },
  { id: 'monitor', label: 'Condition Monitoring', status: 'active' },
  { id: 'decision', label: 'Decision', status: 'idle' },
  { id: 'event', label: 'Safe Simulated Event', status: 'idle' },
];

const faultBranch = { id: 'fault', label: 'Fault Detected → Safe State', status: 'fault' };

const transitions = [
  { ts: 'T+00:14:38', from: 'Mode Selection', to: 'Condition Monitoring', status: 'Active' },
  { ts: 'T+00:12:04', from: 'Self Check', to: 'Mode Selection', status: 'Committed' },
  { ts: 'T+00:08:12', from: 'Initialization', to: 'Self Check', status: 'Committed' },
  { ts: 'T+00:04:00', from: '—', to: 'Initialization', status: 'Committed' },
];

export default function StateMachinePage() {
  const [activeIdx, setActiveIdx] = useState(3);

  useEffect(() => {
    const t = setInterval(() => setActiveIdx(i => i >= 5 ? 3 : i + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const enriched = states.map((s, i) => ({
    ...s,
    status: i < activeIdx ? 'complete' : i === activeIdx ? 'active' : 'idle',
  }));

  const col = {
    complete: { bg: 'var(--green-muted)', border: 'rgba(34,197,94,0.3)', text: 'var(--green)' },
    active: { bg: 'var(--accent-muted)', border: 'rgba(56,189,248,0.35)', text: 'var(--accent)' },
    idle: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', text: 'var(--text-muted)' },
    fault: { bg: 'var(--amber-muted)', border: 'rgba(245,158,11,0.3)', text: 'var(--amber)' },
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 32, gap: 24, overflowY: 'auto' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>State Machine</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Electronic fuze state logic — simulation mode</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, flex: 1, minHeight: 0 }}>
        {/* State diagram */}
        <div className="card" style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: 60 }}>
            {/* Main flow */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              {enriched.map((s, i) => {
                const c = col[s.status];
                return (
                  <React.Fragment key={s.id}>
                    <div style={{
                      background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 10,
                      padding: '16px 28px', textAlign: 'center', minWidth: 220,
                      transition: 'all 0.3s ease',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{s.label}</div>
                      {s.status === 'active' && (
                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 4 }}>
                          {[0, 0.2, 0.4].map(d => (
                            <span key={d} className="pulse-dot pulse-blue" style={{ animationDelay: `${d}s` }} />
                          ))}
                        </div>
                      )}
                    </div>
                    {i < enriched.length - 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0' }}>
                        <div style={{ width: 2, height: 20, background: s.status === 'complete' ? 'var(--green)' : 'rgba(255,255,255,0.08)' }} />
                        <svg width="10" height="6"><polygon points="5,6 0,0 10,0" fill={s.status === 'complete' ? 'var(--green)' : 'rgba(255,255,255,0.08)'} /></svg>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Fault branch */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 48, height: 1, background: 'rgba(245,158,11,0.25)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>fault branch</span>
              </div>
              <div style={{ background: col.fault.bg, border: `1.5px solid ${col.fault.border}`, borderRadius: 10, padding: '16px 20px', textAlign: 'center', minWidth: 180 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: col.fault.text }}>{faultBranch.label}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>Current State</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>{enriched[activeIdx]?.label || '—'}</div>
            <StatusBadge status="running" label="Active" />
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>System Health</div>
            {[{ l: 'Logic Status', v: 'Nominal' }, { l: 'Fault Count', v: '0' }, { l: 'Cycle Time', v: '0.12 ms' }].map(item => (
              <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.l}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-primary)' }}>{item.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transition timeline */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Transition Timeline</div>
        <table className="k-table">
          <thead><tr><th>Time</th><th>From</th><th>To</th><th>Status</th></tr></thead>
          <tbody>
            {transitions.map((row, i) => (
              <tr key={i}>
                <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{row.ts}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>{row.from}</td>
                <td style={{ color: 'var(--accent)', fontWeight: 500 }}>{row.to}</td>
                <td><StatusBadge status={row.status === 'Active' ? 'running' : 'healthy'} label={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
