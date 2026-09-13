# ESP32 Sensor Demonstrator Backend

A backend-only FastAPI service for an inert SIH electronics demonstrator. It reads newline-delimited JSON telemetry from an ESP32 over USB Serial, validates sensor health, detects abnormal sensor readings, logs data to SQLite, and broadcasts processed packets over WebSocket.

No frontend, targeting, firing, impact prediction, detonation, fuze, canard, or physical activation logic is included. The demo state machine always reports `physical_action: NONE`.

## Architecture

`ESP32 -> SensorData -> State Estimation + Digital Twin -> Deviation/Error -> Guidance Simulation -> UpdatedState -> Analytics -> Overview`

- `sensors/serial_reader.py`: reconnectable PySerial reader.
- `sensors/validator.py`: structure, numeric, finite-value, and GPS-fix checks.
- `ai/anomaly_detector.py`: sensor-only Scikit-learn IsolationForest with calibration.
- `state/estimator.py`: converts validated sensor data into `EstimatedState`.
- `state/digital_twin.py`: creates `SimulatedState` and calculates deviation from the estimate.
- `state/guidance.py`: monitor-only guidance simulation; it never activates hardware.
- `data/analytics.py`: calculates health and deviation metrics for an overview.
- `state/demo_state_machine.py`: `SAFE`, `MONITORING`, and `SENSOR_ALERT` states.
- `database/logger.py`: local SQLite persistence.
- `main.py`: FastAPI lifecycle, REST routes, and WebSocket broadcast.

## Installation

Requires Python 3.11 or newer.

```powershell
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set the serial port. Windows examples are `COM3` or `COM5`.

```powershell
Copy-Item .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Configuration

- `SERIAL_PORT`: USB serial port, default `COM3`.
- `SERIAL_BAUD`: default `115200`.
- `AUTO_SERIAL`: set `false` to run without attempting a serial connection.
- `SERIAL_RECONNECT_SECONDS`: reconnect delay.
- `ANOMALY_WARMUP_SAMPLES`: valid samples needed before the model is ready.
- `DATABASE_PATH`: default `data/sensors.db`.

## Hardware setup

- **ESP32 + MPU6050:** connect SDA to GPIO 21, SCL to GPIO 22, 3.3V, and GND. The included sketch reads the MPU6050 at I2C address `0x68`.
- **BMP280:** use the same I2C bus and confirm its address, commonly `0x76` or `0x77`. The sketch includes marked placeholder functions for the BMP280 library integration.
- **LM35:** connect output to an ESP32 ADC-capable pin, with the included example using GPIO 34. Calibrate the ADC reference for your board.
- **NEO-M8N GPS:** connect the module to a spare ESP32 hardware UART, share GND, and parse NMEA sentences. The sketch contains marked GPS placeholders.
- **OLED, LEDs, buttons, buzzer:** these are outside the telemetry backend contract. Never connect them to backend activation logic; the supplied backend does not issue hardware commands.

Install the ESP32 board package in Arduino IDE, select the matching ESP32 board, upload `esp32_example/esp32_sensor_demo.ino`, and open Serial Monitor at 115200 baud. The sketch sends one JSON object per line.

## API

- `GET /api/status`: backend, configured port, serial connection, auto-serial flag, and WebSocket client count.
- `GET /api/latest`: most recently processed packet, or `null`. The response includes `estimated_state`, `simulated_state`, `deviation`, `guidance`, and `analytics`.
- `POST /api/sensor-data`: submit an ESP32-shaped JSON object manually.
- `POST /api/demo/reset`: return the safe demo state to `SAFE`.
- `WS /ws`: receives the latest packet on connect and every subsequent processed packet, including the architecture stages.

The packet format is shown in `sample_sensor.json`. A packet is valid for anomaly detection only when all four sensors are healthy and GPS has a fix. During warmup, AI status is `CALIBRATING`; malformed or incomplete packets produce `INCOMPLETE`.

## Test without ESP32

With the server running, from PowerShell:

```powershell
$body = Get-Content .\sample_sensor.json -Raw
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/sensor-data -ContentType 'application/json' -Body $body
Invoke-RestMethod -Uri http://localhost:8000/api/status
Invoke-RestMethod -Uri http://localhost:8000/api/latest
```

With Python:

```python
import json
import urllib.request

with open("sample_sensor.json", encoding="utf-8") as file:
    request = urllib.request.Request(
        "http://localhost:8000/api/sensor-data",
        data=json.dumps(json.load(file)).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
print(urllib.request.urlopen(request).read().decode())
```

Send the sample repeatedly to complete calibration. Change a sensor value substantially to exercise anomaly detection after calibration.

## Serial troubleshooting

1. Check Device Manager for the ESP32 COM port and update `SERIAL_PORT`.
2. Close Arduino Serial Monitor before starting Uvicorn because only one process can own the port.
3. Confirm both sides use 115200 baud and that each JSON packet ends with a newline.
4. Set `AUTO_SERIAL=false` to test REST endpoints without hardware.
5. Invalid JSON and disconnected ports are logged and retried; they do not stop the API.

## Database

SQLite is created automatically at `data/sensors.db`. The `sensor_readings` table stores timestamp, source, sensor JSON, health, AI result, demo state, and creation time. No external database server is required.
