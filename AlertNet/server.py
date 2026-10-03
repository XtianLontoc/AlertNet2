from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database import init_db, get_connection


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="AlertNet Server",
    description="Centralized Hazard & Fire Response System",
    version="1.0"
)


# Initialize database
init_db()


# ============================================================
# DATA MODELS
# ============================================================

class SensorReading(BaseModel):

    device_id: str = "alertnet01"

    temperature: float | None = None

    humidity: float | None = None

    gas_level: float | None = None

    flame_detected: bool = False

    scan_angle: float | None = None

    hazard_detected: bool = False


class HazardEvent(BaseModel):

    device_id: str = "alertnet01"

    event_type: str

    severity: str = "WARNING"

    temperature: float | None = None

    humidity: float | None = None

    gas_level: float | None = None

    scan_angle: float | None = None

    action_taken: str | None = None


class DeviceControl(BaseModel):

    pump: bool = False

    alarm: bool = False

    manual_override: bool = False

    target_angle: float = 0


# ============================================================
# BASIC SERVER TEST
# ============================================================

@app.get("/api/status")
def server_status():

    return {
        "system": "AlertNet",
        "status": "online"
    }


# ============================================================
# SENSOR READINGS
# ============================================================

@app.post("/api/readings")
def create_reading(reading: SensorReading):

    conn = get_connection()

    cursor = conn.execute("""
        INSERT INTO sensor_readings (
            device_id,
            temperature,
            humidity,
            gas_level,
            flame_detected,
            scan_angle,
            hazard_detected
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        reading.device_id,
        reading.temperature,
        reading.humidity,
        reading.gas_level,
        int(reading.flame_detected),
        reading.scan_angle,
        int(reading.hazard_detected)
    ))

    conn.commit()

    reading_id = cursor.lastrowid

    conn.close()

    return {
        "message": "Sensor reading saved",
        "id": reading_id
    }


@app.get("/api/readings/latest")
def get_latest_reading():

    conn = get_connection()

    row = conn.execute("""
        SELECT *
        FROM sensor_readings
        WHERE device_id = ?
        ORDER BY id DESC
        LIMIT 1
    """, ("alertnet01",)).fetchone()

    conn.close()


    if row is None:

        return {
            "message": "No sensor readings yet"
        }


    return dict(row)


# ============================================================
# HAZARD EVENTS
# ============================================================

@app.post("/api/events")
def create_event(event: HazardEvent):

    conn = get_connection()

    cursor = conn.execute("""
        INSERT INTO hazard_events (
            device_id,
            event_type,
            severity,
            temperature,
            humidity,
            gas_level,
            scan_angle,
            action_taken
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event.device_id,
        event.event_type,
        event.severity,
        event.temperature,
        event.humidity,
        event.gas_level,
        event.scan_angle,
        event.action_taken
    ))

    conn.commit()

    event_id = cursor.lastrowid

    conn.close()

    return {
        "message": "Hazard event saved",
        "id": event_id
    }


@app.get("/api/events/{device_id}")
def get_events(device_id: str):

    conn = get_connection()

    rows = conn.execute("""
        SELECT *
        FROM hazard_events
        WHERE device_id = ?
        ORDER BY created_at DESC
        LIMIT 20
    """, (device_id,)).fetchall()

    conn.close()

    return [dict(row) for row in rows]


# ============================================================
# DEVICE CONTROL
# ============================================================

@app.get("/api/control/{device_id}")
def get_device_control(device_id: str):

    conn = get_connection()

    row = conn.execute("""
        SELECT *
        FROM device_control
        WHERE device_id = ?
        LIMIT 1
    """, (device_id,)).fetchone()

    conn.close()


    if row is None:

        return {
            "device_id": device_id,
            "pump": False,
            "alarm": False,
            "manual_override": False,
            "target_angle": 0
        }


    return dict(row)


@app.post("/api/control/{device_id}")
def update_device_control(
    device_id: str,
    control: DeviceControl
):

    conn = get_connection()

    conn.execute("""
        INSERT INTO device_control (
            device_id,
            pump,
            alarm,
            manual_override,
            target_angle,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)

        ON CONFLICT(device_id)
        DO UPDATE SET
            pump = excluded.pump,
            alarm = excluded.alarm,
            manual_override = excluded.manual_override,
            target_angle = excluded.target_angle,
            updated_at = CURRENT_TIMESTAMP
    """, (
        device_id,
        int(control.pump),
        int(control.alarm),
        int(control.manual_override),
        control.target_angle
    ))

    conn.commit()

    conn.close()

    return {
        "message": "Device control updated",
        "device_id": device_id
    }


# ============================================================
# WEB DASHBOARD
# ============================================================

WEB_FOLDER = Path(__file__).parent / "web"

app.mount(
    "/",
    StaticFiles(
        directory=WEB_FOLDER,
        html=True
    ),
    name="web"
)