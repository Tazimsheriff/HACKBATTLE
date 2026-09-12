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

// ═══════════════════════════════════════════════════════
// PIN DEFINITIONS
// ═══════════════════════════════════════════════════════
#define OLED_SDA_PIN      8
#define OLED_SCL_PIN      9
#define DHT_PIN           4
#define BUZZER_PIN        5
#define BUTTON_TEST_PIN   0

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
DHT dht(DHT_PIN, DHT_TYPE);

float currentTemp = -18.2;
float currentHumidity = 82.0;
bool doorOpen = false;
bool alarmActive = false;
bool policySuppressed = false;
bool buzzerBeeping = false;
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

  // 2. Large Temperature Readout
  display.setTextSize(2);
  display.setCursor(4, 16);
  display.printf("%+.1f C", currentTemp);

  // 3. Humidity & Buzzer Indicator
  display.setTextSize(1);
  display.setCursor(4, 36);
  display.printf("HUM: %.1f%%", currentHumidity);

  display.setCursor(72, 36);
  if (buzzerBeeping) {
    display.print("[BUZZ:ON]");
  } else if (doorOpen) {
    display.print("[OPEN]");
  } else {
    display.print("[SEALED]");
  }

  // 4. Status Bar Divider
  display.drawLine(0, 49, SCREEN_WIDTH, 49, SSD1306_WHITE);

  // 5. Cloud Connection & Packet Footer
  display.setCursor(2, 54);
  display.printf("NET:%s  ACK:#%d", (WiFi.status() == WL_CONNECTED ? "OK" : "DISC"), packetCount);

  // Small activity heartbeat dot
  if ((millis() / 500) % 2 == 0) {
    display.fillCircle(122, 57, 2, SSD1306_WHITE);
  }

  display.display();
}

// ═══════════════════════════════════════════════════════
// HTTP TELEMETRY DISPATCH TO SAPIENS AGENT
// ═══════════════════════════════════════════════════════
void sendTelemetryToAgent() {
  if (WiFi.status() != WL_CONNECTED) {
    packetCount++;
    return;
  }

  HTTPClient http;
  http.begin(SERVER_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);

  String jsonPayload = 
    "{\"deviceId\":\"ESP32-S3-COLD-01\","
    "\"temperature\":" + String(currentTemp, 1) + ","
    "\"humidity\":" + String(currentHumidity, 1) + ","
    "\"doorOpen\":" + (doorOpen ? "true" : "false") + "}";

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    String response = http.getString();
    packetCount++;

    // Check if AI policy engine suppressed the alert
    if (response.indexOf("\"suppressedByPolicy\":true") >= 0) {
      policySuppressed = true;
      alarmActive = false;
      noTone(BUZZER_PIN);
    } else {
      policySuppressed = false;
      if (response.indexOf("\"anomalyFlag\":true") >= 0) {
        alarmActive = true;
      } else {
        alarmActive = false;
        noTone(BUZZER_PIN);
      }
    }
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
  bool buttonPressed = (digitalRead(BUTTON_TEST_PIN) == LOW);
  if (buttonPressed) {
    currentTemp = -8.2; // Critical thermal breach above threshold
    doorOpen = true;
    alarmActive = true;
    policySuppressed = false;
  }

  // 2. Read Physical DHT Sensor Every 2 Seconds
  if (now - lastSensorReadTime >= 2000) {
    lastSensorReadTime = now;
    float readT = dht.readTemperature();
    float readH = dht.readHumidity();

    if (!isnan(readT)) {
      currentTemp = readT;
    }
    if (!isnan(readH)) {
      currentHumidity = readH;
    }
  }

  // 3. Dispatch Telemetry to SAPIENS Agent Every 4 Seconds
  if (now - lastTelemetrySendTime >= 4000) {
    lastTelemetrySendTime = now;
    sendTelemetryToAgent();

    // Auto-recover test breach if button is released
    if (!buttonPressed) {
      doorOpen = false;
      if (currentTemp > -12.0 && isnan(dht.readTemperature())) {
        currentTemp = -18.2;
        alarmActive = false;
      }
    }
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
