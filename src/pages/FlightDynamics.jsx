import React, { useState, useEffect, useRef } from 'react';
import { KPICard, SectionHeader, StatusBadge, MetricRow, InfoPanel, SimpleLineChart } from '../components/ui';

function generateHistory(base, noise, len = 40) {
  return Array.from({ length: len }, (_, i) => base + Math.sin(i * 0.4) * noise + (Math.random() - 0.5) * noise * 0.5);
}

export default function FlightDynamics() {
  const [state, setState] = useState({
    altitude: 24773.9,
    velocityX: 1402.6,
    velocityY: -42.1,
    velocityZ: 18.4,
    accel: 13.68,
    pitch: 4.12,
    yaw: -0.84,
    roll: 0.05,
  });

  const [history, setHistory] = useState({
    altitude: generateHistory(24773, 200),
    velocity: generateHistory(1402, 50),
    accel: generateHistory(13.68, 1),
  });

  useEffect(() => {
    const t = setInterval(() => {
      setState(s => ({
        altitude: +(s.altitude + (Math.random() - 0.5) * 10).toFixed(1),
        velocityX: +(s.velocityX + (Math.random() - 0.5) * 5).toFixed(1),
        velocityY: +(s.velocityY + (Math.random() - 0.5) * 1).toFixed(1),
        velocityZ: +(s.velocityZ + (Math.random() - 0.5) * 0.5).toFixed(1),
        accel: +(s.accel + (Math.random() - 0.5) * 0.2).toFixed(2),
        pitch: +(s.pitch + (Math.random() - 0.5) * 0.05).toFixed(2),
        yaw: +(s.yaw + (Math.random() - 0.5) * 0.02).toFixed(2),
        roll: +(s.roll + (Math.random() - 0.5) * 0.01).toFixed(2),
      }));
      setHistory(h => ({
        altitude: [...h.altitude.slice(1), state.altitude],
        velocity: [...h.velocity.slice(1), state.velocityX],
        accel: [...h.accel.slice(1), state.accel],
      }));
    }, 800);
    return () => clearInterval(t);
  }, [state]);

  const [showDrawer, setShowDrawer] = useState(false);

  return (
    <div style={{ flex: 1, padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Flight Dynamics"
        subtitle="Digital twin state and system behaviour"
        action={
          <button className="btn-secondary" onClick={() => setShowDrawer(!showDrawer)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
            </svg>
            Advanced Parameters
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, flex: 1, minHeight: 0 }}>
        {/* Left: State chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20, flex: 1 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>State vs. Time</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Live altitude, velocity, and acceleration</div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Altitude</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--accent)' }}>{state.altitude.toFixed(1)} m</span>
              </div>
              <SimpleLineChart data={history.altitude} color="#38BDF8" height={90} label="Altitude (m)" />
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Velocity</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--teal)' }}>{state.velocityX.toFixed(1)} m/s</span>
              </div>
              <SimpleLineChart data={history.velocity} color="#2DD4BF" height={90} label="Velocity (m/s)" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Acceleration</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#A78BFA' }}>{state.accel.toFixed(2)} g</span>
              </div>
              <SimpleLineChart data={history.accel} color="#A78BFA" height={90} label="Acceleration (g)" />
            </div>
          </div>
        </div>

        {/* Right: State panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <InfoPanel title="Position" badge={<StatusBadge status="running" label="6-DoF" />}>
            <MetricRow label="Altitude" value={state.altitude.toFixed(0)} unit="m" status="healthy" />
            <MetricRow label="Downrange" value="41,824" unit="m" />
            <MetricRow label="Cross-Range" value="-114.8" unit="m" />
          </InfoPanel>

          <InfoPanel title="Velocity">
            <MetricRow label="Axial" value={state.velocityX.toFixed(1)} unit="m/s" />
            <MetricRow label="Lateral" value={state.velocityY.toFixed(1)} unit="m/s" />
            <MetricRow label="Normal" value={state.velocityZ.toFixed(1)} unit="m/s" />
          </InfoPanel>

          <InfoPanel title="Orientation">
            <MetricRow label="Pitch" value={`${state.pitch > 0 ? '+' : ''}${state.pitch.toFixed(2)}°`} />
            <MetricRow label="Yaw" value={`${state.yaw > 0 ? '+' : ''}${state.yaw.toFixed(2)}°`} />
            <MetricRow label="Roll" value={`${state.roll > 0 ? '+' : ''}${state.roll.toFixed(2)}°`} />
          </InfoPanel>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard label="Mach Number" value="4.12" unit="M" trend="Hypersonic regime" status="info" />
        <KPICard label="Dynamic Pressure" value="61.8" unit="kPa" trend="Below max-Q threshold" status="healthy" />
        <KPICard label="Angle of Attack" value="+1.84" unit="deg" trend="Trimmed" status="healthy" />
        <KPICard label="Total Acceleration" value={state.accel.toFixed(2)} unit="g" status="healthy" />
      </div>

      {/* Advanced drawer */}
      {showDrawer && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Advanced Parameters</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { l: 'Integration Solver', v: 'RK4 Adaptive' },
              { l: 'Time Step', v: '0.001 s' },
              { l: 'Real-Time Factor', v: '1.000×' },
              { l: 'Aerodynamic Model', v: '6-DoF Coupled' },
              { l: 'Atmospheric Model', v: 'ISA 1976' },
              { l: 'Solver Residual', v: '1.4e-8' },
            ].map(item => (
              <div key={item.l}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{item.l}</div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{item.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
