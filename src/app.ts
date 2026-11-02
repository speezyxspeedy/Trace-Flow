import './index.css';
import { renderOverview } from './views/overview';
import { renderTraces } from './views/traces';
import { renderWaterfall } from './views/waterfall';
import { renderServices } from './views/services';
import { renderDependencies } from './views/dependencies';
import { renderErrors } from './views/errors';
import { renderLiveMonitoring } from './views/live';
import { renderIngest } from './views/ingest';
import { renderSettings } from './views/settings';

// Global Application State
interface AppState {
  currentTab: string;
  selectedTraceId: string | null;
  wsConnected: boolean;
  onLiveEvent?: (event: any) => void;
}

const state: AppState = {
  currentTab: 'overview',
  selectedTraceId: null,
  wsConnected: false
};

// Main DOM Container
const root = document.getElementById('app')!;

function initApp() {
  root.innerHTML = `
    <!-- Sidebar Navigation -->
    <aside class="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none shadow-xs">
      <div>
        <!-- Brand Wordmark Header with New Logo -->
        <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <!-- New Modern Interlocking Tracing Flow Glyph Logo -->
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 flex items-center justify-center text-white shadow-sm shadow-indigo-600/25">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <!-- Connected Microservice Nodes and Causal Vectors -->
                <circle cx="5" cy="12" r="2.5" fill="white" fill-opacity="0.2" />
                <circle cx="19" cy="6" r="2.5" fill="white" fill-opacity="0.2" />
                <circle cx="19" cy="18" r="2.5" fill="white" fill-opacity="0.2" />
                <path d="M7.5 12C11 12 13 6 16.5 6" stroke-width="2.2" />
                <path d="M7.5 12C11 12 13 18 16.5 18" stroke-width="2.2" />
                <circle cx="12" cy="12" r="1.5" fill="white" />
              </svg>
            </div>
            <div>
              <span class="text-base font-bold tracking-tight text-slate-900 block leading-tight">TraceFlow</span>
              <span class="text-[11px] text-slate-500 font-medium block">Distributed Tracing</span>
            </div>
          </div>
        </div>

        <!-- Navigation Links -->
        <nav class="p-3 space-y-1 text-xs font-medium text-slate-600">
          <button data-tab="overview" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors nav-tab-btn">
            <svg class="w-4 h-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>Overview</span>
          </button>

          <button data-tab="traces" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors nav-tab-btn">
            <svg class="w-4 h-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>Trace Explorer</span>
          </button>

          <button data-tab="waterfall" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors nav-tab-btn">
            <svg class="w-4 h-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Waterfall Timeline</span>
          </button>

          <button data-tab="services" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors nav-tab-btn">
            <svg class="w-4 h-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            <span>Services Registry</span>
          </button>

          <button data-tab="dependencies" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors nav-tab-btn">
            <svg class="w-4 h-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span>Dependency Map</span>
          </button>

          <button data-tab="errors" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors nav-tab-btn">
            <svg class="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Error Investigation</span>
          </button>

          <button data-tab="live" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors nav-tab-btn">
            <svg class="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Live Monitoring</span>
          </button>

          <div class="pt-3 border-t border-slate-200 space-y-1">
            <button data-tab="ingest" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors nav-tab-btn">
              <svg class="w-4 h-4 shrink-0 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Data Import</span>
            </button>

            <button data-tab="settings" class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors nav-tab-btn">
              <svg class="w-4 h-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings & Docs</span>
            </button>
          </div>
        </nav>
      </div>

      <!-- Footer: Real-time Connection Status -->
      <div class="p-4 border-t border-slate-200 bg-slate-50/70 text-[11px] font-mono">
        <div class="flex items-center justify-between">
          <span class="text-slate-500 font-sans font-medium">TELEMETRY</span>
          <div class="flex items-center gap-1.5">
            <span id="app-status-dot" class="w-2 h-2 rounded-full bg-slate-400"></span>
            <span id="app-status-label" class="text-slate-500">CONNECTING</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
      <!-- Top Header -->
      <header class="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 shrink-0 select-none shadow-xs">
        <!-- Zone 1: Breadcrumb Context -->
        <div class="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span class="text-slate-400">TraceFlow</span>
          <span>/</span>
          <span id="top-breadcrumb-title" class="text-slate-900 font-semibold capitalize">Overview</span>
        </div>

        <!-- Zone 2: Global Quick Lookup Input -->
        <div class="max-w-md w-full relative hidden sm:block">
          <input id="global-search-input" type="text" placeholder="Jump to Trace ID or service name..." 
            class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100/80 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-all" />
          <svg class="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <!-- Zone 3: Primary Quick CTA -->
        <div class="flex items-center gap-3 shrink-0">
          <button id="top-quick-ingest-btn" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Ingest Traces
          </button>
        </div>
      </header>

      <!-- View Viewport -->
      <section id="view-viewport" class="flex-1 overflow-y-auto">
        <!-- Dynamically rendered view -->
      </section>
    </main>
  `;

  // Attach Navigation Listeners
  root.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) navigateTo(tab);
    });
  });

  // Top Ingest Button
  root.querySelector('#top-quick-ingest-btn')?.addEventListener('click', () => {
    navigateTo('ingest');
  });

  // Global Quick Lookup
  const globalSearch = root.querySelector('#global-search-input') as HTMLInputElement;
  globalSearch?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = globalSearch.value.trim();
      if (!val) return;
      if (val.length >= 16) {
        navigateTo('waterfall', { traceId: val });
      } else {
        navigateTo('traces');
        setTimeout(() => {
          const input = document.querySelector('#filter-search') as HTMLInputElement;
          if (input) {
            input.value = val;
            input.dispatchEvent(new Event('input'));
          }
        }, 50);
      }
    }
  });

  // Setup WebSocket Client
  setupWebSocket();

  // Initial Route
  navigateTo('overview');
}

