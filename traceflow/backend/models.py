from dataclasses import dataclass
from typing import Optional, Dict, Any, List

@dataclass
class TraceModel:
    trace_id: str
    start_time: int
    end_time: int
    duration: float
    status: str
    root_service: str
    span_count: int
    error_count: int = 0
    is_demo: int = 0
    created_at: int = 0

@dataclass
class SpanModel:
    span_id: str
    trace_id: str
    parent_span_id: Optional[str]
    service_name: str
    operation_name: str
    start_time: int
    end_time: int
    duration: float
    status: str
    status_message: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    events: Optional[List[Dict[str, Any]]] = None
    is_demo: int = 0
