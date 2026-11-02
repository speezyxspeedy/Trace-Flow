export async function fetchDependencies() {
  const res = await fetch('/api/dependencies');
  return await res.json();
}
