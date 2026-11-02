// Service Dependency Map Component - Light Observability Theme
export async function renderDependencies(container: HTMLElement, state: any, navigateTo: (tab: string, params?: any) => void) {
  container.innerHTML = `
    <div class="h-full flex flex-col overflow-hidden bg-white">
      <!-- Header -->
      <div class="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Service Dependency Map
          </h1>
          <p class="text-xs text-slate-500 mt-0.5">
            Real-time topology DAG derived from parent-to-child span causal relationships
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button id="deps-refresh-btn" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-2 shadow-xs">
            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Recompute Topology
          </button>
          <div class="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> &lt;1% Err</span>
            <span class="text-slate-300">·</span>
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span> 1-5% Err</span>
            <span class="text-slate-300">·</span>
            <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-500"></span> &gt;5% Err</span>
          </div>
        </div>
      </div>

      <!-- Graph Viewport & Flyout Service Drawer -->
      <div class="flex-1 flex overflow-hidden relative">
        <!-- SVG Canvas with Subtle Grid -->
        <div id="deps-canvas-container" class="flex-1 h-full w-full bg-[#F8FAFC] overflow-auto relative select-none flex items-center justify-center">
          <div class="text-xs text-slate-400 py-16 text-center">Computing service dependencies...</div>
        </div>

        <!-- Service Flyout Drawer (On Node Click) -->
        <div id="service-drawer" class="hidden w-[420px] bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl z-20">
          <div class="p-4 border-b border-slate-200 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span id="sd-status-dot" class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <h3 id="sd-service-name" class="text-sm font-bold text-slate-900">Service Name</h3>
            </div>
            <button id="sd-close-btn" class="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            <!-- Key Service Metrics -->
            <div class="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px]">
              <div>
                <span class="text-slate-500 block text-[10px] font-sans font-semibold">TOTAL SPANS</span>
                <span id="sd-span-count" class="text-slate-900 font-bold text-sm">0</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[10px] font-sans font-semibold">ERROR RATE</span>
                <span id="sd-error-rate" class="text-emerald-600 font-bold text-sm">0%</span>
              </div>
              <div class="col-span-2 pt-2 border-t border-slate-200 grid grid-cols-3 gap-1">
                <div>
                  <span class="text-slate-500 block text-[9.5px] font-sans font-semibold">AVG LATENCY</span>
                  <span id="sd-avg-lat" class="text-slate-800 font-medium">-</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[9.5px] font-sans font-semibold">P95 LATENCY</span>
                  <span id="sd-p95-lat" class="text-indigo-600 font-medium">-</span>
                </div>
                <div>
                  <span class="text-slate-500 block text-[9.5px] font-sans font-semibold">P99 LATENCY</span>
                  <span id="sd-p99-lat" class="text-sky-600 font-medium">-</span>
                </div>
              </div>
            </div>

            <!-- Action: Filter Traces by this Service -->
            <button id="sd-filter-traces-btn" class="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-semibold transition-colors text-xs flex items-center justify-center gap-2 shadow-xs">
              View All Traces for this Service →
            </button>

            <!-- Upstream Callers -->
            <div>
              <h4 class="text-xs font-bold text-slate-900 mb-1.5 flex items-center justify-between">
                <span>Inbound Callers (Upstream)</span>
                <span id="sd-upstream-count" class="font-mono text-[10px] text-slate-500 font-semibold">0</span>
              </h4>
              <div id="sd-upstream-list" class="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <!-- Injected callers -->
              </div>
            </div>

            <!-- Downstream Dependencies -->
            <div>
              <h4 class="text-xs font-bold text-slate-900 mb-1.5 flex items-center justify-between">
                <span>Outbound Dependencies (Downstream)</span>
                <span id="sd-downstream-count" class="font-mono text-[10px] text-slate-500 font-semibold">0</span>
              </h4>
              <div id="sd-downstream-list" class="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <!-- Injected downstream -->
              </div>
            </div>

            <!-- Operations Breakdown -->
            <div>
              <h4 class="text-xs font-bold text-slate-900 mb-1.5">Top Operations</h4>
              <div id="sd-operations-list" class="space-y-1.5">
                <!-- Injected operations -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const canvasContainer = container.querySelector('#deps-canvas-container') as HTMLElement;
  const drawer = container.querySelector('#service-drawer') as HTMLElement;

  async function loadDependencyGraph() {
    try {
      const res = await fetch('/api/dependencies');
      const data = await res.json();

      const nodes = data.nodes || [];
      const edges = data.edges || [];

      if (nodes.length === 0) {
        canvasContainer.innerHTML = `<div class="text-xs text-slate-400 py-16 text-center">No service traces found. Ingest traces to build dependency graph.</div>`;
        return;
      }

      renderSVGGraph(nodes, edges);
    } catch (err: any) {
      canvasContainer.innerHTML = `<div class="text-xs text-rose-500 py-16 text-center font-medium">Failed to load dependencies: ${err.message}</div>`;
    }
  }

  function renderSVGGraph(nodes: any[], edges: any[]) {
    const width = 960;
    const height = 540;

    const inDegree: Record<string, number> = {};
    const outDegree: Record<string, number> = {};
    nodes.forEach(n => { inDegree[n.id] = 0; outDegree[n.id] = 0; });
    edges.forEach(e => {
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
      outDegree[e.source] = (outDegree[e.source] || 0) + 1;
    });

    const layers: string[][] = [[], [], []];

    nodes.forEach(n => {
      if (inDegree[n.id] === 0 || n.id.includes('gateway')) {
        layers[0].push(n.id);
      } else if (outDegree[n.id] === 0 || n.id.includes('db') || n.id.includes('cache') || n.id.includes('payment')) {
        layers[2].push(n.id);
      } else {
        layers[1].push(n.id);
      }
    });

    if (layers[0].length === 0 && nodes.length > 0) layers[0].push(nodes[0].id);

    const positions: Record<string, { x: number; y: number }> = {};
    const layerXs = [160, 480, 800];

    layers.forEach((layerNodes, lIdx) => {
      const x = layerXs[lIdx];
      const count = layerNodes.length;
      layerNodes.forEach((nodeId, nIdx) => {
        const y = count === 1 ? height / 2 : (height / (count + 1)) * (nIdx + 1);
        positions[nodeId] = { x, y };
      });
    });

    nodes.forEach(n => {
      if (!positions[n.id]) {
        positions[n.id] = { x: 480, y: height / 2 };
      }
    });

    // Render Edges
    let edgesSvg = '';
    edges.forEach(e => {
      const p1 = positions[e.source];
      const p2 = positions[e.target];
      if (!p1 || !p2) return;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const cx1 = p1.x + dx * 0.5;
      const cy1 = p1.y;
      const cx2 = p1.x + dx * 0.5;
      const cy2 = p2.y;

      const pathData = `M ${p1.x + 85} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x - 85} ${p2.y}`;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      const isErrorEdge = e.error_count > 0;

      edgesSvg += `
        <g class="group">
          <!-- Shadow path -->
          <path d="${pathData}" fill="none" stroke="#E2E8F0" stroke-width="4" />
          <!-- Animated flow line -->
          <path d="${pathData}" fill="none" stroke="${isErrorEdge ? '#F43F5E' : '#6366F1'}" stroke-width="2" class="edge-flowing" />
          
          <!-- Edge metric badge -->
          <g transform="translate(${midX}, ${midY})">
            <rect x="-38" y="-10" width="76" height="20" rx="4" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1" class="shadow-xs" />
            <text x="0" y="3.5" font-size="9.5" fill="${isErrorEdge ? '#E11D48' : '#334155'}" font-weight="600" text-anchor="middle" font-family="JetBrains Mono">
              ${e.call_count} req · ${e.avg_latency}ms
            </text>
          </g>
        </g>
      `;
    });

    // Render Nodes
    let nodesSvg = '';
    nodes.forEach(n => {
      const pos = positions[n.id];
      const isCritical = n.error_rate > 5;
      const isWarn = n.error_rate > 1 && n.error_rate <= 5;
      const statusColor = isCritical ? '#EF4444' : (isWarn ? '#F59E0B' : '#10B981');
      const badgeBorder = isCritical ? '#FECDD3' : (isWarn ? '#FDE68A' : '#A7F3D0');

      nodesSvg += `
        <g class="cursor-pointer group node-item" data-service="${n.id}" transform="translate(${pos.x - 80}, ${pos.y - 36})">
          <!-- Card Background -->
          <rect x="0" y="0" width="160" height="72" rx="10" fill="#FFFFFF" stroke="${statusColor}" stroke-width="1.8" class="group-hover:stroke-indigo-600 transition-all shadow-sm" />
          
          <!-- Top Row: Status Dot & Service Name -->
          <circle cx="16" cy="20" r="4.5" fill="${statusColor}" />
          <text x="28" y="24" font-size="12" font-weight="700" fill="#0F172A" font-family="Plus Jakarta Sans">
            ${n.name.length > 14 ? n.name.substring(0, 13) + '…' : n.name}
          </text>

          <!-- Divider -->
          <line x1="12" y1="36" x2="148" y2="36" stroke="#F1F5F9" stroke-width="1" />

          <!-- Bottom Row: Metrics -->
          <text x="14" y="54" font-size="10" fill="#64748B" font-family="JetBrains Mono">
            ${n.request_count} calls
          </text>
          <text x="146" y="54" font-size="10" font-weight="600" fill="${isCritical ? '#DC2626' : (isWarn ? '#D97706' : '#059669')}" text-anchor="end" font-family="JetBrains Mono">
            ${n.error_rate}% err · ${Math.round(n.avg_latency)}ms
          </text>
        </g>
      `;
    });

    canvasContainer.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" class="w-full h-full max-w-5xl">
        <defs>
          <pattern id="dot-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#E2E8F0" />
          </pattern>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#dot-pattern)" />
        ${edgesSvg}
        ${nodesSvg}
      </svg>
    `;

    // Wire Node Click to Open Service Flyout Drawer
    canvasContainer.querySelectorAll('.node-item').forEach(el => {
      el.addEventListener('click', () => {
        const serviceName = el.getAttribute('data-service');
        if (serviceName) openServiceDrawer(serviceName);
      });
    });
  }

  async function openServiceDrawer(serviceName: string) {
    drawer.classList.remove('hidden');

    const nameEl = drawer.querySelector('#sd-service-name') as HTMLElement;
    const dotEl = drawer.querySelector('#sd-status-dot') as HTMLElement;
    const spanCountEl = drawer.querySelector('#sd-span-count') as HTMLElement;
    const errorRateEl = drawer.querySelector('#sd-error-rate') as HTMLElement;
    const avgLatEl = drawer.querySelector('#sd-avg-lat') as HTMLElement;
    const p95LatEl = drawer.querySelector('#sd-p95-lat') as HTMLElement;
    const p99LatEl = drawer.querySelector('#sd-p99-lat') as HTMLElement;
    const upstreamList = drawer.querySelector('#sd-upstream-list') as HTMLElement;
    const downstreamList = drawer.querySelector('#sd-downstream-list') as HTMLElement;
    const opsList = drawer.querySelector('#sd-operations-list') as HTMLElement;
    const filterTracesBtn = drawer.querySelector('#sd-filter-traces-btn') as HTMLButtonElement;

    nameEl.textContent = serviceName;

    filterTracesBtn.onclick = () => {
      navigateTo('traces');
      setTimeout(() => {
        const select = document.querySelector('#filter-service') as HTMLSelectElement;
        if (select) {
          select.value = serviceName;
          select.dispatchEvent(new Event('change'));
        }
      }, 50);
    };

    try {
      const res = await fetch(`/api/services/${serviceName}`);
      const data = await res.json();

      spanCountEl.textContent = String(data.total_spans || 0);
      errorRateEl.textContent = `${data.error_rate || 0}%`;
      errorRateEl.className = `font-bold text-sm font-mono ${data.error_rate > 5 ? 'text-rose-600' : 'text-emerald-600'}`;
      dotEl.className = `w-2.5 h-2.5 rounded-full ${data.error_rate > 5 ? 'bg-rose-500' : 'bg-emerald-500'}`;

      const pct = data.percentiles || {};
      avgLatEl.textContent = `${pct.avg || 0}ms`;
      p95LatEl.textContent = `${pct.p95 || 0}ms`;
      p99LatEl.textContent = `${pct.p99 || 0}ms`;

      // Upstream
      const up = data.upstream || [];
      drawer.querySelector('#sd-upstream-count')!.textContent = String(up.length);
      upstreamList.innerHTML = up.length === 0 ? `<div class="text-[11px] text-slate-400">No inbound callers (root ingress).</div>` :
        up.map((u: any) => `
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-slate-800 font-semibold">${u.caller}</span>
            <span class="font-mono text-slate-500 font-medium">${u.call_count} calls</span>
          </div>
        `).join('');

      // Downstream
      const down = data.downstream || [];
      drawer.querySelector('#sd-downstream-count')!.textContent = String(down.length);
      downstreamList.innerHTML = down.length === 0 ? `<div class="text-[11px] text-slate-400">No outbound dependencies (leaf service).</div>` :
        down.map((d: any) => `
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-slate-800 font-semibold">${d.dependency}</span>
            <span class="font-mono text-slate-500 font-medium">${d.call_count} calls</span>
          </div>
        `).join('');

      // Operations
      const ops = data.operations || [];
      opsList.innerHTML = ops.map((op: any) => `
        <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px]">
          <div class="flex items-center justify-between text-slate-800 font-semibold">
            <span class="truncate max-w-[240px]">${op.operation_name}</span>
            <span class="text-slate-500">${op.count} calls</span>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-500 mt-1">
            <span>Avg: ${Math.round(op.avg_dur)}ms</span>
            <span class="${op.errors > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}">${op.errors} errors</span>
          </div>
        </div>
      `).join('');

    } catch (err: any) {
      console.error('Failed to load service details:', err);
    }
  }

  container.querySelector('#sd-close-btn')?.addEventListener('click', () => {
    drawer.classList.add('hidden');
  });

  container.querySelector('#deps-refresh-btn')?.addEventListener('click', () => {
    loadDependencyGraph();
  });

  loadDependencyGraph();
}
