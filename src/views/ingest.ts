// Ingestion & Data Import Component - Light Observability Theme
export function renderIngest(container: HTMLElement, state: any, navigateTo: (tab: string, params?: any) => void) {
  container.innerHTML = `
    <div class="p-6 space-y-6 max-w-5xl mx-auto">
      <!-- Header -->
      <div class="pb-4 border-b border-slate-200">
        <h1 class="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          OpenTelemetry & JSON Trace Ingestion
        </h1>
        <p class="text-xs text-slate-500 mt-1">
          Ingest distributed traces via JSON upload, raw payload submission, or test with built-in standard OTel sample traces
        </p>
      </div>

      <!-- Quick Sample Loader Buttons -->
      <div class="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 class="text-xs font-bold text-slate-900">Load Standard Sample Datasets</h3>
          <p class="text-[11px] text-slate-500 mt-0.5">Pre-built microservice traces with full parent-child causal relationships</p>
        </div>
        <div class="flex items-center gap-3">
          <button id="load-sample-normal-btn" class="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs">
            <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Load Normal Trace (Checkout Flow)
          </button>
          <button id="load-sample-error-btn" class="px-3.5 py-2 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs">
            <svg class="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Load Error Trace (Gateway Timeout)
          </button>
        </div>
      </div>

      <!-- File Upload Zone -->
      <div id="drop-zone" class="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-8 text-center transition-colors cursor-pointer bg-white shadow-xs">
        <input type="file" id="file-input" class="hidden" accept=".json,application/json" />
        <div class="space-y-2">
          <div class="w-12 h-12 mx-auto rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div class="text-xs text-slate-800 font-bold">Click to upload or drag & drop trace JSON file</div>
          <p class="text-[11px] text-slate-500">Supports OpenTelemetry JSON resourceSpans or TraceFlow format</p>
        </div>
      </div>

      <!-- Raw JSON Textarea Editor -->
      <div class="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-slate-900">Direct JSON Ingest Payload</h3>
          <div class="flex items-center gap-2">
            <button id="format-json-btn" class="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
              Format JSON
            </button>
            <button id="clear-json-btn" class="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
              Clear
            </button>
          </div>
        </div>

        <textarea id="json-editor" rows="12" placeholder='Paste OpenTelemetry JSON or TraceFlow JSON payload here...'
          class="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white leading-relaxed"></textarea>

        <div class="flex items-center justify-between pt-2">
          <div id="ingest-status-msg" class="text-xs font-mono text-slate-500 font-medium">
            Ready to parse payload.
          </div>
          <button id="submit-ingest-btn" class="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs">
            Ingest Payload →
          </button>
        </div>
      </div>

      <!-- Ingest Result Box (If completed) -->
      <div id="ingest-result-card" class="hidden p-4 rounded-xl border"></div>

      <!-- Documented Schema Reference -->
      <div class="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
        <h3 class="text-xs font-bold text-slate-900">Supported JSON Schemas</h3>
        <p class="text-xs text-slate-500 leading-relaxed">
          TraceFlow automatically normalizes both standard OpenTelemetry Protocol (OTLP/JSON) envelopes and clean TraceFlow hierarchical envelopes:
        </p>
        <pre class="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto">{
  "trace_id": "4bfb104920e0f97a593d6326c281ad8b",
  "spans": [
    {
      "span_id": "00f067aa0ba902b7",
      "parent_span_id": null,
      "service_name": "api-gateway",
      "operation_name": "HTTP POST /api/v1/checkout",
      "start_time": "2026-11-02T12:00:00.000Z",
      "end_time": "2026-11-02T12:00:00.342Z",
      "status": "OK",
      "attributes": { "http.method": "POST", "http.status_code": 200 }
    }
  ]
}</pre>
      </div>
    </div>
  `;

  const dropZone = container.querySelector('#drop-zone') as HTMLElement;
  const fileInput = container.querySelector('#file-input') as HTMLInputElement;
  const jsonEditor = container.querySelector('#json-editor') as HTMLTextAreaElement;
  const statusMsg = container.querySelector('#ingest-status-msg') as HTMLElement;
  const resultCard = container.querySelector('#ingest-result-card') as HTMLElement;
  const submitBtn = container.querySelector('#submit-ingest-btn') as HTMLButtonElement;

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        jsonEditor.value = evt.target?.result as string;
        statusMsg.textContent = `Loaded file: ${file.name} (${Math.round(file.size / 1024)} KB)`;
      };
      reader.readAsText(file);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-indigo-500', 'bg-indigo-50/30');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/30');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/30');
    const file = e.dataTransfer?.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        jsonEditor.value = evt.target?.result as string;
        statusMsg.textContent = `Loaded file: ${file.name}`;
      };
      reader.readAsText(file);
    }
  });

  container.querySelector('#load-sample-normal-btn')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/sample/normal');
      const data = await res.json();
      jsonEditor.value = JSON.stringify(data, null, 2);
      statusMsg.textContent = 'Loaded normal multi-service checkout trace.';
      statusMsg.className = 'text-xs font-mono text-emerald-700 font-semibold';
    } catch (err: any) {
      alert('Failed to load sample: ' + err.message);
    }
  });

  container.querySelector('#load-sample-error-btn')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/sample/error');
      const data = await res.json();
      jsonEditor.value = JSON.stringify(data, null, 2);
      statusMsg.textContent = 'Loaded gateway timeout error cascade trace.';
      statusMsg.className = 'text-xs font-mono text-rose-700 font-semibold';
    } catch (err: any) {
      alert('Failed to load sample: ' + err.message);
    }
  });

  container.querySelector('#format-json-btn')?.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(jsonEditor.value);
      jsonEditor.value = JSON.stringify(parsed, null, 2);
    } catch (e: any) {
      alert('Invalid JSON: ' + e.message);
    }
  });

  container.querySelector('#clear-json-btn')?.addEventListener('click', () => {
    jsonEditor.value = '';
    statusMsg.textContent = 'Ready to parse payload.';
    statusMsg.className = 'text-xs font-mono text-slate-500 font-medium';
    resultCard.classList.add('hidden');
  });

  submitBtn.addEventListener('click', async () => {
    const raw = jsonEditor.value.trim();
    if (!raw) {
      alert('Please enter or upload JSON trace data to ingest.');
      return;
    }

    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch (e: any) {
      statusMsg.textContent = `JSON Parse Error: ${e.message}`;
      statusMsg.className = 'text-xs font-mono text-rose-600 font-bold';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Ingesting...';

    try {
      const res = await fetch('/api/traces/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        resultCard.className = 'p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 space-y-2 shadow-xs';
        resultCard.innerHTML = `
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-xs flex items-center gap-2 text-emerald-800">
              <svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Trace Ingest Succeeded
            </h4>
            <button id="view-ingested-traces-btn" class="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
              View in Explorer →
            </button>
          </div>
          <div class="text-[11px] font-mono text-emerald-800 font-medium">
            Ingested ${data.ingested_traces} trace(s) and ${data.ingested_spans} span(s).
          </div>
          <div class="text-[10px] font-mono text-slate-600 truncate">
            Trace IDs: ${data.trace_ids?.join(', ')}
          </div>
        `;
        resultCard.classList.remove('hidden');
        statusMsg.textContent = 'Ingestion complete.';
        statusMsg.className = 'text-xs font-mono text-emerald-700 font-bold';

        resultCard.querySelector('#view-ingested-traces-btn')?.addEventListener('click', () => {
          navigateTo('traces');
        });

      } else {
        resultCard.className = 'p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 space-y-1 shadow-xs';
        resultCard.innerHTML = `
          <h4 class="font-bold text-xs flex items-center gap-2 text-rose-800">
            <svg class="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Ingest Failed
          </h4>
          <p class="text-xs font-mono text-rose-700">${data.error || 'Unknown server rejection'}</p>
        `;
        resultCard.classList.remove('hidden');
        statusMsg.textContent = 'Ingestion failed.';
        statusMsg.className = 'text-xs font-mono text-rose-600 font-bold';
      }
    } catch (err: any) {
      alert('Network error while ingesting: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Ingest Payload →';
    }
  });
}
