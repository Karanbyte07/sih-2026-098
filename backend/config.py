from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    serial_port: str = os.getenv("SERIAL_PORT", "COM3")
    serial_baud: int = int(os.getenv("SERIAL_BAUD", "115200"))
    auto_serial: bool = os.getenv("AUTO_SERIAL", "true").lower() in {"1", "true", "yes", "on"}
    serial_reconnect_seconds: float = float(os.getenv("SERIAL_RECONNECT_SECONDS", "2"))
    anomaly_warmup_samples: int = int(os.getenv("ANOMALY_WARMUP_SAMPLES", "20"))
    anomaly_contamination: float = float(os.getenv("ANOMALY_CONTAMINATION", "0.05"))
    database_path: Path = Path(os.getenv("DATABASE_PATH", "data/sensors.db"))


settings = Settings()
