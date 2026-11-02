# TraceFlow - Distributed Systems Observability & Distributed Tracing Platform

TraceFlow is a lightweight, high-performance distributed tracing and observability platform designed to track microservice request flow, calculate percentile latencies (P50, P95, P99), isolate cascade failures, visualize waterfall timelines, and compute service dependency graphs.

---

## 1. Architecture & Tech Stack

- **Backend**: Python 3.11+ / FastAPI, SQLite (WAL mode with indexed lookups), WebSockets (`/ws/live`).
- **Frontend**: Pure Vanilla JavaScript (ES6+), HTML5, CSS3, SVG interactive charts & graphs. No React/Vue/Angular bloat.
- **Data Ingestion**: OpenTelemetry-compatible JSON trace parser (`resourceSpans` or TraceFlow envelope).
- **Persistence**: High-performance SQLite database with indexes on `trace_id`, `service_name`, `status`, and `start_time`.

---

## 2. Windows 11 PowerShell Setup Instructions

Follow these exact steps in **Windows 11 PowerShell** to set up and run TraceFlow:

### Step 1: Open PowerShell and Navigate to the Project
```powershell
cd traceflow
```

### Step 2: Create a Python Virtual Environment
```powershell
python -m venv venv
```

### Step 3: Activate the Virtual Environment
```powershell
# Set script execution policy for this terminal session if needed:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Activate:
.\venv\Scripts\Activate.ps1
```
*(Your prompt will now show `(venv)`)*

### Step 4: Install Dependencies
```powershell
pip install -r requirements.txt
```

### Step 5: Start the FastAPI Server with Live Reload
```powershell
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### Step 6: Access TraceFlow in your Browser
Open [http://localhost:8000](http://localhost:8000)

---

## 3. Running Automated Tests

Run the test suite with pytest:
```powershell
pytest backend/tests/test_api.py -v
```

Tests verify:
- Valid OpenTelemetry trace ingestion
- Rejection of invalid JSON and missing trace IDs
- Duplicate span idempotent upsert
- Nested span hierarchy tree assembly
- Causal service dependency graph computation
- Latency percentile accuracy (P50, P95, P99)
- Error root cause cascade tracking

---

## 4. REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/traces/ingest` | Ingest JSON trace payload (OpenTelemetry or TraceFlow format) |
| `POST` | `/api/traces/upload` | Upload `.json` trace file |
| `GET` | `/api/traces` | Filtered, paginated traces (`?search`, `?service`, `?status`, `?limit`) |
| `GET` | `/api/traces/{trace_id}` | Complete trace details with nested span tree hierarchy |
| `GET` | `/api/services` | Service registry with error rates and latency percentiles |
| `GET` | `/api/services/{service_name}` | Deep dive into service operations, callers, and dependencies |
| `GET` | `/api/analytics/overview` | High-level metrics, ingestion volume timeline, and latency histogram |
| `GET` | `/api/analytics/latency` | Service-by-service latency distribution |
| `GET` | `/api/analytics/errors` | Failed span analysis and root cause cascade |
| `GET` | `/api/dependencies` | Microservice dependency graph (DAG nodes and directed edges) |
| `WS` | `/ws/live` | WebSocket connection for real-time live trace streaming |

---

## 5. Ingesting Sample Traces via cURL / PowerShell

### Ingest Normal Checkout Trace:
```powershell
curl.exe -X POST http://127.0.0.1:8000/api/traces/ingest `
  -H "Content-Type: application/json" `
  -d "@sample_data/normal_trace.json"
```

### Ingest Error Gateway Timeout Trace:
```powershell
curl.exe -X POST http://127.0.0.1:8000/api/traces/ingest `
  -H "Content-Type: application/json" `
  -d "@sample_data/error_trace.json"
```

---

## 6. OpenTelemetry JSON Schema Format

```json
{
  "trace_id": "4bfb104920e0f97a593d6326c281ad8b",
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

---

## 7. Synthetic Demo Traffic Engine

TraceFlow includes an optional demo traffic generator simulating realistic microservices:
- `api-gateway`
- `auth-service`
- `user-service`
- `order-service`
- `payment-service`
- `postgres-db`
- `redis-cache`

All synthetic records are tagged with `is_demo = 1` and clearly labeled with `DEMO DATA` in the UI. Synthetic traces can be purged at any time without impacting real imported telemetry.
