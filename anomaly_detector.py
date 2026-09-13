from __future__ import annotations

import threading
from typing import Any

import numpy as np
from sklearn.ensemble import IsolationForest

from sensors.validator import extract_features


class SensorAnomalyDetector:
    def __init__(self, warmup_samples: int = 20, contamination: float = 0.05):
        self.warmup_samples = max(2, warmup_samples)
        self.contamination = contamination
        self._samples: list[list[float]] = []
        self._model: IsolationForest | None = None
        self._lock = threading.Lock()

    def analyze(self, packet: dict[str, Any]) -> dict[str, Any]:
        features = extract_features(packet)
        if features is None:
            return {"status": "INCOMPLETE", "anomaly_score": 0.0, "model_ready": self._model is not None}

        with self._lock:
            if self._model is None:
                self._samples.append(features)
                if len(self._samples) < self.warmup_samples:
                    return {"status": "CALIBRATING", "anomaly_score": 0.0, "model_ready": False}
                self._model = IsolationForest(
                    n_estimators=100,
                    contamination=self.contamination,
                    random_state=42,
                ).fit(np.asarray(self._samples, dtype=float))

            decision = float(self._model.decision_function(np.asarray([features], dtype=float))[0])
            prediction = int(self._model.predict(np.asarray([features], dtype=float))[0])
            score = float(np.clip(0.5 + decision, 0.0, 1.0))
            return {
                "status": "ANOMALY" if prediction == -1 else "NORMAL",
                "anomaly_score": round(score, 4),
                "model_ready": True,
            }
