import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

// Sidebar pages
import MissionControl from './pages/MissionControl';

function Placeholder({ page }) {
  return <div style={{ padding: 36, color: 'var(--text-secondary)' }}><h1 style={{ color: 'var(--text-primary)', fontSize: 24, marginBottom: 8 }}>{page}</h1><p>This workspace will be available in a future release.</p></div>;
}

export default function App() {
  const [activePage, setActivePage] = useState('mission');

  const handlePageChange = (page) => {
    setActivePage(page);
  };
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar activePage={activePage} setActivePage={handlePageChange} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activePage === 'mission'
            ? <MissionControl />
            : <Placeholder page={activePage.charAt(0).toUpperCase() + activePage.slice(1)} />}
        </main>
      </div>
    </div>
  );
}
