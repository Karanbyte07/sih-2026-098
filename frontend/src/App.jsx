import React, { useState } from 'react';
import { dataSourceManager } from './sensors/dataSourceManager.js';
import TopNav from './components/TopNav';

// Pages
import SystemOverview  from './pages/SystemOverview';
import LiveSensorData  from './pages/LiveSensorData';
import StateEstimation from './pages/StateEstimation';
import FlightDynamics  from './pages/FlightDynamics';
import GuidanceControl from './pages/GuidanceControl';
import ElectronicFuze  from './pages/ElectronicFuze';
import Analytics       from './pages/Analytics';
import SystemArchitecture from './pages/SystemArchitecture';

function Placeholder({ page }) {
  return (
    <div style={{ padding: 40, color: 'var(--text-secondary)' }}>
      <h1 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{page}</h1>
      <p>This workspace is not yet available.</p>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage]   = useState('overview');
  const [dataSource, setDataSource]   = useState('hardware');

  const handleDataSourceChange = (source) => {
    setDataSource(source);
    dataSourceManager.setSource(source === 'hardware' ? 'esp32' : 'simulation');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'overview':      return <SystemOverview setActivePage={setActivePage} />;
      case 'sensor':        return <LiveSensorData />;
      case 'estimation':    return <StateEstimation />;
      case 'flight':        return <FlightDynamics />;
      case 'guidance':      return <GuidanceControl />;
      case 'fuze':          return <ElectronicFuze />;
      case 'analytics':     return <Analytics />;
      case 'architecture':  return <SystemArchitecture />;
      default:              return <Placeholder page={activePage} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg)' }}>
      <TopNav
        activePage={activePage}
        setActivePage={setActivePage}
        dataSource={dataSource}
        setDataSource={handleDataSourceChange}
      />
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {renderPage()}
      </main>
    </div>
  );
}
