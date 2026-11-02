// Error Investigation & Root Cause Analyzer Component - Light Theme
export async function renderErrors(container: HTMLElement, state: any, navigateTo: (tab: string, params?: any) => void) {
  container.innerHTML = `
    <div class="p-6 space-y-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Error Investigation & Root Cause Analyzer
          </h1>
          <p class="text-xs text-slate-500 mt-1">
            Isolate exceptions, cascade failures, upstream timeouts, and trace error provenance
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button id="errors-refresh-btn" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-2 shadow-xs">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Errors
          </button>
        </div>
      </div>

      <!-- Top Row: Error Breakdown by Service -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Failed Spans</div>
            <div id="errors-total-count" class="text-3xl font-bold font-mono text-rose-600 mt-1 tabular-nums">-</div>
            <p class="text-xs text-slate-500 mt-2 leading-relaxed">
              Spans explicitly recording errors, exception events, or HTTP 4xx/5xx status codes.
            </p>
          </div>
          <div class="pt-4 border-t border-slate-100">
            <button id="view-only-failed-traces-btn" class="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors">
              Filter Explorer for Failed Traces →
            </button>
          </div>
        </div>

        <div class="lg:col-span-2 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-slate-900">Error Distribution by Service</h3>
            <span class="text-xs font-mono text-slate-500">Service Failure Count</span>
          </div>
          <div id="service-error-distribution" class="space-y-2.5">
            <div class="text-xs text-slate-400 py-6 text-center">Loading error distribution...</div>
          </div>
        </div>
      </div>

      <!-- Failed Spans Detailed Inspector List -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Recent Failed Spans & Exceptions</h3>
            <p class="text-xs text-slate-500 mt-0.5">Extracted stack traces, error causes, and parent trace IDs</p>
          </div>
          <input id="error-search-input" type="text" placeholder="Filter by message or service..." 
            class="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white font-mono w-64" />
        </div>

        <div id="failed-spans-container" class="divide-y divide-slate-100 max-h-[600px] overflow-y-auto p-4 space-y-3">
          <div class="text-xs text-slate-400 py-12 text-center">Loading failed spans...</div>
        </div>
      </div>
    </div>
  `;

  let cachedFailedSpans: any[] = [];
  const searchInput = container.querySelector('#error-search-input') as HTMLInputElement;

  async function loadErrorAnalytics() {
    try {
      const res = await fetch('/api/analytics/errors');
      const data = await res.json();

      container.querySelector('#errors-total-count')!.textContent = String(data.total_error_spans || 0);

      // Render Service Distribution Bars
      const distContainer = container.querySelector('#service-error-distribution') as HTMLElement;
      const byService = data.by_service || [];

      if (byService.length === 0) {
        distContainer.innerHTML = `<div class="text-xs text-emerald-600 py-6 text-center font-semibold">Zero errors recorded across all services. System nominal!</div>`;
      } else {
        const maxErr = Math.max(...byService.map((s: any) => s.error_count), 1);
        distContainer.innerHTML = byService.map((s: any) => {
          const pct = Math.round((s.error_count / maxErr) * 100);
          return `
            <div class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-slate-800">${s.service_name}</span>
                <span class="font-mono text-rose-600 font-semibold">${s.error_count} errors</span>
              </div>
              <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div class="bg-rose-500 h-full rounded-full" style="width: ${pct}%"></div>
              </div>
            </div>
          `;
        }).join('');
      }

      cachedFailedSpans = data.failed_spans || [];
      renderFailedSpans(cachedFailedSpans);

    } catch (err: any) {
      console.error('Error loading analytics:', err);
    }
  }

  function renderFailedSpans(spans: any[]) {
    const list = container.querySelector('#failed-spans-container') as HTMLElement;
    const filter = (searchInput?.value || '').toLowerCase().trim();

    const filtered = filter ? spans.filter(s =>
      s.service_name.toLowerCase().includes(filter) ||
      s.operation_name.toLowerCase().includes(filter) ||
      (s.error_message && s.error_message.toLowerCase().includes(filter))
    ) : spans;

    if (filtered.length === 0) {
      list.innerHTML = `<div class="text-xs text-slate-400 py-12 text-center">No matching error spans found.</div>`;
      return;
    }

    list.innerHTML = filtered.map(s => {
      const dateStr = new Date(s.start_time).toISOString().replace('T', ' ').substring(0, 19);
      const exEvent = (s.events || []).find((e: any) => e.name === 'exception' || e.attributes?.['exception.stacktrace']);
      const stacktrace = exEvent?.attributes?.['exception.stacktrace'];

      return `
        <div class="p-4 bg-white rounded-xl border border-rose-200 hover:border-rose-300 transition-colors space-y-2 shadow-xs">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
              <span class="font-bold text-xs text-slate-900">${s.service_name}</span>
              <span class="text-slate-400">/</span>
              <span class="font-mono text-xs text-indigo-700 font-semibold">${s.operation_name}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-mono text-[11px] text-slate-500">${dateStr}</span>
              <button class="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:text-white hover:bg-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg transition-colors jump-waterfall-btn" data-trace-id="${s.trace_id}">
                Jump to Trace Waterfall →
              </button>
            </div>
          </div>

          <!-- Error Message Banner -->
          <div class="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 font-mono text-[11px] whitespace-pre-wrap break-all">
            ${s.error_message}
          </div>

          <!-- IDs and Duration -->
          <div class="flex items-center gap-4 text-[11px] font-mono text-slate-500 pt-1">
            <span>Trace ID: <strong class="text-slate-800">${s.trace_id.substring(0, 14)}...</strong></span>
            <span>·</span>
            <span>Span ID: <strong class="text-slate-800">${s.span_id.substring(0, 12)}...</strong></span>
            <span>·</span>
            <span>Duration: <strong class="text-slate-900 font-bold">${s.duration} ms</strong></span>
          </div>

          <!-- Stack Trace (If available) -->
          ${stacktrace ? `
            <div class="mt-2">
              <details class="text-[11px]">
                <summary class="text-slate-600 hover:text-slate-900 cursor-pointer font-semibold">View Stack Trace</summary>
                <pre class="mt-2 p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-200 overflow-x-auto whitespace-pre">${stacktrace}</pre>
              </details>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    list.querySelectorAll('.jump-waterfall-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const traceId = btn.getAttribute('data-trace-id');
        if (traceId) navigateTo('waterfall', { traceId });
      });
    });
  }

  searchInput?.addEventListener('input', () => {
    renderFailedSpans(cachedFailedSpans);
  });

  container.querySelector('#errors-refresh-btn')?.addEventListener('click', () => loadErrorAnalytics());
  container.querySelector('#view-only-failed-traces-btn')?.addEventListener('click', () => {
    navigateTo('traces');
    setTimeout(() => {
      const sel = document.querySelector('#filter-status') as HTMLSelectElement;
      if (sel) {
        sel.value = 'ERROR';
        sel.dispatchEvent(new Event('change'));
      }
    }, 50);
  });

  loadErrorAnalytics();
}
