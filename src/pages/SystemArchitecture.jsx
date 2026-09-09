import React, { useState } from 'react';
import { SectionHeader, StatusBadge } from '../components/ui';

const nodes = [
  // Main pipeline (left column)
  { id: 'scenario', label: 'Scenario & Disturbance\nGenerator', col: 1, row: 0 },
  { id: 'digital-twin', label: 'Digital Twin', col: 1, row: 1, primary: true },
  { id: 'sensor-model', label: 'Sensor & Uncertainty\nModel', col: 1, row: 2 },
  { id: 'estimation', label: 'State Estimation', col: 1, row: 3, primary: true },
  { id: 'guidance', label: 'Guidance Decision', col: 1, row: 4, primary: true },
  { id: 'control', label: 'Control Response\nModel', col: 1, row: 5 },
  { id: 'updated-state', label: 'Updated State', col: 1, row: 6, primary: true },
  { id: 'feedback', label: 'Feedback', col: 1, row: 7 },
  // Fuze pipeline (right column)
  { id: 'fuze', label: 'Smart Electronic\nFuze', col: 3, row: 1, fuze: true },
  { id: 'sm', label: 'State Machine', col: 3, row: 2, fuze: true },
  { id: 'eval', label: 'Condition\nEvaluation', col: 3, row: 3, fuze: true },
  { id: 'safe-event', label: 'Safe Simulated\nEvent', col: 3, row: 4, fuze: true },
];

const nodeInfo = {
  'scenario': { title: 'Scenario & Disturbance Generator', desc: 'Generates simulation scenarios including atmospheric disturbances, sensor noise models, and trajectory profiles.', params: ['Atmospheric Model: ISA 1976', 'Gust Model: Von Kármán', 'Noise: Gaussian + colored'] },
  'digital-twin': { title: 'Digital Twin', desc: 'Full 6-degree-of-freedom simulation of vehicle dynamics including aerodynamic forces, gravity, and thrust.', params: ['Solver: RK4 Adaptive', 'DoF: 6', 'Rate: 1000 Hz'] },
  'sensor-model': { title: 'Sensor & Uncertainty Model', desc: 'Models IMU, GNSS, and other sensor outputs including noise, bias, and dropout scenarios.', params: ['IMU bias: 0.002°/hr', 'GNSS DOP: 0.84', 'CAN-FD latency: 0.18ms'] },
  'estimation': { title: 'State Estimation', desc: 'Extended Kalman Filter for fusing sensor measurements into optimal state estimates.', params: ['Type: EKF', 'Innovation: 0.012 m', 'Convergence: 99.4%'] },
  'guidance': { title: 'Guidance Decision', desc: 'Proportional-navigation guidance law computing acceleration commands to track the reference trajectory.', params: ["N' Gain: 4.2", 'LOS Rate: 0.32°/s', 'A_cmd: 12.8 m/s²'] },
  'control': { title: 'Control Response Model', desc: 'Maps guidance commands to fin deflections via autopilot, simulating actuator dynamics.', params: ['Slew Rate: 285°/s', 'Phase Margin: 54.2°', 'Update Rate: 1000 Hz'] },
  'updated-state': { title: 'Updated State', desc: 'The integrated simulation state fed back into the next step, closing the simulation loop.', params: ['Step: 4,982', 'Residual: 1.4e-8', 'RMS: 0.14 m'] },
  'feedback': { title: 'Feedback Loop', desc: 'Closes the simulation loop, enabling real-time correction of guidance and control based on estimated state.', params: ['Delay: 0.18 ms', 'Loss: 0.000%'] },
  'fuze': { title: 'Smart Electronic Fuze', desc: 'Programmable logic module that evaluates mission conditions and transitions through safety-verified states.', params: ['Mode: Simulation', 'Status: Safe', 'Logic: Verified'] },
  'sm': { title: 'State Machine', desc: 'Hierarchical finite state machine governing fuze logic progression and fault detection.', params: ['States: 7', 'Active: Monitoring', 'Cycle: 0.12 ms'] },
  'eval': { title: 'Condition Evaluation', desc: 'Real-time evaluation of physical gate conditions against thresholds.', params: ['Pressure: 42.2 kPa ✓', 'Accel: 9.4 g ✓', 'Thermal: +56°C ✓'] },
  'safe-event': { title: 'Safe Simulated Event', desc: 'Simulation-only output representing the fuze decision. No physical actuation occurs.', params: ['Output: Simulation only', 'Physical: None', 'Logged: Yes'] },
};

