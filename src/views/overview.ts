// Overview View Component - Light Observability Theme
export async function renderOverview(container: HTMLElement, state: any, navigateTo: (tab: string, params?: any) => void) {
  container.innerHTML = `
    <div class="p-6 space-y-6 max-w-7xl mx-auto">
      <!-- Top Title & Quick Actions -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            System Observability Overview
          </h1>
          <p class="text-xs text-slate-500 mt-1">
            Real-time aggregate telemetry across all monitored microservices
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button id="overview-refresh-btn" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-2 shadow-xs">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Metrics
          </button>
          <button id="overview-ingest-btn" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Ingest Traces
          </button>
        </div>
      </div>

      <!-- Key Performance Metrics Grid -->
      <div id="overview-metrics-grid" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Traces</div>
          <div id="metric-total-traces" class="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">-</div>
          <div class="text-[11px] text-slate-400 mt-1">End-to-end requests</div>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Spans</div>
          <div id="metric-total-spans" class="text-2xl font-bold font-mono text-indigo-600 mt-1 tabular-nums">-</div>
          <div class="text-[11px] text-slate-400 mt-1">Distributed operations</div>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Avg Latency</div>
          <div id="metric-avg-latency" class="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">-</div>
          <div class="text-[11px] text-slate-400 mt-1">Mean duration</div>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">P50 Latency</div>
          <div id="metric-p50-latency" class="text-2xl font-bold font-mono text-emerald-600 mt-1 tabular-nums">-</div>
          <div class="text-[11px] text-slate-400 mt-1">Median response</div>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">P95 Latency</div>
          <div id="metric-p95-latency" class="text-2xl font-bold font-mono text-purple-600 mt-1 tabular-nums">-</div>
          <div class="text-[11px] text-slate-400 mt-1">95th percentile</div>
        </div>
        <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Error Rate</div>
          <div id="metric-error-rate" class="text-2xl font-bold font-mono mt-1 tabular-nums text-slate-900">-</div>
          <div id="metric-error-count" class="text-[11px] text-slate-400 mt-1">Failed spans</div>
        </div>
      </div>

      <!-- Charts Row: Volume Timeline & Latency Distribution -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Trace Volume & Status Chart -->
        <div class="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Trace Ingestion Timeline</h3>
              <p class="text-xs text-slate-500">Request throughput and success ratio</p>
            </div>
            <div class="flex items-center gap-4 text-xs text-slate-600 font-mono">
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-indigo-600"></span> OK</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Error</span>
            </div>
          </div>
          <div id="volume-chart-container" class="h-56 w-full flex items-center justify-center text-xs text-slate-400">
            Loading timeline...
          </div>
        </div>

        <!-- Latency Distribution Histogram -->
        <div class="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Latency Distribution</h3>
              <p class="text-xs text-slate-500">Response time buckets across all recorded traces</p>
            </div>
            <span class="text-xs text-slate-500 font-mono">Bucket Count</span>
          </div>
          <div id="latency-chart-container" class="h-56 w-full flex items-center justify-center text-xs text-slate-400">
            Loading histogram...
          </div>
        </div>
      </div>

      <!-- Services & Recent Traces Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Slowest Services Breakdown -->
        <div class="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-slate-900">Slowest Services</h3>
            <button id="view-all-services-btn" class="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">View all</button>
          </div>
          <div id="slowest-services-list" class="space-y-2">
            <div class="text-xs text-slate-400 py-4 text-center">Loading slowest services...</div>
          </div>
        </div>

        <!-- Most Active Services -->
        <div class="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-slate-900">High-Throughput Services</h3>
            <button id="view-deps-btn" class="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">View graph</button>
          </div>
          <div id="active-services-list" class="space-y-2.5">
            <div class="text-xs text-slate-400 py-4 text-center">Loading active services...</div>
          </div>
        </div>

        <!-- Quick Demo Generator Controller -->
        <div class="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-900">Demo Traffic Engine</h3>
              <span id="demo-indicator-badge" class="text-[11px] font-mono px-2 py-0.5 rounded text-slate-600 bg-slate-100 border border-slate-200 font-medium">STANDBY</span>
            </div>
            <p class="text-xs text-slate-500 mt-2 leading-relaxed">
              Generate realistic microservice spans simulating normal checkouts, Stripe timeouts, JWT expiration, and database deadlocks.
            </p>
            <div class="mt-4 space-y-2">
              <div class="flex items-center justify-between text-xs text-slate-600">
                <span class="font-medium">Error Rate</span>
                <span id="demo-error-rate-val" class="font-mono text-slate-900 font-semibold">20%</span>
              </div>
              <input id="demo-error-slider" type="range" min="0" max="100" value="20" class="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer" />
            </div>
          </div>

          <div class="pt-4 border-t border-slate-200 space-y-2">
            <div class="flex gap-2">
              <button id="demo-toggle-btn" class="flex-1 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs">
                Start Continuous Demo
              </button>
              <button id="demo-single-btn" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors" title="Inject 1 synthetic trace">
                +1 Trace
              </button>
            </div>
            <div class="flex gap-2">
              <button id="demo-purge-btn" class="w-full py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors">
                Purge Demo Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Ingested Traces Table -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div class="p-5 border-b border-slate-200 flex items-center justify-between text-xs">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Recent Distributed Traces</h3>
            <p class="text-xs text-slate-500 mt-0.5">Latest root spans processed across the pipeline</p>
          </div>
          <button id="explore-all-traces-btn" class="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg transition-colors">
            Open Trace Explorer →
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="text-slate-500 bg-slate-50/75 border-b border-slate-200">
                <th class="py-2.5 px-4 font-semibold">Trace ID</th>
                <th class="py-2.5 px-4 font-semibold">Root Service</th>
                <th class="py-2.5 px-4 font-semibold">Spans</th>
                <th class="py-2.5 px-4 font-semibold">Duration</th>
                <th class="py-2.5 px-4 font-semibold">Status</th>
                <th class="py-2.5 px-4 font-semibold">Timestamp</th>
                <th class="py-2.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody id="overview-recent-traces-body" class="divide-y divide-slate-100">
              <tr>
                <td colspan="7" class="py-8 text-center text-slate-400">Loading traces...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Attach Handlers
  container.querySelector('#overview-refresh-btn')?.addEventListener('click', () => loadOverviewData());
  container.querySelector('#overview-ingest-btn')?.addEventListener('click', () => navigateTo('ingest'));
  container.querySelector('#view-all-services-btn')?.addEventListener('click', () => navigateTo('services'));
  container.querySelector('#view-deps-btn')?.addEventListener('click', () => navigateTo('dependencies'));
  container.querySelector('#explore-all-traces-btn')?.addEventListener('click', () => navigateTo('traces'));

  // Demo Generator Wire-up
  const toggleBtn = container.querySelector('#demo-toggle-btn') as HTMLButtonElement;
  const singleBtn = container.querySelector('#demo-single-btn') as HTMLButtonElement;
  const purgeBtn = container.querySelector('#demo-purge-btn') as HTMLButtonElement;
  const errorSlider = container.querySelector('#demo-error-slider') as HTMLInputElement;
  const errorVal = container.querySelector('#demo-error-rate-val') as HTMLSpanElement;
  const badge = container.querySelector('#demo-indicator-badge') as HTMLSpanElement;

  errorSlider?.addEventListener('input', () => {
    errorVal.textContent = errorSlider.value + '%';
  });

  async function checkDemoStatus() {
    try {
      const res = await fetch('/api/demo/status');
      const data = await res.json();
      if (data.running) {
        toggleBtn.textContent = 'Stop Demo Generator';
        toggleBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
        toggleBtn.classList.add('bg-amber-600', 'hover:bg-amber-700');
        badge.textContent = 'LIVE GENERATING';
        badge.className = 'text-[11px] font-mono px-2 py-0.5 rounded text-emerald-700 bg-emerald-50 border border-emerald-300 font-semibold';
      } else {
        toggleBtn.textContent = 'Start Continuous Demo';
        toggleBtn.classList.remove('bg-amber-600', 'hover:bg-amber-700');
        toggleBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
        badge.textContent = 'STANDBY';
        badge.className = 'text-[11px] font-mono px-2 py-0.5 rounded text-slate-600 bg-slate-100 border border-slate-200 font-medium';
      }
    } catch {
      // ignore
    }
  }

  toggleBtn?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/demo/status');
      const cur = await res.json();
      if (cur.running) {
        await fetch('/api/demo/stop', { method: 'POST' });
      } else {
        await fetch('/api/demo/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interval_ms: 2500, error_rate: Number(errorSlider.value) })
        });
      }
      await checkDemoStatus();
      loadOverviewData();
    } catch (e: any) {
      alert('Failed to toggle demo generator: ' + e.message);
    }
  });

  singleBtn?.addEventListener('click', async () => {
    try {
      singleBtn.disabled = true;
      await fetch('/api/demo/generate-one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      loadOverviewData();
    } catch (e: any) {
      alert('Error generating demo trace: ' + e.message);
    } finally {
      singleBtn.disabled = false;
    }
  });

  purgeBtn?.addEventListener('click', async () => {
    if (!confirm('Purge all synthetic DEMO traces? (Real imported traces will NOT be affected)')) return;
    try {
      await fetch('/api/demo/purge', { method: 'DELETE' });
      loadOverviewData();
    } catch (e: any) {
      alert('Error purging demo traces: ' + e.message);
    }
  });

  checkDemoStatus();

  // Load and render overview telemetry
  async function loadOverviewData() {
    try {
      const [overviewRes, tracesRes] = await Promise.all([
        fetch('/api/analytics/overview'),
        fetch('/api/traces?limit=8')
      ]);

      const data = await overviewRes.json();
      const tracesData = await tracesRes.json();

      const summary = data.summary || {};

      // Fill Metric Cards
      const totalTracesEl = container.querySelector('#metric-total-traces');
      const totalSpansEl = container.querySelector('#metric-total-spans');
      const avgLatEl = container.querySelector('#metric-avg-latency');
      const p50El = container.querySelector('#metric-p50-latency');
      const p95El = container.querySelector('#metric-p95-latency');
      const errorRateEl = container.querySelector('#metric-error-rate');
      const errorCountEl = container.querySelector('#metric-error-count');

      if (totalTracesEl) totalTracesEl.textContent = Number(summary.total_traces || 0).toLocaleString();
      if (totalSpansEl) totalSpansEl.textContent = Number(summary.total_spans || 0).toLocaleString();
      if (avgLatEl) avgLatEl.textContent = `${summary.avg_latency || 0} ms`;
      if (p50El) p50El.textContent = `${summary.p50_latency || 0} ms`;
      if (p95El) p95El.textContent = `${summary.p95_latency || 0} ms`;

      if (errorRateEl) {
        errorRateEl.textContent = `${summary.error_rate || 0}%`;
        errorRateEl.className = `text-2xl font-bold font-mono mt-1 tabular-nums ${Number(summary.error_rate) > 5 ? 'text-rose-600' : 'text-emerald-600'}`;
      }
      if (errorCountEl) {
        errorCountEl.textContent = `${summary.error_traces || 0} failed traces`;
      }

      // Render Volume SVG Chart
      renderVolumeChart(container.querySelector('#volume-chart-container') as HTMLElement, data.time_buckets || []);

      // Render Latency Histogram SVG Chart
      renderLatencyHistogram(container.querySelector('#latency-chart-container') as HTMLElement, data.latency_buckets || []);

      // Render Slowest Services
      renderSlowestServices(container.querySelector('#slowest-services-list') as HTMLElement, data.slowest_services || [], navigateTo);

      // Render Active Services
      renderActiveServices(container.querySelector('#active-services-list') as HTMLElement, data.active_services || [], navigateTo);

      // Render Recent Traces Table
      renderRecentTracesTable(container.querySelector('#overview-recent-traces-body') as HTMLElement, tracesData.traces || [], navigateTo);
    } catch (err: any) {
      console.error('Failed to load overview data:', err);
    }
  }

  loadOverviewData();
}

function renderVolumeChart(target: HTMLElement, buckets: any[]) {
  if (!target) return;
  if (buckets.length === 0) {
    target.innerHTML = `<div class="text-xs text-slate-400 py-10">No trace timeline points recorded yet.</div>`;
    return;
  }

  const maxTotal = Math.max(...buckets.map(b => b.total_traces), 1);
  const width = 500;
  const height = 180;
  const padBottom = 24;
  const padLeft = 30;
  const chartH = height - padBottom;
  const chartW = width - padLeft;
  const barWidth = Math.max(12, Math.floor(chartW / buckets.length) - 6);

  let barsSvg = '';
  buckets.forEach((b, idx) => {
    const x = padLeft + idx * (chartW / buckets.length) + 4;
    const totalH = (b.total_traces / maxTotal) * (chartH - 20);
    const errorH = (b.error_traces / maxTotal) * (chartH - 20);
    const okH = Math.max(0, totalH - errorH);
    const yOk = chartH - okH;
    const yErr = yOk - errorH;

    const timeLabel = new Date(b.bucket_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    barsSvg += `
      <g class="cursor-pointer group">
        <title>${timeLabel}: ${b.total_traces} traces (${b.error_traces} errors)</title>
        <!-- OK segment -->
        <rect x="${x}" y="${yOk}" width="${barWidth}" height="${okH}" rx="3" fill="#6366F1" class="hover:opacity-85 transition-opacity" />
        <!-- Error segment -->
        ${errorH > 0 ? `<rect x="${x}" y="${yErr}" width="${barWidth}" height="${errorH}" rx="3" fill="#F43F5E" class="hover:opacity-85 transition-opacity" />` : ''}
        <!-- Time label -->
        <text x="${x + barWidth / 2}" y="${height - 6}" font-size="10" fill="#64748B" text-anchor="middle" font-family="JetBrains Mono">${timeLabel}</text>
      </g>
    `;
  });

  target.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="w-full h-full overflow-visible">
      <line x1="${padLeft}" y1="${chartH}" x2="${width}" y2="${chartH}" stroke="#E2E8F0" stroke-width="1" />
      <text x="${padLeft - 6}" y="${chartH}" font-size="9" fill="#94A3B8" text-anchor="end" font-family="JetBrains Mono">0</text>
      <text x="${padLeft - 6}" y="14" font-size="9" fill="#94A3B8" text-anchor="end" font-family="JetBrains Mono">${maxTotal}</text>
      ${barsSvg}
    </svg>
  `;
}

