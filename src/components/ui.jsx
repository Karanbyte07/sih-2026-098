import React from 'react';

// ─── KPI Card ─────────────────────────────────────────────────────────────────
export function KPICard({ label, value, unit, status, trend, icon }) {
  const statusColor = {
    healthy: 'var(--green)',
    warning: 'var(--amber)',
    fault: 'var(--red)',
    info: 'var(--accent)',
  }[status] || 'var(--text-muted)';

  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="section-title">{label}</span>
        {icon && <span style={{ fontSize: 18, opacity: 0.5 }}>{icon}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="kpi-value mono">{value}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {trend && (
        <div style={{ marginTop: 8, fontSize: 12, color: statusColor, display: 'flex', alignItems: 'center', gap: 4 }}>
          {trend}
        </div>
      )}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status, label }) {
  const map = {
    healthy: { cls: 'badge-green', dot: 'pulse-green', text: label || 'Healthy' },
    running: { cls: 'badge-blue', dot: 'pulse-blue', text: label || 'Running' },
    warning: { cls: 'badge-amber', dot: 'pulse-amber', text: label || 'Warning' },
    fault: { cls: 'badge-red', dot: 'pulse-amber', text: label || 'Fault' },
    standby: { cls: 'badge-teal', dot: 'pulse-blue', text: label || 'Standby' },
    idle: { cls: 'badge-teal', dot: null, text: label || 'Idle' },
  }[status] || { cls: 'badge-blue', dot: null, text: label || status };

  return (
    <span className={`badge ${map.cls}`}>
      {map.dot && <span className={`pulse-dot ${map.dot}`} />}
      {map.text}
    </span>
  );
}

// ─── Metric Row ───────────────────────────────────────────────────────────────
export function MetricRow({ label, value, unit, status }) {
  const color = status === 'healthy' ? 'var(--green)' : status === 'warning' ? 'var(--amber)' : status === 'fault' ? 'var(--red)' : 'var(--text-primary)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 500, color }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

// ─── Simple Line Chart (Canvas) ───────────────────────────────────────────────
export function SimpleLineChart({ data = [], color = '#38BDF8', height = 120, showGrid = true, label = '' }) {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const pad = { top: 8, right: 8, bottom: 24, left: 40 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const px = (i) => pad.left + (i / (data.length - 1)) * cw;
    const py = (v) => pad.top + (1 - (v - min) / range) * ch;

    // Grid lines
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (i / 4) * ch;
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
        // Y labels
        const val = (max - (i / 4) * range).toFixed(1);
        ctx.fillStyle = 'rgba(148,163,184,0.6)';
        ctx.font = '10px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(val, pad.left - 4, y + 3);
      }
    }

    // Area fill — safe gradient (supports hex-7 and rgba)
    const isHex7 = typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color);
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    grad.addColorStop(0, isHex7 ? color + '30' : 'rgba(56,189,248,0.18)');
    grad.addColorStop(1, isHex7 ? color + '00' : 'rgba(56,189,248,0.0)');
    ctx.beginPath();
    ctx.moveTo(px(0), py(data[0]));
    for (let i = 1; i < data.length; i++) ctx.lineTo(px(i), py(data[i]));
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
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dot at last point
    ctx.beginPath();
    ctx.arc(px(data.length - 1), py(data[data.length - 1]), 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // X label
    if (label) {
      ctx.fillStyle = 'rgba(148,163,184,0.6)';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(label, w / 2, h - 4);
    }
  }, [data, color]);

  return <canvas ref={canvasRef} width={600} height={height} style={{ width: '100%', height: height, display: 'block' }} />;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = '#38BDF8' }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
    </div>
  );
}

// ─── Info Panel ───────────────────────────────────────────────────────────────
export function InfoPanel({ title, children, badge }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
        {badge}
      </div>
      {children}
    </div>
  );
}
