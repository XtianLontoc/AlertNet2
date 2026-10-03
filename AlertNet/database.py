import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).with_name("alertnet.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL DEFAULT 'alertnet01',
            temperature REAL,
            humidity REAL,
            gas_level REAL,
            flame_detected INTEGER NOT NULL DEFAULT 0,
            scan_angle REAL,
            hazard_detected INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()