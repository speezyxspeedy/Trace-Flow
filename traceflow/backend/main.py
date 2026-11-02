import os
import json
import asyncio
from typing import Optional, List, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import init_db, get_db
from .services.ingestion import normalize_payload, save_traces
from .services.tracing import get_traces, get_trace_by_id
from .services.analytics import get_overview_analytics, get_error_analytics, calculate_percentiles
from .services.dependencies import get_dependencies_graph

# Initialize Database Schema
init_db()

app = FastAPI(
    title="TraceFlow API",
    description="Distributed Systems Observability & Distributed Tracing Platform API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WebSocket Live Stream Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        data = json.dumps(message)
        for connection in list(self.active_connections):
            try:
                await connection.send_text(data)
            except Exception:
                self.active_connections.discard(connection)

manager = ConnectionManager()

# --- Endpoints ---

@app.post("/api/traces/ingest", status_code=201)
async def ingest_traces(payload: Any = Body(...)):
    """Ingest OpenTelemetry Protocol (OTLP/JSON) or TraceFlow JSON traces."""
    if not payload:
        raise HTTPException(status_code=400, detail="Empty trace payload.")
    
    normalized = normalize_payload(payload, is_demo=False)
    if not normalized:
        raise HTTPException(status_code=400, detail="No valid spans or trace_id found in payload.")

    ingested_traces, ingested_spans, trace_ids = save_traces(normalized, is_demo=False)

    overview = get_overview_analytics()
    await manager.broadcast({
        "type": "ingested",
        "count": ingested_traces,
        "trace_ids": trace_ids,
        "stats": overview.get("summary")
    })

    return {
        "success": True,
        "ingested_traces": ingested_traces,
        "ingested_spans": ingested_spans,
        "trace_ids": trace_ids
    }

@app.post("/api/traces/upload", status_code=201)
async def upload_trace_file(file: UploadFile = File(...)):
    """Upload JSON trace file directly."""
    try:
        content = await file.read()
        payload = json.loads(content.decode("utf-8"))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse uploaded JSON file: {str(e)}")

    normalized = normalize_payload(payload, is_demo=False)
    if not normalized:
        raise HTTPException(status_code=400, detail="No valid spans or trace_id found in file.")

    ingested_traces, ingested_spans, trace_ids = save_traces(normalized, is_demo=False)
    return {
        "success": True,
        "ingested_traces": ingested_traces,
        "ingested_spans": ingested_spans,
        "trace_ids": trace_ids
    }

@app.get("/api/traces")
def list_traces(
    search: Optional[str] = None,
    service: Optional[str] = None,
    status: Optional[str] = None,
    min_duration: Optional[float] = None,
    max_duration: Optional[float] = None,
    is_demo: Optional[int] = None,
    sort_by: str = "start_time",
    order: str = "DESC",
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    """List and filter distributed traces with pagination."""
    return get_traces(
        search=search,
        service=service,
        status=status,
        min_duration=min_duration,
        max_duration=max_duration,
        is_demo=is_demo,
        sort_by=sort_by,
        order=order,
        limit=limit,
        offset=offset
    )

@app.get("/api/traces/{trace_id}")
def trace_detail(trace_id: str):
    """Fetch complete hierarchical span tree and metadata for a specific trace."""
    data = get_trace_by_id(trace_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Trace {trace_id} not found.")
    return data

@app.get("/api/services")
def list_services():
    """List all registered services with request counts, error rates, and percentile latencies."""
    with get_db() as conn:
        service_rows = conn.execute("""
            SELECT service_name, 
                   COUNT(*) as span_count, 
                   SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as error_count,
                   AVG(duration) as avg_latency
            FROM spans
            GROUP BY service_name
            ORDER BY span_count DESC;
        """).fetchall()

        services = []
        for s in service_rows:
            durations = [r["duration"] for r in conn.execute(
                "SELECT duration FROM spans WHERE service_name = ? ORDER BY duration ASC;", (s["service_name"],)
            ).fetchall()]
            pct = calculate_percentiles(durations)
            err_rate = round((s["error_count"] / s["span_count"]) * 100, 1) if s["span_count"] > 0 else 0.0

            health = "healthy"
            if err_rate > 5:
                health = "critical"
            elif err_rate > 1 or pct["p95"] > 1000:
                health = "warning"

            services.append({
                "service_name": s["service_name"],
                "request_count": s["span_count"],
                "error_count": s["error_count"],
                "error_rate": err_rate,
                "average_latency": pct["avg"],
                "p50_latency": pct["p50"],
                "p95_latency": pct["p95"],
                "p99_latency": pct["p99"],
                "health": health
            })

    return {"services": services}

@app.get("/api/services/{service_name}")
def service_deep_dive(service_name: str):
    """Fetch service details, operations, inbound callers, and outbound dependencies."""
    with get_db() as conn:
        spans = conn.execute(
            "SELECT * FROM spans WHERE service_name = ? ORDER BY start_time DESC LIMIT 100;", (service_name,)
        ).fetchall()
        if not spans:
            raise HTTPException(status_code=404, detail=f"Service {service_name} not found.")

        durations = [s["duration"] for s in spans]
        pct = calculate_percentiles(durations)
        error_count = sum(1 for s in spans if s["status"] == "ERROR")
        error_rate = round((error_count / len(spans)) * 100, 1)

        ops = [dict(r) for r in conn.execute("""
            SELECT operation_name, COUNT(*) as count, AVG(duration) as avg_dur, SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as errors
            FROM spans WHERE service_name = ?
            GROUP BY operation_name
            ORDER BY count DESC;
        """, (service_name,)).fetchall()]

        upstream = [dict(r) for r in conn.execute("""
            SELECT p.service_name as caller, COUNT(*) as call_count
            FROM spans c
            JOIN spans p ON c.parent_span_id = p.span_id
            WHERE c.service_name = ? AND p.service_name != ?
            GROUP BY p.service_name;
        """, (service_name, service_name)).fetchall()]

        downstream = [dict(r) for r in conn.execute("""
            SELECT c.service_name as dependency, COUNT(*) as call_count
            FROM spans p
            JOIN spans c ON c.parent_span_id = p.span_id
            WHERE p.service_name = ? AND c.service_name != ?
            GROUP BY c.service_name;
        """, (service_name, service_name)).fetchall()]

    return {
        "service_name": service_name,
        "total_spans": len(spans),
        "error_count": error_count,
        "error_rate": error_rate,
        "percentiles": pct,
        "operations": ops,
        "upstream": upstream,
        "downstream": downstream
    }

@app.get("/api/analytics/overview")
def analytics_overview():
    """System-wide summary metrics, timeline volume buckets, and latency histogram."""
    return get_overview_analytics()

@app.get("/api/analytics/latency")
def analytics_latency():
    """Latency distribution and percentile rankings across all services."""
    with get_db() as conn:
        all_durs = [r["duration"] for r in conn.execute("SELECT duration FROM traces ORDER BY duration ASC;").fetchall()]
        overall = calculate_percentiles(all_durs)

        services = [r["service_name"] for r in conn.execute("SELECT DISTINCT service_name FROM spans;").fetchall()]
        per_service = []
        for s in services:
            s_durs = [r["duration"] for r in conn.execute("SELECT duration FROM spans WHERE service_name = ? ORDER BY duration ASC;", (s,)).fetchall()]
            pct = calculate_percentiles(s_durs)
            per_service.append({
                "service_name": s,
                "count": len(s_durs),
                **pct
            })

    per_service.sort(key=lambda x: x["p95"], reverse=True)
    return {"overall": overall, "per_service": per_service}

@app.get("/api/analytics/errors")
def analytics_errors():
    """Failed span analysis, root cause extraction, and error breakdown."""
    return get_error_analytics()

@app.get("/api/dependencies")
def dependencies_dag():
    """Derived microservice dependency graph (nodes and directed call edges)."""
    return get_dependencies_graph()

@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    """Live WebSocket feed for streaming trace telemetry."""
    await manager.connect(websocket)
    try:
        overview = get_overview_analytics()
        await websocket.send_text(json.dumps({
            "type": "connected",
            "message": "TraceFlow Python FastAPI WebSocket Connected",
            "summary": overview.get("summary")
        }))
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Mount Static Frontend if present
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
