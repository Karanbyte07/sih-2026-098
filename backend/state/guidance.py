from __future__ import annotations

from typing import Any


def simulate_guidance(deviation: dict[str, Any], ai_result: dict[str, Any]) -> dict[str, Any]:
    anomaly = ai_result.get("status") == "ANOMALY"
    deviated = deviation.get("status") == "DEVIATION"
    return {
        "mode": "MONITOR_ONLY",
        "recommendation": "REVIEW_SENSOR_DATA" if anomaly or deviated else "CONTINUE_MONITORING",
        "physical_action": "NONE",
        "reason": "ANOMALY_DETECTED" if anomaly else ("MODEL_DEVIATION" if deviated else "NO_DEVIATION"),
    }