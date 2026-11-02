export function createWaterfallRuler(totalDuration, zoom = 1.0) {
  const steps = [0, 0.25, 0.5, 0.75, 1.0];
  return steps.map(pct => {
    const ms = Math.round(totalDuration * pct);
    const left = (pct * 100) * zoom;
    return `<div style="position:absolute;left:${left}%;"><span style="transform:translateX(-50%);font-family:monospace;">${ms}ms</span></div>`;
  }).join('');
}
