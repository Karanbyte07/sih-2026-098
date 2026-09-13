import React, { useState, useEffect } from 'react';

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
function Icon({ name, size = 15 }) {
  const icons = {
    overview: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    sensor: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    estimation: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M3 12h2M19 12h2M12 3v2M12 19v2" />
        <path d="M5.6 5.6l1.4 1.4M17 17l1.4 1.4M17 7l-1.4 1.4M6.4 17.6L5 19" />
      </svg>
    ),
    flight: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
    guidance: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    fuze: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    analytics: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  };
  return icons[name] || null;
}

const navItems = [
  { id: 'overview',     label: 'Overview',           icon: 'overview' },
  { id: 'sensor',       label: 'Live Sensors',       icon: 'sensor' },
  { id: 'estimation',   label: 'State Estimation',   icon: 'estimation' },
  { id: 'flight',       label: 'Flight Dynamics',    icon: 'flight' },
  { id: 'guidance',     label: 'Guidance & Control', icon: 'guidance' },
  { id: 'fuze',         label: 'Electronic Fuze',    icon: 'fuze' },
  { id: 'analytics',    label: 'Analytics',          icon: 'analytics' },
];

export default function TopNav({ activePage, setActivePage, dataSource, setDataSource }) {
  const [timeUtc, setTimeUtc] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setTimeUtc(`${h}:${m}:${s} UTC`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header style={{
      height: 60,
      background: 'var(--panel)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
      paddingLeft: 22,
      paddingRight: 22,
      gap: 0,
      zIndex: 100,
      position: 'relative',
    }}>
      {/* ── Logo & Brand ─────────────────────────────────────── */}
      <div
        onClick={() => setActivePage('overview')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginRight: 16,
          flexShrink: 0,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 60%, #818CF8 100%)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 14px rgba(56, 189, 248, 0.4)',
          flexShrink: 0,
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#050C16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <div style={{
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '0.07em',
            lineHeight: 1.15,
            fontFamily: 'Inter, sans-serif',
            display: 'flex',
            alignItems: 'center',
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #FFFFFF 25%, #E2E8F0 65%, #94A3B8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              BALLISTIC
            </span>
            <span style={{
              color: '#38BDF8',
              textShadow: '0 0 10px rgba(56, 189, 248, 0.6)',
            }}>
              X
            </span>
          </div>
          <div style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            fontWeight: 500,
            letterSpacing: '0.03em',
            lineHeight: 1,
            marginTop: 2,
          }}>
            Aerospace Digital Twin
          </div>
        </div>
      </div>

      {/* ── Separator ──────────────────────────────────── */}
      <div style={{ width: 1, height: 22, background: 'var(--border-strong)', marginRight: 12, flexShrink: 0 }} />

      {/* ── Nav Items ──────────────────────────────────── */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'hidden' }}>
        {navItems.map(item => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 8px',
                borderRadius: 7,
                border: active ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent',
                background: active ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 11.5,
                fontWeight: active ? 600 : 450,
                fontFamily: 'Inter, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: active ? '0 0 12px -2px rgba(56, 189, 248, 0.25)' : 'none',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <span style={{
                opacity: active ? 1 : 0.65,
                display: 'flex',
                color: active ? 'var(--accent)' : 'currentColor',
                filter: active ? 'drop-shadow(0 0 5px rgba(56, 189, 248, 0.5))' : 'none',
              }}>
                <Icon name={item.icon} size={13} />
              </span>
              {item.label}
              {active && (
                <span style={{
                  position: 'absolute',
                  bottom: -1,
                  left: '18%',
                  right: '18%',
                  height: 2,
                  background: '#38BDF8',
                  borderRadius: 2,
                  boxShadow: '0 0 8px #38BDF8',
                }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── UTC Clock ──────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 8px',
        borderRadius: 6,
        background: 'rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border)',
        marginLeft: 10,
        flexShrink: 0,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10.5,
          color: 'var(--text-secondary)',
          letterSpacing: '0.03em',
        }}>
          {timeUtc || '00:00:00 UTC'}
        </span>
      </div>

      {/* ── Data Source Selector ──────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12, flexShrink: 0 }}>
        <div style={{
          display: 'flex',
          background: 'rgba(5, 12, 22, 0.8)',
          border: '1px solid var(--border-strong)',
          borderRadius: 7,
          padding: 2,
          gap: 2,
        }}>
          {[
            { id: 'simulation', label: 'SIMULATOR', icon: '●' },
            { id: 'hardware',   label: 'ESP32 HW',  icon: '⚡' },
          ].map(src => {
            const isSelected = dataSource === src.id;
            return (
              <button
                key={src.id}
                onClick={() => setDataSource && setDataSource(src.id)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 5,
                  border: isSelected ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  fontFamily: 'JetBrains Mono, monospace',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: isSelected ? 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)' : 'transparent',
                  color: isSelected ? '#050C16' : 'var(--text-muted)',
                  boxShadow: isSelected ? '0 0 10px rgba(56, 189, 248, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <span style={{ fontSize: 7 }}>{src.icon}</span>
                {src.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── System Status Indicator ────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginLeft: 12,
        padding: '3px 8px',
        borderRadius: 100,
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        flexShrink: 0,
      }}>
        <span className="pulse-dot pulse-green" style={{ width: 5, height: 5 }} />
        <span style={{
          fontSize: 10.5,
          color: 'var(--green)',
          fontWeight: 600,
          letterSpacing: '0.04em',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          LIVE
        </span>
      </div>
    </header>
  );
}
