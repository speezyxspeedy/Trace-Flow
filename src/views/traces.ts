// Trace Explorer View Component - Light Observability Theme
export async function renderTraces(container: HTMLElement, state: any, navigateTo: (tab: string, params?: any) => void) {
  container.innerHTML = `
    <div class="p-6 space-y-5 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Distributed Trace Explorer
          </h1>
          <p class="text-xs text-slate-500 mt-1">
            Search, filter, and inspect end-to-end distributed transaction traces across microservices
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button id="traces-refresh-btn" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-2 shadow-xs">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button id="traces-ingest-btn" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs">
            + Ingest New Trace
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <!-- Search Trace ID or Service -->
          <div class="relative">
            <input id="filter-search" type="text" placeholder="Search Trace ID or root service..." 
              class="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 font-mono transition-all" />
            <svg class="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <!-- Service Filter -->
          <div>
            <select id="filter-service" class="w-full px-3 py-2 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all">
              <option value="ALL">All Services</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div>
            <select id="filter-status" class="w-full px-3 py-2 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 font-mono transition-all">
              <option value="ALL">All Statuses (OK & Errors)</option>
              <option value="OK">Status: OK</option>
              <option value="ERROR">Status: ERROR</option>
            </select>
          </div>

          <!-- Dataset Filter (Demo vs Imported) -->
          <div>
            <select id="filter-demo" class="w-full px-3 py-2 text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all">
              <option value="ALL">All Datasets (Demo & Ingested)</option>
              <option value="0">Only User Ingested Traces</option>
              <option value="1">Only Synthetic Demo Traces</option>
            </select>
          </div>
        </div>

        <!-- Secondary Controls: Duration, Sorting & Reset -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
          <div class="flex items-center gap-3">
            <span class="text-[11px] font-semibold text-slate-600">Min Duration:</span>
            <input id="filter-min-dur" type="number" placeholder="0 ms" class="w-20 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-800 font-mono text-[11px]" />
            <span class="text-[11px] font-semibold text-slate-600">Max Duration:</span>
            <input id="filter-max-dur" type="number" placeholder="∞ ms" class="w-20 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-800 font-mono text-[11px]" />
            <button id="filter-reset-btn" class="text-xs text-indigo-600 hover:text-indigo-700 font-semibold ml-2">Reset Filters</button>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-[11px] font-semibold text-slate-600">Sort By:</span>
            <select id="filter-sort" class="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-800 text-[11px] font-medium">
              <option value="start_time:DESC">Newest First</option>
              <option value="start_time:ASC">Oldest First</option>
              <option value="duration:DESC">Slowest Duration</option>
              <option value="duration:ASC">Fastest Duration</option>
              <option value="span_count:DESC">Highest Span Count</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Traces Results Table -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div class="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs">
          <div class="text-slate-500">
            Showing <span id="traces-count-label" class="font-mono text-slate-900 font-bold">0</span> traces
          </div>
          <div class="flex items-center gap-2">
            <button id="pagination-prev" class="px-3 py-1 text-xs font-medium bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-md border border-slate-200 transition-colors">
              Previous
            </button>
            <span id="pagination-page-label" class="text-slate-500 font-mono text-[11px]">Page 1</span>
            <button id="pagination-next" class="px-3 py-1 text-xs font-medium bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-md border border-slate-200 transition-colors">
              Next
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="text-slate-500 bg-slate-50/75 border-b border-slate-200">
                <th class="py-3 px-4 font-semibold">Trace ID</th>
                <th class="py-3 px-4 font-semibold">Root Service</th>
                <th class="py-3 px-4 font-semibold">Spans</th>
                <th class="py-3 px-4 font-semibold">Errors</th>
                <th class="py-3 px-4 font-semibold">Duration</th>
                <th class="py-3 px-4 font-semibold">Status</th>
                <th class="py-3 px-4 font-semibold">Start Time (UTC)</th>
                <th class="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="traces-table-body" class="divide-y divide-slate-100">
              <tr>
                <td colspan="8" class="py-8 text-center text-slate-400">Loading traces...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // State
  let currentPage = 0;
  const pageSize = 20;

  // References
  const searchInput = container.querySelector('#filter-search') as HTMLInputElement;
  const serviceSelect = container.querySelector('#filter-service') as HTMLSelectElement;
  const statusSelect = container.querySelector('#filter-status') as HTMLSelectElement;
  const demoSelect = container.querySelector('#filter-demo') as HTMLSelectElement;
  const minDurInput = container.querySelector('#filter-min-dur') as HTMLInputElement;
  const maxDurInput = container.querySelector('#filter-max-dur') as HTMLInputElement;
  const sortSelect = container.querySelector('#filter-sort') as HTMLSelectElement;
  const tableBody = container.querySelector('#traces-table-body') as HTMLElement;
  const countLabel = container.querySelector('#traces-count-label') as HTMLElement;
  const pageLabel = container.querySelector('#pagination-page-label') as HTMLElement;
  const prevBtn = container.querySelector('#pagination-prev') as HTMLButtonElement;
  const nextBtn = container.querySelector('#pagination-next') as HTMLButtonElement;

  // Populate services dropdown
  async function loadServicesList() {
    try {
      const res = await fetch('/api/services');
      const data = await res.json();
      const services = data.services || [];
      serviceSelect.innerHTML = '<option value="ALL">All Services</option>' +
        services.map((s: any) => `<option value="${s.service_name}">${s.service_name} (${s.request_count})</option>`).join('');
    } catch {
      // ignore
    }
  }

  // Load traces
  async function fetchTraces() {
    try {
      tableBody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-400">Querying traces...</td></tr>`;

      const [sortBy, sortOrder] = sortSelect.value.split(':');
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(currentPage * pageSize),
        sort_by: sortBy,
        order: sortOrder
      });

      if (searchInput.value.trim()) params.append('search', searchInput.value.trim());
      if (serviceSelect.value !== 'ALL') params.append('service', serviceSelect.value);
      if (statusSelect.value !== 'ALL') params.append('status', statusSelect.value);
      if (demoSelect.value !== 'ALL') params.append('is_demo', demoSelect.value);
      if (minDurInput.value) params.append('min_duration', minDurInput.value);
      if (maxDurInput.value) params.append('max_duration', maxDurInput.value);

      const res = await fetch(`/api/traces?${params.toString()}`);
      const data = await res.json();

      const traces = data.traces || [];
      const total = data.total || 0;

      countLabel.textContent = `${total}`;
      const totalPages = Math.ceil(total / pageSize);
      pageLabel.textContent = `Page ${currentPage + 1} of ${Math.max(1, totalPages)}`;

      prevBtn.disabled = currentPage === 0;
      nextBtn.disabled = (currentPage + 1) >= totalPages;

      if (traces.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="py-12 text-center text-slate-400">
              No matching traces found. Try broadening filters or ingesting new traces.
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = traces.map((t: any) => {
        const isError = t.status === 'ERROR';
        const isDemo = t.is_demo === 1;
        const date = new Date(t.start_time);
        const isoString = date.toISOString().replace('T', ' ').substring(0, 19);

        // Visual duration bar calculation
        const durWidth = Math.min(100, Math.max(5, (t.duration / 3000) * 100));

        return `
          <tr class="hover:bg-slate-50 transition-colors cursor-pointer trace-item-row" data-id="${t.trace_id}">
            <td class="py-3 px-4 font-mono">
              <div class="flex items-center gap-2">
                <span class="text-indigo-600 font-semibold">${t.trace_id.substring(0, 16)}...</span>
                <button class="text-slate-400 hover:text-slate-700 copy-id-btn" data-copy="${t.trace_id}" title="Copy full Trace ID">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                ${isDemo ? '<span class="text-[9px] font-mono px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-semibold">DEMO</span>' : ''}
              </div>
            </td>
            <td class="py-3 px-4 font-semibold text-slate-800">
              ${t.root_service}
            </td>
            <td class="py-3 px-4 font-mono text-slate-600 font-medium">
              ${t.span_count}
            </td>
            <td class="py-3 px-4 font-mono">
              <span class="${t.error_count > 0 ? 'text-rose-600 font-bold' : 'text-slate-400 font-normal'}">
                ${t.error_count || 0}
              </span>
            </td>
            <td class="py-3 px-4 font-mono">
              <div class="flex items-center gap-2">
                <span class="text-slate-800 font-medium w-16">${t.duration} ms</span>
                <div class="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div class="${isError ? 'bg-rose-500' : 'bg-indigo-600'} h-full rounded-full" style="width: ${durWidth}%"></div>
                </div>
              </div>
            </td>
            <td class="py-3 px-4">
              <span class="font-mono text-[11px] px-2 py-0.5 rounded font-semibold ${isError ? 'text-rose-700 bg-rose-50 border border-rose-200' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'}">
                ${t.status}
              </span>
            </td>
            <td class="py-3 px-4 font-mono text-slate-500 text-[11px]">
              ${isoString}
            </td>
            <td class="py-3 px-4 text-right">
              <button class="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-md transition-colors inspect-btn" data-id="${t.trace_id}">
                Waterfall →
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // Wire Row Clicks
      tableBody.querySelectorAll('.trace-item-row').forEach(row => {
        row.addEventListener('click', () => {
          const id = row.getAttribute('data-id');
          if (id) navigateTo('waterfall', { traceId: id });
        });
      });

      // Wire Copy Buttons
      tableBody.querySelectorAll('.copy-id-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const text = btn.getAttribute('data-copy');
          if (text) {
            navigator.clipboard.writeText(text);
            btn.innerHTML = `<span class="text-[9px] text-emerald-600 font-mono font-semibold">copied!</span>`;
            setTimeout(() => {
              btn.innerHTML = `
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              `;
            }, 1500);
          }
        });
      });

      // Wire Inspect Buttons
      tableBody.querySelectorAll('.inspect-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          if (id) navigateTo('waterfall', { traceId: id });
        });
      });

    } catch (err: any) {
      tableBody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-rose-500 font-medium">Failed to fetch traces: ${err.message}</td></tr>`;
    }
  }

  // Event Listeners for Filters
  searchInput?.addEventListener('input', () => {
    currentPage = 0;
    fetchTraces();
  });
  serviceSelect?.addEventListener('change', () => {
    currentPage = 0;
    fetchTraces();
  });
  statusSelect?.addEventListener('change', () => {
    currentPage = 0;
    fetchTraces();
  });
  demoSelect?.addEventListener('change', () => {
    currentPage = 0;
    fetchTraces();
  });
  minDurInput?.addEventListener('change', () => {
    currentPage = 0;
    fetchTraces();
  });
  maxDurInput?.addEventListener('change', () => {
    currentPage = 0;
    fetchTraces();
  });
  sortSelect?.addEventListener('change', () => {
    currentPage = 0;
    fetchTraces();
  });

  container.querySelector('#filter-reset-btn')?.addEventListener('click', () => {
    searchInput.value = '';
    serviceSelect.value = 'ALL';
    statusSelect.value = 'ALL';
    demoSelect.value = 'ALL';
    minDurInput.value = '';
    maxDurInput.value = '';
    sortSelect.value = 'start_time:DESC';
    currentPage = 0;
    fetchTraces();
  });

  prevBtn?.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      fetchTraces();
    }
  });

  nextBtn?.addEventListener('click', () => {
    currentPage++;
    fetchTraces();
  });

  container.querySelector('#traces-refresh-btn')?.addEventListener('click', () => fetchTraces());
  container.querySelector('#traces-ingest-btn')?.addEventListener('click', () => navigateTo('ingest'));

  loadServicesList();
  fetchTraces();
}
