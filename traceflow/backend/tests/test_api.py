import os
import pytest
from fastapi.testclient import TestClient

# Set test DB environment before importing app
os.environ["TRACEFLOW_DB"] = "test_traceflow.db"

from ..main import app
from ..database import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    if os.path.exists("test_traceflow.db"):
        os.remove("test_traceflow.db")
    init_db("test_traceflow.db")
    yield
    if os.path.exists("test_traceflow.db"):
        os.remove("test_traceflow.db")

def test_valid_trace_ingestion():
    payload = {
        "trace_id": "test_trace_001",
        "spans": [
            {
                "span_id": "span_root",
                "parent_span_id": None,
                "service_name": "gateway",
                "operation_name": "GET /api/v1/health",
                "start_time": 1700000000000,
                "end_time": 1700000000100,
                "duration": 100.0,
                "status": "OK"
            }
        ]
    }
    res = client.post("/api/traces/ingest", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["ingested_traces"] == 1
    assert data["ingested_spans"] == 1

def test_missing_trace_id_fails():
    payload = {
        "spans": [
            {
                "span_id": "span_no_trace",
                "service_name": "gateway",
                "start_time": 1700000000000,
                "end_time": 1700000000100
            }
        ]
    }
    res = client.post("/api/traces/ingest", json=payload)
    assert res.status_code == 400

def test_duplicate_spans_handled_safely():
    payload = {
        "trace_id": "test_dup_001",
        "spans": [
            {
                "span_id": "span_unique",
                "parent_span_id": None,
                "service_name": "order-service",
                "operation_name": "process",
                "start_time": 1700000000000,
                "end_time": 1700000000050,
                "status": "OK"
            }
        ]
    }
    # Ingest once
    res1 = client.post("/api/traces/ingest", json=payload)
    assert res1.status_code == 201
    # Ingest same span again (idempotent upsert)
    res2 = client.post("/api/traces/ingest", json=payload)
    assert res2.status_code == 201

    trace_res = client.get("/api/traces/test_dup_001")
    assert trace_res.status_code == 200
    assert len(trace_res.json()["spans"]) == 1

def test_nested_spans_and_dependency_graph():
    payload = {
        "trace_id": "test_nested_001",
        "spans": [
            {
                "span_id": "span_gw",
                "parent_span_id": None,
                "service_name": "api-gateway",
                "operation_name": "POST /order",
                "start_time": 1700000000000,
                "end_time": 1700000000200,
                "duration": 200.0,
                "status": "OK"
            },
            {
                "span_id": "span_ord",
                "parent_span_id": "span_gw",
                "service_name": "order-service",
                "operation_name": "create",
                "start_time": 1700000000020,
                "end_time": 1700000000180,
                "duration": 160.0,
                "status": "OK"
            },
            {
                "span_id": "span_pay",
                "parent_span_id": "span_ord",
                "service_name": "payment-service",
                "operation_name": "charge",
                "start_time": 1700000000050,
                "end_time": 1700000000150,
                "duration": 100.0,
                "status": "ERROR",
                "status_message": "Gateway Timeout"
            }
        ]
    }
    res = client.post("/api/traces/ingest", json=payload)
    assert res.status_code == 201

    # Check Trace Details hierarchy
    trace_res = client.get("/api/traces/test_nested_001")
    assert trace_res.status_code == 200
    tree = trace_res.json()["span_tree"]
    assert len(tree) == 1
    assert tree[0]["service_name"] == "api-gateway"
    assert len(tree[0]["children"]) == 1
    assert tree[0]["children"][0]["service_name"] == "order-service"
    assert len(tree[0]["children"][0]["children"]) == 1
    assert tree[0]["children"][0]["children"][0]["service_name"] == "payment-service"

    # Check Dependencies Graph
    dep_res = client.get("/api/dependencies")
    assert dep_res.status_code == 200
    dep_data = dep_res.json()
    assert len(dep_data["nodes"]) >= 3
    assert len(dep_data["edges"]) >= 2

def test_error_analytics():
    err_res = client.get("/api/analytics/errors")
    assert err_res.status_code == 200

def test_pagination():
    res = client.get("/api/traces?limit=10&offset=0")
    assert res.status_code == 200
    assert "total" in res.json()
    assert "traces" in res.json()
