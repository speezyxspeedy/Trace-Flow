// Live Monitoring Feed Component - Light Observability Theme
export function renderLiveMonitoring(container: HTMLElement, state: any, navigateTo: (tab: string, params?: any) => void) {
  container.innerHTML = `
    <div class="p-6 space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Live Stream Telemetry
          </h1>
          <p class="text-xs text-slate-500 mt-1">
            Real-time WebSocket event bus broadcasting incoming traces and ingestion events
          </p>
        </div>
        <div class="flex items-center gap-3">
          <div id="live-connection-badge" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono shadow-xs">
            <span id="live-status-dot" class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span id="live-status-text" class="text-slate-800 font-semibold">Connected (Live WS)</span>
          </div>
          <button id="live-pause-btn" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-xs">
            Pause Stream
          </button>
          <button id="live-clear-btn" class="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-lg transition-colors">
            Clear Feed
          </button>
        </div>
      </div>

      <!-- Quick Trigger Bar: Inject test traffic -->
      <div class="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between gap-4 shrink-0">
        <div class="flex items-center gap-3 text-xs text-slate-600 font-medium">
          <span>Inject Synthetic Events:</span>
          <button id="live-gen-normal" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-mono text-[11px] font-semibold transition-colors">
            + Normal Trace
          </button>
          <button id="live-gen-timeout" class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-mono text-[11px] font-semibold transition-colors">
            + Stripe Timeout
          </button>
          <button id="live-gen-auth" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-mono text-[11px] font-semibold transition-colors">
            + JWT Expired
          </button>
          <button id="live-gen-deadlock" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-mono text-[11px] font-semibold transition-colors">
            + DB Deadlock
          </button>
        </div>
        <div class="text-xs font-mono text-slate-500">
          Feed count: <span id="live-event-counter" class="text-slate-900 font-bold">0</span> events
        </div>
      </div>

      <!-- Event Stream Log List -->
      <div class="flex-1 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col overflow-hidden">
        <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-mono text-slate-600 font-semibold">
          <div class="w-24">TIMESTAMP</div>
          <div class="w-32">EVENT TYPE</div>
          <div class="w-40">ROOT SERVICE</div>
          <div class="flex-1">TRACE DETAILS</div>
          <div class="w-24 text-right">ACTION</div>
        </div>

        <div id="live-feed-container" class="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
          <div class="text-center text-slate-400 py-16 font-sans">
            Listening for live traces... Ingest traces or click the synthetic triggers above.
          </div>
        </div>
      </div>
    </div>
  `;

  let isPaused = false;
  let eventCount = 0;
  const feed = container.querySelector('#live-feed-container') as HTMLElement;
  const counter = container.querySelector('#live-event-counter') as HTMLElement;
  const pauseBtn = container.querySelector('#live-pause-btn') as HTMLButtonElement;
  const clearBtn = container.querySelector('#live-clear-btn') as HTMLButtonElement;

  pauseBtn?.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Resume Stream' : 'Pause Stream';
    pauseBtn.className = isPaused ?
      'px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg' :
      'px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs';
  });

  clearBtn?.addEventListener('click', () => {
    feed.innerHTML = `<div class="text-center text-slate-400 py-16 font-sans">Feed cleared. Waiting for new events...</div>`;
    eventCount = 0;
    counter.textContent = '0';
  });

  async function triggerScenario(scenario: string) {
    try {
      await fetch('/api/demo/generate-one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      });
    } catch (err: any) {
      alert('Error triggering scenario: ' + err.message);
    }
  }

  container.querySelector('#live-gen-normal')?.addEventListener('click', () => triggerScenario('normal'));
  container.querySelector('#live-gen-timeout')?.addEventListener('click', () => triggerScenario('payment_timeout'));
  container.querySelector('#live-gen-auth')?.addEventListener('click', () => triggerScenario('auth_expired'));
  container.querySelector('#live-gen-deadlock')?.addEventListener('click', () => triggerScenario('db_deadlock'));

  state.onLiveEvent = (event: any) => {
    if (isPaused) return;

    if (eventCount === 0) {
      feed.innerHTML = '';
    }

    eventCount++;
    counter.textContent = String(eventCount);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });

    let itemHtml = '';
    if (event.type === 'new_trace' && event.trace) {
      const t = event.trace;
      const isError = t.status === 'ERROR';

      itemHtml = `
        <div class="p-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between gap-4 border border-slate-100 transition-colors">
          <div class="w-24 text-slate-500 text-[11px] font-medium">${timeStr}</div>
          <div class="w-32">
            <span class="text-[10px] px-2 py-0.5 rounded font-semibold ${isError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}">
              TRACE_INGEST
            </span>
          </div>
          <div class="w-40 font-bold text-slate-800 truncate">${t.root_service}</div>
          <div class="flex-1 flex items-center gap-3 text-slate-600">
            <span class="text-indigo-600 font-semibold">${t.trace_id.substring(0, 14)}...</span>
            <span>·</span>
            <span class="font-medium">${t.duration} ms</span>
            <span>·</span>
            <span>${t.span_count} spans</span>
            <span>·</span>
            <span class="${isError ? 'text-rose-600' : 'text-emerald-600'} font-bold">${t.status}</span>
          </div>
          <div class="w-24 text-right">
            <button class="text-indigo-600 hover:text-indigo-800 hover:underline text-[11px] font-semibold live-view-btn" data-id="${t.trace_id}">
              Inspect →
            </button>
          </div>
        </div>
      `;
    } else if (event.type === 'connected') {
      itemHtml = `
        <div class="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-4 text-emerald-800 text-[11px]">
          <span class="w-24 text-slate-500 font-medium">${timeStr}</span>
          <span class="font-bold">SYS_CONNECTED</span>
          <span>WebSocket Live Client connected successfully. Ready for incoming trace streams.</span>
        </div>
      `;
    }

    if (itemHtml) {
      feed.insertAdjacentHTML('afterbegin', itemHtml);
      if (feed.children.length > 100) {
        feed.removeChild(feed.lastChild!);
      }

      feed.querySelectorAll('.live-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = (e.target as HTMLElement).getAttribute('data-id');
          if (id) navigateTo('waterfall', { traceId: id });
        });
      });
    }
  };
}
