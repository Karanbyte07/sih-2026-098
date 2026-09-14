"""
find_port.py  —  Run this to auto-detect your Arduino/ESP32 COM port.

Usage:
    python find_port.py
"""
import serial.tools.list_ports

def find_arduino_port():
    ports = list(serial.tools.list_ports.comports())

    if not ports:
        print("\n[NO PORTS] No COM ports found at all.")
        print("    -> Driver not installed. See instructions below.\n")
        print("=" * 55)
        print("  INSTALL THE CH340 DRIVER (most Arduino clones):")
        print("  https://www.wch-ic.com/downloads/CH341SER_EXE.html")
        print()
        print("  OR install full Arduino IDE (also installs drivers):")
        print("  https://www.arduino.cc/en/software")
        print("=" * 55)
        return None

    print(f"\n[FOUND] {len(ports)} serial port(s):\n")
    for i, p in enumerate(ports, 1):
        print(f"  [{i}] {p.device:10s}  —  {p.description}")
        if p.manufacturer:
            print(f"           Manufacturer: {p.manufacturer}")

    # Heuristic: prefer ports that mention Arduino, CH340, CP210, FTDI, USB Serial
    keywords = ["arduino", "ch340", "ch341", "cp210", "ftdi", "usb serial", "usb-serial", "esp"]
    candidates = [
        p for p in ports
        if any(k in (p.description or "").lower() or k in (p.manufacturer or "").lower() for k in keywords)
    ]

    if candidates:
        best = candidates[0]
        print(f"\n[BEST MATCH] Arduino port: {best.device}  ({best.description})")
        print(f"\n    -> Set this in backend/.env:\n")
        print(f"       SERIAL_PORT={best.device}")
    else:
        print("\n[WARNING] Could not auto-identify Arduino port.")
        print("    Plug in the Arduino and run this script again.")
        print("    The new port that appears is your Arduino.\n")

    return candidates[0].device if candidates else None


if __name__ == "__main__":
    find_arduino_port()
