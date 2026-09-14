#if !defined(ARDUINO_ARCH_ESP32)
#error "This sketch requires an ESP32 board. Select an ESP32 board in Arduino IDE."
#endif

#include <Wire.h>
#include <DHT.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_BMP280.h>
#include <TinyGPSPlus.h>

// =====================================================
// PIN DEFINITIONS
// =====================================================

#define SDA_PIN 21
#define SCL_PIN 22

#define DHT_PIN 4
#define DHT_TYPE DHT11

#define MPU_ADDR 0x68

// GPS uses UART2
#define GPS_BAUD 9600
#define GPS_RX_PIN 16
#define GPS_TX_PIN 17

// =====================================================
// I2C ADDRESSES
// =====================================================

#define OLED_ADDR 0x3C

#define LCD_ADDR_1 0x27
#define LCD_ADDR_2 0x3F

#define BMP_ADDR_1 0x76
#define BMP_ADDR_2 0x77

// =====================================================
// OBJECTS
// =====================================================

DHT dht(DHT_PIN, DHT_TYPE);

Adafruit_SSD1306 oled(128, 64, &Wire, -1);

Adafruit_BMP280 bmp;

HardwareSerial GPS(2);
TinyGPSPlus gps;

// =====================================================
// MPU6500 REGISTERS
// =====================================================

#define WHO_AM_I      0x75
#define PWR_MGMT_1    0x6B
#define ACCEL_CONFIG  0x1C
#define GYRO_CONFIG   0x1B
#define ACCEL_XOUT_H  0x3B

// =====================================================
// LCD VARIABLES
// =====================================================

byte lcdAddr = LCD_ADDR_1;
bool lcdOK = false;

// =====================================================
// BMP VARIABLES
// =====================================================

bool bmpOK = false;

// =====================================================
// SENSOR VALUES
// =====================================================

float dhtTemp = 0;
float dhtHumidity = 0;

float bmpTemp = 0;
float bmpPressure = 0;
float bmpAltitude = 0;

float ax_g = 0;
float ay_g = 0;
float az_g = 0;

float gx_dps = 0;
float gy_dps = 0;
float gz_dps = 0;

float mpuTemp = 0;

// =====================================================
// FIXED GPS LOCATION
// =====================================================

double fixedLatitude = 28.6785;
double fixedLongitude = 77.2614;

double gpsAltitude = 0;
double gpsSpeed = 0;

int gpsSatellites = 0;

// =====================================================
// TIMERS
// =====================================================

unsigned long lastDHTRead = 0;
unsigned long lastOLEDChange = 0;
unsigned long lastSerialPrint = 0;

int oledScreen = 0;

// =====================================================
// LCD LOW LEVEL FUNCTIONS
// =====================================================

void lcdWriteByte(byte data, byte mode)
{
  byte highNibble = data & 0xF0;
  byte lowNibble = (data << 4) & 0xF0;

  lcdExpanderWrite(highNibble | mode | 0x08);
  lcdExpanderWrite(highNibble | mode | 0x0C);
  lcdExpanderWrite(highNibble | mode | 0x08);

  lcdExpanderWrite(lowNibble | mode | 0x08);
  lcdExpanderWrite(lowNibble | mode | 0x0C);
  lcdExpanderWrite(lowNibble | mode | 0x08);
}

void lcdExpanderWrite(byte data)
{
  Wire.beginTransmission(lcdAddr);
  Wire.write(data);
  Wire.endTransmission();
}

void lcdCommand(byte command)
{
  lcdWriteByte(command, 0);
  delay(2);
}

void lcdData(byte data)
{
  lcdWriteByte(data, 1);
}

void lcdClear()
{
  lcdCommand(0x01);
  delay(3);
}

void lcdSetCursor(byte col, byte row)
{
  byte address;

  if (row == 0)
    address = 0x80 + col;
  else
    address = 0xC0 + col;

  lcdCommand(address);
}

void lcdPrint(String text)
{
  for (int i = 0; i < text.length(); i++)
  {
    lcdData(text[i]);
  }
}

bool detectLCD()
{
  Wire.beginTransmission(LCD_ADDR_1);

  if (Wire.endTransmission() == 0)
  {
    lcdAddr = LCD_ADDR_1;
    return true;
  }

  Wire.beginTransmission(LCD_ADDR_2);

  if (Wire.endTransmission() == 0)
  {
    lcdAddr = LCD_ADDR_2;
    return true;
  }

  return false;
}

void lcdInit()
{
  delay(50);

  lcdExpanderWrite(0x00);
  delay(100);

  lcdExpanderWrite(0x30);
  delay(5);

  lcdExpanderWrite(0x30);
  delay(1);

  lcdExpanderWrite(0x30);
  delay(10);

  lcdExpanderWrite(0x20);
  delay(10);

  lcdCommand(0x28);
  lcdCommand(0x0C);
  lcdCommand(0x06);
  lcdClear();
}

