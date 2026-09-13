import React, { useState } from 'react';
import { SectionHeader, StatusBadge, SimpleLineChart } from '../components/ui';

const scenarios = ['Baseline Run', 'Scenario A — High-G', 'Scenario B — Gust Disturbance', 'Scenario C — Sensor Noise'];
const baselines = ['Standard ISA', 'MIL-HDBK-1797'];

const tableData = [
  { scenario: 'Scenario A — High-G', baseline: '0.14 m', proposed: '0.12 m', diff: '−14.3%', better: true },
  { scenario: 'Scenario B — Gust', baseline: '0.21 m', proposed: '0.18 m', diff: '−14.3%', better: true },
  { scenario: 'Scenario C — Noise', baseline: '0.09 m', proposed: '0.09 m', diff: '0.0%', better: null },
  { scenario: 'Baseline Run', baseline: '0.07 m', proposed: '0.06 m', diff: '−14.3%', better: true },
];

function generateSeries(base, factor = 1) {
  return Array.from({ length: 50 }, (_, i) =>
    base * factor + Math.sin(i * 0.3) * base * 0.2 + (Math.random() - 0.5) * base * 0.1
  );
}

export default function Analytics() {
  const [scenario, setScenario] = useState(scenarios[1]);
  const [baselineType, setBaselineType] = useState(baselines[0]);

  const baselineData = generateSeries(0.14, 1);
  const proposedData = generateSeries(0.14, 0.86);

  return (
    <div style={{ flex: 1, padding: 32, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Analytics"
        subtitle="Simulation performance and validation results"
      />

      {/* Selectors */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Scenario</label>
        <select
          className="k-select"
          value={scenario}
          onChange={e => setScenario(e.target.value)}
          style={{ minWidth: 220 }}
        >
          {scenarios.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 16 }}>Reference</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {baselines.map(b => (
            <button
              key={b}
              className={baselineType === b ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setBaselineType(b)}
              style={{ fontSize: 12, padding: '6px 14px' }}
            >
              {b}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <StatusBadge status="healthy" label="Validation Passed" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Main performance chart */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Tracking Error — {scenario}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Cross-track error over simulation window</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 2, background: 'rgba(148,163,184,0.4)', borderRadius: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Baseline</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 2, background: 'var(--accent)', borderRadius: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Proposed</span>
              </div>
            </div>
          </div>
          <SimpleLineChart data={baselineData} color="rgba(148,163,184,0.5)" height={160} label="Error (m)" />
          <div style={{ marginTop: -160, pointerEvents: 'none', position: 'relative', zIndex: 1 }}>
            <SimpleLineChart data={proposedData} color="#38BDF8" height={160} label="" />
          </div>
        </div>

        {/* Secondary chart */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>State Estimation Residual</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Kalman filter innovation signal</div>
          </div>
          <SimpleLineChart
            data={Array.from({ length: 50 }, (_, i) => 0.012 + Math.sin(i * 0.5) * 0.003 + Math.random() * 0.002)}
            color="#2DD4BF"
            height={160}
            label="Residual (m)"
          />

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Summary Statistics</div>
            {[
              { l: 'Mean Residual', v: '0.012 m' },
              { l: 'Peak Residual', v: '0.031 m' },
              { l: 'RMS Error', v: '0.014 m' },
              { l: 'Filter Confidence', v: '99.4%' },
            ].map(item => (
              <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.l}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--text-primary)' }}>{item.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Scenario Comparison</div>
        <table className="k-table">
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Baseline</th>
              <th>Proposed</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, i) => (
              <tr key={i}>
                <td>{row.scenario}</td>
                <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{row.baseline}</span></td>
                <td><span style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{row.proposed}</span></td>
                <td>
                  <span style={{
                    fontFamily: 'JetBrains Mono', fontSize: 12,
                    color: row.better === true ? 'var(--green)' : row.better === false ? 'var(--red)' : 'var(--text-muted)',
                  }}>
                    {row.diff}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
