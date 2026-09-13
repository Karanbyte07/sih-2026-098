from __future__ import annotations

from typing import Any


def build_analytics(health: dict[str, bool], ai_result: dict[str, Any], deviation: dict[str, Any]) -> dict[str, Any]:
    healthy = sum(health.values())
    total = len(health)
    return {
        "sensor_health_score": round(healthy / total, 2) if total else 0.0,
        "healthy_sensors": healthy,
        "sensor_count": total,
        "anomaly": ai_result.get("status") == "ANOMALY",
        "model_deviation": deviation.get("status") == "DEVIATION",
        "deviation_magnitude": deviation.get("magnitude", 0.0),
    }