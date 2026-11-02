import json
from typing import Dict, Any, List
from ..database import get_db

def calculate_percentiles(values: List[float]) -> Dict[str, float]:
    if not values:
        return {"p50": 0.0, "p95": 0.0, "p99": 0.0, "avg": 0.0}
    sorted_vals = sorted(values)
    n = len(sorted_vals)
    def p(pct: float) -> float:
        idx = min(n - 1, int((pct / 100.0) * n))
        return round(sorted_vals[idx], 2)
    return {
        "p50": p(50),
        "p95": p(95),
        "p99": p(99),
        "avg": round(sum(sorted_vals) / n, 2)
    }

def get_overview_analytics() -> Dict[str, Any]:
    with get_db() as conn:
        total_traces = conn.execute("SELECT COUNT(*) as c FROM traces;").fetchone()["c"]
        total_spans = conn.execute("SELECT COUNT(*) as c FROM spans;").fetchone()["c"]
        error_traces = conn.execute("SELECT COUNT(*) as c FROM traces WHERE status = 'ERROR';").fetchone()["c"]
        error_rate = round((error_traces / total_traces) * 100, 1) if total_traces > 0 else 0.0

        durations = [r["duration"] for r in conn.execute("SELECT duration FROM traces ORDER BY duration ASC;").fetchall()]
        pct = calculate_percentiles(durations)

        summary = {
            "total_traces": total_traces,
            "total_spans": total_spans,
            "error_traces": error_traces,
            "error_rate": error_rate,
            "avg_latency": pct["avg"],
            "p50_latency": pct["p50"],
            "p95_latency": pct["p95"],
            "p99_latency": pct["p99"]
        }

        # Time buckets (grouped by 1-minute intervals)
        time_rows = conn.execute("""
            SELECT (start_time / 60000) * 60000 as bucket_time,
                   COUNT(*) as total_traces,
                   SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as error_traces,
                   AVG(duration) as avg_duration
            FROM traces
            GROUP BY bucket_time
            ORDER BY bucket_time DESC
            LIMIT 15;
        """).fetchall()
        time_buckets = [dict(r) for r in reversed(time_rows)]

        # Latency buckets
        latency_buckets = [
            {"range": "0-50ms", "count": sum(1 for d in durations if d <= 50)},
            {"range": "50-100ms", "count": sum(1 for d in durations if 50 < d <= 100)},
            {"range": "100-250ms", "count": sum(1 for d in durations if 100 < d <= 250)},
            {"range": "250-500ms", "count": sum(1 for d in durations if 250 < d <= 500)},
            {"range": "500ms-1s", "count": sum(1 for d in durations if 500 < d <= 1000)},
            {"range": ">1s", "count": sum(1 for d in durations if d > 1000)},
        ]

        slowest_services = [dict(r) for r in conn.execute("""
            SELECT service_name, AVG(duration) as avg_lat, MAX(duration) as max_lat, COUNT(*) as count
            FROM spans
            GROUP BY service_name
            ORDER BY avg_lat DESC
            LIMIT 5;
        """).fetchall()]

        active_services = [dict(r) for r in conn.execute("""
            SELECT service_name, COUNT(*) as count, SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as errors
            FROM spans
            GROUP BY service_name
            ORDER BY count DESC
            LIMIT 5;
        """).fetchall()]

    return {
        "summary": summary,
        "time_buckets": time_buckets,
        "latency_buckets": latency_buckets,
        "slowest_services": slowest_services,
        "active_services": active_services
    }

def get_error_analytics() -> Dict[str, Any]:
    with get_db() as conn:
        error_rows = conn.execute("""
            SELECT span_id, trace_id, parent_span_id, service_name, operation_name, start_time, duration, status_message, attributes, events
            FROM spans
            WHERE status = 'ERROR'
            ORDER BY start_time DESC
            LIMIT 50;
        """).fetchall()

        by_service = [dict(r) for r in conn.execute("""
            SELECT service_name, COUNT(*) as error_count
            FROM spans
            WHERE status = 'ERROR'
            GROUP BY service_name
            ORDER BY error_count DESC;
        """).fetchall()]

    formatted_spans = []
    for r in error_rows:
        s = dict(r)
        attrs = json.loads(s.get("attributes") or "{}")
        events = json.loads(s.get("events") or "[]")
        error_msg = s.get("status_message") or attrs.get("error.message") or attrs.get("exception.message")
        if not error_msg:
            ex_event = next((e for e in events if e.get("name") == "exception"), None)
            if ex_event:
                error_msg = ex_event.get("attributes", {}).get("exception.message")
        s["error_message"] = error_msg or "Span recorded with error status"
        s["attributes"] = attrs
        s["events"] = events
        formatted_spans.append(s)

    return {
        "total_error_spans": len(formatted_spans),
        "by_service": by_service,
        "failed_spans": formatted_spans
    }
