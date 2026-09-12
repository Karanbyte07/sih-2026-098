import React from 'react';

const PAGE_LABELS = {
  mission:      'Mission Control',
  flight:       'Flight Dynamics',
  guidance:     'Guidance & Control',
  fuze:         'Electronic Fuze',
  sensor:       'Live Sensor Data',
  estimation:   'State Estimation',
  analytics:    'Analytics',
  architecture: 'System Architecture',
  settings:     'Settings',
};

export default function TopBar({ activePage }) {
  const label = PAGE_LABELS[activePage] ?? activePage;

  return (
    <header style={{
      height: 48,
      background: 'var(--panel)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'stretch',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingLeft: 22 }}>
        <span style={{ fontSize: 12, letterSpacing: '0.08em', fontWeight: 700, color: 'var(--text-primary)' }}>
          BALLISTIC<span style={{ color: 'var(--accent)' }}>X</span>
        </span>
        <span style={{ height: 16, width: 1, background: 'var(--border-strong)' }} />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      </div>

      {/* Right side */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, paddingRight: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span className="pulse-dot pulse-green" />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>System Online</span>
        </div>
      </div>
    </header>
  );
}
