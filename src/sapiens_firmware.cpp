/**
 * SAPIENS SENTINEL — Compact Hardware Edge Agent
 * 
 * Hardware:
 *   1. ESP32-S3-DevKitC-1 (Controller)
 *   2. 0.96" SSD1306 I2C OLED (128x64) -> SDA: GPIO 8, SCL: GPIO 9
 *   3. DHT11 / DHT22 Sensor            -> DATA: GPIO 4 (VCC: 3.3V, GND: GND)
 *   4. Piezo Buzzer                    -> POS (+): GPIO 5, NEG (-): GND
 *   5. BOOT Button                     -> GPIO 0 (Hold to test thermal breach / siren)
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

#define OLED_SDA_PIN      8
#define OLED_SCL_PIN      9
#define BUZZER_PIN        5
#define BUTTON_TEST_PIN   0

// Candidate pins for DHT DATA (Supports GPIO 10 and GPIO 4)
const int DHT_PINS[] = { 10, 4 };
int currentPinIndex = 0;
#define ACTIVE_DHT_PIN    (DHT_PINS[currentPinIndex])

// DHT Sensor Type: DHT22 (white) or DHT11 (blue)
#define DHT_TYPE          DHT22

// OLED Display Configuration
#define SCREEN_WIDTH      128
#define SCREEN_HEIGHT     64
#define OLED_RESET        -1

// ═══════════════════════════════════════════════════════
// WI-FI & SAPIENS AGENT CLOUD ENDPOINT
// ═══════════════════════════════════════════════════════
const char* WIFI_SSID = "TAZIM-LAPTOP 4453";
const char* WIFI_PASS = "123456789";

// Windows Mobile Hotspot Gateway IP
const char* SERVER_ENDPOINT = "http://192.168.137.1:3000/api/esp32/events";

// ═══════════════════════════════════════════════════════
// PERIPHERALS & GLOBAL STATE
// ═══════════════════════════════════════════════════════
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
DHT dht(10, DHT_TYPE);

float currentTemp = -18.2;
float currentHumidity = 82.0;
bool doorOpen = false;
bool alarmActive = false;
bool policySuppressed = false;
bool buzzerBeeping = false;
bool isDht11 = false;
bool sensorDetected = false;
int detectedPin = 10;
unsigned long lastSensorReadTime = 0;
unsigned long lastTelemetrySendTime = 0;
unsigned long lastBuzzerToggleTime = 0;
bool buzzerState = false;
int packetCount = 0;

// ═══════════════════════════════════════════════════════
// DUAL ACTIVE & PASSIVE PIEZO BUZZER DRIVER
// ═══════════════════════════════════════════════════════
void soundBuzzer(int freq = 2400) {
  buzzerBeeping = true;
  tone(BUZZER_PIN, freq);
  digitalWrite(BUZZER_PIN, HIGH);
}

void silenceBuzzer() {
  buzzerBeeping = false;
  noTone(BUZZER_PIN);
  digitalWrite(BUZZER_PIN, LOW);
}

void beep(int freq, int durationMs) {
  soundBuzzer(freq);
  delay(durationMs);
  silenceBuzzer();
}

// ═══════════════════════════════════════════════════════
// OLED STATUS RENDERING
// ═══════════════════════════════════════════════════════
void updateOLED() {
  display.clearDisplay();

  // 1. Top Header Banner
  if (alarmActive && !policySuppressed) {
    display.fillRect(0, 0, SCREEN_WIDTH, 12, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK);
    display.setTextSize(1);
    display.setCursor(4, 2);
    display.print("! SIREN: ALARM ON !");
  } else if (policySuppressed) {
    display.fillRect(0, 0, SCREEN_WIDTH, 12, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK);
    display.setTextSize(1);
    display.setCursor(6, 2);
    display.print("POL#1: DEFROST HOLD");
  } else {
    display.fillRect(0, 0, SCREEN_WIDTH, 12, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK);
    display.setTextSize(1);
    display.setCursor(4, 2);
    display.print("SAPIENS COLD-CHAIN");
  }

  display.setTextColor(SSD1306_WHITE);

  // 2. Large Centered Temperature Readout (Exclusively on Row 2)
  if (sensorDetected) {
    display.setTextSize(2);
    display.setCursor(16, 16);
    display.printf("%+.1f C", currentTemp);

    // 3. Row 3: Relative Humidity (Left) & Storage Seal Status (Right)
    display.setTextSize(1);
    display.setCursor(4, 36);
    display.printf("RH:%.0f%%", currentHumidity);

    display.setCursor(76, 36);
    if (buzzerBeeping) {
      display.print("[ALARM]");
    } else if (doorOpen) {
      display.print("[ OPEN]");
    } else {
      display.print("[SEALED]");
    }
  } else {
    display.setTextSize(1);
    display.setCursor(4, 16);
    display.print("DHT: NO SENSOR DATA");
    display.setCursor(4, 26);
    display.print("CHECK GPIO 10 OR 4");
    display.setCursor(4, 36);
    display.printf("SCANNING GPIO %d...", ACTIVE_DHT_PIN);
  }

  // 4. Status Bar Divider Line
  display.drawLine(0, 48, SCREEN_WIDTH, 48, SSD1306_WHITE);

  // 5. Cloud Connection & Packet Footer (Shows DHT22 Pin & Packet Count)
  display.setCursor(2, 53);
  display.printf("NET:%s DHT22:P%d #%d", (WiFi.status() == WL_CONNECTED ? "OK" : "DISC"), detectedPin, packetCount);

  // Small activity heartbeat dot
  if ((millis() / 500) % 2 == 0) {
    display.fillCircle(123, 56, 2, SSD1306_WHITE);
  }

  display.display();
}

// ═══════════════════════════════════════════════════════
// HTTP TELEMETRY DISPATCH TO SAPIENS AGENT
// ═══════════════════════════════════════════════════════
void sendTelemetryToAgent() {
  String jsonPayload = 
    "{\"deviceId\":\"ESP32-S3-COLD-01\","
    "\"temperature\":" + String(currentTemp, 1) + ","
    "\"humidity\":" + String(currentHumidity, 1) + ","
    "\"sensorConnected\":" + (sensorDetected ? "true" : "false") + ","
    "\"detectedPin\":" + String(detectedPin) + ","
    "\"sensorModel\":\"" + String(isDht11 ? "DHT11" : "DHT22") + "\","
    "\"packetCount\":" + String(packetCount) + ","
    "\"doorOpen\":" + (doorOpen ? "true" : "false") + ","
    "\"isBootBreach\":" + (alarmActive ? "true" : "false") + "}";

  // Always emit telemetry to Serial so COM4 USB bridge can ingest instantly
  Serial.print("[TELEMETRY_JSON] ");
  Serial.println(jsonPayload);

  if (WiFi.status() != WL_CONNECTED) {
    packetCount++;
    return;
  }

  HTTPClient http;
  http.begin(SERVER_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    packetCount++;
  } else {
    Serial.printf("Telemetry POST failed: %d\n", httpCode);
  }
  http.end();
}

// ═══════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n==========================================");
  Serial.println("  SAPIENS SENTINEL ESP32-S3 INITIALIZING  ");
  Serial.println("==========================================");

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUTTON_TEST_PIN, INPUT_PULLUP);
  silenceBuzzer();

  // Test Buzzer on Boot (3 distinct audible test beeps)
  Serial.println("Testing buzzer on GPIO 5...");
  for (int b = 0; b < 3; b++) {
    soundBuzzer(2000 + (b * 300));
    delay(140);
    silenceBuzzer();
    delay(80);
  }

  // Initialize I2C OLED (SSD1306 on GPIO 8 & 9)
  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    display.begin(SSD1306_SWITCHCAPVCC, 0x3D);
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(14, 15);
  display.println("SAPIENS AGENT");
  display.setCursor(14, 30);
  display.println("COLD-CHAIN S3");
  display.setCursor(14, 45);
  display.println("Connecting WiFi...");
  display.display();

  // Initialize DHT Sensor
  dht.begin();

  // Connect to Laptop Mobile Hotspot
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to Hotspot: ");
  Serial.println(WIFI_SSID);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected! Assigned IP: " + WiFi.localIP().toString());
    beep(2400, 100);
    delay(50);
    beep(3000, 150);
  } else {
    Serial.println("\nWiFi not connected yet. Running in Autonomous Simulation Mode.");
  }
}

// ═══════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════
void loop() {
  unsigned long now = millis();

  // 1. Check BOOT Button (Hold to trigger instant test breach & siren)
  static bool lastBtnState = false;
  bool buttonPressed = (digitalRead(BUTTON_TEST_PIN) == LOW);
  if (buttonPressed) {
    doorOpen = true;
    alarmActive = true;
    policySuppressed = false;
    if (!lastBtnState) {
      lastTelemetrySendTime = now;
      Serial.println("[BOOT ALARM] Button pressed! Critical thermal breach triggered.");
      sendTelemetryToAgent(); // Immediate dispatch!
    }
  } else {
    doorOpen = false;
    alarmActive = false;
  }
  lastBtnState = buttonPressed;

  // Auto-reconnect WiFi if disconnected
  static unsigned long lastWiFiRetry = 0;
  if (WiFi.status() != WL_CONNECTED && now - lastWiFiRetry >= 5000) {
    lastWiFiRetry = now;
    WiFi.reconnect();
  }

  // 2. Read Physical DHT Sensor Every 2 Seconds (Auto-scans GPIO 10 & GPIO 4, DHT22 & DHT11)
  if (now - lastSensorReadTime >= 2000) {
    lastSensorReadTime = now;
    float readT = dht.readTemperature();
    float readH = dht.readHumidity();

    if (isnan(readT) || isnan(readH)) {
      // Cycle pin and sensor type
      currentPinIndex = (currentPinIndex + 1) % 2;
      isDht11 = (currentPinIndex == 0) ? !isDht11 : isDht11;
      int testPin = ACTIVE_DHT_PIN;
      dht = DHT(testPin, isDht11 ? DHT11 : DHT22);
      dht.begin();
      delay(40);
      readT = dht.readTemperature();
      readH = dht.readHumidity();
    }

    if (!isnan(readT) && !isnan(readH)) {
      sensorDetected = true;
      detectedPin = ACTIVE_DHT_PIN;
      currentTemp = readT; // Actual real temperature from sensor!
      currentHumidity = readH; // Actual real humidity from sensor!
      Serial.printf("[DHT SUCCESS] Model: %s on GPIO %d | Temp: %.1f C | Hum: %.1f %%\n",
                    (isDht11 ? "DHT11" : "DHT22"), detectedPin, currentTemp, currentHumidity);
    } else {
      sensorDetected = false;
      Serial.printf("[DHT SCAN] Testing GPIO %d (%s)... No signal yet.\n",
                    ACTIVE_DHT_PIN, (isDht11 ? "DHT11" : "DHT22"));
    }
  }

  // 3. Dispatch Telemetry to SAPIENS Agent Every 4 Seconds
  if (now - lastTelemetrySendTime >= 4000) {
    lastTelemetrySendTime = now;
    sendTelemetryToAgent();
  }

  // 4. Handle Buzzer Siren (Pulsing alarm beep on unsuppressed breach)
  if (alarmActive && !policySuppressed) {
    if (now - lastBuzzerToggleTime >= 200) {
      lastBuzzerToggleTime = now;
      buzzerState = !buzzerState;
      if (buzzerState) {
        soundBuzzer(2400);
      } else {
        silenceBuzzer();
      }
    }
  } else {
    silenceBuzzer();
  }

  // 5. Update OLED Display (~20 FPS)
  updateOLED();
  delay(50);
}
