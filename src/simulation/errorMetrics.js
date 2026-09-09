export function calculateErrorMetrics(reference, simulated, progress = 1) {
  const sampleCount = Math.max(1, Math.floor(reference.length * progress));
  const errors = reference.slice(0, sampleCount).map((point, index) => Math.hypot(simulated[index].x - point.x, simulated[index].y - point.y));
  const latest = errors[errors.length - 1] || 0;
  const rmse = Math.sqrt(errors.reduce((sum, error) => sum + error ** 2, 0) / errors.length);
  return { tracking: latest * 0.42, estimation: rmse * 0.18, rmse };
}