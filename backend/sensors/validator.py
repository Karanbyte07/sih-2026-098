from __future__ import annotations

import math
from typing import Any

SENSOR_NAMES = ("imu", "bmp280", "lm35", "gps")

IMU_FIELDS = ("ax", "ay", "az", "gx", "gy", "gz")


def _finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def validate_sensor_packet(packet: Any) -> dict[str, bool]:
    """Return per-sensor health without raising on malformed serial input."""
    health = {name: False for name in SENSOR_NAMES}
    if not isinstance(packet, dict) or not isinstance(packet.get("sensors"), dict):
        return health

    sensors = packet["sensors"]
    imu = sensors.get("imu")
    health["imu"] = isinstance(imu, dict) and all(_finite_number(imu.get(field)) for field in IMU_FIELDS)

    bmp = sensors.get("bmp280")
    health["bmp280"] = isinstance(bmp, dict) and all(
        _finite_number(bmp.get(field)) for field in ("pressure", "temperature")
    )

    lm35 = sensors.get("lm35")
    health["lm35"] = isinstance(lm35, dict) and _finite_number(lm35.get("temperature"))

    gps = sensors.get("gps")
    health["gps"] = (
        isinstance(gps, dict)
        and isinstance(gps.get("fix"), bool)
        and gps.get("fix")
        and _finite_number(gps.get("latitude"))
        and _finite_number(gps.get("longitude"))
        and _finite_number(gps.get("satellites"))
    )
    return health


def validation_errors(packet: Any, health: dict[str, bool]) -> list[str]:
    errors: list[str] = []
    if not isinstance(packet, dict):
        return ["packet must be a JSON object"]
    if not isinstance(packet.get("timestamp"), (int, float)) or isinstance(packet.get("timestamp"), bool):
        errors.append("timestamp must be numeric")
    if not isinstance(packet.get("sensors"), dict):
        errors.append("sensors must be an object")
    errors.extend(f"{name} is missing or invalid" for name, valid in health.items() if not valid)
    return errors


def extract_features(packet: dict[str, Any]) -> list[float] | None:
    health = validate_sensor_packet(packet)
    if not all(health.values()):
        return None
    sensors = packet["sensors"]
    imu = sensors["imu"]
    bmp = sensors["bmp280"]
    return [
        float(imu[field]) for field in IMU_FIELDS
    ] + [float(bmp["pressure"]), float(bmp["temperature"]), float(sensors["lm35"]["temperature"])]