function renderLatencyHistogram(target: HTMLElement, buckets: any[]) {
  if (!target) return;
  const maxCount = Math.max(...buckets.map(b => b.count), 1);
  const width = 500;
  const height = 180;
  const padBottom = 24;
  const padLeft = 30;
  const chartH = height - padBottom;
  const chartW = width - padLeft;
  const barWidth = Math.max(16, Math.floor(chartW / buckets.length) - 12);

  let barsSvg = '';
  buckets.forEach((b, idx) => {
    const x = padLeft + idx * (chartW / buckets.length) + 6;
    const barH = (b.count / maxCount) * (chartH - 20);
    const y = chartH - barH;

    barsSvg += `
      <g class="cursor-pointer group">
        <title>${b.range}: ${b.count} traces</title>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="3" fill="#0284C7" class="hover:fill-sky-500 transition-colors" />
        <text x="${x + barWidth / 2}" y="${y - 4}" font-size="10" fill="#0369A1" font-weight="600" text-anchor="middle" font-family="JetBrains Mono">${b.count > 0 ? b.count : ''}</text>
        <text x="${x + barWidth / 2}" y="${height - 6}" font-size="9.5" fill="#64748B" text-anchor="middle" font-family="JetBrains Mono">${b.range}</text>
      </g>
    `;
  });

  target.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="w-full h-full overflow-visible">
      <line x1="${padLeft}" y1="${chartH}" x2="${width}" y2="${chartH}" stroke="#E2E8F0" stroke-width="1" />
      <text x="${padLeft - 6}" y="${chartH}" font-size="9" fill="#94A3B8" text-anchor="end" font-family="JetBrains Mono">0</text>
      <text x="${padLeft - 6}" y="14" font-size="9" fill="#94A3B8" text-anchor="end" font-family="JetBrains Mono">${maxCount}</text>
      ${barsSvg}
    </svg>
  `;
}

function renderSlowestServices(target: HTMLElement, services: any[], navigateTo: (tab: string, params?: any) => void) {
  if (!target) return;
  if (services.length === 0) {
    target.innerHTML = `<div class="text-xs text-slate-400 py-3">No service data available.</div>`;
    return;
  }

  target.innerHTML = services.map(s => `
    <div class="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors service-row" data-service="${s.service_name}">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full ${s.avg_lat > 1000 ? 'bg-rose-500' : (s.avg_lat > 300 ? 'bg-amber-500' : 'bg-indigo-600')}"></span>
        <span class="font-semibold text-slate-800">${s.service_name}</span>
      </div>
      <div class="flex items-center gap-3 font-mono text-[11px]">
        <span class="text-slate-600 font-medium">${Math.round(s.avg_lat)}ms avg</span>
        <span class="text-slate-300">·</span>
        <span class="text-slate-800 font-semibold">${Math.round(s.max_lat)}ms max</span>
      </div>
    </div>
  `).join('');

  target.querySelectorAll('.service-row').forEach(row => {
    row.addEventListener('click', () => {
      const service = row.getAttribute('data-service');
      navigateTo('services', { selectedService: service });
    });
  });
}

function renderActiveServices(target: HTMLElement, services: any[], navigateTo: (tab: string, params?: any) => void) {
  if (!target) return;
  if (services.length === 0) {
    target.innerHTML = `<div class="text-xs text-slate-400 py-3">No service data available.</div>`;
    return;
  }

  const maxCount = Math.max(...services.map(s => s.count), 1);

  target.innerHTML = services.map(s => {
    const pct = Math.round((s.count / maxCount) * 100);
    return `
      <div class="text-xs p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors active-service-row" data-service="${s.service_name}">
        <div class="flex items-center justify-between mb-1.5">
          <span class="font-semibold text-slate-800">${s.service_name}</span>
          <span class="font-mono text-slate-500 text-[11px] font-medium">${s.count} spans</span>
        </div>
        <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div class="bg-indigo-600 h-full rounded-full" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');

  target.querySelectorAll('.active-service-row').forEach(row => {
    row.addEventListener('click', () => {
      const service = row.getAttribute('data-service');
      navigateTo('services', { selectedService: service });
    });
  });
}

