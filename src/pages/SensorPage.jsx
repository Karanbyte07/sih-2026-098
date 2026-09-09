import React, { useState, useEffect } from 'react';
import { StatusBadge, SimpleLineChart } from '../components/ui';

const sensors = [
  { id: 'imu', label: 'IMU', detail: 'Tri-axial accelerometer & gyroscope', status: 'healthy', rate: '1000 Hz' },
  { id: 'gnss', label: 'Position Source', detail: 'GNSS / RTK — 14 satellites', status: 'healthy', rate: '10 Hz' },
  { id: 'mcu', label: 'MCU', detail: 'Mission computer & processor', status: 'healthy', rate: '1000 Hz' },
  { id: 'link', label: 'Data Link', detail: 'CAN-FD + MIL-1553B bus', status: 'healthy', rate: '1 Mbps' },
];

const liveValues = [
  { label: 'Axial Acceleration', value: '+13.68', unit: 'g' },
  { label: 'Lateral Acceleration', value: '−0.42', unit: 'g' },
  { label: 'Pitch Rate', value: '+14.2', unit: '°/s' },
  { label: 'Yaw Rate', value: '−3.8', unit: '°/s' },
  { label: 'Altitude (MSL)', value: '24,773', unit: 'm' },
  { label: 'Velocity', value: '1,402', unit: 'm/s' },
];

export default function SensorPage() {
  const [imuData, setImuData] = useState(() => Array.from({ length: 40 }, (_, i) => 13.68 + Math.sin(i * 0.4) * 1.2));

  useEffect(() => {
    const t = setInterval(() => {
      setImuData(d => [...d.slice(1), 13.68 + Math.sin(Date.now() * 0.001) * 1.2 + (Math.random() - 0.5) * 0.3]);
    }, 200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ flex: 1, padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>Live Sensor Data</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Real-time sensor health and values</p>
      </div>

      {/* Sensor Health */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Sensor Health</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {sensors.map(sensor => (
            <div key={sensor.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{sensor.label}</div>
                <StatusBadge status={sensor.status} label={sensor.status === 'healthy' ? 'OK' : 'Fault'} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{sensor.detail}</div>
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: 'var(--accent)' }}>{sensor.rate}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live chart */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>IMU Acceleration — Live</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Axial acceleration, 1000 Hz stream</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="pulse-dot pulse-blue" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Live</span>
          </div>
        </div>
        <SimpleLineChart data={imuData} color="#38BDF8" height={140} label="Acceleration (g)" />
      </div>

      {/* Live values */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 12 }}>Current Values</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {liveValues.map(item => (
            <div key={item.label} className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{item.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 22, fontWeight: 500, color: 'var(--text-primary)' }}>{item.value}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
