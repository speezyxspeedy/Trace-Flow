from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class SpanEventSchema(BaseModel):
    name: str
    timestamp: Any
    attributes: Optional[Dict[str, Any]] = None

class SpanInputSchema(BaseModel):
    span_id: str
    trace_id: Optional[str] = None
    parent_span_id: Optional[str] = None
    service_name: Optional[str] = None
    operation_name: Optional[str] = None
    start_time: Any
    end_time: Optional[Any] = None
    duration: Optional[float] = None
    status: Optional[str] = "OK"
    status_message: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    events: Optional[List[SpanEventSchema]] = None

class TraceInputSchema(BaseModel):
    trace_id: str
    resource: Optional[Dict[str, Any]] = None
    attributes: Optional[Dict[str, Any]] = None
    spans: List[SpanInputSchema]

class TraceSummarySchema(BaseModel):
    trace_id: str
    start_time: int
    end_time: int
    duration: float
    status: str
    root_service: str
    span_count: int
    error_count: int
    is_demo: int

class ServiceMetricsSchema(BaseModel):
    service_name: str
    request_count: int
    error_count: int
    error_rate: float
    average_latency: float
    p50_latency: float
    p95_latency: float
    p99_latency: float
    health: str

class DependencyEdgeSchema(BaseModel):
    source: str
    target: str
    call_count: int
    error_count: int
    error_rate: float
    avg_latency: float

class DependencyNodeSchema(BaseModel):
    id: str
    name: str
    request_count: int
    error_count: int
    error_rate: float
    avg_latency: float

class IngestResponseSchema(BaseModel):
    success: bool
    ingested_traces: int
    ingested_spans: int
    trace_ids: List[str]
