import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

// Pages
import MissionControl   from './pages/MissionControl';
import FlightDynamics   from './pages/FlightDynamics';
import GuidanceControl  from './pages/GuidanceControl';
import ElectronicFuze   from './pages/ElectronicFuze';
import Analytics        from './pages/Analytics';
import SystemArchitecture from './pages/SystemArchitecture';
import LiveSensorData   from './pages/LiveSensorData';
import StateEstimation  from './pages/StateEstimation';

function Placeholder({ page }) {
  return (
    <div style={{ padding: 36, color: 'var(--text-secondary)' }}>
      <h1 style={{ color: 'var(--text-primary)', fontSize: 22, marginBottom: 8 }}>{page}</h1>
      <p>This workspace will be available in a future release.</p>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState('mission');

  const renderPage = () => {
    switch (activePage) {
      case 'mission':      return <MissionControl />;
      case 'flight':       return <FlightDynamics />;
      case 'guidance':     return <GuidanceControl />;
      case 'fuze':         return <ElectronicFuze />;
      case 'analytics':    return <Analytics />;
      case 'architecture': return <SystemArchitecture />;
      case 'sensor':       return <LiveSensorData />;
      case 'estimation':   return <StateEstimation />;
      case 'settings':     return <Placeholder page="Settings" />;
      default:             return <Placeholder page={activePage} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar activePage={activePage} />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
