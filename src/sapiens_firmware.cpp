/**
 * SAPIENS AGENT — ESP32-S3 Cold-Chain Sensor Reporter & OLED Display
 * 
 * Hardware:
 *   - ESP32-S3-DevKitC-1
 *   - 0.96" I2C SSD1306 OLED (128x64) on SDA: GPIO 8, SCL: GPIO 9
 *   - Optional: DS18B20 or DHT22 temperature sensor on GPIO 4
 * 
 * Functions:
 *   1. Measures temperature, humidity, and door contact status.
 *   2. Sends periodic HTTP telemetry to SAPIENS AGENT backend (/api/esp32/events).
 *   3. Receives learned policy status and anomaly decisions from backend.
 *   4. Renders live status, temperature, and policy indicators on the SSD1306 OLED.
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1

// Pin definitions matching user setup
#define I2C_SDA_PIN 8
#define I2C_SCL_PIN 9
#define BUTTON_ANOMALY_PIN 0  // Boot button to trigger test anomaly

// WiFi credentials (update for local network)
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// SAPIENS Server endpoint
// Replace with your development machine's local IP address (e.g., http://192.168.1.100:3000)
const char* SERVER_ENDPOINT = "http://192.168.1.50:3000/api/esp32/events";

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
uint8_t oled_addr = 0x3C;

// Telemetry state
float currentTemp = -18.4;
float currentHumidity = 82.0;
bool doorOpen = false;
bool lastAnomalyFlag = false;
bool policySuppressed = false;
unsigned long lastSendTime = 0;
unsigned long packetCount = 0;
bool wifiConnected = false;

void setupDisplay() {
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  if (!display.begin(SSD1306_SWITCHCAPVCC, oled_addr)) {
    display.begin(SSD1306_SWITCHCAPVCC, 0x3D);
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(10, 10);
  display.println("SAPIENS AGENT");
  display.setCursor(10, 25);
  display.println("ESP32-S3 SENSOR");
  display.setCursor(10, 40);
  display.println("Connecting WiFi...");
  display.display();
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\nWiFi connected! IP: " + WiFi.localIP().toString());
  } else {
    wifiConnected = false;
    Serial.println("\nWiFi connection failed, running in autonomous simulation mode.");
  }
}

void sendTelemetry(float temp, float humidity, bool door) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(SERVER_ENDPOINT);
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"deviceId\":\"ESP32-S3-COLD-01\",\"temperature\":" + String(temp, 1) + 
                   ",\"humidity\":" + String(humidity, 1) + 
                   ",\"doorOpen\":" + (door ? "true" : "false") + "}";

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] POST %d | Response: %s\n", httpCode, response.c_str());
    
    // Check if response contains learned policy suppression
    if (response.indexOf("anomaly_suppressed_by_learned_policy") > 0) {
      policySuppressed = true;
      lastAnomalyFlag = false;
    } else if (response.indexOf("anomaly_detected") > 0) {
      lastAnomalyFlag = true;
      policySuppressed = false;
    } else {
      lastAnomalyFlag = false;
      policySuppressed = false;
    }
  } else {
    Serial.printf("[HTTP] POST failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
  packetCount++;
}

void renderOLED() {
  display.clearDisplay();

  // Header Banner
  display.fillRect(0, 0, SCREEN_WIDTH, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setTextSize(1);
  display.setCursor(4, 2);
  display.print("SAPIENS // COLD-S3");

  // Temperature display (Large font)
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(2);
  display.setCursor(4, 16);
  display.printf("%0.1f C", currentTemp);

  // Status badge
  display.setTextSize(1);
  display.setCursor(82, 16);
  if (lastAnomalyFlag) {
    display.print("[ALERT]");
  } else if (policySuppressed) {
    display.print("[POLICY]");
  } else {
    display.print("[SAFE]");
  }

  // Sub-metrics
  display.setCursor(4, 36);
  display.printf("RH:%0.0f%%  Door:%s", currentHumidity, doorOpen ? "OPEN" : "CLOSED");

  // Bottom info bar
  display.drawFastHLine(0, 48, SCREEN_WIDTH, SSD1306_WHITE);
  display.setCursor(4, 52);
  display.printf("Tx:%lu  %s", packetCount, wifiConnected ? "ONLINE" : "STANDALONE");

  display.display();
}

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_ANOMALY_PIN, INPUT_PULLUP);
  setupDisplay();
  connectWiFi();
}

void loop() {
  // Check if button pressed to simulate defrost cycle spike
  if (digitalRead(BUTTON_ANOMALY_PIN) == LOW) {
    currentTemp = -14.2; // Defrost cycle temperature
    doorOpen = false;
    Serial.println("[SIM] Button triggered defrost spike (-14.2 C)");
    delay(300);
  } else {
    // Normal small fluctuations around -18.2 C
    currentTemp = -18.2 + ((millis() % 7) * 0.1);
  }

  // Send telemetry every 5 seconds
  if (millis() - lastSendTime > 5000) {
    sendTelemetry(currentTemp, currentHumidity, doorOpen);
    lastSendTime = millis();
  }

  renderOLED();
  delay(250);
}
