from __future__ import annotations

from typing import Any


def estimate_state(packet: dict[str, Any], health: dict[str, bool]) -> dict[str, Any]:
    sensors = packet.get("sensors") if isinstance(packet.get("sensors"), dict) else {}
    imu = sensors.get("imu") if isinstance(sensors.get("imu"), dict) else {}
    bmp280 = sensors.get("bmp280") if isinstance(sensors.get("bmp280"), dict) else {}
    gps = sensors.get("gps") if isinstance(sensors.get("gps"), dict) else {}

    return {
        "available": any(health.values()),
        "quality": round(sum(health.values()) / len(health), 2) if health else 0.0,
        "orientation": {field: imu.get(field) for field in ("ax", "ay", "az", "gx", "gy", "gz")},
        "environment": {
            "pressure": bmp280.get("pressure"),
            "temperature": bmp280.get("temperature"),
            "board_temperature": (sensors.get("lm35") or {}).get("temperature"),
        },
        "position": {
            "latitude": gps.get("latitude"),
            "longitude": gps.get("longitude"),
            "satellites": gps.get("satellites"),
            "fix": gps.get("fix", False),
        },
    }