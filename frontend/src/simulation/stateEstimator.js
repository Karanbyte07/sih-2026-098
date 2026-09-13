export function estimateState(simulated, progress, scenario = 'nominal') {
  const point = simulated[Math.min(simulated.length - 1, Math.floor(progress * (simulated.length - 1)))] || simulated[0];
  const noise = scenario === 'sensorNoise' ? 1.7 : scenario === 'systemFault' ? 3.6 : 0.2;
  return {
    position: { x: 124.5 + (point.x - 50) * 0.15 + noise, y: 82.1 + (point.y - 40) * 0.12 - noise * 0.35, z: 156.8 + Math.sin(progress * Math.PI) * 2 + noise * 0.2 },
    velocity: 42.5 + Math.sin(progress * Math.PI * 2) * 1.8 + noise,
    orientation: { roll: 2.1 + Math.sin(progress * Math.PI * 2) * 0.3, pitch: 1.4 + Math.cos(progress * Math.PI) * 0.2, yaw: 3.2 + progress * 0.8 },
    uncertainty: scenario === 'systemFault' ? 72.6 : 97.4,
  };
}