function renderRecentTracesTable(target: HTMLElement, traces: any[], navigateTo: (tab: string, params?: any) => void) {
  if (!target) return;
  if (traces.length === 0) {
    target.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-400">No traces ingested yet. Ingest or generate demo traces above.</td></tr>`;
    return;
  }

  target.innerHTML = traces.map(t => {
    const dateStr = new Date(t.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isError = t.status === 'ERROR';
    const isDemo = t.is_demo === 1;

    return `
      <tr class="hover:bg-slate-50/80 transition-colors cursor-pointer trace-table-row" data-id="${t.trace_id}">
        <td class="py-3 px-4 font-mono font-medium text-indigo-600 flex items-center gap-2">
          <span>${t.trace_id.substring(0, 14)}...</span>
          ${isDemo ? '<span class="text-[9px] font-mono px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-semibold">DEMO</span>' : ''}
        </td>
        <td class="py-3 px-4 font-semibold text-slate-800">${t.root_service}</td>
        <td class="py-3 px-4 font-mono text-slate-600">${t.span_count}</td>
        <td class="py-3 px-4 font-mono font-medium text-slate-800">${t.duration} ms</td>
        <td class="py-3 px-4">
          <span class="font-mono text-[11px] px-2 py-0.5 rounded font-semibold ${isError ? 'text-rose-700 bg-rose-50 border border-rose-200' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'}">
            ${t.status}
          </span>
        </td>
        <td class="py-3 px-4 font-mono text-slate-500">${dateStr}</td>
        <td class="py-3 px-4 text-right">
          <button class="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-md transition-colors view-waterfall-btn" data-id="${t.trace_id}">
            Waterfall →
          </button>
        </td>
      </tr>
    `;
  }).join('');

  target.querySelectorAll('.trace-table-row').forEach(row => {
    row.addEventListener('click', () => {
      const traceId = row.getAttribute('data-id');
      if (traceId) navigateTo('waterfall', { traceId });
    });
  });

  target.querySelectorAll('.view-waterfall-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const traceId = btn.getAttribute('data-id');
      if (traceId) navigateTo('waterfall', { traceId });
    });
  });
}