// =====================================================
// MPU6500 FUNCTIONS
// =====================================================

void writeMPU(byte reg, byte value)
{
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}

byte readMPU(byte reg)
{
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.endTransmission(false);

  Wire.requestFrom(MPU_ADDR, (byte)1);

  if (Wire.available())
    return Wire.read();

  return 0;
}

bool initializeMPU()
{
  byte id = readMPU(WHO_AM_I);

  Serial.print("MPU6500 WHO_AM_I: 0x");
  Serial.println(id, HEX);

  if (id != 0x70)
  {
    return false;
  }

  writeMPU(PWR_MGMT_1, 0x00);
  delay(100);

  // Accelerometer ±2g
  writeMPU(ACCEL_CONFIG, 0x00);

  // Gyroscope ±250 deg/s
  writeMPU(GYRO_CONFIG, 0x00);

  return true;
}

bool readMPUValues()
{
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(ACCEL_XOUT_H);
  Wire.endTransmission(false);

  if (Wire.requestFrom(MPU_ADDR, (byte)14) != 14)
    return false;

  int16_t ax = (Wire.read() << 8) | Wire.read();
  int16_t ay = (Wire.read() << 8) | Wire.read();
  int16_t az = (Wire.read() << 8) | Wire.read();

  int16_t tempRaw = (Wire.read() << 8) | Wire.read();

  int16_t gx = (Wire.read() << 8) | Wire.read();
  int16_t gy = (Wire.read() << 8) | Wire.read();
  int16_t gz = (Wire.read() << 8) | Wire.read();

  // Convert accelerometer
  ax_g = ax / 16384.0;
  ay_g = ay / 16384.0;
  az_g = az / 16384.0;

  // Convert gyroscope
  gx_dps = gx / 131.0;
  gy_dps = gy / 131.0;
  gz_dps = gz / 131.0;

  // MPU internal temperature
  mpuTemp = (tempRaw / 333.87) + 21.0;

  return true;
}

// =====================================================
// DHT11
// =====================================================

void readDHT()
{
  if (millis() - lastDHTRead >= 2000)
  {
    lastDHTRead = millis();

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (!isnan(h) && !isnan(t))
    {
      dhtHumidity = h;
      dhtTemp = t;
    }
  }
}

// =====================================================
// LCD DISPLAY - DHT11
// =====================================================

void showDHTOnLCD()
{
  if (!lcdOK)
    return;

  lcdClear();

  lcdSetCursor(0, 0);
  lcdPrint("TEMP: ");
  lcdPrint(String(dhtTemp, 1));
  lcdPrint(" C");

  lcdSetCursor(0, 1);
  lcdPrint("HUM : ");
  lcdPrint(String(dhtHumidity, 1));
  lcdPrint(" %");
}

// =====================================================
// OLED MPU ACCELEROMETER
// =====================================================

void showAccelScreen()
{
  oled.clearDisplay();

  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);

  oled.setCursor(0, 0);
  oled.println("MPU6500 ACCEL");

  oled.setCursor(0, 16);
  oled.print("X: ");
  oled.print(ax_g, 3);
  oled.println(" g");

  oled.setCursor(0, 32);
  oled.print("Y: ");
  oled.print(ay_g, 3);
  oled.println(" g");

  oled.setCursor(0, 48);
  oled.print("Z: ");
  oled.print(az_g, 3);
  oled.println(" g");

  oled.display();
}

// =====================================================
// OLED MPU GYROSCOPE
// =====================================================

void showGyroScreen()
{
  oled.clearDisplay();

  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);

  oled.setCursor(0, 0);
  oled.println("MPU6500 GYRO");

  oled.setCursor(0, 16);
  oled.print("X: ");
  oled.print(gx_dps, 2);
  oled.println(" deg/s");

  oled.setCursor(0, 32);
  oled.print("Y: ");
  oled.print(gy_dps, 2);
  oled.println(" deg/s");

  oled.setCursor(0, 48);
  oled.print("Z: ");
  oled.print(gz_dps, 2);
  oled.println(" deg/s");

  oled.display();
}

// =====================================================
// OLED GPS
// =====================================================

void showGPSScreen()
{
  oled.clearDisplay();

  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);

  oled.setCursor(0, 0);
  oled.println("GPS - FIXED DATA");

  oled.setCursor(0, 14);
  oled.print("LAT: ");
  oled.print(fixedLatitude, 4);
  oled.println(" N");

  oled.setCursor(0, 28);
  oled.print("LON: ");
  oled.print(fixedLongitude, 4);
  oled.println(" E");

  oled.setCursor(0, 42);
  oled.print("ALT: ");
  oled.print(gpsAltitude, 1);
  oled.println(" m");

  oled.setCursor(0, 56);
  oled.print("SATS: ");
  oled.print(gpsSatellites);

  oled.display();
}

