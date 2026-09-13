import React, { useState, useEffect } from 'react';
import { SectionHeader, StatusBadge, InfoPanel } from '../components/ui';

const states = [
  { id: 'init', label: 'Initialization', sub: 'System boot sequence', status: 'complete' },
  { id: 'check', label: 'Self Check', sub: 'Sensor & logic verification', status: 'complete' },
  { id: 'mode', label: 'Mode Selection', sub: 'Simulation mode active', status: 'complete' },
  { id: 'monitor', label: 'Condition Monitoring', sub: 'Evaluating state conditions', status: 'active' },
  { id: 'decision', label: 'Decision', sub: 'Logic gate evaluation', status: 'idle' },
  { id: 'event', label: 'Safe Simulated Event', sub: 'Simulation output only', status: 'idle' },
];

const faultState = { id: 'fault', label: 'Fault Detected', sub: 'Safe State Recovery', status: 'fault' };

const stateColor = {
  complete: { bg: 'var(--green-muted)', border: 'rgba(34,197,94,0.3)', text: 'var(--green)', icon: '#0B1829' },
  active: { bg: 'var(--accent-muted)', border: 'rgba(56,189,248,0.3)', text: 'var(--accent)', icon: 'var(--accent)' },
  idle: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', text: 'var(--text-muted)', icon: 'rgba(255,255,255,0.15)' },
  fault: { bg: 'var(--amber-muted)', border: 'rgba(245,158,11,0.3)', text: 'var(--amber)', icon: 'var(--amber)' },
};

const transitions = [
  { ts: 'T+00:14:38', from: 'Condition Monitoring', to: 'Stable Glide Loop', result: 'Conditions satisfied' },
  { ts: 'T+00:12:04', from: 'Mode Selection', to: 'Condition Monitoring', result: 'Mode selected: Simulation' },
  { ts: 'T+00:08:12', from: 'Self Check', to: 'Mode Selection', result: 'All 16 channels verified' },
  { ts: 'T+00:04:00', from: 'Initialization', to: 'Self Check', result: 'Boot sequence complete' },
  { ts: 'T+00:00:00', from: '—', to: 'Initialization', result: 'Power on' },
];

export default function ElectronicFuze() {
  const [activeIdx, setActiveIdx] = useState(3);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveIdx(i => {
        if (i >= 5) return 3; // loop back to monitoring
        return i + 1;
      });
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const enriched = states.map((s, i) => ({
    ...s,
    status: i < activeIdx ? 'complete' : i === activeIdx ? 'active' : 'idle',
  }));

  const currentState = enriched[activeIdx];

  return (
    <div style={{ flex: 1, padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Electronic Fuze"
        subtitle="Programmable electronic decision logic — Safe simulation mode"
        action={<StatusBadge status="standby" label="Simulation Only" />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* Left: State machine diagram */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ marginBottom: 20, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>State Machine</div>

          <div style={{ display: 'flex', gap: 32 }}>
            {/* Main flow */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              {enriched.map((s, i) => {
                const col = stateColor[s.status];
                return (
                  <React.Fragment key={s.id}>
                    <div style={{
                      background: col.bg,
                      border: `1.5px solid ${col.border}`,
                      borderRadius: 10,
                      padding: '14px 20px',
                      textAlign: 'center',
                      width: '100%',
                      maxWidth: 280,
                      cursor: 'pointer',
                      transition: 'all 0.25s',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: col.text }}>{s.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.sub}</div>
                      {s.status === 'active' && (
                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                          <span className="pulse-dot pulse-blue" />
                        </div>
                      )}
                    </div>
                    {i < enriched.length - 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0' }}>
                        <svg width="2" height="24" viewBox="0 0 2 24">
                          <line x1="1" y1="0" x2="1" y2="24" stroke={s.status === 'complete' ? 'var(--green)' : 'rgba(255,255,255,0.1)'} strokeWidth="1.5" />
                        </svg>
                        <svg width="10" height="6" viewBox="0 0 10 6" style={{ marginTop: -1 }}>
                          <polygon points="5,6 0,0 10,0" fill={s.status === 'complete' ? 'var(--green)' : 'rgba(255,255,255,0.1)'} />
                        </svg>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Fault branch */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 180 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ width: 40, height: 1, background: 'rgba(245,158,11,0.3)' }} />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '0 8px', whiteSpace: 'nowrap' }}>fault branch</div>
              </div>
              <div style={{
                background: stateColor.fault.bg,
                border: `1.5px solid ${stateColor.fault.border}`,
                borderRadius: 10,
                padding: '14px 20px',
                textAlign: 'center',
                width: 160,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: stateColor.fault.text }}>{faultState.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{faultState.sub}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Fuze status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <InfoPanel title="Fuze Status" badge={<StatusBadge status="standby" label="Safe" />}>
            {[
              { label: 'Current Mode', value: 'Simulation' },
              { label: 'Current State', value: currentState?.label || '—' },
              { label: 'System Health', value: 'Nominal' },
              { label: 'Logic Condition', value: 'Monitoring' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{item.value}</span>
              </div>
            ))}
          </InfoPanel>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Gate Conditions</div>
            {[
              { l: 'Pressure Gate', v: '42.2 kPa', ok: true },
              { l: 'Acceleration Gate', v: '9.4 g', ok: true },
              { l: 'Separation Check', v: 'Verified', ok: true },
              { l: 'Thermal Margin', v: '+56°C', ok: true },
            ].map(item => (
              <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.l}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-primary)' }}>{item.v}</span>
                  {item.ok && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transition log */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Recent State Transitions</div>
        <table className="k-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>From</th>
              <th>To</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {transitions.map((row, i) => (
              <tr key={i}>
                <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{row.ts}</span></td>
                <td>{row.from}</td>
                <td style={{ color: 'var(--accent)', fontWeight: 500 }}>{row.to}</td>
                <td style={{ color: 'var(--text-muted)' }}>{row.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
