import React, { useState, useEffect } from 'react';
import { KPICard, SectionHeader, StatusBadge, SimpleLineChart } from '../components/ui';

export default function SimulationPage() {
  const [step, setStep] = useState(4982);
  const [running, setRunning] = useState(false);
  const [errorData] = useState(() => Array.from({ length: 40 }, (_, i) =>
    0.14 * Math.exp(-i * 0.02) + Math.sin(i * 0.3) * 0.015 + Math.random() * 0.008
  ));

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setStep(s => Math.min(10000, s + 2)), 100);
    return () => clearInterval(t);
  }, [running]);

  const pct = (step / 10000) * 100;

  return (
    <div style={{ flex: 1, padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Simulation"
        subtitle="Scenario execution and integration solver"
        action={
          <button className={running ? 'btn-secondary' : 'btn-primary'} onClick={() => setRunning(r => !r)}>
            {running ? '⏸ Pause' : '▶ Run'}
          </button>
        }
      />

      {/* Progress */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Simulation Progress</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Scenario A — High-G Atmospheric Re-entry</div>
          </div>
          <StatusBadge status={running ? 'running' : 'standby'} label={running ? 'Running' : 'Paused'} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 28, fontWeight: 500, color: 'var(--text-primary)' }}>{step.toLocaleString()}</span>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ 10,000 steps</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono', fontSize: 14, color: 'var(--accent)' }}>T+{(step * 0.001).toFixed(3)}s</span>
        </div>

        <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 6, transition: 'width 0.2s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>{pct.toFixed(2)}% complete</span>
          <span>1000 Hz integration rate</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20 }}>
        {/* Main chart */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Tracking Error vs. Time</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Cross-track deviation over simulation window</div>
          </div>
          <SimpleLineChart data={errorData} color="#38BDF8" height={180} label="Error (m)" />
        </div>

        {/* Solver config */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Solver Configuration</div>
          {[
            { l: 'Method', v: 'RK4 Adaptive' },
            { l: 'Time Step', v: '0.001 s' },
            { l: 'Real-Time Factor', v: '1.000×' },
            { l: 'Aerodynamic Model', v: '6-DoF Coupled' },
            { l: 'Atmospheric Model', v: 'ISA 1976' },
            { l: 'Gust Model', v: 'Von Kármán' },
            { l: 'Solver Residual', v: '1.4e-8' },
          ].map(item => (
            <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.l}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-primary)' }}>{item.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard label="Tracking Error" value="0.14" unit="m" status="healthy" trend="↓ Converging" />
        <KPICard label="Integration Step" value={step.toLocaleString()} unit="steps" />
        <KPICard label="Simulation Time" value={`T+${(step * 0.001).toFixed(2)}`} unit="s" />
        <KPICard label="Solver Residual" value="1.4e-8" trend="Converged" status="healthy" />
      </div>
    </div>
  );
}