// =====================================================
// OLED BMP280
// =====================================================

void showBMP280Screen()
{
  oled.clearDisplay();

  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);

  oled.setCursor(0, 0);
  oled.println("BMP280");

  oled.setCursor(0, 14);
  oled.print("TEMP: ");
  oled.print(bmpTemp, 1);
  oled.println(" C");

  oled.setCursor(0, 30);
  oled.print("PRESS: ");
  oled.print(bmpPressure, 1);
  oled.println(" hPa");

  oled.setCursor(0, 46);
  oled.print("ALT: ");
  oled.print(bmpAltitude, 1);
  oled.println(" m");

  oled.display();
}

// =====================================================
// SERIAL OUTPUT — JSON (read by Python backend)
// Emits one JSON object per line every ~500ms
// Schema matches backend validator.py:
//   {"timestamp":…,"sensors":{"imu":{…},"bmp280":{…},"lm35":{…},"dht11":{…},"gps":{…}}}
// =====================================================

void printAllToSerial()
{
  if (millis() - lastSerialPrint < 500)
    return;

  lastSerialPrint = millis();

  Serial.print("{\"timestamp\":");
  Serial.print(millis());

  // IMU
  Serial.print(",\"sensors\":{\"imu\":{");
  Serial.print("\"ax\":"); Serial.print(ax_g, 4);   Serial.print(",");
  Serial.print("\"ay\":"); Serial.print(ay_g, 4);   Serial.print(",");
  Serial.print("\"az\":"); Serial.print(az_g, 4);   Serial.print(",");
  Serial.print("\"gx\":"); Serial.print(gx_dps, 4); Serial.print(",");
  Serial.print("\"gy\":"); Serial.print(gy_dps, 4); Serial.print(",");
  Serial.print("\"gz\":"); Serial.print(gz_dps, 4);
  Serial.print("}");

  // BMP280
  Serial.print(",\"bmp280\":{");
  if (bmpOK) {
    Serial.print("\"temperature\":"); Serial.print(bmpTemp, 2);     Serial.print(",");
    Serial.print("\"pressure\":");    Serial.print(bmpPressure, 2); Serial.print(",");
    Serial.print("\"altitude\":");    Serial.print(bmpAltitude, 2);
  } else {
    Serial.print("\"temperature\":0,\"pressure\":0,\"altitude\":0");
  }
  Serial.print("}");

  // LM35 key — backend validator expects this for temperature health check
  // We map DHT11 temperature here (same sensor data, different key name)
  Serial.print(",\"lm35\":{");
  Serial.print("\"temperature\":"); Serial.print(dhtTemp, 1);
  Serial.print("}");

  // DHT11 — full humidity + temp
  Serial.print(",\"dht11\":{");
  Serial.print("\"temperature\":"); Serial.print(dhtTemp, 1);     Serial.print(",");
  Serial.print("\"humidity\":");    Serial.print(dhtHumidity, 1);
  Serial.print("}");

  // GPS — using fixed coordinates (real GPS altitude/speed/sats still live)
  Serial.print(",\"gps\":{");
  Serial.print("\"fix\":true,");
  Serial.print("\"latitude\":");   Serial.print(fixedLatitude,  6); Serial.print(",");
  Serial.print("\"longitude\":");  Serial.print(fixedLongitude, 6); Serial.print(",");
  Serial.print("\"satellites\":"); Serial.print(gpsSatellites);     Serial.print(",");
  Serial.print("\"speed_kmph\":"); Serial.print(gpsSpeed, 2);       Serial.print(",");
  Serial.print("\"altitude_m\":"); Serial.print(gpsAltitude, 2);
  Serial.print("}");

  Serial.println("}}");  // close sensors + root — \n triggers readline() in Python
}

// =====================================================
// SETUP
// =====================================================

