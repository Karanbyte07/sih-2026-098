import React, { useState, useEffect, useRef } from 'react';

function StatusBar() {
  const [step, setStep] = useState(4982);
  useEffect(() => {
    const t = setInterval(() => setStep(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="grid grid-cols-5 gap-px bg-struct border-b border-struct" style={{ minHeight: 56 }}>
      {/* System Status */}
      <div className="bg-layer-2 flex flex-col justify-center px-3 py-2">
        <div className="section-label mb-1">System Status</div>
        <div className="flex items-center gap-2">
          <span className="dot-nominal pulse-dot" />
          <span className="font-mono text-2xs text-nominal">NOMINAL</span>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="font-mono text-2xl text-nominal font-bold">99.98%</span>
        </div>
        <div className="font-mono text-2xs text-outline mt-0.5">UPTIME 42.8h</div>
      </div>

      {/* Simulation Clock */}
      <div className="bg-layer-2 flex flex-col justify-center px-3 py-2">
        <div className="section-label mb-1">Simulation Clock</div>
        <div className="font-mono text-2xs text-signal mb-1">HIL 1000 Hz</div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xs text-outline">STEP</span>
          <span className="font-mono text-2xl text-on-surface font-bold">{step.toLocaleString()}</span>
        </div>
        <div className="font-mono text-2xs text-outline">/ 10,000 MAX</div>
      </div>

      {/* Sensor Bus Link */}
      <div className="bg-layer-2 flex flex-col justify-center px-3 py-2">
        <div className="section-label mb-1">Sensor Bus Link</div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-2xl text-on-surface font-bold">16/16</span>
          <span className="chip chip-nominal">LOCKED</span>
        </div>
        <div className="font-mono text-2xs text-nominal">JITTER &lt;0.04ms</div>
      </div>

      {/* Kalman Convergence */}
      <div className="bg-layer-2 flex flex-col justify-center px-3 py-2">
        <div className="section-label mb-1">Kalman Convergence</div>
        <div className="font-mono text-2xl text-on-surface font-bold">99.42%</div>
        <div className="font-mono text-2xs text-outline mt-1">COV 1.2e-4</div>
      </div>

      {/* EKF Stable */}
      <div className="bg-layer-2 flex flex-col justify-center px-3 py-2">
        <div className="section-label mb-1">EKF Status</div>
        <span className="chip chip-nominal w-fit">EKF STABLE</span>
        <div className="font-mono text-2xs text-outline mt-2">SIGMA: 0.012m</div>
      </div>
    </div>
  );
}

function TrajectoryCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    function draw(t) {
      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = '#0A1626';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.strokeStyle = '#16283D';
      for (let x = 0; x < w; x += 200) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 200) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Dashed trajectory (planned)
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(136, 146, 157, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.08, h * 0.88);
      ctx.bezierCurveTo(w * 0.2, h * 0.1, w * 0.5, h * 0.05, w * 0.85, h * 0.78);
      ctx.stroke();

      // Active trajectory (cyan glow)
      ctx.setLineDash([]);
      const grad = ctx.createLinearGradient(w * 0.08, h * 0.88, w * 0.55, h * 0.15);
      grad.addColorStop(0, 'rgba(24, 168, 255, 0.9)');
      grad.addColorStop(0.5, '#22D3C5');
      grad.addColorStop(1, 'rgba(24, 168, 255, 0.7)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#18A8FF';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(w * 0.08, h * 0.88);
      ctx.bezierCurveTo(w * 0.18, h * 0.12, w * 0.42, h * 0.08, w * 0.55, h * 0.18);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Apogee point
      const apogeeX = w * 0.46;
      const apogeeY = h * 0.11;
      ctx.fillStyle = '#22D3C5';
      ctx.beginPath();
      ctx.arc(apogeeX, apogeeY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(34, 211, 197, 0.15)';
      ctx.beginPath();
      ctx.arc(apogeeX, apogeeY, 12, 0, Math.PI * 2);
      ctx.fill();

      // Labels
      ctx.font = '10px JetBrains Mono';
      ctx.fillStyle = '#22D3C5';
      ctx.fillText('APOGEE 24.8km', apogeeX + 14, apogeeY + 4);

      // WP-01 Launch label
      ctx.fillStyle = '#88929d';
      ctx.fillText('WP-01: LAUNCH', w * 0.06, h * 0.95);

      // Target label
      ctx.fillStyle = '#18A8FF';
      ctx.fillText('TARGET (SIM)', w * 0.82, h * 0.83);

      // Coordinate indicator
      ctx.fillStyle = 'rgba(10, 22, 38, 0.85)';
      ctx.fillRect(w * 0.05, h * 0.78, 250, 28);
      ctx.strokeStyle = '#16283D';
      ctx.lineWidth = 1;
      ctx.strokeRect(w * 0.05, h * 0.78, 250, 28);
      ctx.font = '10px JetBrains Mono';
      ctx.fillStyle = '#88929d';
      ctx.fillText('COORDINATE FRAME (WGS-84)', w * 0.06, h * 0.78 + 11);
      ctx.fillStyle = '#18A8FF';
      ctx.fillText('X: +1,489.2 m   Y: -842.1 m   Z: 24,812.4 m', w * 0.06, h * 0.78 + 23);
    }

    draw(0);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={620}
      height={380}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}

function TelemetryPanel() {
  const [mach, setMach] = useState(4.12);
  const [alt, setAlt] = useState(24773.9);

  useEffect(() => {
    const t = setInterval(() => {
      setMach(m => +(m + (Math.random() - 0.5) * 0.01).toFixed(2));
      setAlt(a => +(a + (Math.random() - 0.5) * 0.5).toFixed(1));
    }, 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col h-full bg-layer-2 border-l border-struct">
      <div className="panel-header">
        <span className="section-label">Live Telemetry & State Vector</span>
        <span className="chip chip-primary" style={{ fontSize: 9 }}>1000 HZ BURST</span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-struct flex-1">
        {/* Altitude */}
        <div className="bg-layer-2 p-3">
          <div className="section-label mb-2">Altitude (MSL)</div>
          <div className="font-mono text-2xl text-on-surface font-bold">{alt.toFixed(1)}</div>
          <div className="font-mono text-2xs text-outline">m</div>
        </div>
        {/* True Airspeed */}
        <div className="bg-layer-2 p-3">
          <div className="section-label mb-2">True Airspeed</div>
          <div className="font-mono text-2xl text-on-surface font-bold">1245.5</div>
          <div className="font-mono text-2xs text-signal">m/s</div>
          <div className="font-mono text-2xs text-outline mt-1">MACH {mach} HYPERSONIC</div>
          <div className="font-mono text-2xs text-outline">AoA: +1.84°</div>
        </div>
        {/* Total Accel */}
        <div className="bg-layer-2 p-3">
          <div className="section-label mb-2">Total Accel</div>
          <div className="font-mono text-2xl text-on-surface font-bold">13.68</div>
          <div className="font-mono text-2xs text-outline">g</div>
          <div className="font-mono text-2xs text-outline mt-1">Q: 42.1 kPa</div>
        </div>
        {/* Simulation MET */}
        <div className="bg-layer-2 p-3">
          <div className="section-label mb-2">Simulation MET</div>
          <div className="font-mono text-md text-signal font-bold">T+00:04:12.850</div>
          <div className="font-mono text-2xs text-outline mt-1">DELTA-T: 0.0010s</div>
        </div>
      </div>

      {/* Euler Orientation */}
      <div className="border-t border-struct p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="section-label">Euler Orientation</span>
          <span className="font-mono text-2xs text-outline">QUATERNION [q0..q3]</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'PITCH', value: '+4.12°', sub: 'TRIM -0.12°' },
            { label: 'YAW', value: '-0.84°', sub: 'BETA +0.02°' },
            { label: 'ROLL', value: '+0.05°', sub: 'SPIN DAMPED' },
          ].map(item => (
            <div key={item.label} className="bg-layer-1 rounded p-2 border border-struct">
              <div className="section-label mb-1">{item.label}</div>
              <div className="font-mono text-sm text-on-surface font-bold">{item.value}</div>
              <div className="font-mono text-2xs text-outline">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actuator deflection */}
      <div className="border-t border-struct p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="section-label">Actuator Deflection Channels</span>
          <span className="font-mono text-2xs text-signal">FIN-01..04</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[
            { label: 'FIN 1', value: '-3.2°' },
            { label: 'FIN 2', value: '2.1°' },
            { label: 'FIN 3', value: '+0.9°' },
            { label: 'FIN 4', value: '-0.3°' },
          ].map(fin => (
            <div key={fin.label} className="bg-layer-1 rounded border border-struct p-2 text-center">
              <div className="section-label mb-1">{fin.label}</div>
              <div className="font-mono text-xs text-on-surface font-bold">{fin.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WaypointPanel() {
  const waypoints = [
    { id: 'WP-01', label: 'LAUNCH BOOST', status: 'CLEARED', color: 'nominal' },
    { id: 'WP-02', label: 'MID-COURSE GLIDE', status: 'PASSING', color: 'signal' },
    { id: 'APOGEE', label: '24,812 m [LIVE BEACON]', status: null, color: 'signal-2' },
    { id: 'TERM-PT', label: 'IMPACT TARGET', status: 'LOCKED', color: 'caution' },
  ];

  return (
    <div className="bg-layer-2 border border-struct rounded p-3" style={{ position: 'absolute', top: 12, left: 12, minWidth: 280 }}>
      <div className="section-label mb-2">Waypoints Sequence:</div>
      <div className="space-y-1.5">
        {waypoints.map(wp => (
          <div key={wp.id} className="flex items-center gap-2">
            <span className={`dot-${wp.color}`} />
            <span className="font-mono text-2xs text-outline">{wp.id}:</span>
            <span className="font-mono text-2xs text-on-surface">{wp.label}</span>
            {wp.status && (
              <span className={`chip chip-${wp.color === 'nominal' ? 'nominal' : wp.color === 'signal' ? 'primary' : wp.color === 'signal-2' ? 'secondary' : 'warning'} ml-auto`} style={{ fontSize: 8 }}>
                {wp.status}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BottomPanels() {
  const logs = [
    { time: '14:20:47.102', tag: 'HIL_CORE', color: 'log-tag-hil', msg: 'Master clock sync initialized at 1000.000 Hz. Packet jitter: 0.012ms.' },
    { time: '14:20:48.040', tag: 'GNC_EXEC', color: 'log-tag-gnc', msg: 'Line-of-sight vector acquired. Kalman filter state P_cov converged below 0.0002.' },
    { time: '14:20:48.892', tag: 'FUZE_SIM', color: 'log-tag-fuze', msg: 'Arming threshold qualification passed: Peak dynamic pressure > 35 kPa sustained for 400ms.' },
    { time: '14:20:49.204', tag: '6-DOF', color: 'log-tag-dof', msg: 'Step 4,892 integrated. Alpha: +1.84 deg, Mach: 4.12, Trajectory RMS error: 0.14 m.' },
  ];

  return (
    <div className="border-t border-struct" style={{ minHeight: 140 }}>
      {/* 3-column bottom row */}
      <div className="grid border-b border-struct" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {/* Estimation & Tracking Errors */}
        <div className="border-r border-struct p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-signal" style={{ fontSize: 12 }}>show_chart</span>
              <span className="section-label">Estimation & Tracking Errors</span>
            </div>
            <span className="font-mono text-2xs text-outline">RMS TOLERANCE</span>
          </div>
          {[
            { label: 'Cross-Track Error', value: '0.14 m', sub: '±0.02', pct: 72 },
            { label: 'Kalman Innovation Cov', value: '0.08 m', sub: null, pct: 45 },
            { label: 'Plant Confidence Index', value: '99.72%', sub: null, pct: 99 },
          ].map(item => (
            <div key={item.label} className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-2xs text-on-surface-variant">{item.label}</span>
                <span className="font-mono text-2xs text-nominal font-bold">{item.value}</span>
              </div>
              <div className="progress-track">
                <div className="progress-bar-nominal" style={{ width: `${item.pct}%`, height: '100%' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Active Scenario Injection */}
        <div className="border-r border-struct p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-signal" style={{ fontSize: 12 }}>tune</span>
              <span className="section-label">Active Scenario Injection</span>
            </div>
            <span className="chip chip-primary" style={{ fontSize: 9 }}>SCEN-402</span>
          </div>
          <div className="space-y-1">
            {[
              { label: 'Profile:', value: 'Hypersonic Re-entry Perturbation' },
              { label: 'Turbulence Model:', value: 'Von Kármán Gust [σ=2.4m/s]' },
              { label: 'G-Load Envelope:', value: 'Max +22.0g Limit', highlight: 'caution' },
              { label: 'Target Coordinates:', value: '31.284° N, 114.902° W' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-2">
                <span className="font-mono text-2xs text-outline w-36 flex-shrink-0">{item.label}</span>
                <span className={`font-mono text-2xs ${item.highlight === 'caution' ? 'text-caution' : 'text-on-surface'}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Electronic Fuze Safe Logic */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-nominal" style={{ fontSize: 12 }}>shield</span>
              <span className="section-label">Electronic Fuze Safe Logic</span>
            </div>
            <span className="chip chip-nominal" style={{ fontSize: 9 }}>QUALIFIED</span>
          </div>
          <div className="space-y-1">
            {[
              { label: 'Operational Mode:', value: 'DIGITAL TWIN TEST' },
              { label: 'Arming Interlock:', value: 'ARMED-SIMULATION', color: 'signal' },
              { label: 'Trajectory Gate:', value: 'GATE-3 PASS (R > 12km)' },
              { label: 'Hardware Watchdog:', value: '0 FAULTS // SYNC OK', color: 'nominal' },
            ].map(item => (
              <div key={item.label} className="flex items-start justify-between gap-2">
                <span className="font-mono text-2xs text-outline">{item.label}</span>
                <span className={`font-mono text-2xs ${item.color === 'signal' ? 'text-signal' : item.color === 'nominal' ? 'text-nominal' : 'text-on-surface'}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Terminal Log */}
      <div>
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-signal" style={{ fontSize: 12 }}>terminal</span>
            <span className="section-label">Real-Time Engineering Event Stream & Terminal Log</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xs text-outline">FILTER: ALL EVENTS</span>
            <button className="btn-secondary" style={{ height: 20, fontSize: 9 }}>CLEAR</button>
          </div>
        </div>
        <div className="bg-surface-container-lowest">
          {logs.map((log, i) => (
            <div key={i} className="log-line">
              <span className="log-timestamp">[{log.time}]</span>{' '}
              <span className={log.color}>[{log.tag}]</span>{' '}
              {log.msg}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MainDashboard() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Center: Trajectory Canvas */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-signal" style={{ fontSize: 12 }}>travel_explore</span>
              <span className="section-label">3D Mission & Trajectory Simulation Canvas</span>
              <span className="font-mono text-2xs text-outline">GIMBAL REF // ENU</span>
            </div>
            <div className="flex items-center gap-1">
              {['3D ORBIT', 'TOP (X-Y)', 'PROFILE (Z)'].map((v, i) => (
                <button key={v} className={`btn-secondary ${i === 0 ? 'border-signal text-signal' : ''}`} style={{ height: 20, fontSize: 9 }}>
                  {v}
                </button>
              ))}
              <button className="btn-secondary ml-2" style={{ height: 20, fontSize: 9 }}>⛶</button>
            </div>
          </div>
          <div className="flex-1 trajectory-canvas relative" style={{ background: '#030c18' }}>
            <TrajectoryCanvas />
            <WaypointPanel />
          </div>
          <BottomPanels />
        </div>

        {/* Right: Telemetry */}
        <div style={{ width: 300, minWidth: 300 }}>
          <TelemetryPanel />
        </div>
      </div>
    </div>
  );
}
