from __future__ import annotations

import json
import sqlite3
import threading
from pathlib import Path
from typing import Any


class SensorLogger:
    def __init__(self, database_path: Path):
        self.database_path = database_path
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path, check_same_thread=False)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute("""
                CREATE TABLE IF NOT EXISTS sensor_readings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    source TEXT NOT NULL,
                    sensors_json TEXT NOT NULL,
                    health_json TEXT NOT NULL,
                    ai_json TEXT NOT NULL,
                    demo_json TEXT NOT NULL,
                    architecture_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            columns = {row[1] for row in connection.execute("PRAGMA table_info(sensor_readings)")}
            if "architecture_json" not in columns:
                connection.execute("ALTER TABLE sensor_readings ADD COLUMN architecture_json TEXT NOT NULL DEFAULT '{}'")

    def log(
        self,
        timestamp: float,
        source: str,
        sensors: dict[str, Any],
        health: dict[str, bool],
        ai: dict[str, Any],
        demo: dict[str, Any],
        architecture: dict[str, Any],
    ) -> None:
        with self._lock, self._connect() as connection:
            connection.execute(
                "INSERT INTO sensor_readings (timestamp, source, sensors_json, health_json, ai_json, demo_json, architecture_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (timestamp, source, json.dumps(sensors), json.dumps(health), json.dumps(ai), json.dumps(demo), json.dumps(architecture)),
            )

    def latest(self) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 1").fetchone()
        if row is None:
            return None
        result = {
            "timestamp": row["timestamp"],
            "source": row["source"],
            "sensors": json.loads(row["sensors_json"]),
            "health": json.loads(row["health_json"]),
            "ai": json.loads(row["ai_json"]),
            "demo": json.loads(row["demo_json"]),
        }
        architecture = json.loads(row["architecture_json"] or "{}")
        if isinstance(architecture, dict):
            result.update(architecture)
        return result
