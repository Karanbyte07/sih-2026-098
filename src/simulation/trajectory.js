const SCENARIO_OFFSETS = {
  nominal: (t) => ({ x: 0, y: Math.sin(t * Math.PI * 2) * 1.2 }),
  disturbance: (t) => ({ x: Math.sin(t * Math.PI * 2) * 4, y: Math.sin(t * Math.PI * 3) * 8 }),
  sensorNoise: (t) => ({ x: Math.sin(t * Math.PI * 8) * 2.2, y: Math.cos(t * Math.PI * 7) * 2.8 }),
  systemFault: (t) => ({ x: t * 10, y: Math.sin(t * Math.PI * 2) * 12 + t * 8 }),
};

export function generateReferenceTrajectory(count = 72) {
  return Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1);
    return { t, x: 7 + t * 86, y: 78 - Math.sin(t * Math.PI) * 49 - t * 5 };
  });
}

export function applyDisturbance(reference, scenario = 'nominal') {
  const offsetFor = SCENARIO_OFFSETS[scenario] || SCENARIO_OFFSETS.nominal;
  return reference.map((point) => {
    const offset = offsetFor(point.t);
    return { ...point, x: point.x + offset.x, y: point.y + offset.y };
  });
}