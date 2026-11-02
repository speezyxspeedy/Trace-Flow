export async function fetchTraces(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/traces?${query}`);
  return await res.json();
}

export async function fetchTraceDetail(traceId) {
  const res = await fetch(`/api/traces/${traceId}`);
  return await res.json();
}
