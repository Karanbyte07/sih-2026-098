import React, { useRef, useEffect, useState } from 'react';
import { StatusBadge } from '../components/ui';

function Visualization3D() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const angleRef = useRef(0);
  const [view, setView] = useState('3d');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      if (view === '3d') angleRef.current += 0.003;
      const angle = angleRef.current;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#070E1B';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      // 3D grid projection
      const project = (x, y, z) => {
        const scale = 240 / (240 + z);
        const rotX = x * Math.cos(angle) - z * Math.sin(angle);
        const rotZ = x * Math.sin(angle) + z * Math.cos(angle);
        const rotY = y * Math.cos(0.3) - rotZ * Math.sin(0.3);
        const finalZ = y * Math.sin(0.3) + rotZ * Math.cos(0.3);
        const s = 200 / (200 + finalZ);
        return {
          x: cx + rotX * s * (view === '2d' ? 0 : 1),
          y: cy + rotY * s,
        };
      };

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        const a = project(i * 40, 0, -120);
        const b = project(i * 40, 0, 120);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        const c = project(-120, 0, i * 40);
        const d = project(120, 0, i * 40);
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
      }

      // Reference path
      const refPts = [];
      const simPts = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const x = -100 + t * 200;
        const y = -Math.sin(t * Math.PI) * 80;
        const z = -40 + t * 80;
        refPts.push(project(x, y, z));
        const noise = Math.sin(i * 0.7) * 6;
        simPts.push(project(x + noise * 0.3, y + noise, z + noise * 0.2));
      }

      // Reference
      ctx.beginPath();
      refPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = 'rgba(148,163,184,0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Sim path
      ctx.beginPath();
      simPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Launch point
      const launch = simPts[0];
      ctx.beginPath();
      ctx.arc(launch.x, launch.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#38BDF8';
      ctx.fill();

      // Current position marker
      const current = simPts[simPts.length - 1];
      ctx.beginPath();
      ctx.arc(current.x, current.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#38BDF8';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(current.x, current.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56,189,248,0.15)';
      ctx.fill();

      // Endpoint
      const endpoint = refPts[refPts.length - 1];
      ctx.beginPath();
      ctx.arc(endpoint.x, endpoint.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(148,163,184,0.5)';
      ctx.fill();

      // Labels
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.font = '11px Inter';
      ctx.fillText('Launch', launch.x + 10, launch.y - 8);
      ctx.fillStyle = '#38BDF8';
      ctx.fillText('Current State', current.x + 12, current.y - 8);
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.fillText('Reference Endpoint', endpoint.x + 10, endpoint.y - 8);

      // Legend
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.font = '11px Inter';
      ctx.setLineDash([5, 3]);
      ctx.strokeStyle = 'rgba(148,163,184,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(20, 20); ctx.lineTo(44, 20); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText('Reference', 48, 24);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(20, 38); ctx.lineTo(44, 38); ctx.stroke();
      ctx.fillStyle = '#38BDF8';
      ctx.fillText('Simulation', 48, 42);

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [view]);

  return (
    <div style={{ position: 'relative', flex: 1, background: '#070E1B', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Controls */}
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6, zIndex: 10 }}>
        {['2D', '3D', 'Reset'].map(v => (
          <button
            key={v}
            onClick={() => {
              if (v === '3D') setView('3d');
              if (v === '2D') setView('2d');
              if (v === 'Reset') angleRef.current = 0;
            }}
            style={{
              background: (v === '3D' && view === '3d') || (v === '2D' && view === '2d') ? 'rgba(56,189,248,0.2)' : 'rgba(15,32,53,0.9)',
              border: (v === '3D' && view === '3d') || (v === '2D' && view === '2d') ? '1px solid rgba(56,189,248,0.5)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: (v === '3D' && view === '3d') || (v === '2D' && view === '2d') ? '#38BDF8' : 'rgba(148,163,184,0.8)',
              fontSize: 12,
              padding: '5px 12px',
              cursor: 'pointer',
              fontFamily: 'Inter',
            }}
          >
            {v}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        width={900}
        height={500}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}

export default function VisualizationPage() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 32, gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>3D Visualization</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Reference and simulated trajectory paths</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 20, flex: 1, minHeight: 0 }}>
        {/* Visualization */}
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
          <Visualization3D />
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Current State</div>
            {[
              { l: 'Altitude', v: '24,773 m' },
              { l: 'Velocity', v: '1,402 m/s' },
              { l: 'Mach', v: '4.12' },
              { l: 'AoA', v: '+1.84°' },
              { l: 'Downrange', v: '41.8 km' },
            ].map(item => (
              <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.l}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-primary)' }}>{item.v}</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Tracking</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Cross-track error</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 22, color: 'var(--status-green)', marginBottom: 6 }}>0.14 m</div>
            <StatusBadge status="healthy" label="Within tolerance" />
          </div>
        </div>
      </div>
    </div>
  );
}
