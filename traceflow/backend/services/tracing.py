import json
from typing import Dict, Any, List, Optional
from ..database import get_db

def get_traces(
    search: Optional[str] = None,
    service: Optional[str] = None,
    status: Optional[str] = None,
    min_duration: Optional[float] = None,
    max_duration: Optional[float] = None,
    is_demo: Optional[int] = None,
    sort_by: str = "start_time",
    order: str = "DESC",
    limit: int = 25,
    offset: int = 0
) -> Dict[str, Any]:
    clauses = []
    params = []

    if search:
        clauses.append("(trace_id LIKE ? OR root_service LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])
    if service and service != "ALL":
        clauses.append("root_service = ?")
        params.append(service)
    if status and status != "ALL":
        clauses.append("status = ?")
        params.append(status)
    if min_duration is not None:
        clauses.append("duration >= ?")
        params.append(min_duration)
    if max_duration is not None:
        clauses.append("duration <= ?")
        params.append(max_duration)
    if is_demo is not None:
        clauses.append("is_demo = ?")
        params.append(is_demo)

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    safe_sort = sort_by if sort_by in ("start_time", "duration", "span_count") else "start_time"
    safe_order = "ASC" if order.upper() == "ASC" else "DESC"

    with get_db() as conn:
        count_cur = conn.execute(f"SELECT COUNT(*) as total FROM traces {where};", params)
        total = count_cur.fetchone()["total"]

        query = f"""
            SELECT trace_id, start_time, end_time, duration, status, root_service, span_count, error_count, is_demo
            FROM traces
            {where}
            ORDER BY {safe_sort} {safe_order}
            LIMIT ? OFFSET ?;
        """
        rows = conn.execute(query, params + [limit, offset]).fetchall()
        traces = [dict(r) for r in rows]

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "traces": traces
    }

def get_trace_by_id(trace_id: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        trace_row = conn.execute("SELECT * FROM traces WHERE trace_id = ?;", (trace_id,)).fetchone()
        if not trace_row:
            return None

        span_rows = conn.execute(
            "SELECT * FROM spans WHERE trace_id = ? ORDER BY start_time ASC;", (trace_id,)
        ).fetchall()

    trace = dict(trace_row)
    spans = []
    for r in span_rows:
        s = dict(r)
        s["attributes"] = json.loads(s.get("attributes") or "{}")
        s["events"] = json.loads(s.get("events") or "[]")
        spans.append(s)

    # Reconstruct nested span hierarchy tree
    span_map = {s["span_id"]: {**s, "children": []} for s in spans}
    root_spans = []

    for s in spans:
        node = span_map[s["span_id"]]
        p_id = s.get("parent_span_id")
        if p_id and p_id in span_map:
            span_map[p_id]["children"].append(node)
        else:
            root_spans.append(node)

    services = list({s["service_name"] for s in spans})

    return {
        "trace": trace,
        "services": services,
        "spans": spans,
        "span_tree": root_spans
    }
