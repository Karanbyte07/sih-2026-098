/**
 * KINETICA — Live Sensor Data Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays real-time sensor telemetry from the active data source.
 *
 * Data flow:
 *   DataSourceManager (SimulationSensorSource | ESP32SensorSource)
 *         ↓  normalizeSensorData()
 *         ↓  useSensorData() hook
 *         ↓
 *   LiveSensorData (this component)
 *
 * This component does NOT contain any sensor generation logic.
 * It only consumes the SensorData provided by useSensorData().
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSensorData } from '../hooks/useSensorData.js';
import { STREAM_CHANNELS, getChannelValue } from '../sensors/types.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_LENGTH = 80; // rolling window size

// ─── Formatting helpers ────────────────────────────────────────────────────────
function fmt(val, decimals = 3) {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'number' && !isFinite(val)) return 'N/A';
  if (typeof val === 'number') return val.toFixed(decimals);
  return String(val);
}

// ─── Small UI components ───────────────────────────────────────────────────────

function StatusIndicator({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: ok ? 'var(--green)' : 'var(--text-muted)',
        flexShrink: 0,
        animation: ok ? 'pulse-dot 2s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  );
}

function DataRow({ label, value, unit }) {
  const display = value === null || value === undefined ? 'N/A'
    : typeof value === 'number' ? fmt(value)
    : String(value);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{
          fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 500,
          color: display === 'N/A' ? 'var(--text-muted)' : 'var(--text-primary)',
        }}>
          {display}
        </span>
        {unit && display !== 'N/A' && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{unit}</span>
        )}
      </div>
    </div>
  );
}

function SensorCard({ title, badge, children, style }) {
  return (
    <div className="card" style={{ padding: 20, ...style }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
        {badge}
      </div>
      {children}
    </div>
  );
}

function SubLabel({ label }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', color: 'var(--text-muted)',
      marginTop: 14, marginBottom: 4,
    }}>{label}</div>
  );
}

// ─── Live Canvas Chart ────────────────────────────────────────────────────────
function LiveChart({ data, color = '#38BDF8', height = 180, unit = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const pad = { top: 12, right: 16, bottom: 28, left: 52 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const px = (i) => pad.left + (i / (data.length - 1)) * cw;
    const py = (v) => pad.top + (1 - (v - min) / range) * ch;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * ch;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.55)';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((max - (i / 4) * range).toFixed(2), pad.left - 6, y + 3);
    }

    // Area fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    grad.addColorStop(0, color + '30');
    grad.addColorStop(1, color + '00');
    ctx.beginPath();
    ctx.moveTo(px(0), py(data[0]));
    for (let i = 1; i < data.length; i++) {
      const cpx = (px(i - 1) + px(i)) / 2;
      ctx.bezierCurveTo(cpx, py(data[i - 1]), cpx, py(data[i]), px(i), py(data[i]));
    }
    ctx.lineTo(px(data.length - 1), pad.top + ch);
    ctx.lineTo(px(0), pad.top + ch);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(px(0), py(data[0]));
    for (let i = 1; i < data.length; i++) {
      const cpx = (px(i - 1) + px(i)) / 2;
      ctx.bezierCurveTo(cpx, py(data[i - 1]), cpx, py(data[i]), px(i), py(data[i]));
    }
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();

    // Live dot
    const lx = px(data.length - 1);
    const ly = py(data[data.length - 1]);
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.arc(lx, ly, 7, 0, Math.PI * 2);
    ctx.strokeStyle = color + '50'; ctx.lineWidth = 1.5; ctx.stroke();

    // Axis labels
    ctx.fillStyle = 'rgba(148,163,184,0.4)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← Time', pad.left + cw / 2, h - 6);
    if (unit) {
      ctx.textAlign = 'left';
      ctx.fillText(unit, 2, pad.top + 10);
    }
  }, [data, color, unit]);

  return (
    <canvas ref={canvasRef} width={900} height={height}
      style={{ width: '100%', height, display: 'block' }} />
  );
}

// ─── Sub-cards ─────────────────────────────────────────────────────────────────

function ConnectionBadge({ connected }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: connected ? 'var(--green)' : 'var(--text-muted)',
        animation: connected ? 'pulse-dot 2s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: 12, color: connected ? 'var(--green)' : 'var(--text-muted)', fontWeight: 500 }}>
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}

function HardwareStatusCard({ sourceName, status, packetsReceived, lastUpdateMs }) {
  const isConnected = sourceName === 'simulation' || status === 'running';
  const streamLabel = status === 'running'      ? 'Sensor Stream · Receiving'
                    : status === 'paused'        ? 'Sensor Stream · Paused'
                    : status === 'disconnected'  ? 'Sensor Stream · Disconnected'
                    :                             'Sensor Stream · Ready';

  return (
    <SensorCard title="Hardware Status">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>ESP32</span>
          <ConnectionBadge connected={isConnected} />
        </div>
        <div style={{ height: 1, background: 'var(--border)' }} />
        <StatusIndicator ok={status === 'running'} label={streamLabel} />
        <StatusIndicator ok={status === 'running'} label={`Data Quality · ${status === 'running' ? 'Good' : 'N/A'}`} />
        <div style={{ height: 1, background: 'var(--border)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last Update</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-secondary)' }}>
            {lastUpdateMs < 1000 ? `${lastUpdateMs} ms ago` : `${(lastUpdateMs / 1000).toFixed(1)} s ago`}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Packets Received</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-secondary)' }}>
            {packetsReceived.toLocaleString()}
          </span>
        </div>
      </div>
    </SensorCard>
  );
}

function GpsCard({ gps, sourceName }) {
  const available = gps?.available;
  return (
    <SensorCard title="GPS" badge={
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: available ? 'var(--green)' : 'var(--amber)',
          animation: 'pulse-dot 2s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 12, color: available ? 'var(--green)' : 'var(--amber)' }}>
          {available ? 'Fix Available' : 'No Fix'}
        </span>
      </div>
    }>
      <DataRow label="Latitude"  value={gps?.latitude}  unit="°" />
      <DataRow label="Longitude" value={gps?.longitude} unit="°" />
      <DataRow label="Altitude"  value={gps?.altitude !== null ? Number(gps.altitude).toFixed(1) : null}  unit="m" />
      {sourceName === 'simulation' && (
        <div style={{
          marginTop: 12, padding: '6px 10px',
          background: 'var(--amber-muted)', borderRadius: 6,
          fontSize: 11, color: 'var(--amber)',
        }}>
          Simulation values — not real GPS
        </div>
      )}
    </SensorCard>
  );
}

function ImuCard({ imu }) {
  const acc = imu?.acceleration ?? { x: null, y: null, z: null };
  const gyr = imu?.gyroscope    ?? { x: null, y: null, z: null };
  return (
    <SensorCard title="MPU6050" badge={
      <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'JetBrains Mono' }}>IMU</span>
    }>
      <SubLabel label="Acceleration" />
      <DataRow label="X" value={acc.x} unit="m/s²" />
      <DataRow label="Y" value={acc.y} unit="m/s²" />
      <DataRow label="Z" value={acc.z} unit="m/s²" />
      <SubLabel label="Gyroscope" />
      <DataRow label="X" value={gyr.x} unit="°/s" />
      <DataRow label="Y" value={gyr.y} unit="°/s" />
      <DataRow label="Z" value={gyr.z} unit="°/s" />
    </SensorCard>
  );
}

function EnvironmentCard({ environmental }) {
  const env = environmental ?? {};
  return (
    <SensorCard title="Environment">
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
        BMP280
      </div>
      <DataRow label="Pressure"    value={env.pressure}          unit="hPa" />
      <DataRow label="Temperature" value={env.bmp280Temperature} unit="°C" />
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 18, marginBottom: 8, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        LM35
      </div>
      <DataRow label="Temperature" value={env.lm35Temperature} unit="°C" />
    </SensorCard>
  );
}

function DataQualityCard({ quality }) {
  const entries = [
    { label: 'GPS',           ok: quality?.gps           === 'good' },
    { label: 'MPU6050',       ok: quality?.imu           === 'good' },
    { label: 'Environment',   ok: quality?.environmental === 'good' },
    { label: 'Packet Stream', ok: quality?.stream        === 'good' },
  ];
  return (
    <SensorCard title="Data Quality">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map(e => (
          <StatusIndicator key={e.label} ok={e.ok}
            label={`${e.label} · ${e.ok ? 'OK' : (quality?.stream === 'disconnected' ? 'Disconnected' : 'Unavailable')}`}
          />
        ))}
      </div>
    </SensorCard>
  );
}

function PeripheralsCard({ ir, switches }) {
  const sw = switches ?? {};
  return (
    <SensorCard title="Peripherals">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <StatusIndicator ok={!ir?.active} label={`IR Input · ${ir?.active ? 'Event Detected' : 'Ready'}`} />
        <div style={{ height: 1, background: 'var(--border)', marginTop: 2 }} />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Switch Inputs
        </div>
        {[1, 2, 3, 4].map(n => (
          <div key={n} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>SW{n}</span>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: sw[`sw${n}`] ? 'var(--green)' : 'var(--text-muted)' }}>
              {sw[`sw${n}`] ? 'CLOSED' : 'OPEN'}
            </span>
          </div>
        ))}
      </div>
    </SensorCard>
  );
}

function StreamControls({ status, onStart, onStop, onReset }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <button className="btn-primary" onClick={onStart} disabled={status === 'running'} id="sensor-start-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>
        Start Stream
      </button>
      <button className="btn-secondary" onClick={onStop} disabled={status !== 'running'} id="sensor-stop-btn">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
        Stop
      </button>
      <button className="btn-secondary" onClick={onReset} id="sensor-reset-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" />
        </svg>
        Reset
      </button>
    </div>
  );
}

function DataSourceSelector({ sourceName, onSetSource }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Data Source</span>
      <select
        className="k-select"
        value={sourceName}
        onChange={e => onSetSource(e.target.value)}
        id="data-source-select"
        style={{ fontSize: 12, padding: '5px 10px' }}
      >
        <option value="simulation">Simulation</option>
        <option value="esp32">ESP32 Hardware (not connected)</option>
      </select>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LiveSensorData() {
  const { data, sourceName, status, packetsReceived, lastUpdateMs, start, stop, reset, setSource } = useSensorData();

  const [chartData,    setChartData]    = useState(() => Array(CHART_LENGTH).fill(0));
  const [chartChannel, setChartChannel] = useState('imu.acceleration.x');

  // Update chart rolling buffer whenever new data arrives
  useEffect(() => {
    if (status !== 'running') return;
    const val = getChannelValue(data, chartChannel);
    setChartData(prev => [...prev.slice(1), val]);
  }, [data, chartChannel, status]);

  // Reset chart when channel changes
  useEffect(() => {
    setChartData(prev => Array(CHART_LENGTH).fill(getChannelValue(data, chartChannel)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartChannel]);

  const activeChannel = STREAM_CHANNELS.find(c => c.key === chartChannel);
  const streamLabel   = status === 'running'     ? 'Receiving'
                      : status === 'paused'       ? 'Paused'
                      : status === 'disconnected' ? 'Disconnected'
                      : 'Ready';
  const streamColor   = status === 'running'     ? 'var(--green)'
                      : status === 'paused'       ? 'var(--amber)'
                      : 'var(--text-muted)';

  return (
    <div id="live-sensor-page" style={{
      flex: 1, padding: '28px 32px', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 24,
    }}>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Live Sensor Data
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Real-time sensor telemetry and hardware status
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <div className="card" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>ESP32</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Prototype Controller</div>
            </div>
            <ConnectionBadge connected={sourceName === 'simulation' || status === 'running'} />
          </div>
          <DataSourceSelector sourceName={sourceName} onSetSource={setSource} />
        </div>
      </div>

      {/* ── Source notice banner ─────────────────────────────────────────── */}
      <div style={{
        padding: '10px 16px',
        background: sourceName === 'esp32' ? 'var(--red-muted)' : 'var(--amber-muted)',
        border: `1px solid ${sourceName === 'esp32' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
        borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke={sourceName === 'esp32' ? 'var(--red)' : 'var(--amber)'} strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
          <circle cx="12" cy="16" r="1" fill={sourceName === 'esp32' ? 'var(--red)' : 'var(--amber)'} />
        </svg>
        <span style={{ fontSize: 13, color: sourceName === 'esp32' ? 'var(--red)' : 'var(--amber)' }}>
          {sourceName === 'esp32'
            ? 'ESP32 not connected — data unavailable. Connect hardware to begin telemetry.'
            : 'Simulation mode active — values are synthetic and do not represent real measurements.'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: streamColor,
            animation: status === 'running' ? 'pulse-dot 2s ease-in-out infinite' : 'none' }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: streamColor }}>{streamLabel}</span>
        </div>
      </div>

      {/* ── Hardware Status + Stream Controls ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
        <HardwareStatusCard
          sourceName={sourceName}
          status={status}
          packetsReceived={packetsReceived}
          lastUpdateMs={lastUpdateMs}
        />
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Stream Controls
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {sourceName === 'esp32'
                ? 'Connect ESP32 hardware first. When connected, Start Stream will begin hardware telemetry.'
                : 'Control the simulated sensor data stream.'}
            </div>
          </div>
          <StreamControls
            status={sourceName === 'esp32' ? 'disconnected' : status}
            onStart={start}
            onStop={stop}
            onReset={reset}
          />
          {status === 'running' && sourceName === 'simulation' && (
            <div style={{ marginTop: 16, display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Update Rate</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-secondary)' }}>4 Hz</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Packets</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {packetsReceived.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Source</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--accent)' }}>Simulation</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sensor Cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <GpsCard gps={data.gps} sourceName={sourceName} />
        <ImuCard imu={data.imu} />
        <EnvironmentCard environmental={data.environmental} />
      </div>

      {/* ── Live Chart ───────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>Live Sensor Stream</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Continuous time-series — last {CHART_LENGTH} samples</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {status === 'running' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', animation: 'pulse-dot 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 12, color: 'var(--green)' }}>Live</span>
              </div>
            )}
            <select className="k-select" value={chartChannel} onChange={e => setChartChannel(e.target.value)}
              id="chart-channel-select" style={{ fontSize: 12, padding: '6px 10px' }}>
              {STREAM_CHANNELS.map(ch => (
                <option key={ch.key} value={ch.key}>{ch.label}</option>
              ))}
            </select>
          </div>
        </div>
        <LiveChart data={chartData} color="#38BDF8" height={180} unit={activeChannel?.unit ?? ''} />
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Channel: {activeChannel?.label}</span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, color: 'var(--text-primary)' }}>
            {getChannelValue(data, chartChannel).toFixed(4)}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{activeChannel?.unit}</span>
          </span>
        </div>
      </div>

      {/* ── Data Quality + Peripherals ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DataQualityCard quality={data.quality} />
        <PeripheralsCard ir={data.ir} switches={data.switches} />
      </div>

      {/* ── Data Flow strip ─────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 16, borderColor: 'rgba(56,189,248,0.15)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Data Flow
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {['Sensor Data', 'Validation', 'State Estimation', 'Guidance / Control', 'Analytics'].map((label, i, arr) => (
            <React.Fragment key={label}>
              <div style={{ padding: '5px 12px', borderRadius: 6, background: 'var(--card-elevated)', border: '1px solid var(--border-strong)', fontSize: 12, color: i === 0 ? 'var(--accent)' : 'var(--text-secondary)' }}>
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
