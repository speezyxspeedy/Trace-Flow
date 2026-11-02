import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.environ.get("TRACEFLOW_DB", "traceflow.db")

def init_db(db_path: str = DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS traces (
                trace_id TEXT PRIMARY KEY,
                start_time INTEGER NOT NULL,
                end_time INTEGER NOT NULL,
                duration REAL NOT NULL,
                status TEXT NOT NULL,
                root_service TEXT NOT NULL,
                span_count INTEGER NOT NULL,
                error_count INTEGER DEFAULT 0,
                is_demo INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_traces_start_time ON traces(start_time DESC);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_traces_root_service ON traces(root_service);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_traces_status ON traces(status);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_traces_is_demo ON traces(is_demo);")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS spans (
                span_id TEXT PRIMARY KEY,
                trace_id TEXT NOT NULL,
                parent_span_id TEXT,
                service_name TEXT NOT NULL,
                operation_name TEXT NOT NULL,
                start_time INTEGER NOT NULL,
                end_time INTEGER NOT NULL,
                duration REAL NOT NULL,
                status TEXT NOT NULL,
                status_message TEXT,
                attributes TEXT NOT NULL DEFAULT '{}',
                events TEXT NOT NULL DEFAULT '[]',
                is_demo INTEGER DEFAULT 0,
                FOREIGN KEY(trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON spans(trace_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_spans_parent_span_id ON spans(parent_span_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_spans_service_name ON spans(service_name);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_spans_status ON spans(status);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_spans_start_time ON spans(start_time);")
    conn.close()

@contextmanager
def get_db(db_path: str = DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
