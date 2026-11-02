// Settings & API Documentation Component - Light Theme
export function renderSettings(container: HTMLElement, state: any, navigateTo: (tab: string, params?: any) => void) {
  container.innerHTML = `
    <div class="p-6 space-y-8 max-w-5xl mx-auto">
      <!-- Header -->
      <div class="pb-4 border-b border-slate-200">
        <h1 class="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          Platform Settings & API Documentation
        </h1>
        <p class="text-xs text-slate-500 mt-1">
          OpenTelemetry integration specs, REST API reference, and Windows 11 PowerShell instructions
        </p>
      </div>

      <!-- Database Management & Maintenance -->
      <div class="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
        <div>
          <h3 class="text-sm font-bold text-slate-900">Data Storage & Maintenance</h3>
          <p class="text-xs text-slate-500 mt-1">
            SQLite WAL database stores traces, indexed spans, and calculated causal dependency edges.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3 pt-2">
          <button id="purge-demo-btn" class="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors shadow-xs">
            Purge Only Synthetic Demo Data
          </button>
          <button id="purge-all-btn" class="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors shadow-xs">
            Reset Database (Delete All Traces)
          </button>
        </div>
      </div>

      <!-- Windows 11 PowerShell Quickstart -->
      <div class="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
            <svg class="w-4 h-4 text-sky-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.951-1.799"/>
            </svg>
            Windows 11 PowerShell Setup (Python FastAPI Backend)
          </h3>
          <span class="text-[11px] font-mono text-slate-500 font-medium">PowerShell 7 / 5.1</span>
        </div>
        <p class="text-xs text-slate-500 leading-relaxed">
          To run the standalone Python FastAPI version of TraceFlow on Windows 11 with SQLite and WebSockets:
        </p>
        <pre class="p-4 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed"># 1. Clone or navigate to the traceflow directory
cd traceflow

# 2. Create Python virtual environment
python -m venv venv

# 3. Activate virtual environment in PowerShell
.\venv\Scripts\Activate.ps1
# (If execution policy restricts scripts: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass)

# 4. Install backend dependencies
pip install -r requirements.txt

# 5. Launch FastAPI with Uvicorn
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# 6. Open browser at http://localhost:8000</pre>
      </div>

      <!-- REST API Documentation -->
      <div class="space-y-4">
        <h3 class="text-sm font-bold text-slate-900">REST API Endpoints Reference</h3>

        <div class="space-y-3">
          <!-- Ingest Endpoint -->
          <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
            <div class="flex items-center gap-2 font-mono text-xs">
              <span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">POST</span>
              <span class="text-slate-900 font-bold">/api/traces/ingest</span>
              <span class="text-slate-500 font-sans ml-2">Ingest OpenTelemetry or TraceFlow JSON</span>
            </div>
            <pre class="p-3 bg-slate-900 rounded-lg font-mono text-[11px] text-slate-200 overflow-x-auto">curl -X POST http://localhost:3000/api/traces/ingest \\
  -H "Content-Type: application/json" \\
  -d @sample_data/normal_trace.json</pre>
          </div>

          <!-- Get Traces -->
          <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
            <div class="flex items-center gap-2 font-mono text-xs">
              <span class="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-bold">GET</span>
              <span class="text-slate-900 font-bold">/api/traces</span>
              <span class="text-slate-500 font-sans ml-2">Filter and paginate traces (?search, ?service, ?status, ?limit)</span>
            </div>
            <pre class="p-3 bg-slate-900 rounded-lg font-mono text-[11px] text-slate-200 overflow-x-auto">curl -s "http://localhost:3000/api/traces?status=ERROR&limit=10"</pre>
          </div>

          <!-- Get Trace by ID -->
          <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
            <div class="flex items-center gap-2 font-mono text-xs">
              <span class="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-bold">GET</span>
              <span class="text-slate-900 font-bold">/api/traces/{trace_id}</span>
              <span class="text-slate-500 font-sans ml-2">Fetch full span hierarchy tree and timing data</span>
            </div>
            <pre class="p-3 bg-slate-900 rounded-lg font-mono text-[11px] text-slate-200 overflow-x-auto">curl -s http://localhost:3000/api/traces/4bfb104920e0f97a593d6326c281ad8b</pre>
          </div>

          <!-- Dependencies -->
          <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
            <div class="flex items-center gap-2 font-mono text-xs">
              <span class="px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-bold">GET</span>
              <span class="text-slate-900 font-bold">/api/dependencies</span>
              <span class="text-slate-500 font-sans ml-2">Derive service graph nodes and directed call edges</span>
            </div>
            <pre class="p-3 bg-slate-900 rounded-lg font-mono text-[11px] text-slate-200 overflow-x-auto">curl -s http://localhost:3000/api/dependencies</pre>
          </div>

          <!-- WebSocket -->
          <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
            <div class="flex items-center gap-2 font-mono text-xs">
              <span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">WS</span>
              <span class="text-slate-900 font-bold">/ws/live</span>
              <span class="text-slate-500 font-sans ml-2">Real-time WebSocket event subscription stream</span>
            </div>
            <pre class="p-3 bg-slate-900 rounded-lg font-mono text-[11px] text-slate-200 overflow-x-auto"># Connect via wscat or JavaScript
const ws = new WebSocket("ws://localhost:3000/ws/live");
ws.onmessage = (e) => console.log(JSON.parse(e.data));</pre>
          </div>
        </div>
      </div>
    </div>
  `;

  // Purge handlers
  container.querySelector('#purge-demo-btn')?.addEventListener('click', async () => {
    if (!confirm('Purge all synthetic DEMO traces?')) return;
    try {
      const res = await fetch('/api/demo/purge', { method: 'DELETE' });
      const data = await res.json();
      alert(data.message || 'Purged demo traces.');
    } catch (err: any) {
      alert('Error purging: ' + err.message);
    }
  });

  container.querySelector('#purge-all-btn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to completely RESET the database and delete all traces?')) return;
    try {
      const res = await fetch('/api/traces', { method: 'DELETE' });
      const data = await res.json();
      alert(data.message || 'Database reset.');
    } catch (err: any) {
      alert('Error resetting database: ' + err.message);
    }
  });
}
