from __future__ import annotations

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from ai.anomaly_detector import SensorAnomalyDetector
from config import settings
from database.logger import SensorLogger
from sensors.serial_reader import SerialReader
from sensors.validator import validate_sensor_packet
from data.analytics import build_analytics
from state.digital_twin import calculate_deviation, simulate_state
from state.demo_state_machine import DemoStateMachine
from state.estimator import estimate_state
from state.guidance import simulate_guidance

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.connections.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self.connections.discard(websocket)

    async def broadcast(self, message: dict[str, Any]) -> None:
        async with self._lock:
            connections = list(self.connections)
        stale: list[WebSocket] = []
        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception:
                stale.append(websocket)
        for websocket in stale:
            await self.disconnect(websocket)


logger_db = SensorLogger(settings.database_path)
detector = SensorAnomalyDetector(settings.anomaly_warmup_samples, settings.anomaly_contamination)
state_machine = DemoStateMachine()
manager = ConnectionManager()
serial_reader: SerialReader | None = None
latest_packet: dict[str, Any] | None = logger_db.latest()
processing_loop: asyncio.AbstractEventLoop | None = None


async def process_packet(packet: dict[str, Any], source: str) -> dict[str, Any]:
    global latest_packet
    health = validate_sensor_packet(packet)
    ai_result = detector.analyze(packet)
    estimated_state = estimate_state(packet, health)
    simulated_state = simulate_state(estimated_state)
    deviation = calculate_deviation(estimated_state, simulated_state)
    guidance = simulate_guidance(deviation, ai_result)
    analytics = build_analytics(health, ai_result, deviation)
    demo_result = state_machine.update(health, ai_result)
    sensors = packet.get("sensors") if isinstance(packet.get("sensors"), dict) else {}
    timestamp = packet.get("timestamp", time.time())
    if not isinstance(timestamp, (int, float)) or isinstance(timestamp, bool):
        timestamp = time.time()
    processed = {
        "connected": bool(serial_reader and serial_reader.connected) if source == "USB_SERIAL" else False,
        "source": source,
        "timestamp": timestamp,
        "sensors": sensors,
        "health": health,
        "ai": ai_result,
        "estimated_state": estimated_state,
        "simulated_state": simulated_state,
        "deviation": deviation,
        "guidance": guidance,
        "analytics": analytics,
        "demo": demo_result,
    }
    architecture = {
        "estimated_state": estimated_state,
        "simulated_state": simulated_state,
        "deviation": deviation,
        "guidance": guidance,
        "analytics": analytics,
    }
    logger_db.log(timestamp, source, sensors, health, ai_result, demo_result, architecture)
    latest_packet = processed
    await manager.broadcast(processed)
    return processed


def serial_packet_callback(packet: dict[str, Any]) -> None:
    if processing_loop and not processing_loop.is_closed():
        processing_loop.call_soon_threadsafe(asyncio.create_task, process_packet(packet, "USB_SERIAL"))


@asynccontextmanager
async def lifespan(_: FastAPI):
    global processing_loop, serial_reader
    processing_loop = asyncio.get_running_loop()
    if settings.auto_serial:
        serial_reader = SerialReader(
            settings.serial_port,
            settings.serial_baud,
            serial_packet_callback,
            settings.serial_reconnect_seconds,
        )
        serial_reader.start()
    yield
    if serial_reader:
        serial_reader.stop()
    processing_loop = None


app = FastAPI(title="ESP32 Sensor Demonstrator Backend", version="1.0.0", lifespan=lifespan)


@app.get("/api/status")
async def get_status() -> dict[str, Any]:
    return {
        "backend_status": "running",
        "serial_port": settings.serial_port,
        "serial_connected": bool(serial_reader and serial_reader.connected),
        "auto_serial": settings.auto_serial,
        "websocket_clients": len(manager.connections),
    }


@app.get("/api/latest")
async def get_latest() -> dict[str, Any] | None:
    return latest_packet


@app.post("/api/sensor-data")
async def post_sensor_data(packet: dict[str, Any]) -> dict[str, Any]:
    return await process_packet(packet, "MANUAL")


@app.post("/api/demo/reset")
async def reset_demo() -> dict[str, Any]:
    result = state_machine.reset()
    return {"demo": result}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    try:
        if latest_packet:
            await websocket.send_json(latest_packet)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)
