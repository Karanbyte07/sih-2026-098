from __future__ import annotations

from typing import Any


class DemoStateMachine:
    def __init__(self) -> None:
        self.state = "SAFE"

    def update(self, health: dict[str, bool], ai_result: dict[str, Any]) -> dict[str, str]:
        event = "NONE"
        if ai_result.get("status") == "ANOMALY":
            if self.state != "SENSOR_ALERT":
                event = "SENSOR_ANOMALY"
            self.state = "SENSOR_ALERT"
        elif all(health.values()) and ai_result.get("status") in {"CALIBRATING", "NORMAL"}:
            if self.state == "SAFE":
                event = "SENSORS_AVAILABLE"
            self.state = "MONITORING"
        else:
            self.state = "SAFE"
        return {"state": self.state, "physical_action": "NONE", "event": event}

    def reset(self) -> dict[str, str]:
        self.state = "SAFE"
        return {"state": self.state, "physical_action": "NONE", "event": "RESET"}
