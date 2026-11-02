# TraceFlow

> **Distributed Systems Observability & Distributed Tracing Platform**

TraceFlow is a high-performance distributed tracing and observability platform built for modern microservice architectures. It enables software engineers, SREs, and DevOps teams to understand how transactions travel across complex distributed services, pinpoint latency bottlenecks, investigate cascade failures, and visualize real-time service dependencies.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Directory Structure](#directory-structure)
- [Getting Started](#getting-started)
  - [Option A: Full-Stack Web Application (Node / TypeScript)](#option-a-full-stack-web-application-node--typescript)
  - [Option B: Python FastAPI Standalone Backend (Windows 11 / Linux / macOS)](#option-b-python-fastapi-standalone-backend-windows-11--linux--macos)
- [Running Automated Tests](#running-automated-tests)
- [OpenTelemetry & Data Ingestion](#opentelemetry--data-ingestion)
- [REST API Reference](#rest-api-reference)
- [Live WebSocket Telemetry](#live-websocket-telemetry)
- [Synthetic Demo Traffic Engine](#synthetic-demo-traffic-engine)
- [Contributing & License](#contributing--license)

---

## Overview

Modern cloud-native applications comprise dozens or hundreds of independent microservices communicating over HTTP, gRPC, and asynchronous message queues. When a user action slows down or fails, diagnosing which specific service or query caused the bottleneck is exceptionally challenging without distributed tracing.

TraceFlow provides complete visibility across distributed transaction paths by collecting, indexing, and visualizing causal span relationships following OpenTelemetry standards.

---

## Key Features

### 1. Distributed Trace Explorer
- **Search & Multi-Filter**: Query traces instantly by Trace ID, root service name, status (`OK` / `ERROR`), duration thresholds (`min` and `max` ms), and dataset origin (Real Ingested vs Synthetic Demo).
- **Sorting & Pagination**: Sort by newest, oldest, longest duration, or highest span count with responsive pagination.
- **Visual Duration Bars**: Quick-scan duration bars provide instant relative latency comparison across rows.
- **One-Click Jump**: Seamless navigation between list views and deep span waterfalls.

### 2. Interactive Waterfall Timeline
- **Precise Timing Engine**: Renders horizontal duration bars using actual trace start times, relative offsets, and span durations.
- **Service Color Coding**: Consistent, distinct color palettes across microservices (`api-gateway`, `auth-service`, `order-service`, `payment-service`, `postgres-db`, `redis-cache`).
- **Parent-Child Hierarchy Tree**: Nested tree layout showing span caller/callee relationships with expand and collapse controls.
- **Zoom Controls**: Interactive Zoom In (`+`), Zoom Out (`-`), and Reset (`100%`) to inspect millisecond-level micro-operations.
- **Deep Span Drawer**: Slide-in inspector detailing Span ID, Parent ID, Start/End UTC timestamps, formatted Key-Value attributes, and event logs with stack traces.

### 3. Service Dependency Map (DAG)
- **SVG Topological Topology**: Interactive directed acyclic graph (DAG) automatically computed from span parent-child relationships.
- **Directed Causal Edges**: Visual connection pathways with request throughput counts, average latency badges, and animated data flow particles.
- **SLA Health Rings**: Real-time error rate indicators per node:
  - Healthy: `< 1%` error rate
  - Warning: `1% - 5%` error rate
  - Critical: `> 5%` error rate
- **Service Flyout Inspector**: Slide-over panel revealing upstream callers, downstream dependencies, top operations, and P50/P95/P99 latency metrics.

### 4. Performance & Percentile Analytics
- **Percentile Engine**: Accurate statistical calculations for P50 (median), P95, and P99 latency.
- **Trace Volume Timeline**: SVG bar chart showing time-bucketed request volume segmented by successful and failed traces.
- **Latency Distribution Histogram**: Categorized duration buckets (`0-50ms`, `50-100ms`, `100-250ms`, `250-500ms`, `500ms-1s`, `>1s`).
- **Ranked Service Breakdown**: Real-time leaderboards of highest-throughput and slowest services.

### 5. Error Investigation & Root Cause Analyzer
- **Cascade Failure Tracking**: Trace downstream error propagation (e.g. Stripe API timeout in `payment-service` triggering a timeout exception in `order-service`, resulting in an HTTP 504 at `api-gateway`).
- **Exception & Log Extraction**: Direct extraction of error messages, exception types, and full stack traces from span attributes and events.
- **Error Distribution by Service**: Visual comparison of failure rates across microservices.

### 6. Live Stream Telemetry
- **Bidirectional WebSocket Bus**: Real-time event streaming (`/ws/live`) broadcasting incoming traces and ingestion events as they happen.
- **Live Activity Ticker**: Feed showing real-time timestamps, event types, root services, and duration stats.
- **Stream Controls**: Pause/resume stream toggles and manual stream clearing.

### 7. Synthetic Demo Traffic Engine
- **Microservice Simulation**: Simulates a production ecommerce microservice mesh:
  - `api-gateway`
  - `auth-service`
  - `user-service`
  - `order-service`
  - `payment-service`
  - `postgres-db`
  - `redis-cache`
- **Scenario Injection**: Test normal checkouts, Stripe payment timeouts, expired JWT authentication, and database deadlocks.
- **Isolated Dataset**: All synthetic traces are marked `is_demo = 1` and clearly labeled with `DEMO DATA` tags.
- **Clean Slate Purge**: Purge synthetic records anytime with one click without modifying imported data.

---

## Architecture & Tech Stack

```
                        ┌──────────────────────────────────────────────┐
                        │              Client Browser                  │
                        │  (HTML5 / CSS3 / Vanilla JavaScript / SVG)   │
                        └──────▲───────────────────────────────▲───────┘
                               │ HTTP REST API                 │ WebSocket
                               │ (/api/*)                      │ (/ws/live)
                        ┌──────▼───────────────────────────────▼───────┐
                        │             TraceFlow Server                 │
                        │      FastAPI / Express + SQLite (WAL)        │
                        └──────┬───────────────────────────────┬───────┘
                               │                               │
                ┌──────────────▼─────────────┐   ┌─────────────▼──────────────┐
                │   OTel Ingestion Engine    │   │  Analytics & DAG Generator │
                │  - Timestamp normalization │   │  - Percentiles (P50/95/99) │
                │  - Hierarchy tree builder  │   │  - Service dependency graph│
                │  - Duplicate deduplication │   │  - Root cause detection    │
                └──────────────┬─────────────┘   └─────────────┬──────────────┘
                               │                               │
                        ┌──────▼───────────────────────────────▼───────┐
                        │             SQLite Database                  │
                        │    - traces (indexed by time, service)       │
                        │    - spans  (indexed by trace_id, parent_id) │
                        └──────────────────────────────────────────────┘
```

- **Frontend**: Clean Vanilla JavaScript (ES6+), HTML5, Tailwind CSS, SVG visualization engine. Zero frontend framework overhead.
- **Database**: SQLite in Write-Ahead Logging (`WAL`) mode with indexes on `trace_id`, `service_name`, `status`, `parent_span_id`, and `start_time`.
- **Backend**:
  - Full-stack Vite + Node/TypeScript engine running on port 3000.
  - Standalone Python 3.11+ / FastAPI backend in `traceflow/backend/`.

---

## Directory Structure

```
.
├── index.html                  # Main application entry point
├── package.json                # Node dependencies and scripts
├── server.ts                   # Full-stack server with SQLite and WebSockets
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite configuration
│
├── src/                        # Frontend source code
│   ├── app.ts                  # Application controller, router & WebSocket client
│   ├── index.css               # Design system & custom scrollbar styles
│   └── views/                  # Modular view controllers
│       ├── overview.ts         # High-level KPIs, timeline volume & latency charts
│       ├── traces.ts           # Trace Explorer, multi-parameter filters & pagination
│       ├── waterfall.ts        # Interactive Waterfall timeline, zoom & span drawer
│       ├── services.ts         # Service registry and percentile latency table
│       ├── dependencies.ts     # SVG Service Dependency Map (DAG)
│       ├── errors.ts           # Root-cause error cascade & stack trace inspector
│       ├── live.ts             # Live WebSocket stream monitoring feed
│       ├── ingest.ts           # Drag-and-drop JSON upload & sample loaders
│       └── settings.ts         # API documentation & maintenance controls
│
├── sample_data/                # Sample OpenTelemetry JSON traces
│   ├── normal_trace.json       # Multi-service checkout flow
│   └── error_trace.json        # Upstream gateway timeout cascade
│
└── traceflow/                  # Standalone Python FastAPI distribution
    ├── requirements.txt        # Python package dependencies
    ├── README.md               # PowerShell setup instructions
    ├── backend/
    │   ├── main.py             # FastAPI entry point, WebSockets & REST routers
    │   ├── database.py         # SQLite connection manager & migrations
    │   ├── models.py           # Data models
    │   ├── schemas.py          # Pydantic validation schemas
    │   ├── services/
    │   │   ├── ingestion.py    # OpenTelemetry normalization service
    │   │   ├── tracing.py      # Trace retrieval & span tree builder
    │   │   ├── analytics.py    # Percentile & distribution calculations
    │   │   └── dependencies.py # Service dependency DAG builder
    │   └── tests/
    │       └── test_api.py     # Automated pytest suite
    └── frontend/               # Standalone vanilla frontend assets
        ├── index.html
        ├── css/style.css
        └── js/
```

---

## Getting Started

### Option A: Full-Stack Web Application (Node / TypeScript)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open the application**:
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

### Option B: Python FastAPI Standalone Backend (Windows 11 / Linux / macOS)

#### Windows 11 PowerShell Setup

1. **Open PowerShell and navigate to `traceflow`**:
   ```powershell
   cd traceflow
   ```

2. **Create a Python virtual environment**:
   ```powershell
   python -m venv venv
   ```

3. **Activate the virtual environment**:
   ```powershell
   # If execution policy requires bypass for this session:
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

   .\venv\Scripts\Activate.ps1
   ```
   *(Your terminal prompt will display `(venv)`)*

4. **Install Python dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

5. **Start the FastAPI server**:
   ```powershell
   uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

6. **Open in browser**:
   Navigate to [http://localhost:8000](http://localhost:8000)

---

## Running Automated Tests

Run the complete test suite using `pytest`:

```bash
cd traceflow
pytest backend/tests/test_api.py -v
```

### Verified Test Cases:
- `test_valid_trace_ingestion`: Verifies OpenTelemetry trace structure ingestion.
- `test_missing_trace_id_fails`: Confirms 400 Bad Request rejection on invalid trace data.
- `test_duplicate_spans_handled_safely`: Validates idempotent span upserts without corrupted state.
- `test_nested_spans_and_dependency_graph`: Asserts multi-level tree reconstruction and DAG edge derivation.
- `test_error_analytics`: Tests failed span extraction and error categorization.
- `test_pagination`: Validates limit/offset query pagination and total counts.

---

## OpenTelemetry & Data Ingestion

TraceFlow supports standard OpenTelemetry protocol JSON (`resourceSpans`) and TraceFlow envelopes.

### Supported Ingestion Schema Example

```json
{
  "trace_id": "4bfb104920e0f97a593d6326c281ad8b",
  "resource": {
    "service.name": "api-gateway",
    "deployment.environment": "production"
  },
  "spans": [
    {
      "span_id": "00f067aa0ba902b7",
      "parent_span_id": null,
      "service_name": "api-gateway",
      "operation_name": "HTTP POST /api/v1/checkout",
      "start_time": "2026-11-02T12:00:00.000Z",
      "end_time": "2026-11-02T12:00:00.342Z",
      "duration": 342.0,
      "status": "OK",
      "attributes": {
        "http.method": "POST",
        "http.status_code": 200,
        "user.id": "usr_998124"
      },
      "events": [
        {
          "name": "tls_handshake_complete",
          "timestamp": "2026-11-02T12:00:00.015Z"
        }
      ]
    }
  ]
}
```

### Ingesting via cURL

```bash
# Ingest normal checkout trace
curl -X POST http://localhost:3000/api/traces/ingest \
  -H "Content-Type: application/json" \
  -d @sample_data/normal_trace.json

# Ingest error cascade trace
curl -X POST http://localhost:3000/api/traces/ingest \
  -H "Content-Type: application/json" \
  -d @sample_data/error_trace.json
```

---

## REST API Reference

| Method | Endpoint | Query / Body Parameters | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/traces/ingest` | Raw JSON trace payload | Ingest single or batched distributed traces |
| `POST` | `/api/traces/upload` | Multipart JSON file | Upload a trace file from disk |
| `GET` | `/api/traces` | `search`, `service`, `status`, `min_duration`, `max_duration`, `limit`, `offset` | Filter, search, and paginate traces |
| `GET` | `/api/traces/{trace_id}` | Path parameter: `trace_id` | Full trace details with nested span tree hierarchy |
| `GET` | `/api/services` | — | Service registry with throughput, error rates, and P50/P95/P99 latency |
| `GET` | `/api/services/{service_name}` | Path parameter: `service_name` | Service profile, callers, dependencies, and operations |
| `GET` | `/api/analytics/overview` | — | Overall system KPIs, volume timeline, and latency distribution |
| `GET` | `/api/analytics/latency` | — | Service-by-service latency percentiles |
| `GET` | `/api/analytics/errors` | — | Extracted failed spans, error messages, and stack traces |
| `GET` | `/api/dependencies` | — | DAG graph nodes and directed call edges with latency metrics |
| `POST` | `/api/demo/start` | `interval_ms`, `error_rate` | Start synthetic microservice traffic generator |
| `POST` | `/api/demo/stop` | — | Stop synthetic demo traffic generator |
| `POST` | `/api/demo/generate-one` | `scenario` | Generate a single synthetic transaction trace |
| `DELETE` | `/api/demo/purge` | — | Purge all synthetic demo traces from the database |
| `DELETE` | `/api/traces` | — | Reset database and purge all trace records |
| `WS` | `/ws/live` | WebSocket connection | Real-time event streaming bus |

---

## Live WebSocket Telemetry

Connect any WebSocket client to `ws://localhost:3000/ws/live` to subscribe to live trace broadcasts:

```javascript
const ws = new WebSocket("ws://localhost:3000/ws/live");

ws.onopen = () => {
  console.log("Connected to TraceFlow Live WebSocket");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Telemetry Event Received:", data);
};

// Send heartbeat
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ping" }));
  }
}, 30000);
```

---

## Synthetic Demo Traffic Engine

For testing and demonstration without an external telemetry emitter, TraceFlow provides an internal traffic generator:

- **Scenarios Supported**:
  - `normal`: Successful checkout transaction across Gateway -> Auth -> Order -> Payment -> DB.
  - `payment_timeout`: Downstream Stripe gateway timeout causing an order failure and HTTP 504.
  - `auth_expired`: Expired JWT Bearer token rejection at authentication layer.
  - `db_deadlock`: Conflicting lock acquired during ledger insertion resulting in transaction rollback.
- **Data Isolation**: All synthetic demo records have `is_demo = 1` and can be purged at any time via the UI or `DELETE /api/demo/purge`.

---

## Contributing & License

TraceFlow is distributed under the Apache-2.0 License. Contributions, bug reports, and pull requests are welcome.
