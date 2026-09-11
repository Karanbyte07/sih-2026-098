/**
 * KINETICA — useSensorData React Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * The single entry point for all React components that need sensor data.
 *
 * Components should NEVER import SimulationSensorSource or ESP32SensorSource
 * directly. They should use this hook exclusively.
 *
 * Returns:
 *   data       — latest validated SensorData
 *   sourceName — 'simulation' | 'esp32'
 *   status     — 'ready' | 'running' | 'paused' | 'disconnected'
 *   packetsReceived
 *   lastUpdateMs
 *   start      — begin sensor stream
 *   stop       — pause sensor stream
 *   reset      — reset to initial state
 *   setSource  — switch between 'simulation' and 'esp32'
 *
 * Example:
 *   const { data, status, start, stop, reset, setSource } = useSensorData();
 *   // data.gps.latitude, data.imu.acceleration.x, etc.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { dataSourceManager } from '../sensors/dataSourceManager.js';

export function useSensorData() {
  const [data,       setData]       = useState(() => dataSourceManager.getLatestData());
  const [statusInfo, setStatusInfo] = useState(() => dataSourceManager.getStatus());

  // Track last-update time for the status display
  const lastTickRef = useRef(Date.now());
  const [lastUpdateMs, setLastUpdateMs] = useState(0);

  // Subscribe to the DataSourceManager once
  useEffect(() => {
    const listener = (newData) => {
      setData(newData);
      lastTickRef.current = Date.now();
      setLastUpdateMs(0);
      setStatusInfo(dataSourceManager.getStatus());
    };

    dataSourceManager.subscribe(listener);
    return () => dataSourceManager.unsubscribe(listener);
  }, []);

  // Keep the lastUpdateMs counter ticking
  useEffect(() => {
    const t = setInterval(() => {
      const ms = Date.now() - lastTickRef.current;
      setLastUpdateMs(ms);
    }, 100);
    return () => clearInterval(t);
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    lastTickRef.current = Date.now();
    dataSourceManager.start();
    setStatusInfo(dataSourceManager.getStatus());
  }, []);

  const stop = useCallback(() => {
    dataSourceManager.stop();
    setStatusInfo(dataSourceManager.getStatus());
  }, []);

  const reset = useCallback(() => {
    dataSourceManager.reset();
    setData(dataSourceManager.getLatestData());
    setStatusInfo(dataSourceManager.getStatus());
    lastTickRef.current = Date.now();
    setLastUpdateMs(0);
  }, []);

  const setSource = useCallback((name) => {
    dataSourceManager.setSource(name);
    setData(dataSourceManager.getLatestData());
    setStatusInfo(dataSourceManager.getStatus());
  }, []);

  return {
    /** @type {import('../sensors/types.js').SensorData} */
    data,

    /** @type {'simulation' | 'esp32'} */
    sourceName:      statusInfo.source,

    /** @type {import('../sensors/types.js').StreamStatus} */
    status:          statusInfo.status,

    packetsReceived: statusInfo.packetsReceived,
    lastUpdateMs,

    start,
    stop,
    reset,
    setSource,
  };
}
