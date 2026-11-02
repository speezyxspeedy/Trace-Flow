import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// --- Database Initialization ---
const DB_PATH = path.resolve(process.cwd(), 'traceflow.db');
const db = new Database(DB_PATH);

// Pragmas for high concurrency & performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS traces (
    trace_id TEXT PRIMARY KEY,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    duration REAL NOT NULL,
    status TEXT NOT NULL,
    root_service TEXT NOT NULL,
    span_count INTEGER NOT NULL,
    error_count INTEGER DEFAULT 0,
    is_demo INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_traces_start_time ON traces(start_time DESC);
  CREATE INDEX IF NOT EXISTS idx_traces_root_service ON traces(root_service);
  CREATE INDEX IF NOT EXISTS idx_traces_status ON traces(status);
  CREATE INDEX IF NOT EXISTS idx_traces_is_demo ON traces(is_demo);

  CREATE TABLE IF NOT EXISTS spans (
    span_id TEXT PRIMARY KEY,
    trace_id TEXT NOT NULL,
    parent_span_id TEXT,
    service_name TEXT NOT NULL,
    operation_name TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    duration REAL NOT NULL,
    status TEXT NOT NULL,
    status_message TEXT,
    attributes TEXT NOT NULL DEFAULT '{}',
    events TEXT NOT NULL DEFAULT '[]',
    is_demo INTEGER DEFAULT 0,
    FOREIGN KEY(trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON spans(trace_id);
  CREATE INDEX IF NOT EXISTS idx_spans_parent_span_id ON spans(parent_span_id);
  CREATE INDEX IF NOT EXISTS idx_spans_service_name ON spans(service_name);
  CREATE INDEX IF NOT EXISTS idx_spans_status ON spans(status);
  CREATE INDEX IF NOT EXISTS idx_spans_start_time ON spans(start_time);
`);

// --- OpenTelemetry / Trace Normalization Utilities ---

interface NormalizedSpan {
  span_id: string;
  trace_id: string;
  parent_span_id: string | null;
  service_name: string;
  operation_name: string;
  start_time: number; // epoch ms
  end_time: number;   // epoch ms
  duration: number;   // ms
  status: 'OK' | 'ERROR';
  status_message?: string;
  attributes: Record<string, any>;
  events: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, any>;
  }>;
}

function parseTimestamp(val: any): number {
  if (typeof val === 'number') {
    // Check if nanoseconds (19 digits)
    if (val > 1e16) return Math.floor(val / 1e6);
    // Check if microseconds (16 digits)
    if (val > 1e13) return Math.floor(val / 1e3);
    // Milliseconds or seconds
    if (val < 1e11) return Math.floor(val * 1000);
    return Math.floor(val);
  }
  if (typeof val === 'string') {
    // Numeric string
    if (/^\d+$/.test(val)) {
      const num = Number(val);
      if (val.length >= 18) return Math.floor(num / 1e6); // nanos
      if (val.length >= 15) return Math.floor(num / 1e3); // micros
      if (val.length <= 10) return num * 1000;           // secs
      return num;
    }
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function extractOTelAttributes(rawAttrs: any): Record<string, any> {
  if (!rawAttrs) return {};
  if (!Array.isArray(rawAttrs) && typeof rawAttrs === 'object') {
    return rawAttrs;
  }
  if (Array.isArray(rawAttrs)) {
    const result: Record<string, any> = {};
    for (const item of rawAttrs) {
      if (item && item.key) {
        if (item.value && typeof item.value === 'object') {
          const v = item.value.stringValue ?? item.value.intValue ?? item.value.doubleValue ?? item.value.boolValue ?? JSON.stringify(item.value);
          result[item.key] = v;
        } else {
          result[item.key] = item.value;
        }
      }
    }
    return result;
  }
  return {};
}

function normalizeIncomingPayload(payload: any, isDemo: boolean = false): { trace_id: string; spans: NormalizedSpan[] }[] {
  const tracesMap = new Map<string, NormalizedSpan[]>();

  // Case 1: Standard OpenTelemetry ResourceSpans envelope
  if (payload && Array.isArray(payload.resourceSpans)) {
    for (const rs of payload.resourceSpans) {
      const resourceAttrs = extractOTelAttributes(rs.resource?.attributes);
      const defaultService = resourceAttrs['service.name'] || 'unknown-service';
      const scopeSpans = rs.scopeSpans || rs.instrumentationLibrarySpans || [];

      for (const ss of scopeSpans) {
        const rawSpans = ss.spans || [];
        for (const s of rawSpans) {
          const traceId = s.traceId || s.trace_id;
          const spanId = s.spanId || s.span_id;
          if (!traceId || !spanId) continue;

          const start = parseTimestamp(s.startTimeUnixNano || s.start_time);
          const end = parseTimestamp(s.endTimeUnixNano || s.end_time || start);
          const dur = Math.max(0.1, s.duration != null ? Number(s.duration) : Math.round((end - start) * 100) / 100);

          const attrs = { ...resourceAttrs, ...extractOTelAttributes(s.attributes) };
          const serviceName = attrs['service.name'] || s.service_name || defaultService;
          const opName = s.name || s.operation_name || 'unnamed-operation';

          let status: 'OK' | 'ERROR' = 'OK';
          let statusMessage = s.status?.message || s.status_message || '';
          if (s.status?.code === 2 || s.status?.code === 'STATUS_CODE_ERROR' || s.status === 'ERROR' || attrs['error'] === true || attrs['http.status_code'] >= 400) {
            status = 'ERROR';
          }

          const events = Array.isArray(s.events) ? s.events.map((e: any) => ({
            name: e.name || 'event',
            timestamp: parseTimestamp(e.timeUnixNano || e.timestamp),
            attributes: extractOTelAttributes(e.attributes)
          })) : [];

          const span: NormalizedSpan = {
            span_id: String(spanId),
            trace_id: String(traceId),
            parent_span_id: s.parentSpanId || s.parent_span_id || null,
            service_name: String(serviceName),
            operation_name: String(opName),
            start_time: start,
            end_time: end >= start ? end : start + dur,
            duration: dur,
            status,
            status_message: statusMessage || undefined,
            attributes: attrs,
            events
          };

          if (!tracesMap.has(span.trace_id)) tracesMap.set(span.trace_id, []);
          tracesMap.get(span.trace_id)!.push(span);
        }
      }
    }
  }
  // Case 2: TraceFlow single trace envelope: { trace_id, spans: [...] }
  else if (payload && (payload.trace_id || payload.traceId) && Array.isArray(payload.spans)) {
    const traceId = String(payload.trace_id || payload.traceId);
    const spansList: NormalizedSpan[] = [];
    const rootAttrs = payload.attributes || payload.resource || {};

    for (const s of payload.spans) {
      const sId = String(s.span_id || s.spanId);
      if (!sId) continue;
      const start = parseTimestamp(s.start_time || s.startTime);
      const end = parseTimestamp(s.end_time || s.endTime || start);
      const dur = s.duration != null ? Number(s.duration) : Math.max(0.1, Math.round((end - start) * 100) / 100);
      const status = (s.status === 'ERROR' || s.error === true) ? 'ERROR' : 'OK';

      spansList.push({
        span_id: sId,
        trace_id: traceId,
        parent_span_id: s.parent_span_id || s.parentSpanId || null,
        service_name: String(s.service_name || s.serviceName || 'unknown-service'),
        operation_name: String(s.operation_name || s.operationName || s.name || 'operation'),
        start_time: start,
        end_time: end >= start ? end : start + dur,
        duration: dur,
        status,
        status_message: s.status_message || s.statusMessage || (status === 'ERROR' ? 'Span marked as error' : undefined),
        attributes: { ...rootAttrs, ...(s.attributes || {}) },
        events: Array.isArray(s.events) ? s.events.map((e: any) => ({
          name: e.name || 'event',
          timestamp: parseTimestamp(e.timestamp),
          attributes: e.attributes || {}
        })) : []
      });
    }
    tracesMap.set(traceId, spansList);
  }
  // Case 3: Array of traces or array of raw spans
  else if (Array.isArray(payload)) {
    for (const item of payload) {
      if (item && item.spans && (item.trace_id || item.traceId)) {
        const sub = normalizeIncomingPayload(item, isDemo);
        for (const t of sub) {
          if (!tracesMap.has(t.trace_id)) tracesMap.set(t.trace_id, []);
          tracesMap.get(t.trace_id)!.push(...t.spans);
        }
      } else if (item && (item.span_id || item.spanId) && (item.trace_id || item.traceId)) {
        const tId = String(item.trace_id || item.traceId);
        const sId = String(item.span_id || item.spanId);
        const start = parseTimestamp(item.start_time || item.startTime);
        const end = parseTimestamp(item.end_time || item.endTime || start);
        const dur = item.duration != null ? Number(item.duration) : Math.max(0.1, Math.round((end - start) * 100) / 100);
        const status = (item.status === 'ERROR' || item.error === true) ? 'ERROR' : 'OK';

        const span: NormalizedSpan = {
          span_id: sId,
          trace_id: tId,
          parent_span_id: item.parent_span_id || item.parentSpanId || null,
          service_name: String(item.service_name || item.serviceName || 'unknown-service'),
          operation_name: String(item.operation_name || item.operationName || item.name || 'operation'),
          start_time: start,
          end_time: end >= start ? end : start + dur,
          duration: dur,
          status,
          status_message: item.status_message || (status === 'ERROR' ? 'Span marked as error' : undefined),
          attributes: item.attributes || {},
          events: Array.isArray(item.events) ? item.events : []
        };
        if (!tracesMap.has(tId)) tracesMap.set(tId, []);
        tracesMap.get(tId)!.push(span);
      }
    }
  }

  const result: { trace_id: string; spans: NormalizedSpan[] }[] = [];
  for (const [trace_id, spans] of tracesMap.entries()) {
    if (spans.length > 0) {
      result.push({ trace_id, spans });
    }
  }
  return result;
}

// Ingestion statement prepared
const insertTraceStmt = db.prepare(`
  INSERT INTO traces (trace_id, start_time, end_time, duration, status, root_service, span_count, error_count, is_demo, created_at)
  VALUES (@trace_id, @start_time, @end_time, @duration, @status, @root_service, @span_count, @error_count, @is_demo, @created_at)
  ON CONFLICT(trace_id) DO UPDATE SET
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    duration = excluded.duration,
    status = excluded.status,
    root_service = excluded.root_service,
    span_count = excluded.span_count,
    error_count = excluded.error_count,
    is_demo = excluded.is_demo
`);

const insertSpanStmt = db.prepare(`
  INSERT INTO spans (span_id, trace_id, parent_span_id, service_name, operation_name, start_time, end_time, duration, status, status_message, attributes, events, is_demo)
  VALUES (@span_id, @trace_id, @parent_span_id, @service_name, @operation_name, @start_time, @end_time, @duration, @status, @status_message, @attributes, @events, @is_demo)
  ON CONFLICT(span_id) DO UPDATE SET
    parent_span_id = excluded.parent_span_id,
    service_name = excluded.service_name,
    operation_name = excluded.operation_name,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    duration = excluded.duration,
    status = excluded.status,
    status_message = excluded.status_message,
    attributes = excluded.attributes,
    events = excluded.events,
    is_demo = excluded.is_demo
`);

function saveNormalizedTraces(normalizedList: { trace_id: string; spans: NormalizedSpan[] }[], isDemo: boolean = false): { ingestedTraces: number; ingestedSpans: number; traceIds: string[] } {
  let ingestedTraces = 0;
  let ingestedSpans = 0;
  const traceIds: string[] = [];

  const runTx = db.transaction(() => {
    for (const item of normalizedList) {
      const { trace_id, spans } = item;
      if (spans.length === 0) continue;

      let minStart = Infinity;
      let maxEnd = -Infinity;
      let hasError = false;
      let errorCount = 0;

      // Identify root service: span without parent_span_id or earliest start_time
      let rootSpan = spans.find(s => !s.parent_span_id);
      if (!rootSpan) {
        rootSpan = spans.reduce((prev, curr) => curr.start_time < prev.start_time ? curr : prev, spans[0]);
      }

      for (const s of spans) {
        if (s.start_time < minStart) minStart = s.start_time;
        if (s.end_time > maxEnd) maxEnd = s.end_time;
        if (s.status === 'ERROR') {
          hasError = true;
          errorCount++;
        }
      }

      const totalDuration = Math.max(0.1, Math.round((maxEnd - minStart) * 100) / 100);

      insertTraceStmt.run({
        trace_id,
        start_time: minStart,
        end_time: maxEnd,
        duration: totalDuration,
        status: hasError ? 'ERROR' : 'OK',
        root_service: rootSpan.service_name,
        span_count: spans.length,
        error_count: errorCount,
        is_demo: isDemo ? 1 : 0,
        created_at: Date.now()
      });

      for (const s of spans) {
        insertSpanStmt.run({
          span_id: s.span_id,
          trace_id: s.trace_id,
          parent_span_id: s.parent_span_id,
          service_name: s.service_name,
          operation_name: s.operation_name,
          start_time: s.start_time,
          end_time: s.end_time,
          duration: s.duration,
          status: s.status,
          status_message: s.status_message || null,
          attributes: JSON.stringify(s.attributes || {}),
          events: JSON.stringify(s.events || []),
          is_demo: isDemo ? 1 : 0
        });
        ingestedSpans++;
      }

      ingestedTraces++;
      traceIds.push(trace_id);
    }
  });

  runTx();
  return { ingestedTraces, ingestedSpans, traceIds };
}

// Percentile helper
function calculatePercentiles(values: number[]): { p50: number; p95: number; p99: number; avg: number } {
  if (values.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const getP = (p: number) => {
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return Math.round(sorted[idx] * 100) / 100;
  };
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    p50: getP(50),
    p95: getP(95),
    p99: getP(99),
    avg: Math.round((sum / sorted.length) * 100) / 100
  };
}

// --- Demo Trace Generator Engine ---
class DemoGenerator {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private intervalMs: number = 3000;
  private errorRatePercent: number = 20;
  private generatedCount: number = 0;
  private onGeneratedCallback?: (trace: any) => void;

  constructor(cb?: (trace: any) => void) {
    this.onGeneratedCallback = cb;
  }

  setCallback(cb: (trace: any) => void) {
    this.onGeneratedCallback = cb;
  }

  getStatus() {
    return {
      running: this.isRunning,
      interval_ms: this.intervalMs,
      error_rate: this.errorRatePercent,
      generated_count: this.generatedCount
    };
  }

  start(intervalMs: number = 3000, errorRate: number = 20) {
    this.intervalMs = Math.max(1000, intervalMs);
    this.errorRatePercent = Math.min(100, Math.max(0, errorRate));
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => {
      this.generateSyntheticTrace();
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  generateSyntheticTrace(forceScenario?: 'normal' | 'payment_timeout' | 'auth_expired' | 'db_deadlock') {
    const isError = forceScenario ? forceScenario !== 'normal' : (Math.random() * 100 < this.errorRatePercent);
    const traceId = 'demo_' + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
    const now = Date.now();

    const scenario = forceScenario || (isError ? (Math.random() < 0.5 ? 'payment_timeout' : (Math.random() < 0.5 ? 'auth_expired' : 'db_deadlock')) : 'normal');

    const spans: NormalizedSpan[] = [];
    const rootSpanId = 'span_gw_' + Math.random().toString(16).substring(2, 10);
    const authSpanId = 'span_auth_' + Math.random().toString(16).substring(2, 10);
    const orderSpanId = 'span_ord_' + Math.random().toString(16).substring(2, 10);
    const paymentSpanId = 'span_pay_' + Math.random().toString(16).substring(2, 10);
    const dbSpanId = 'span_db_' + Math.random().toString(16).substring(2, 10);

    const endpoints = ['/api/v1/checkout', '/api/v1/orders', '/api/v1/cart/commit', '/api/v1/subscriptions/renew'];
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

    let currentT = now;

    // 1. Root Gateway Span
    let gwDuration = 180 + Math.random() * 150;
    if (scenario === 'payment_timeout') gwDuration = 3200 + Math.random() * 800;

    const rootSpan: NormalizedSpan = {
      span_id: rootSpanId,
      trace_id: traceId,
      parent_span_id: null,
      service_name: 'api-gateway',
      operation_name: `HTTP POST ${endpoint}`,
      start_time: currentT,
      end_time: currentT + gwDuration,
      duration: Math.round(gwDuration * 10) / 10,
      status: isError ? 'ERROR' : 'OK',
      status_message: isError ? `Request failed: ${scenario}` : undefined,
      attributes: {
        'http.method': 'POST',
        'http.target': endpoint,
        'http.status_code': scenario === 'auth_expired' ? 401 : (scenario === 'payment_timeout' ? 504 : (scenario === 'db_deadlock' ? 500 : 200)),
        'client.ip': '192.168.1.' + Math.floor(Math.random() * 250),
        'demo.tag': 'DEMO DATA'
      },
      events: [
        { name: 'request_start', timestamp: currentT, attributes: { engine: 'envoy-v1.30' } }
      ]
    };
    spans.push(rootSpan);

    // 2. Auth Service Span
    const authStart = currentT + 12;
    const authDur = 25 + Math.random() * 20;
    const authIsError = scenario === 'auth_expired';
    spans.push({
      span_id: authSpanId,
      trace_id: traceId,
      parent_span_id: rootSpanId,
      service_name: 'auth-service',
      operation_name: 'RPC VerifyToken',
      start_time: authStart,
      end_time: authStart + authDur,
      duration: Math.round(authDur * 10) / 10,
      status: authIsError ? 'ERROR' : 'OK',
      status_message: authIsError ? 'TokenExpired: JWT expired 14 seconds ago' : undefined,
      attributes: {
        'rpc.service': 'AuthService',
        'auth.token_type': 'Bearer',
        'error': authIsError,
        'demo.tag': 'DEMO DATA'
      },
      events: authIsError ? [
        { name: 'exception', timestamp: authStart + authDur, attributes: { 'exception.type': 'TokenExpiredError', 'exception.message': 'Signature verification failed' } }
      ] : []
    });

    // If Auth failed, don't cascade down
    if (!authIsError) {
      // 3. Order Service Span
      const orderStart = authStart + authDur + 8;
      let orderDur = 110 + Math.random() * 80;
      if (scenario === 'payment_timeout') orderDur = 2900 + Math.random() * 200;
      const orderIsError = scenario === 'payment_timeout' || scenario === 'db_deadlock';

      spans.push({
        span_id: orderSpanId,
        trace_id: traceId,
        parent_span_id: rootSpanId,
        service_name: 'order-service',
        operation_name: 'OrderProcessor.Create',
        start_time: orderStart,
        end_time: orderStart + orderDur,
        duration: Math.round(orderDur * 10) / 10,
        status: orderIsError ? 'ERROR' : 'OK',
        status_message: orderIsError ? `Order failed due to downstream ${scenario}` : undefined,
        attributes: {
          'order.id': 'ORD-' + Math.floor(100000 + Math.random() * 900000),
          'order.total_usd': (Math.random() * 300 + 20).toFixed(2),
          'demo.tag': 'DEMO DATA'
        },
        events: []
      });

      // 4. Payment Service Span
      const payStart = orderStart + 15;
      let payDur = 65 + Math.random() * 40;
      const payIsError = scenario === 'payment_timeout';
      if (payIsError) payDur = 2800;

      spans.push({
        span_id: paymentSpanId,
        trace_id: traceId,
        parent_span_id: orderSpanId,
        service_name: 'payment-service',
        operation_name: 'POST /v1/charges',
        start_time: payStart,
        end_time: payStart + payDur,
        duration: Math.round(payDur * 10) / 10,
        status: payIsError ? 'ERROR' : 'OK',
        status_message: payIsError ? 'SocketTimeout: Stripe API call timed out after 2800ms' : undefined,
        attributes: {
          'payment.provider': 'Stripe',
          'payment.method': 'card',
          'error': payIsError,
          'demo.tag': 'DEMO DATA'
        },
        events: payIsError ? [
          { name: 'exception', timestamp: payStart + payDur, attributes: { 'exception.type': 'TimeoutError', 'exception.message': 'Upstream gateway unresponsive' } }
        ] : []
      });

      // 5. Database Span
      if (!payIsError) {
        const dbStart = payStart + payDur + 10;
        const dbDur = scenario === 'db_deadlock' ? 450 : (15 + Math.random() * 30);
        const dbIsError = scenario === 'db_deadlock';

        spans.push({
          span_id: dbSpanId,
          trace_id: traceId,
          parent_span_id: orderSpanId,
          service_name: 'postgres-db',
          operation_name: 'INSERT INTO orders_ledger',
          start_time: dbStart,
          end_time: dbStart + dbDur,
          duration: Math.round(dbDur * 10) / 10,
          status: dbIsError ? 'ERROR' : 'OK',
          status_message: dbIsError ? 'DeadlockDetected: process 4812 acquired conflicting lock' : undefined,
          attributes: {
            'db.system': 'postgresql',
            'db.table': 'orders_ledger',
            'error': dbIsError,
            'demo.tag': 'DEMO DATA'
          },
          events: dbIsError ? [
            { name: 'exception', timestamp: dbStart + dbDur, attributes: { 'exception.type': 'DeadlockException', 'exception.message': 'Transaction aborted due to deadlock' } }
          ] : []
        });
      }
    }

    const saved = saveNormalizedTraces([{ trace_id: traceId, spans }], true);
    this.generatedCount++;

    if (this.onGeneratedCallback) {
      this.onGeneratedCallback({
        trace_id: traceId,
        start_time: rootSpan.start_time,
        duration: rootSpan.duration,
        status: rootSpan.status,
        root_service: rootSpan.service_name,
        span_count: spans.length,
        is_demo: 1
      });
    }

    return { trace_id: traceId, span_count: spans.length, status: rootSpan.status, scenario };
  }
}

// Seed Initial Sample Traces if DB is empty
function seedSampleDataIfEmpty() {
  const row = db.prepare('SELECT COUNT(*) as count FROM traces').get() as { count: number };
  if (row.count === 0) {
    try {
      const normalFile = path.resolve(process.cwd(), 'sample_data/normal_trace.json');
      const errorFile = path.resolve(process.cwd(), 'sample_data/error_trace.json');

      if (fs.existsSync(normalFile)) {
        const normalData = JSON.parse(fs.readFileSync(normalFile, 'utf8'));
        const normalized = normalizeIncomingPayload(normalData, false);
        saveNormalizedTraces(normalized, false);
      }
      if (fs.existsSync(errorFile)) {
        const errorData = JSON.parse(fs.readFileSync(errorFile, 'utf8'));
        const normalized = normalizeIncomingPayload(errorData, false);
        saveNormalizedTraces(normalized, false);
      }
      console.log('Seeded sample traces into traceflow.db');
    } catch (err) {
      console.error('Error seeding sample traces:', err);
    }
  }
}

seedSampleDataIfEmpty();

// --- Express App & Routes Setup ---
const app = express();
const server = createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws/live' });

const liveClients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  liveClients.add(ws);

  // Send initial welcome message with current summary
  const summary = getOverviewSummary();
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'TraceFlow Live WebSocket Connected',
    timestamp: Date.now(),
    client_count: liveClients.size,
    summary
  }));

  ws.on('message', (message: string) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch {
      // ignore
    }
  });

  ws.on('close', () => {
    liveClients.delete(ws);
  });
});

function broadcastLiveEvent(event: any) {
  const payload = JSON.stringify(event);
  for (const client of liveClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

const demoGen = new DemoGenerator((traceMeta) => {
  broadcastLiveEvent({
    type: 'new_trace',
    trace: traceMeta,
    stats: getOverviewSummary()
  });
});

function getOverviewSummary() {
  const totalTraces = (db.prepare('SELECT COUNT(*) as c FROM traces').get() as any).c;
  const totalSpans = (db.prepare('SELECT COUNT(*) as c FROM spans').get() as any).c;
  const errorTraces = (db.prepare("SELECT COUNT(*) as c FROM traces WHERE status = 'ERROR'").get() as any).c;
  const errorRate = totalTraces > 0 ? Math.round((errorTraces / totalTraces) * 1000) / 10 : 0;

  const latencies = (db.prepare('SELECT duration FROM traces ORDER BY duration ASC').all() as any[]).map(r => r.duration);
  const percentiles = calculatePercentiles(latencies);

  return {
    total_traces: totalTraces,
    total_spans: totalSpans,
    error_traces: errorTraces,
    error_rate: errorRate,
    avg_latency: percentiles.avg,
    p50_latency: percentiles.p50,
    p95_latency: percentiles.p95,
    p99_latency: percentiles.p99
  };
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- API Endpoints ---

// 1. Ingest Traces (JSON body)
app.post('/api/traces/ingest', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || (typeof payload !== 'object' && !Array.isArray(payload))) {
      return res.status(400).json({ error: 'Invalid JSON payload. Expected trace object or array.' });
    }

    const normalized = normalizeIncomingPayload(payload, false);
    if (normalized.length === 0) {
      return res.status(400).json({
        error: 'No valid traces detected in payload. Ensure each span contains trace_id and span_id.'
      });
    }

    const { ingestedTraces, ingestedSpans, traceIds } = saveNormalizedTraces(normalized, false);

    // Broadcast to WS clients
    broadcastLiveEvent({
      type: 'ingested',
      count: ingestedTraces,
      trace_ids: traceIds,
      stats: getOverviewSummary()
    });

    return res.status(201).json({
      success: true,
      ingested_traces: ingestedTraces,
      ingested_spans: ingestedSpans,
      trace_ids: traceIds
    });
  } catch (err: any) {
    console.error('Ingest error:', err);
    return res.status(500).json({ error: 'Failed to ingest traces: ' + err.message });
  }
});

// 2. Upload Traces (Alias/File upload)
app.post('/api/traces/upload', (req: Request, res: Response) => {
  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      payload = JSON.parse(payload);
    }
    const normalized = normalizeIncomingPayload(payload, false);
    if (normalized.length === 0) {
      return res.status(400).json({ error: 'No valid traces found in uploaded file/payload.' });
    }
    const result = saveNormalizedTraces(normalized, false);
    broadcastLiveEvent({
      type: 'ingested',
      count: result.ingestedTraces,
      trace_ids: result.traceIds,
      stats: getOverviewSummary()
    });
    return res.status(201).json({
      success: true,
      ...result
    });
  } catch (err: any) {
    return res.status(400).json({ error: 'Failed to parse uploaded data: ' + err.message });
  }
});

// 3. Query Traces (List with filters & pagination)
app.get('/api/traces', (req: Request, res: Response) => {
  try {
    const {
      search,
      service,
      status,
      min_duration,
      max_duration,
      is_demo,
      sort_by = 'start_time',
      order = 'DESC',
      limit = '25',
      offset = '0'
    } = req.query;

    const conditions: string[] = [];
    const params: Record<string, any> = {};

    if (search) {
      conditions.push('(trace_id LIKE @search OR root_service LIKE @search)');
      params.search = `%${search}%`;
    }
    if (service && service !== 'ALL') {
      conditions.push('root_service = @service');
      params.service = service;
    }
    if (status && status !== 'ALL') {
      conditions.push('status = @status');
      params.status = status;
    }
    if (min_duration) {
      conditions.push('duration >= @min_duration');
      params.min_duration = Number(min_duration);
    }
    if (max_duration) {
      conditions.push('duration <= @max_duration');
      params.max_duration = Number(max_duration);
    }
    if (is_demo !== undefined && is_demo !== 'ALL') {
      conditions.push('is_demo = @is_demo');
      params.is_demo = is_demo === '1' || is_demo === 'true' ? 1 : 0;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';
    const safeSort = ['start_time', 'duration', 'span_count'].includes(String(sort_by)) ? sort_by : 'start_time';

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM traces ${whereClause}`).get(params) as { total: number };
    const query = `
      SELECT trace_id, start_time, end_time, duration, status, root_service, span_count, error_count, is_demo
      FROM traces
      ${whereClause}
      ORDER BY ${safeSort} ${safeOrder}
      LIMIT @limit OFFSET @offset
    `;

    params.limit = Math.min(100, Math.max(1, Number(limit) || 25));
    params.offset = Math.max(0, Number(offset) || 0);

    const rows = db.prepare(query).all(params);

    return res.json({
      total: countRow.total,
      limit: params.limit,
      offset: params.offset,
      traces: rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Trace Details & Hierarchical Span Tree
app.get('/api/traces/:trace_id', (req: Request, res: Response) => {
  try {
    const { trace_id } = req.params;
    const trace = db.prepare('SELECT * FROM traces WHERE trace_id = ?').get(trace_id);
    if (!trace) {
      return res.status(404).json({ error: `Trace ${trace_id} not found.` });
    }

    const rawSpans = db.prepare('SELECT * FROM spans WHERE trace_id = ? ORDER BY start_time ASC').all(trace_id) as any[];

    // Parse attributes and events JSON
    const spans = rawSpans.map(s => ({
      ...s,
      attributes: JSON.parse(s.attributes || '{}'),
      events: JSON.parse(s.events || '[]')
    }));

    // Build hierarchy tree
    const spanMap = new Map<string, any>();
    spans.forEach(s => {
      spanMap.set(s.span_id, { ...s, children: [] });
    });

    const rootSpans: any[] = [];
    spanMap.forEach(s => {
      if (s.parent_span_id && spanMap.has(s.parent_span_id)) {
        spanMap.get(s.parent_span_id).children.push(s);
      } else {
        rootSpans.push(s);
      }
    });

    // Extract unique services involved
    const services = Array.from(new Set(spans.map(s => s.service_name)));

    return res.json({
      trace,
      services,
      spans,
      span_tree: rootSpans
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Services List
app.get('/api/services', (_req: Request, res: Response) => {
  try {
    const serviceRows = db.prepare(`
      SELECT 
        service_name,
        COUNT(*) as span_count,
        SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as error_count,
        AVG(duration) as avg_latency
      FROM spans
      GROUP BY service_name
      ORDER BY span_count DESC
    `).all() as any[];

    const services = serviceRows.map(s => {
      const latencies = (db.prepare('SELECT duration FROM spans WHERE service_name = ? ORDER BY duration ASC').all(s.service_name) as any[]).map(r => r.duration);
      const percentiles = calculatePercentiles(latencies);
      const errorRate = s.span_count > 0 ? Math.round((s.error_count / s.span_count) * 1000) / 10 : 0;

      let health: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (errorRate > 5) health = 'critical';
      else if (errorRate > 1 || percentiles.p95 > 1000) health = 'warning';

      return {
        service_name: s.service_name,
        request_count: s.span_count,
        error_count: s.error_count,
        error_rate: errorRate,
        average_latency: percentiles.avg,
        p50_latency: percentiles.p50,
        p95_latency: percentiles.p95,
        p99_latency: percentiles.p99,
        health
      };
    });

    return res.json({ services });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Service Deep Dive
app.get('/api/services/:service_name', (req: Request, res: Response) => {
  try {
    const { service_name } = req.params;

    const spans = db.prepare(`
      SELECT * FROM spans WHERE service_name = ? ORDER BY start_time DESC LIMIT 100
    `).all(service_name) as any[];

    if (spans.length === 0) {
      return res.status(404).json({ error: `Service '${service_name}' not found.` });
    }

    const latencies = spans.map(s => s.duration);
    const percentiles = calculatePercentiles(latencies);
    const errorCount = spans.filter(s => s.status === 'ERROR').length;
    const errorRate = Math.round((errorCount / spans.length) * 1000) / 10;

    // Distinct operations
    const operations = db.prepare(`
      SELECT operation_name, COUNT(*) as count, AVG(duration) as avg_dur, SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as errors
      FROM spans WHERE service_name = ?
      GROUP BY operation_name
      ORDER BY count DESC
    `).all(service_name);

    // Callers (upstream services)
    const upstream = db.prepare(`
      SELECT p.service_name as caller, COUNT(*) as call_count
      FROM spans c
      JOIN spans p ON c.parent_span_id = p.span_id
      WHERE c.service_name = ? AND p.service_name != ?
      GROUP BY p.service_name
    `).all(service_name, service_name);

    // Dependencies (downstream services)
    const downstream = db.prepare(`
      SELECT c.service_name as dependency, COUNT(*) as call_count
      FROM spans p
      JOIN spans c ON c.parent_span_id = p.span_id
      WHERE p.service_name = ? AND c.service_name != ?
      GROUP BY c.service_name
    `).all(service_name, service_name);

    return res.json({
      service_name,
      total_spans: spans.length,
      error_count: errorCount,
      error_rate: errorRate,
      percentiles,
      operations,
      upstream,
      downstream,
      recent_spans: spans.slice(0, 20).map(s => ({
        ...s,
        attributes: JSON.parse(s.attributes || '{}')
      }))
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Analytics Overview
app.get('/api/analytics/overview', (_req: Request, res: Response) => {
  try {
    const summary = getOverviewSummary();

    // Volume over time (grouped into 10 intervals)
    const timeBuckets = db.prepare(`
      SELECT 
        (start_time / 60000) * 60000 as bucket_time,
        COUNT(*) as total_traces,
        SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as error_traces,
        AVG(duration) as avg_duration
      FROM traces
      GROUP BY bucket_time
      ORDER BY bucket_time DESC
      LIMIT 15
    `).all().reverse();

    // Latency Distribution histogram
    const latencyBuckets = [
      { range: '0-50ms', count: 0 },
      { range: '50-100ms', count: 0 },
      { range: '100-250ms', count: 0 },
      { range: '250-500ms', count: 0 },
      { range: '500ms-1s', count: 0 },
      { range: '>1s', count: 0 }
    ];

    const allDurations = (db.prepare('SELECT duration FROM traces').all() as any[]).map(r => r.duration);
    for (const d of allDurations) {
      if (d <= 50) latencyBuckets[0].count++;
      else if (d <= 100) latencyBuckets[1].count++;
      else if (d <= 250) latencyBuckets[2].count++;
      else if (d <= 500) latencyBuckets[3].count++;
      else if (d <= 1000) latencyBuckets[4].count++;
      else latencyBuckets[5].count++;
    }

    // Slowest services
    const slowestServices = db.prepare(`
      SELECT service_name, AVG(duration) as avg_lat, MAX(duration) as max_lat, COUNT(*) as count
      FROM spans
      GROUP BY service_name
      ORDER BY avg_lat DESC
      LIMIT 5
    `).all();

    // Most active services
    const activeServices = db.prepare(`
      SELECT service_name, COUNT(*) as count, SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as errors
      FROM spans
      GROUP BY service_name
      ORDER BY count DESC
      LIMIT 5
    `).all();

    return res.json({
      summary,
      time_buckets: timeBuckets,
      latency_buckets: latencyBuckets,
      slowest_services: slowestServices,
      active_services: activeServices
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Analytics Latency
app.get('/api/analytics/latency', (_req: Request, res: Response) => {
  try {
    const latencies = (db.prepare('SELECT duration FROM traces ORDER BY duration ASC').all() as any[]).map(r => r.duration);
    const overall = calculatePercentiles(latencies);

    const serviceLatencies = db.prepare(`
      SELECT service_name, duration FROM spans ORDER BY duration ASC
    `).all() as any[];

    const serviceGroup: Record<string, number[]> = {};
    for (const s of serviceLatencies) {
      if (!serviceGroup[s.service_name]) serviceGroup[s.service_name] = [];
      serviceGroup[s.service_name].push(s.duration);
    }

    const perService = Object.keys(serviceGroup).map(name => ({
      service_name: name,
      count: serviceGroup[name].length,
      ...calculatePercentiles(serviceGroup[name])
    })).sort((a, b) => b.p95 - a.p95);

    return res.json({
      overall,
      per_service: perService
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 9. Analytics Errors
app.get('/api/analytics/errors', (_req: Request, res: Response) => {
  try {
    const errorSpans = db.prepare(`
      SELECT span_id, trace_id, parent_span_id, service_name, operation_name, start_time, duration, status_message, attributes, events
      FROM spans
      WHERE status = 'ERROR'
      ORDER BY start_time DESC
      LIMIT 50
    `).all() as any[];

    const serviceErrors = db.prepare(`
      SELECT service_name, COUNT(*) as error_count
      FROM spans
      WHERE status = 'ERROR'
      GROUP BY service_name
      ORDER BY error_count DESC
    `).all();

    const formattedSpans = errorSpans.map(s => {
      const attrs = JSON.parse(s.attributes || '{}');
      const events = JSON.parse(s.events || '[]');
      let errorMsg = s.status_message || attrs['error.message'] || attrs['exception.message'] || attrs['status_message'];

      if (!errorMsg && events.length > 0) {
        const exEvent = events.find((e: any) => e.name === 'exception' || e.attributes?.['exception.message']);
        if (exEvent) {
          errorMsg = exEvent.attributes?.['exception.message'] || exEvent.name;
        }
      }

      return {
        ...s,
        error_message: errorMsg || 'Unknown error occurred',
        attributes: attrs,
        events
      };
    });

    return res.json({
      total_error_spans: formattedSpans.length,
      by_service: serviceErrors,
      failed_spans: formattedSpans
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 10. Service Dependency Graph
app.get('/api/dependencies', (_req: Request, res: Response) => {
  try {
    // Collect all nodes
    const serviceRows = db.prepare(`
      SELECT service_name, COUNT(*) as span_count, SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as error_count, AVG(duration) as avg_latency
      FROM spans
      GROUP BY service_name
    `).all() as any[];

    const nodes = serviceRows.map(s => ({
      id: s.service_name,
      name: s.service_name,
      request_count: s.span_count,
      error_count: s.error_count,
      error_rate: s.span_count > 0 ? Math.round((s.error_count / s.span_count) * 1000) / 10 : 0,
      avg_latency: Math.round(s.avg_latency * 10) / 10
    }));

    // Find parent-to-child edges across distinct services
    const edgeRows = db.prepare(`
      SELECT 
        p.service_name as source,
        c.service_name as target,
        COUNT(*) as call_count,
        SUM(CASE WHEN c.status = 'ERROR' THEN 1 ELSE 0 END) as error_count,
        AVG(c.duration) as avg_latency
      FROM spans c
      JOIN spans p ON c.parent_span_id = p.span_id
      WHERE p.service_name != c.service_name
      GROUP BY source, target
      ORDER BY call_count DESC
    `).all() as any[];

    const edges = edgeRows.map(e => ({
      source: e.source,
      target: e.target,
      call_count: e.call_count,
      error_count: e.error_count,
      error_rate: e.call_count > 0 ? Math.round((e.error_count / e.call_count) * 1000) / 10 : 0,
      avg_latency: Math.round(e.avg_latency * 10) / 10
    }));

    return res.json({ nodes, edges });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 11. Demo Controller Endpoints
app.get('/api/demo/status', (_req: Request, res: Response) => {
  return res.json(demoGen.getStatus());
});

app.post('/api/demo/start', (req: Request, res: Response) => {
  const { interval_ms = 3000, error_rate = 20 } = req.body;
  demoGen.start(Number(interval_ms), Number(error_rate));
  return res.json({ success: true, status: demoGen.getStatus() });
});

app.post('/api/demo/stop', (_req: Request, res: Response) => {
  demoGen.stop();
  return res.json({ success: true, status: demoGen.getStatus() });
});

app.post('/api/demo/generate-one', (req: Request, res: Response) => {
  const { scenario } = req.body;
  const result = demoGen.generateSyntheticTrace(scenario);
  return res.json({ success: true, result });
});

app.delete('/api/demo/purge', (_req: Request, res: Response) => {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM spans WHERE is_demo = 1').run();
    db.prepare('DELETE FROM traces WHERE is_demo = 1').run();
  });
  tx();
  broadcastLiveEvent({
    type: 'purged_demo',
    stats: getOverviewSummary()
  });
  return res.json({ success: true, message: 'All demo traces purged successfully.' });
});

// Purge all traces (for dev clean state)
app.delete('/api/traces', (_req: Request, res: Response) => {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM spans').run();
    db.prepare('DELETE FROM traces').run();
  });
  tx();
  broadcastLiveEvent({
    type: 'purged_all',
    stats: getOverviewSummary()
  });
  return res.json({ success: true, message: 'All traces purged.' });
});

// Sample traces download/fetch
app.get('/api/sample/:type', (req: Request, res: Response) => {
  const { type } = req.params;
  const fileName = type === 'error' ? 'sample_data/error_trace.json' : 'sample_data/normal_trace.json';
  const filePath = path.resolve(process.cwd(), fileName);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  return res.status(404).json({ error: 'Sample file not found' });
});

// --- Vite Middleware Integration for Dev / Static Files in Prod ---
async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`TraceFlow server running on http://0.0.0.0:${PORT}`);
    console.log(`WebSocket live monitoring active at ws://0.0.0.0:${PORT}/ws/live`);
  });
}

startServer().catch(err => {
  console.error('Failed to start TraceFlow server:', err);
});