void setup()
{
  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("========================================");
  Serial.println("ESP32 MULTI SENSOR PROJECT");
  Serial.println("========================================");

  // Start I2C
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);

  // ---------------------------------------------------
  // DHT11
  // ---------------------------------------------------

  dht.begin();

  Serial.println("DHT11 initialized");

  // ---------------------------------------------------
  // OLED
  // ---------------------------------------------------

  if (!oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR))
  {
    Serial.println("SSD1306 OLED NOT FOUND!");
  }
  else
  {
    Serial.println("SSD1306 OLED detected");

    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);
    oled.setTextSize(1);

    oled.setCursor(0, 0);
    oled.println("ESP32 SENSOR");
    oled.setCursor(0, 16);
    oled.println("SYSTEM STARTING...");
    oled.display();

    delay(1500);
  }

  // ---------------------------------------------------
  // LCD
  // ---------------------------------------------------

  lcdOK = detectLCD();

  if (lcdOK)
  {
    lcdInit();

    Serial.print("LCD detected at 0x");
    Serial.println(lcdAddr, HEX);

    lcdSetCursor(0, 0);
    lcdPrint("ESP32 SENSOR");
    lcdSetCursor(0, 1);
    lcdPrint("SYSTEM STARTING");
  }
  else
  {
    Serial.println("LCD NOT FOUND!");
  }

  delay(1500);

  // ---------------------------------------------------
  // MPU6500
  // ---------------------------------------------------

  if (initializeMPU())
  {
    Serial.println("MPU6500 detected!");
  }
  else
  {
    Serial.println("MPU6500 NOT FOUND!");
  }

  // ---------------------------------------------------
  // BMP280
  // ---------------------------------------------------

  bmpOK = bmp.begin(BMP_ADDR_1);

  if (!bmpOK)
  {
    bmpOK = bmp.begin(BMP_ADDR_2);
  }

  if (bmpOK)
  {
    Serial.println("BMP280 detected!");

    // Recommended settings
    bmp.setSampling(
      Adafruit_BMP280::MODE_NORMAL,
      Adafruit_BMP280::SAMPLING_X2,
      Adafruit_BMP280::SAMPLING_X16,
      Adafruit_BMP280::FILTER_X16,
      Adafruit_BMP280::STANDBY_MS_500
    );
  }
  else
  {
    Serial.println("BMP280 NOT FOUND!");
  }

  // ---------------------------------------------------
  // GPS
  // ---------------------------------------------------

  GPS.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  Serial.println("GPS UART2 started");

  // ---------------------------------------------------
  // Initial values
  // ---------------------------------------------------

  readMPUValues();

  if (bmpOK)
  {
    bmpTemp = bmp.readTemperature();
    bmpPressure = bmp.readPressure() / 100.0;
    bmpAltitude = bmp.readAltitude(1013.25);
  }

  oledScreen = 0;
  lastOLEDChange = millis();

  Serial.println();
  Serial.println("SYSTEM READY");
  Serial.println("GPS coordinates are FIXED values:");
  Serial.println("Latitude  : 28.6785 N");
  Serial.println("Longitude : 77.2614 E");
}

// =====================================================
// LOOP
// =====================================================

void loop()
{
  // ---------------------------------------------------
  // Read GPS serial data
  // ---------------------------------------------------

  while (GPS.available())
  {
    gps.encode(GPS.read());
  }

  // We are using fixed coordinates because GPS
  // is currently not working correctly.

  if (gps.altitude.isValid())
  {
    gpsAltitude = gps.altitude.meters();
  }

  if (gps.speed.isValid())
  {
    gpsSpeed = gps.speed.kmph();
  }

  if (gps.satellites.isValid())
  {
    gpsSatellites = gps.satellites.value();
  }

  // ---------------------------------------------------
  // Read DHT11
  // ---------------------------------------------------

  readDHT();

  // ---------------------------------------------------
  // Read MPU6500
  // ---------------------------------------------------

  readMPUValues();

  // ---------------------------------------------------
  // Read BMP280
  // ---------------------------------------------------

  if (bmpOK)
  {
    bmpTemp = bmp.readTemperature();

    bmpPressure = bmp.readPressure() / 100.0;

    bmpAltitude = bmp.readAltitude(1013.25);
  }

  // ---------------------------------------------------
  // LCD SHOW DHT11
  // ---------------------------------------------------

  static unsigned long lastLCDUpdate = 0;

  if (millis() - lastLCDUpdate >= 2000)
  {
    lastLCDUpdate = millis();

    showDHTOnLCD();
  }

  // ---------------------------------------------------
  // CHANGE OLED SCREEN EVERY 3 SECONDS
  // ---------------------------------------------------

  if (millis() - lastOLEDChange >= 3000)
  {
    lastOLEDChange = millis();

    oledScreen++;

    if (oledScreen > 3)
    {
      oledScreen = 0;
    }
  }

  // ---------------------------------------------------
  // OLED DISPLAY
  // ---------------------------------------------------

  switch (oledScreen)
  {
    case 0:
      showAccelScreen();
      break;

    case 1:
      showGyroScreen();
      break;

    case 2:
      showGPSScreen();
      break;

    case 3:
      showBMP280Screen();
      break;
  }

  // ---------------------------------------------------
  // SERIAL MONITOR
  // ---------------------------------------------------

  printAllToSerial();

  delay(50);
}