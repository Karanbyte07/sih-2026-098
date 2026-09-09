import React from 'react';

const navItems = [
  {
    id: 'mission', label: 'Mission Control',
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#38BDF8' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /><line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
      </svg>
    )
  },
  {
    id: 'flight', label: 'Flight Dynamics',
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#38BDF8' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    )
  },
  {
    id: 'guidance', label: 'Guidance & Control',
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#38BDF8' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    )
  },
  {
    id: 'fuze', label: 'Electronic Fuze',
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#38BDF8' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    )
  },
  {
    id: 'analytics', label: 'Analytics',
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#38BDF8' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    )
  },
  {
    id: 'architecture', label: 'System Architecture',
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#38BDF8' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    )
  },
  {
    id: 'settings', label: 'Settings',
    icon: (active) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#38BDF8' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )
  },
];

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <aside style={{
      width: 220,
      minWidth: 220,
      height: '100vh',
      background: 'var(--panel)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32,
            background: 'var(--accent)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B1829" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="2" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>KINETICA</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Precision Simulation &<br />Validation Platform
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 6, padding: '0 4px 8px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Workspace
        </div>
        {navItems.map(item => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              {item.icon(active)}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span className="pulse-dot pulse-green" />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>System Online</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Platform v1.0 — Simulation Mode</div>
      </div>
    </aside>
  );
}