function updateNavigationActiveState(tab: string) {
  root.querySelectorAll('.nav-tab-btn').forEach(btn => {
    const bTab = btn.getAttribute('data-tab');
    if (bTab === tab) {
      btn.className = 'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-indigo-700 bg-indigo-50/90 border border-indigo-200/80 font-semibold transition-colors nav-tab-btn shadow-xs';
    } else {
      btn.className = 'w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 text-slate-600 font-medium transition-colors nav-tab-btn';
    }
  });

  const breadcrumb = root.querySelector('#top-breadcrumb-title');
  if (breadcrumb) {
    const titles: Record<string, string> = {
      overview: 'System Observability Overview',
      traces: 'Distributed Trace Explorer',
      waterfall: 'Waterfall Timeline Visualizer',
      services: 'Service Registry & Latency Metrics',
      dependencies: 'Service Dependency Graph (DAG)',
      errors: 'Error Investigation & Root Cause',
      live: 'Live Stream Telemetry',
      ingest: 'OpenTelemetry & JSON Ingestion',
      settings: 'Settings & API Reference'
    };
    breadcrumb.textContent = titles[tab] || tab;
  }
}

export function navigateTo(tab: string, params: any = {}) {
  state.currentTab = tab;
  updateNavigationActiveState(tab);

  const viewport = root.querySelector('#view-viewport') as HTMLElement;
  if (!viewport) return;

  viewport.innerHTML = '';

  switch (tab) {
    case 'overview':
      renderOverview(viewport, state, navigateTo);
      break;
    case 'traces':
      renderTraces(viewport, state, navigateTo);
      break;
    case 'waterfall':
      renderWaterfall(viewport, state, navigateTo, params.traceId);
      break;
    case 'services':
      renderServices(viewport, state, navigateTo, params.selectedService);
      break;
    case 'dependencies':
      renderDependencies(viewport, state, navigateTo);
      break;
    case 'errors':
      renderErrors(viewport, state, navigateTo);
      break;
    case 'live':
      renderLiveMonitoring(viewport, state, navigateTo);
      break;
    case 'ingest':
      renderIngest(viewport, state, navigateTo);
      break;
    case 'settings':
      renderSettings(viewport, state, navigateTo);
      break;
    default:
      renderOverview(viewport, state, navigateTo);
  }
}

// WebSocket Live Client Connection
function setupWebSocket() {
  const statusDot = root.querySelector('#app-status-dot') as HTMLElement;
  const statusLabel = root.querySelector('#app-status-label') as HTMLElement;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/live`;

  let ws: WebSocket | null = null;
  let retryTimeout = 1000;

  function connect() {
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        state.wsConnected = true;
        retryTimeout = 1000;
        if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        if (statusLabel) {
          statusLabel.textContent = 'LIVE CONNECTED';
          statusLabel.className = 'text-emerald-700 font-semibold';
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (state.onLiveEvent) {
            state.onLiveEvent(data);
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        state.wsConnected = false;
        if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-rose-500';
        if (statusLabel) {
          statusLabel.textContent = 'DISCONNECTED';
          statusLabel.className = 'text-rose-600 font-medium';
        }
        setTimeout(connect, Math.min(10000, retryTimeout * 1.5));
      };

      ws.onerror = () => {
        ws?.close();
      };
    } catch {
      setTimeout(connect, 3000);
    }
  }

  connect();
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
