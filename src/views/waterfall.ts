// Waterfall Timeline Component - Light Observability Theme
export async function renderWaterfall(container: HTMLElement, state: any, navigateTo: (tab: string, params?: any) => void, initialTraceId?: string) {
  let activeTraceId = initialTraceId || state.selectedTraceId;

  container.innerHTML = `
    <div class="h-full flex flex-col overflow-hidden bg-white">
      <!-- Top Trace Selection Bar & Overview -->
      <div class="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div class="flex items-center gap-4">
          <button id="wf-back-to-traces" class="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" title="Back to Traces">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 font-semibold">Trace Waterfall:</span>
              <span id="wf-trace-id-badge" class="font-mono text-xs text-indigo-600 font-bold select-all">Select a trace</span>
              <span id="wf-demo-badge" class="hidden text-[10px] font-mono px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-semibold">DEMO</span>
            </div>
            <div id="wf-summary-strip" class="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-1">
              <span>Root: -</span>
              <span>·</span>
              <span>Duration: -</span>
              <span>·</span>
              <span>Spans: -</span>
              <span>·</span>
              <span>Status: -</span>
            </div>
          </div>
        </div>

        <!-- Controls: Quick Trace Switcher & Zoom Controls -->
        <div class="flex items-center gap-3">
          <!-- Trace Picker Dropdown -->
          <select id="wf-trace-picker" class="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:border-indigo-500 max-w-[280px]">
            <option value="">Choose recent trace...</option>
          </select>

          <!-- Zoom Controls -->
          <div class="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5 text-xs">
            <button id="wf-zoom-out" class="px-2.5 py-1 font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors" title="Zoom Out (-)">
              -
            </button>
            <span id="wf-zoom-level" class="px-2 py-1 font-mono text-[11px] font-medium text-slate-700">100%</span>
            <button id="wf-zoom-in" class="px-2.5 py-1 font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors" title="Zoom In (+)">
              +
            </button>
            <button id="wf-zoom-reset" class="px-2.5 py-1 text-slate-500 hover:text-slate-800 font-medium text-[11px] border-l border-slate-200">
              Reset
            </button>
          </div>

          <!-- Expand/Collapse Tree -->
          <button id="wf-toggle-expand" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-xs">
            Collapse All
          </button>
        </div>
      </div>

      <!-- Main Visualizer Area: Waterfall Tree + Time Ruler & Span Drawer -->
      <div class="flex-1 flex overflow-hidden relative">
        <!-- Waterfall Canvas -->
        <div class="flex-1 flex flex-col overflow-hidden bg-[#FAFCFF]">
          <!-- Time Ruler Header -->
          <div class="h-8 bg-slate-50 border-b border-slate-200 flex items-center select-none text-[10px] font-mono text-slate-500">
            <div class="w-80 px-4 shrink-0 font-sans font-semibold text-slate-600">
              Service & Operation Hierarchy
            </div>
            <div id="wf-time-ruler" class="flex-1 relative h-full flex items-center pr-6">
              <!-- Ruler markers dynamically injected -->
            </div>
          </div>

          <!-- Waterfall Scrollable Rows -->
          <div id="wf-rows-container" class="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
            <div class="text-xs text-slate-400 py-16 text-center">Loading waterfall timeline...</div>
          </div>
        </div>

        <!-- Span Detail Drawer (Slide-in on selection) -->
        <div id="wf-drawer" class="hidden w-[460px] bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl z-20">
          <div class="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span id="drawer-service-name">Service</span>
                <span id="drawer-status-pill" class="text-[10px] font-mono px-2 py-0.5 rounded font-semibold">OK</span>
              </h3>
              <p id="drawer-op-name" class="text-xs font-mono text-indigo-600 mt-0.5 truncate max-w-sm font-medium"></p>
            </div>
            <button id="drawer-close-btn" class="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            <!-- Timing Summary -->
            <div class="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px]">
              <div>
                <span class="text-slate-500 block text-[10px] font-sans font-semibold">SPAN DURATION</span>
                <span id="drawer-duration" class="text-slate-900 font-bold text-sm">0 ms</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[10px] font-sans font-semibold">RELATIVE OFFSET</span>
                <span id="drawer-offset" class="text-slate-900 font-bold text-sm">+0 ms</span>
              </div>
              <div class="col-span-2 pt-2 border-t border-slate-200 flex justify-between">
                <div>
                  <span class="text-slate-500 block text-[10px] font-sans font-semibold">START TIME (UTC)</span>
                  <span id="drawer-start-time" class="text-slate-700">-</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[10px] font-sans font-semibold">END TIME (UTC)</span>
                  <span id="drawer-end-time" class="text-slate-700">-</span>
                </div>
              </div>
            </div>

            <!-- Error Banner (If Error) -->
            <div id="drawer-error-box" class="hidden p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
              <div class="font-bold text-xs flex items-center gap-1.5 mb-1 text-rose-700">
                <svg class="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Error Details
              </div>
              <p id="drawer-error-msg" class="font-mono text-[11px] whitespace-pre-wrap break-all"></p>
            </div>

            <!-- Identifiers -->
            <div class="space-y-1.5 font-mono text-[11px]">
              <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span class="text-slate-500 font-sans font-medium">Span ID</span>
                <span id="drawer-span-id" class="text-slate-800 font-semibold select-all">-</span>
              </div>
              <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span class="text-slate-500 font-sans font-medium">Parent Span ID</span>
                <span id="drawer-parent-id" class="text-slate-800 font-semibold select-all">-</span>
              </div>
              <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span class="text-slate-500 font-sans font-medium">Trace ID</span>
                <span id="drawer-trace-id" class="text-slate-800 font-semibold select-all">-</span>
              </div>
            </div>

            <!-- Attributes Table -->
            <div>
              <h4 class="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Attributes & Tags</span>
                <span id="drawer-attr-count" class="font-mono text-[10px] text-slate-500 font-semibold">0</span>
              </h4>
              <div id="drawer-attributes-table" class="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <!-- Injected attributes -->
              </div>
            </div>

            <!-- Events / Logs -->
            <div>
              <h4 class="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Span Events & Logs</span>
                <span id="drawer-event-count" class="font-mono text-[10px] text-slate-500 font-semibold">0</span>
              </h4>
              <div id="drawer-events-list" class="space-y-2">
                <!-- Injected events -->
              </div>
            </div>

            <!-- Raw JSON View with Copy -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-bold text-slate-900">Raw Span JSON</span>
                <button id="drawer-copy-json" class="text-[11px] text-indigo-600 hover:text-indigo-800 font-mono font-semibold">
                  Copy JSON
                </button>
              </div>
              <pre id="drawer-raw-json" class="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-200 overflow-x-auto max-h-48"></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Palette generator for distinct service colors in light theme
  const serviceColors: Record<string, string> = {
    'api-gateway': '#0284C7', // Sky
    'auth-service': '#7C3AED', // Violet
    'order-service': '#059669', // Emerald
    'payment-service': '#D97706', // Amber
    'inventory-service': '#DB2777', // Pink
    'postgres-db': '#4F46E5', // Indigo
    'redis-cache': '#DC2626', // Red
    'user-service': '#0D9488'  // Teal
  };

  function getServiceColor(name: string): string {
    if (serviceColors[name]) return serviceColors[name];
    const colors = ['#0891B2', '#65A30D', '#EA580C', '#9333EA', '#16A34A', '#2563EB'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  let currentZoom = 1.0;
  let allExpanded = true;
  let activeTraceData: any = null;

  // References
  const tracePicker = container.querySelector('#wf-trace-picker') as HTMLSelectElement;
  const traceBadge = container.querySelector('#wf-trace-id-badge') as HTMLElement;
  const demoBadge = container.querySelector('#wf-demo-badge') as HTMLElement;
  const summaryStrip = container.querySelector('#wf-summary-strip') as HTMLElement;
  const timeRuler = container.querySelector('#wf-time-ruler') as HTMLElement;
  const rowsContainer = container.querySelector('#wf-rows-container') as HTMLElement;
  const drawer = container.querySelector('#wf-drawer') as HTMLElement;
  const zoomLevelLabel = container.querySelector('#wf-zoom-level') as HTMLElement;

  // Populate Trace Picker with recent traces
  async function populateTracePicker() {
    try {
      const res = await fetch('/api/traces?limit=30');
      const data = await res.json();
      const traces = data.traces || [];

      tracePicker.innerHTML = `<option value="">Choose recent trace...</option>` +
        traces.map((t: any) => `
          <option value="${t.trace_id}" ${t.trace_id === activeTraceId ? 'selected' : ''}>
            ${t.status === 'ERROR' ? '⚠️' : '✓'} ${t.root_service} (${t.duration}ms) - ${t.trace_id.substring(0, 10)}...
          </option>
        `).join('');

      if (!activeTraceId && traces.length > 0) {
        activeTraceId = traces[0].trace_id;
        tracePicker.value = activeTraceId;
        loadTraceWaterfall(activeTraceId);
      } else if (activeTraceId) {
        loadTraceWaterfall(activeTraceId);
      }
    } catch {
      // ignore
    }
  }

  // Load and render specific trace
  async function loadTraceWaterfall(traceId: string) {
    if (!traceId) return;
    activeTraceId = traceId;
    state.selectedTraceId = traceId;

    try {
      rowsContainer.innerHTML = `<div class="text-xs text-slate-400 py-16 text-center">Loading waterfall for ${traceId}...</div>`;

      const res = await fetch(`/api/traces/${traceId}`);
      if (!res.ok) {
        rowsContainer.innerHTML = `<div class="text-xs text-rose-600 py-16 text-center font-medium">Trace ${traceId} not found.</div>`;
        return;
      }
      const data = await res.json();
      activeTraceData = data;

      const trace = data.trace;

      // Update Header
      traceBadge.textContent = trace.trace_id;
      if (trace.is_demo === 1) {
        demoBadge.classList.remove('hidden');
      } else {
        demoBadge.classList.add('hidden');
      }

      summaryStrip.innerHTML = `
        <span>Root: <strong class="text-slate-800">${trace.root_service}</strong></span>
        <span>·</span>
        <span>Duration: <strong class="text-slate-800 font-mono">${trace.duration} ms</strong></span>
        <span>·</span>
        <span>Spans: <strong class="text-slate-800 font-mono">${trace.span_count}</strong></span>
        <span>·</span>
        <span class="${trace.status === 'ERROR' ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}">${trace.status}</span>
      `;

      renderRuler(trace.duration);
      renderRows(data.span_tree, trace.start_time, trace.duration);

    } catch (err: any) {
      rowsContainer.innerHTML = `<div class="text-xs text-rose-600 py-16 text-center font-medium">Failed to load waterfall: ${err.message}</div>`;
    }
  }

  // Render Time Ruler (0%, 25%, 50%, 75%, 100%)
  function renderRuler(totalDuration: number) {
    const steps = [0, 0.25, 0.5, 0.75, 1.0];
    timeRuler.innerHTML = steps.map(pct => {
      const ms = Math.round(totalDuration * pct);
      const leftPct = (pct * 100) * currentZoom;
      return `
        <div class="absolute h-full flex flex-col justify-end" style="left: ${leftPct}%;">
          <div class="h-2 w-[1px] bg-slate-300 mb-1"></div>
          <span class="transform -translate-x-1/2 text-slate-500 font-medium">${ms}ms</span>
        </div>
      `;
    }).join('');
  }

  interface FlatRow {
    span: any;
    depth: number;
    hasChildren: boolean;
    isExpanded: boolean;
  }

  function flattenTree(nodes: any[], depth: number = 0): FlatRow[] {
    const result: FlatRow[] = [];
    for (const node of nodes) {
      result.push({
        span: node,
        depth,
        hasChildren: node.children && node.children.length > 0,
        isExpanded: allExpanded
      });
      if (node.children && node.children.length > 0 && allExpanded) {
        result.push(...flattenTree(node.children, depth + 1));
      }
    }
    return result;
  }

  function renderRows(tree: any[], traceStart: number, traceDuration: number) {
    const rows = flattenTree(tree);
    if (rows.length === 0) {
      rowsContainer.innerHTML = `<div class="text-xs text-slate-400 py-10 text-center">No spans in this trace.</div>`;
      return;
    }

    const safeDuration = Math.max(0.1, traceDuration);

    rowsContainer.innerHTML = rows.map((r) => {
      const s = r.span;
      const isError = s.status === 'ERROR';
      const offsetMs = Math.max(0, s.start_time - traceStart);
      const leftPct = Math.min(99.5, (offsetMs / safeDuration) * 100) * currentZoom;
      const widthPct = Math.max(0.6, (s.duration / safeDuration) * 100) * currentZoom;

      const sColor = getServiceColor(s.service_name);
      const indentPx = r.depth * 20;

      return `
        <div class="flex items-center h-8 hover:bg-indigo-50/50 rounded-lg transition-colors group cursor-pointer span-row-item" data-span-id="${s.span_id}">
          <!-- Left Column: Tree Indent, Service & Operation -->
          <div class="w-80 px-3 shrink-0 flex items-center gap-2 overflow-hidden" style="padding-left: ${indentPx + 12}px;">
            ${r.hasChildren ? `
              <span class="text-slate-400 font-mono text-[10px] w-3 text-center">▾</span>
            ` : `<span class="w-3 text-slate-300">·</span>`}
            <span class="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style="background-color: ${sColor};"></span>
            <span class="font-bold text-xs text-slate-900 truncate" title="${s.service_name}">${s.service_name}</span>
            <span class="text-[11px] text-slate-500 font-mono truncate" title="${s.operation_name}">${s.operation_name}</span>
            ${isError ? `<span class="shrink-0 text-[10px] text-rose-600 font-bold bg-rose-50 px-1 rounded border border-rose-200">ERR</span>` : ''}
          </div>

          <!-- Right Column: Horizontal Waterfall Bar -->
          <div class="flex-1 h-full relative flex items-center pr-6 overflow-hidden">
            <!-- Background grid line -->
            <div class="w-full h-[1px] bg-slate-200/60 absolute top-1/2"></div>

            <!-- Span Bar -->
            <div class="absolute h-5 rounded-md flex items-center px-2 transition-all shadow-xs ${isError ? 'ring-1 ring-rose-500 bg-rose-100 text-rose-900' : 'bg-white border border-slate-200 text-slate-800'}"
              style="left: ${leftPct}%; width: ${Math.max(10, widthPct)}%; border-left: 4px solid ${sColor};"
              title="${s.service_name}: ${s.operation_name} (${s.duration}ms)">
              <div class="h-full rounded-r-md" style="background-color: ${sColor}20; position: absolute; inset: 0;"></div>
              <span class="relative z-10 text-[10px] font-mono font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                ${s.duration}ms
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Wire Span Click to Open Drawer
    rowsContainer.querySelectorAll('.span-row-item').forEach(el => {
      el.addEventListener('click', () => {
        const spanId = el.getAttribute('data-span-id');
        const span = activeTraceData?.spans?.find((s: any) => s.span_id === spanId);
        if (span) openSpanDrawer(span, traceStart);
      });
    });
  }

  // Open Drawer with Deep Span Insights
  function openSpanDrawer(span: any, traceStart: number) {
    drawer.classList.remove('hidden');

    const serviceNameEl = drawer.querySelector('#drawer-service-name') as HTMLElement;
    const opNameEl = drawer.querySelector('#drawer-op-name') as HTMLElement;
    const statusPill = drawer.querySelector('#drawer-status-pill') as HTMLElement;
    const durationEl = drawer.querySelector('#drawer-duration') as HTMLElement;
    const offsetEl = drawer.querySelector('#drawer-offset') as HTMLElement;
    const startEl = drawer.querySelector('#drawer-start-time') as HTMLElement;
    const endEl = drawer.querySelector('#drawer-end-time') as HTMLElement;
    const spanIdEl = drawer.querySelector('#drawer-span-id') as HTMLElement;
    const parentIdEl = drawer.querySelector('#drawer-parent-id') as HTMLElement;
    const traceIdEl = drawer.querySelector('#drawer-trace-id') as HTMLElement;
    const errorBox = drawer.querySelector('#drawer-error-box') as HTMLElement;
    const errorMsgEl = drawer.querySelector('#drawer-error-msg') as HTMLElement;
    const attrCountEl = drawer.querySelector('#drawer-attr-count') as HTMLElement;
    const attrTableEl = drawer.querySelector('#drawer-attributes-table') as HTMLElement;
    const eventCountEl = drawer.querySelector('#drawer-event-count') as HTMLElement;
    const eventsListEl = drawer.querySelector('#drawer-events-list') as HTMLElement;
    const rawJsonEl = drawer.querySelector('#drawer-raw-json') as HTMLElement;

    serviceNameEl.textContent = span.service_name;
    opNameEl.textContent = span.operation_name;

    const isError = span.status === 'ERROR';
    statusPill.textContent = span.status;
    statusPill.className = `text-[10px] font-mono px-2 py-0.5 rounded font-bold ${isError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`;

    durationEl.textContent = `${span.duration} ms`;
    offsetEl.textContent = `+${Math.max(0, span.start_time - traceStart)} ms`;
    startEl.textContent = new Date(span.start_time).toISOString().substring(11, 23);
    endEl.textContent = new Date(span.end_time).toISOString().substring(11, 23);

    spanIdEl.textContent = span.span_id;
    parentIdEl.textContent = span.parent_span_id || '(root span)';
    traceIdEl.textContent = span.trace_id;

    // Error Box
    if (isError) {
      errorBox.classList.remove('hidden');
      errorMsgEl.textContent = span.status_message || span.attributes?.['error.message'] || span.attributes?.['exception.message'] || 'Error recorded on span';
    } else {
      errorBox.classList.add('hidden');
    }

    // Attributes Table
    const attrs = span.attributes || {};
    const attrEntries = Object.entries(attrs);
    attrCountEl.textContent = String(attrEntries.length);

    if (attrEntries.length === 0) {
      attrTableEl.innerHTML = `<div class="p-3 text-slate-400 text-[11px]">No custom attributes attached.</div>`;
    } else {
      attrTableEl.innerHTML = `
        <table class="w-full text-left font-mono text-[11px]">
          <tbody>
            ${attrEntries.map(([k, v]) => `
              <tr class="border-b border-slate-200/60 hover:bg-slate-100/60">
                <td class="py-1.5 px-3 text-slate-600 font-sans font-medium select-all">${k}</td>
                <td class="py-1.5 px-3 text-slate-900 font-semibold select-all">${typeof v === 'object' ? JSON.stringify(v) : v}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    // Events List
    const events = span.events || [];
    eventCountEl.textContent = String(events.length);
    if (events.length === 0) {
      eventsListEl.innerHTML = `<div class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-400 text-[11px]">No events recorded for this span.</div>`;
    } else {
      eventsListEl.innerHTML = events.map((e: any) => `
        <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-indigo-700 font-bold">${e.name}</span>
            <span class="text-slate-500 text-[10px]">${new Date(e.timestamp).toISOString().substring(11, 23)}</span>
          </div>
          ${e.attributes ? `
            <div class="text-[10px] text-slate-600 font-sans mt-1 bg-white p-1.5 rounded border border-slate-200">
              ${JSON.stringify(e.attributes, null, 2)}
            </div>
          ` : ''}
        </div>
      `).join('');
    }

    // Raw JSON
    rawJsonEl.textContent = JSON.stringify(span, null, 2);
  }

  // Event Listeners
  container.querySelector('#drawer-close-btn')?.addEventListener('click', () => {
    drawer.classList.add('hidden');
  });

  container.querySelector('#drawer-copy-json')?.addEventListener('click', () => {
    const jsonText = container.querySelector('#drawer-raw-json')?.textContent;
    if (jsonText) {
      navigator.clipboard.writeText(jsonText);
      const btn = container.querySelector('#drawer-copy-json') as HTMLElement;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy JSON'; }, 1500);
    }
  });

  container.querySelector('#wf-back-to-traces')?.addEventListener('click', () => {
    navigateTo('traces');
  });

  tracePicker?.addEventListener('change', () => {
    if (tracePicker.value) {
      loadTraceWaterfall(tracePicker.value);
    }
  });

  // Zoom Handlers
  container.querySelector('#wf-zoom-in')?.addEventListener('click', () => {
    currentZoom = Math.min(5.0, currentZoom + 0.25);
    zoomLevelLabel.textContent = `${Math.round(currentZoom * 100)}%`;
    if (activeTraceData) {
      renderRuler(activeTraceData.trace.duration);
      renderRows(activeTraceData.span_tree, activeTraceData.trace.start_time, activeTraceData.trace.duration);
    }
  });

  container.querySelector('#wf-zoom-out')?.addEventListener('click', () => {
    currentZoom = Math.max(0.5, currentZoom - 0.25);
    zoomLevelLabel.textContent = `${Math.round(currentZoom * 100)}%`;
    if (activeTraceData) {
      renderRuler(activeTraceData.trace.duration);
      renderRows(activeTraceData.span_tree, activeTraceData.trace.start_time, activeTraceData.trace.duration);
    }
  });

  container.querySelector('#wf-zoom-reset')?.addEventListener('click', () => {
    currentZoom = 1.0;
    zoomLevelLabel.textContent = '100%';
    if (activeTraceData) {
      renderRuler(activeTraceData.trace.duration);
      renderRows(activeTraceData.span_tree, activeTraceData.trace.start_time, activeTraceData.trace.duration);
    }
  });

  container.querySelector('#wf-toggle-expand')?.addEventListener('click', (e) => {
    allExpanded = !allExpanded;
    (e.target as HTMLElement).textContent = allExpanded ? 'Collapse All' : 'Expand All';
    if (activeTraceData) {
      renderRows(activeTraceData.span_tree, activeTraceData.trace.start_time, activeTraceData.trace.duration);
    }
  });

  populateTracePicker();
}
