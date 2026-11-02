// Services Directory & Health View - Light Observability Theme
export async function renderServices(container: HTMLElement, state: any, navigateTo: (tab: string, params?: any) => void, selectedService?: string) {
  container.innerHTML = `
    <div class="p-6 space-y-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Service Registry & Health Metrics
          </h1>
          <p class="text-xs text-slate-500 mt-1">
            Service-level SLAs, call volumes, percentile latencies (P50, P95, P99), and error ratios
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button id="services-refresh-btn" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-2 shadow-xs">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button id="services-view-deps-btn" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs">
            View Dependency Topology
          </button>
        </div>
      </div>

      <!-- Services Cards Grid -->
      <div id="services-cards-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="col-span-3 text-xs text-slate-400 py-12 text-center">Loading services...</div>
      </div>
    </div>
  `;

  const grid = container.querySelector('#services-cards-grid') as HTMLElement;

  async function loadServices() {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      const services = data.services || [];

      if (services.length === 0) {
        grid.innerHTML = `<div class="col-span-3 text-xs text-slate-400 py-12 text-center">No services registered yet. Ingest traces to register services.</div>`;
        return;
      }

      grid.innerHTML = services.map((s: any) => {
        const isCritical = s.health === 'critical';
        const isWarn = s.health === 'warning';
        const statusColor = isCritical ? 'text-rose-700 bg-rose-50 border-rose-200' : (isWarn ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200');
        const statusLabel = isCritical ? 'CRITICAL' : (isWarn ? 'WARNING' : 'HEALTHY');

        return `
          <div class="p-5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-slate-900">${s.service_name}</h3>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${statusColor}">
                  ${statusLabel}
                </span>
              </div>
              <div class="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
                <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span class="text-slate-500 block text-[10px] font-sans font-semibold">THROUGHPUT</span>
                  <span class="text-slate-900 text-sm font-bold">${s.request_count}</span>
                  <span class="text-slate-400 text-[10px] ml-1">spans</span>
                </div>
                <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span class="text-slate-500 block text-[10px] font-sans font-semibold">ERROR RATIO</span>
                  <span class="${isCritical ? 'text-rose-600' : 'text-slate-900'} text-sm font-bold">${s.error_rate}%</span>
                  <span class="text-slate-400 text-[10px] ml-1">(${s.error_count})</span>
                </div>
              </div>
            </div>

            <div class="space-y-2 pt-3 border-t border-slate-100 text-xs font-mono">
              <div class="flex justify-between items-center text-slate-600 text-[11px]">
                <span class="font-sans font-medium">Avg Latency</span>
                <span class="text-slate-900 font-semibold">${s.average_latency} ms</span>
              </div>
              <div class="flex justify-between items-center text-slate-600 text-[11px]">
                <span class="font-sans font-medium">P50 (Median)</span>
                <span class="text-emerald-600 font-semibold">${s.p50_latency} ms</span>
              </div>
              <div class="flex justify-between items-center text-slate-600 text-[11px]">
                <span class="font-sans font-medium">P95 Latency</span>
                <span class="text-indigo-600 font-semibold">${s.p95_latency} ms</span>
              </div>
              <div class="flex justify-between items-center text-slate-600 text-[11px]">
                <span class="font-sans font-medium">P99 Latency</span>
                <span class="text-sky-600 font-semibold">${s.p99_latency} ms</span>
              </div>
            </div>

            <div class="pt-2">
              <button class="w-full py-2 text-xs font-semibold text-indigo-700 hover:text-white hover:bg-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg transition-colors filter-service-traces-btn" data-service="${s.service_name}">
                Filter Traces for ${s.service_name} →
              </button>
            </div>
          </div>
        `;
      }).join('');

      grid.querySelectorAll('.filter-service-traces-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sName = btn.getAttribute('data-service');
          navigateTo('traces');
          setTimeout(() => {
            const select = document.querySelector('#filter-service') as HTMLSelectElement;
            if (select && sName) {
              select.value = sName;
              select.dispatchEvent(new Event('change'));
            }
          }, 50);
        });
      });

    } catch (err: any) {
      grid.innerHTML = `<div class="col-span-3 text-xs text-rose-500 py-12 text-center font-medium">Failed to load services: ${err.message}</div>`;
    }
  }

  container.querySelector('#services-refresh-btn')?.addEventListener('click', () => loadServices());
  container.querySelector('#services-view-deps-btn')?.addEventListener('click', () => navigateTo('dependencies'));

  loadServices();
}
