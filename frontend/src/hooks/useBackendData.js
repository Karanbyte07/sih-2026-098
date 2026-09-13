/**
 * KINETICA — useBackendData React Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Exposes the rich computed fields that the Python backend adds to every packet:
 *   - estimated_state  (position quality, orientation, environment)
 *   - health           (per-sensor boolean: imu, bmp280, lm35, gps)
 *   - analytics        (health score, anomaly flag, deviation magnitude)
 *   - guidance         (mode, recommendation, reason)
 *   - deviation        (magnitude, status, per-field values)
 *   - connected        (true when real ESP32 hardware is on the serial port)
 *   - source           ("USB_SERIAL" | "MANUAL" | "DEMO")
 *
 * This hook does NOT replace useSensorData(). Use them together:
 *   const { data }           = useSensorData();    // raw sensor readings for the UI
 *   const { estimatedState } = useBackendData();   // backend-computed state
 *
 * When the active source is "simulation" (not esp32), or the backend is
 * unreachable, all fields return their safe null/default values — the UI
 * continues to work without any special handling.
 *
 * Example usage:
 *   const { estimatedState, analytics, guidance, health, connected } = useBackendData();
 *   // estimatedState.quality         → 0.0 – 1.0
 *   // analytics.sensor_health_score  → 0.0 – 1.0
 *   // analytics.anomaly              → boolean
 *   // guidance.recommendation        → "CONTINUE_MONITORING" | "REVIEW_SENSOR_DATA"
 *   // health.imu                     → boolean
 *   // connected                      → boolean (real ESP32 on serial port)
 */

import { useState, useEffect } from 'react';
import { dataSourceManager }  from '../sensors/dataSourceManager.js';

// ── Safe default shapes (returned when backend is not connected) ──────────────

const DEFAULT_ESTIMATED_STATE = {
  available:   false,
  quality:     0,
  orientation: { ax: null, ay: null, az: null, gx: null, gy: null, gz: null },
  environment: { pressure: null, temperature: null, board_temperature: null },
  position:    { latitude: null, longitude: null, satellites: null, fix: false },
};

const DEFAULT_HEALTH = { imu: false, bmp280: false, lm35: false, gps: false };

const DEFAULT_ANALYTICS = {
  sensor_health_score: 0,
  healthy_sensors:     0,
  sensor_count:        0,
  anomaly:             false,
  model_deviation:     false,
  deviation_magnitude: 0,
};

const DEFAULT_GUIDANCE = {
  mode:            'MONITOR_ONLY',
  recommendation:  'CONTINUE_MONITORING',
  physical_action: 'NONE',
  reason:          'NO_DEVIATION',
};

const DEFAULT_DEVIATION = {
  values:    {},
  magnitude: 0,
  status:    'MATCH',
};

// ── Hook ─────────────────────────────────────────────────────────────────────

function extractFromPayload(payload) {
  if (!payload) {
    return {
      connected:      false,
      source:         null,
      estimatedState: DEFAULT_ESTIMATED_STATE,
      health:         DEFAULT_HEALTH,
      analytics:      DEFAULT_ANALYTICS,
      guidance:       DEFAULT_GUIDANCE,
      deviation:      DEFAULT_DEVIATION,
    };
  }
  return {
    connected:      payload.connected     === true,
    source:         payload.source        ?? null,
    estimatedState: payload.estimated_state ?? DEFAULT_ESTIMATED_STATE,
    health:         payload.health          ?? DEFAULT_HEALTH,
    analytics:      payload.analytics       ?? DEFAULT_ANALYTICS,
    guidance:       payload.guidance        ?? DEFAULT_GUIDANCE,
    deviation:      payload.deviation       ?? DEFAULT_DEVIATION,
  };
}

export function useBackendData() {
  const [backendData, setBackendData] = useState(() =>
    extractFromPayload(dataSourceManager.getBackendPayload())
  );

  useEffect(() => {
    // Re-derive backend fields whenever the sensor data updates
    // (sensor data always ticks when a WS packet arrives)
    const listener = () => {
      const payload = dataSourceManager.getBackendPayload();
      setBackendData(extractFromPayload(payload));
    };

    dataSourceManager.subscribe(listener);
    return () => dataSourceManager.unsubscribe(listener);
  }, []);

  return backendData;
}