export default function SystemArchitecture() {
  const [selected, setSelected] = useState(null);

  const nodeH = 64;
  const nodeW = 200;
  const colGap = 80;
  const rowGap = 24;
  const padX = 40;
  const padY = 30;
  const col1X = padX;
  const col3X = padX + nodeW + colGap + 60 + colGap;
  const svgW = col3X + nodeW + padX;
  const svgH = (8) * (nodeH + rowGap) + padY * 2;

  const getX = (col) => col === 1 ? col1X : col3X;
  const getY = (row) => padY + row * (nodeH + rowGap);
  const cy = (row) => getY(row) + nodeH / 2;

  const info = selected ? nodeInfo[selected] : null;

  return (
    <div style={{ flex: 1, padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="System Architecture"
        subtitle="Simulation pipeline and component relationships — click any node to inspect"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20 }}>
        {/* Diagram */}
        <div className="card" style={{ padding: 20, overflow: 'auto' }}>
          <svg width={svgW} height={svgH} style={{ display: 'block', minWidth: svgW }}>
            {/* Column labels */}
            <text x={col1X + nodeW / 2} y={16} textAnchor="middle" fill="rgba(148,163,184,0.5)" fontSize="11" fontFamily="Inter">Main Simulation Pipeline</text>
            <text x={col3X + nodeW / 2} y={16} textAnchor="middle" fill="rgba(245,158,11,0.6)" fontSize="11" fontFamily="Inter">Electronic Fuze Logic</text>

            {/* Arrows for main pipeline */}
            {[0,1,2,3,4,5,6].map(i => (
              <g key={`arrow-${i}`}>
                <line
                  x1={col1X + nodeW / 2} y1={getY(i) + nodeH}
                  x2={col1X + nodeW / 2} y2={getY(i + 1) - 4}
                  stroke="rgba(56,189,248,0.3)" strokeWidth="1.5"
                />
                <polygon
                  points={`${col1X + nodeW / 2 - 5},${getY(i + 1) - 6} ${col1X + nodeW / 2 + 5},${getY(i + 1) - 6} ${col1X + nodeW / 2},${getY(i + 1) - 1}`}
                  fill="rgba(56,189,248,0.3)"
                />
              </g>
            ))}

            {/* Feedback arrow */}
            <path
              d={`M ${col1X + nodeW / 2} ${getY(7) + nodeH / 2} L ${col1X - 20} ${getY(7) + nodeH / 2} L ${col1X - 20} ${getY(0) + nodeH / 2} L ${col1X} ${getY(0) + nodeH / 2}`}
              stroke="rgba(56,189,248,0.2)" strokeWidth="1.5" fill="none" strokeDasharray="5 3"
            />
            <polygon
              points={`${col1X - 2},${getY(0) + nodeH / 2 - 5} ${col1X - 2},${getY(0) + nodeH / 2 + 5} ${col1X + 6},${getY(0) + nodeH / 2}`}
              fill="rgba(56,189,248,0.2)"
            />
            <text x={col1X - 28} y={(getY(0) + getY(7)) / 2 + nodeH / 2} textAnchor="middle" fill="rgba(56,189,248,0.4)" fontSize="9" fontFamily="Inter" transform={`rotate(-90, ${col1X - 28}, ${(getY(0) + getY(7)) / 2 + nodeH / 2})`}>feedback</text>

            {/* Fuze arrows */}
            {[1,2,3].map(i => (
              <g key={`fuze-arrow-${i}`}>
                <line
                  x1={col3X + nodeW / 2} y1={getY(i) + nodeH}
                  x2={col3X + nodeW / 2} y2={getY(i + 1) - 4}
                  stroke="rgba(245,158,11,0.3)" strokeWidth="1.5"
                />
                <polygon
                  points={`${col3X + nodeW / 2 - 5},${getY(i + 1) - 6} ${col3X + nodeW / 2 + 5},${getY(i + 1) - 6} ${col3X + nodeW / 2},${getY(i + 1) - 1}`}
                  fill="rgba(245,158,11,0.3)"
                />
              </g>
            ))}

            {/* Connection from main to fuze (estimation → fuze) */}
            <line
              x1={col1X + nodeW} y1={cy(1)}
              x2={col3X} y2={cy(1)}
              stroke="rgba(148,163,184,0.15)" strokeWidth="1.5" strokeDasharray="4 3"
            />

            {/* Nodes */}
            {nodes.map(node => {
              const x = getX(node.col);
              const y = getY(node.row);
              const isSelected = selected === node.id;
              const isFuze = node.fuze;
              const isPrimary = node.primary;

              const borderColor = isSelected
                ? (isFuze ? 'rgba(245,158,11,0.8)' : 'rgba(56,189,248,0.8)')
                : isFuze ? 'rgba(245,158,11,0.25)' : isPrimary ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.08)';
              const bgColor = isSelected
                ? (isFuze ? 'rgba(245,158,11,0.1)' : 'rgba(56,189,248,0.1)')
                : isFuze ? 'rgba(245,158,11,0.05)' : isPrimary ? 'rgba(56,189,248,0.05)' : 'rgba(19,37,56,0.8)';

              const labelColor = isFuze ? '#F59E0B' : isPrimary ? '#38BDF8' : '#94A3B8';

              return (
                <g key={node.id} onClick={() => setSelected(selected === node.id ? null : node.id)} style={{ cursor: 'pointer' }}>
                  <rect x={x} y={y} width={nodeW} height={nodeH} rx="8" fill={bgColor} stroke={borderColor} strokeWidth="1.5" />
                  {node.label.split('\n').map((line, li) => (
                    <text
                      key={li}
                      x={x + nodeW / 2}
                      y={y + nodeH / 2 + (li - (node.label.split('\n').length - 1) / 2) * 17}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={labelColor}
                      fontSize="12"
                      fontFamily="Inter"
                      fontWeight={isPrimary || isFuze ? '600' : '400'}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Info panel */}
        <div style={{ width: 260 }}>
          {info ? (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{info.title}</div>
                <button className="btn-ghost" style={{ padding: 4 }} onClick={() => setSelected(null)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{info.desc}</p>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>Parameters</div>
                {info.params.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>{p}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.4, display: 'block', margin: '0 auto 12px' }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12" y2="16" />
                </svg>
                Click any node in the diagram to view component details.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
