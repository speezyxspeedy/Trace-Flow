from typing import Dict, Any
from ..database import get_db

def get_dependencies_graph() -> Dict[str, Any]:
    with get_db() as conn:
        service_rows = conn.execute("""
            SELECT service_name, 
                   COUNT(*) as span_count, 
                   SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as error_count, 
                   AVG(duration) as avg_latency
            FROM spans
            GROUP BY service_name;
        """).fetchall()

        nodes = []
        for s in service_rows:
            req_cnt = s["span_count"]
            err_cnt = s["error_count"]
            err_rate = round((err_cnt / req_cnt) * 100, 1) if req_cnt > 0 else 0.0
            nodes.append({
                "id": s["service_name"],
                "name": s["service_name"],
                "request_count": req_cnt,
                "error_count": err_cnt,
                "error_rate": err_rate,
                "avg_latency": round(float(s["avg_latency"] or 0), 1)
            })

        edge_rows = conn.execute("""
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
            ORDER BY call_count DESC;
        """).fetchall()

        edges = []
        for e in edge_rows:
            c_cnt = e["call_count"]
            err_cnt = e["error_count"]
            err_rate = round((err_cnt / c_cnt) * 100, 1) if c_cnt > 0 else 0.0
            edges.append({
                "source": e["source"],
                "target": e["target"],
                "call_count": c_cnt,
                "error_count": err_cnt,
                "error_rate": err_rate,
                "avg_latency": round(float(e["avg_latency"] or 0), 1)
            })

    return {"nodes": nodes, "edges": edges}
