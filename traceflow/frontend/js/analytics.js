export async function getOverview() {
  const res = await fetch('/api/analytics/overview');
  return await res.json();
}

export async function getErrors() {
  const res = await fetch('/api/analytics/errors');
  return await res.json();
}

export async function getLatency() {
  const res = await fetch('/api/analytics/latency');
  return await res.json();
}
