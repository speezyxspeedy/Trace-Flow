import json
import time
from datetime import datetime
from typing import Any, Dict, List, Tuple
from ..database import get_db

def parse_timestamp(val: Any) -> int:
    if isinstance(val, (int, float)):
        # Nanoseconds
        if val > 1e16:
            return int(val // 1e6)
        # Microseconds
        if val > 1e13:
            return int(val // 1e3)
        # Seconds
        if val < 1e11:
            return int(val * 1000)
        return int(val)
    if isinstance(val, str):
        if val.isdigit():
            num = int(val)
            if len(val) >= 18:
                return int(num // 1e6)
            if len(val) >= 15:
                return int(num // 1e3)
            if len(val) <= 10:
                return int(num * 1000)
            return num
        try:
            # Parse ISO 8601
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            return int(dt.timestamp() * 1000)
        except Exception:
            pass
    return int(time.time() * 1000)

def extract_otel_attributes(raw_attrs: Any) -> Dict[str, Any]:
    if not raw_attrs:
        return {}
    if isinstance(raw_attrs, dict):
        return raw_attrs
    if isinstance(raw_attrs, list):
        out = {}
        for item in raw_attrs:
            if isinstance(item, dict) and "key" in item:
                val = item.get("value")
                if isinstance(val, dict):
                    v = val.get("stringValue") or val.get("intValue") or val.get("doubleValue") or val.get("boolValue") or json.dumps(val)
                    out[item["key"]] = v
                else:
                    out[item["key"]] = val
        return out
    return {}

def normalize_payload(payload: Any, is_demo: bool = False) -> List[Dict[str, Any]]:
    traces_map: Dict[str, List[Dict[str, Any]]] = {}

    # Case 1: OpenTelemetry ResourceSpans
    if isinstance(payload, dict) and "resourceSpans" in payload:
        for rs in payload.get("resourceSpans", []):
            res_attrs = extract_otel_attributes(rs.get("resource", {}).get("attributes", []))
            default_service = res_attrs.get("service.name", "unknown-service")
            scope_spans = rs.get("scopeSpans") or rs.get("instrumentationLibrarySpans") or []
            for ss in scope_spans:
                for s in ss.get("spans", []):
                    trace_id = s.get("traceId") or s.get("trace_id")
                    span_id = s.get("spanId") or s.get("span_id")
                    if not trace_id or not span_id:
                        continue

                    start = parse_timestamp(s.get("startTimeUnixNano") or s.get("start_time"))
                    end = parse_timestamp(s.get("endTimeUnixNano") or s.get("end_time") or start)
                    dur = max(0.1, round(float(s.get("duration", (end - start))), 2))

                    attrs = {**res_attrs, **extract_otel_attributes(s.get("attributes"))}
                    service_name = attrs.get("service.name") or s.get("service_name") or default_service
                    op_name = s.get("name") or s.get("operation_name") or "operation"

                    status = "OK"
                    s_status = s.get("status", {})
                    if isinstance(s_status, dict):
                        if s_status.get("code") in (2, "STATUS_CODE_ERROR") or s_status.get("message"):
                            status = "ERROR"
                    elif s.get("status") == "ERROR" or attrs.get("error") is True:
                        status = "ERROR"

                    events = []
                    for e in s.get("events", []):
                        events.append({
                            "name": e.get("name", "event"),
                            "timestamp": parse_timestamp(e.get("timeUnixNano") or e.get("timestamp")),
                            "attributes": extract_otel_attributes(e.get("attributes"))
                        })

                    span_dict = {
                        "span_id": str(span_id),
                        "trace_id": str(trace_id),
                        "parent_span_id": str(s.get("parentSpanId") or s.get("parent_span_id")) if (s.get("parentSpanId") or s.get("parent_span_id")) else None,
                        "service_name": str(service_name),
                        "operation_name": str(op_name),
                        "start_time": start,
                        "end_time": end if end >= start else start + int(dur),
                        "duration": dur,
                        "status": status,
                        "status_message": s.get("status_message") or (s_status.get("message") if isinstance(s_status, dict) else None),
                        "attributes": attrs,
                        "events": events
                    }
                    traces_map.setdefault(span_dict["trace_id"], []).append(span_dict)

    # Case 2: TraceFlow single trace envelope: { trace_id, spans: [...] }
    elif isinstance(payload, dict) and ("trace_id" in payload or "traceId" in payload) and "spans" in payload:
        trace_id = str(payload.get("trace_id") or payload.get("traceId"))
        root_attrs = payload.get("attributes") or payload.get("resource") or {}
        spans_list = []
        for s in payload.get("spans", []):
            span_id = str(s.get("span_id") or s.get("spanId"))
            if not span_id:
                continue
            start = parse_timestamp(s.get("start_time") or s.get("startTime"))
            end = parse_timestamp(s.get("end_time") or s.get("endTime") or start)
            dur = max(0.1, round(float(s.get("duration", (end - start))), 2))
            status = "ERROR" if (s.get("status") == "ERROR" or s.get("error") is True) else "OK"

            spans_list.append({
                "span_id": span_id,
                "trace_id": trace_id,
                "parent_span_id": str(s.get("parent_span_id") or s.get("parentSpanId")) if (s.get("parent_span_id") or s.get("parentSpanId")) else None,
                "service_name": str(s.get("service_name") or s.get("serviceName") or "unknown-service"),
                "operation_name": str(s.get("operation_name") or s.get("operationName") or s.get("name") or "operation"),
                "start_time": start,
                "end_time": end if end >= start else start + int(dur),
                "duration": dur,
                "status": status,
                "status_message": s.get("status_message"),
                "attributes": {**root_attrs, **(s.get("attributes") or {})},
                "events": s.get("events") or []
            })
        traces_map[trace_id] = spans_list

    # Case 3: Flat array of spans or traces
    elif isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict) and "spans" in item and ("trace_id" in item or "traceId" in item):
                sub = normalize_payload(item, is_demo)
                for t in sub:
                    traces_map.setdefault(t["trace_id"], []).extend(t["spans"])
            elif isinstance(item, dict) and ("span_id" in item or "spanId" in item) and ("trace_id" in item or "traceId" in item):
                t_id = str(item.get("trace_id") or item.get("traceId"))
                s_id = str(item.get("span_id") or item.get("spanId"))
                start = parse_timestamp(item.get("start_time") or item.get("startTime"))
                end = parse_timestamp(item.get("end_time") or item.get("endTime") or start)
                dur = max(0.1, round(float(item.get("duration", (end - start))), 2))
                status = "ERROR" if (item.get("status") == "ERROR" or item.get("error") is True) else "OK"

                span_dict = {
                    "span_id": s_id,
                    "trace_id": t_id,
                    "parent_span_id": str(item.get("parent_span_id") or item.get("parentSpanId")) if (item.get("parent_span_id") or item.get("parentSpanId")) else None,
                    "service_name": str(item.get("service_name") or item.get("serviceName") or "unknown-service"),
                    "operation_name": str(item.get("operation_name") or item.get("operationName") or item.get("name") or "operation"),
                    "start_time": start,
                    "end_time": end if end >= start else start + int(dur),
                    "duration": dur,
                    "status": status,
                    "status_message": item.get("status_message"),
                    "attributes": item.get("attributes") or {},
                    "events": item.get("events") or []
                }
                traces_map.setdefault(t_id, []).append(span_dict)

    result = []
    for trace_id, spans in traces_map.items():
        if spans:
            result.append({"trace_id": trace_id, "spans": spans})
    return result

def save_traces(normalized_traces: List[Dict[str, Any]], is_demo: bool = False) -> Tuple[int, int, List[str]]:
    ingested_traces = 0
    ingested_spans = 0
    trace_ids = []

    with get_db() as conn:
        for t in normalized_traces:
            trace_id = t["trace_id"]
            spans = t["spans"]
            if not spans:
                continue

            min_start = min(s["start_time"] for s in spans)
            max_end = max(s["end_time"] for s in spans)
            dur = max(0.1, round(float(max_end - min_start), 2))
            has_error = any(s["status"] == "ERROR" for s in spans)
            error_count = sum(1 for s in spans if s["status"] == "ERROR")

            root_span = next((s for s in spans if not s.get("parent_span_id")), None)
            if not root_span:
                root_span = min(spans, key=lambda s: s["start_time"])

            conn.execute("""
                INSERT INTO traces (trace_id, start_time, end_time, duration, status, root_service, span_count, error_count, is_demo, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(trace_id) DO UPDATE SET
                    start_time=excluded.start_time,
                    end_time=excluded.end_time,
                    duration=excluded.duration,
                    status=excluded.status,
                    root_service=excluded.root_service,
                    span_count=excluded.span_count,
                    error_count=excluded.error_count,
                    is_demo=excluded.is_demo;
            """, (
                trace_id, min_start, max_end, dur,
                "ERROR" if has_error else "OK",
                root_span["service_name"],
                len(spans), error_count,
                1 if is_demo else 0,
                int(time.time() * 1000)
            ))

            for s in spans:
                conn.execute("""
                    INSERT INTO spans (span_id, trace_id, parent_span_id, service_name, operation_name, start_time, end_time, duration, status, status_message, attributes, events, is_demo)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(span_id) DO UPDATE SET
                        parent_span_id=excluded.parent_span_id,
                        service_name=excluded.service_name,
                        operation_name=excluded.operation_name,
                        start_time=excluded.start_time,
                        end_time=excluded.end_time,
                        duration=excluded.duration,
                        status=excluded.status,
                        status_message=excluded.status_message,
                        attributes=excluded.attributes,
                        events=excluded.events,
                        is_demo=excluded.is_demo;
                """, (
                    s["span_id"], s["trace_id"], s.get("parent_span_id"),
                    s["service_name"], s["operation_name"],
                    s["start_time"], s["end_time"], s["duration"],
                    s["status"], s.get("status_message"),
                    json.dumps(s.get("attributes") or {}),
                    json.dumps(s.get("events") or []),
                    1 if is_demo else 0
                ))
                ingested_spans += 1

            ingested_traces += 1
            trace_ids.append(trace_id)

    return ingested_traces, ingested_spans, trace_ids
