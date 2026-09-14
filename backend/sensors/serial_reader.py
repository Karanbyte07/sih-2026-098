from __future__ import annotations

import json
import logging
import threading
import time
from collections.abc import Callable
from typing import Any

import serial
from serial import SerialException

logger = logging.getLogger(__name__)


class SerialReader:
    """Reconnectable newline-delimited JSON reader for an ESP32 USB serial port."""

    def __init__(self, port: str, baudrate: int, on_packet: Callable[[dict[str, Any]], None], reconnect_seconds: float = 2.0):
        self.port = port
        self.baudrate = baudrate
        self.on_packet = on_packet
        self.reconnect_seconds = reconnect_seconds
        self.connected = False
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._serial: serial.Serial | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, name="esp32-serial-reader", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        self._close_serial()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)
        self._thread = None

    def _run(self) -> None:
        while not self._stop_event.is_set():
            try:
                self._serial = serial.Serial(self.port, self.baudrate, timeout=1)
                self.connected = True
                logger.info("Connected to ESP32 on %s", self.port)
                while not self._stop_event.is_set():
                    raw = self._serial.readline()
                    if not raw:
                        continue
                    line = raw.decode("utf-8", errors="replace").strip()
                    if not line:
                        continue  # skip blank / empty lines silently
                    if not line.startswith("{"):
                        logger.debug("Skipping non-JSON serial line: %s", line[:80])
                        continue  # skip human-readable text lines silently
                    try:
                        packet = json.loads(line)
                        if isinstance(packet, dict):
                            self.on_packet(packet)
                        else:
                            logger.warning("Ignoring non-object serial JSON")
                    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                        logger.debug("Ignoring invalid serial JSON: %s", exc)
            except (SerialException, OSError) as exc:
                self.connected = False
                logger.warning("ESP32 serial unavailable on %s: %s", self.port, exc)
            finally:
                self.connected = False
                self._close_serial()
            self._stop_event.wait(self.reconnect_seconds)

    def _close_serial(self) -> None:
        if self._serial is not None:
            try:
                self._serial.close()
            except (SerialException, OSError):
                pass
            self._serial = None
