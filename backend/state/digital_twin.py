from __future__ import annotations

from typing import Any


def simulate_state(estimated_state: dict[str, Any]) -> dict[str, Any]:
    environment = estimated_state.get("environment", {})
    position = estimated_state.get("position", {})
    orientation = estimated_state.get("orientation", {})

    return {
        "available": estimated_state.get("available", False),
        "orientation": {field: orientation.get(field) for field in ("ax", "ay", "az", "gx", "gy", "gz")},
        "environment": {
            "pressure": environment.get("pressure"),
            "temperature": environment.get("temperature"),
            "board_temperature": environment.get("board_temperature"),
        },
        "position": {
            "latitude": position.get("latitude"),
            "longitude": position.get("longitude"),
            "fix": position.get("fix", False),
        },
        "model": "pass-through-baseline",
    }


def calculate_deviation(estimated_state: dict[str, Any], simulated_state: dict[str, Any]) -> dict[str, Any]:
    comparisons = (
        ("orientation", ("ax", "ay", "az", "gx", "gy", "gz")),
        ("environment", ("pressure", "temperature", "board_temperature")),
        ("position", ("latitude", "longitude")),
    )
    values: dict[str, float] = {}
    for group, fields in comparisons:
        estimated = estimated_state.get(group, {})
        simulated = simulated_state.get(group, {})
        for field in fields:
            left = estimated.get(field)
            right = simulated.get(field)
            if isinstance(left, (int, float)) and isinstance(right, (int, float)):
                values[f"{group}.{field}"] = round(float(left) - float(right), 6)

    magnitude = sum(abs(value) for value in values.values())
    return {"values": values, "magnitude": round(magnitude, 6), "status": "MATCH" if magnitude == 0 else "DEVIATION"}