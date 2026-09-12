/**
 * SAPIENS SENTINEL — Unified ESP32-S3 Multi-Modal Hardware Edge Agent
 * 
 * Hardware Setup:
 *   1. ESP32-S3-DevKitC-1 (Controller)
 *   2. 0.96" SSD1306 I2C OLED (128x64) -> SDA: GPIO 8, SCL: GPIO 9
 *   3. INMP441 I2S MEMS Microphone     -> SCK: GPIO 12, WS: GPIO 13, SD: GPIO 14 (L/R to GND)
 *   4. DHT11 / DHT22 Sensor            -> DATA: GPIO 4 (VCC: 3.3V, GND: GND)
 *   5. Piezo Buzzer                    -> POS (+): GPIO 5, NEG (-): GND
 *   6. BOOT Button                     -> GPIO 0 (Hold to trigger manual test breach)
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include <driver/i2s.h>

// ═══════════════════════════════════════════════════════
// PIN DEFINITIONS
// ═══════════════════════════════════════════════════════
#define OLED_SDA_PIN      8
#define OLED_SCL_PIN      9
#define I2S_SCK_PIN       12
#define I2S_WS_PIN        13
#define I2S_SD_PIN        14
#define DHT_PIN           4
#define BUZZER_PIN        5
#define BUTTON_TEST_PIN   0

// DHT Sensor Type (Change to DHT11 if your sensor is blue, or DHT22 if white)
#define DHT_TYPE          DHT22

// OLED Display Configuration
#define SCREEN_WIDTH      128
#define SCREEN_HEIGHT     64
#define OLED_RESET        -1

// ═══════════════════════════════════════════════════════
// WI-FI & SAPIENS AGENT CLOUD ENDPOINT
// ═══════════════════════════════════════════════════════
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// Local development IP or deployed Railway URL
// Example local: "http://192.168.1.50:3000/api/esp32/events"
const char* SERVER_ENDPOINT = "http://192.168.1.50:3000/api/esp32/events";

// ═══════════════════════════════════════════════════════
// PERIPHERALS & GLOBAL STATE
// ═══════════════════════════════════════════════════════
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
DHT dht(DHT_PIN, DHT_TYPE);

float currentTemp = -18.2;
float currentHumidity = 82.0;
float currentDb = 42.0;
bool doorOpen = false;
bool alarmActive = false;
bool policySuppressed = false;
String policyRule = "";
unsigned long lastSensorReadTime = 0;
unsigned long lastTelemetrySendTime = 0;
unsigned long lastBuzzerToggleTime = 0;
bool buzzerState = false;
int packetCount = 0;

// ═══════════════════════════════════════════════════════
// I2S MICROPHONE DRIVER SETUP (INMP441)
// ═══════════════════════════════════════════════════════
void setupI2SMic() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = 16000,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = i2s_comm_format_t(I2S_COMM_FORMAT_STAND_I2S),
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 4,
    .dma_buf_len = 128,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK_PIN,
    .ws_io_num = I2S_WS_PIN,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_SD_PIN
  };

  esp_err_t err = i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
  if (err == ESP_OK) {
    i2s_set_pin(I2S_NUM_0, &pin_config);
    Serial.println("INMP441 I2S Microphone initialized successfully!");
  } else {
    Serial.printf("I2S driver installation failed: %d\n", err);
  }
}

// Samples audio buffer and returns calculated sound pressure level (dB)
float readMicDecibels() {
  int32_t samples[64];
  size_t bytesRead = 0;
  esp_err_t result = i2s_read(I2S_NUM_0, &samples, sizeof(samples), &bytesRead, 10);
  
  if (result == ESP_OK && bytesRead > 0) {
    int sampleCount = bytesRead / sizeof(int32_t);
    int64_t sumSquares = 0;
    for (int i = 0; i < sampleCount; i++) {
      int32_t val = samples[i] >> 14; // Normalize 24-bit to manageable range
      sumSquares += (int64_t)val * val;
    }
    double meanSquare = (double)sumSquares / sampleCount;
    double rms = sqrt(meanSquare);
    
    // Scale RMS into approximate 35 - 95 dB SPL range
    if (rms < 5.0) rms = 5.0;
    float db = 20.0 * log10(rms) + 18.0;
    if (db < 32.0) db = 32.0;
    if (db > 98.0) db = 98.0;
    return db;
  }
  return 40.0; // Baseline fallback
}

// ═══════════════════════════════════════════════════════
// PIEZO BUZZER FEEDBACK
// ═══════════════════════════════════════════════════════
void beep(int freq, int durationMs) {
  tone(BUZZER_PIN, freq, durationMs);
  delay(durationMs);
  noTone(BUZZER_PIN);
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
    display.setCursor(8, 2);
    display.print("! ALARM: BREACH !");
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
    display.print("SAPIENS SENTINEL S3");
  }

  display.setTextColor(SSD1306_WHITE);

  // 2. Temperature & Humidity Display
  display.setTextSize(1);
  display.setCursor(2, 16);
  display.printf("TEMP: %+.1f C", currentTemp);
  display.setCursor(76, 16);
  display.printf("HUM: %.0f%%", currentHumidity);

  // 3. Audio / Decibel VU Bar Graph
  display.setCursor(2, 28);
  display.printf("MIC: %.1fdB", currentDb);
  
  // Draw VU-meter bar
  int barWidth = map((int)constrain(currentDb, 35.0, 95.0), 35, 95, 0, 56);
  display.drawRect(68, 28, 58, 8, SSD1306_WHITE);
  if (barWidth > 0) {
    display.fillRect(69, 29, barWidth, 6, SSD1306_WHITE);
  }

  // 4. Status Indicator / Hardware Actions
  display.setCursor(2, 40);
  if (doorOpen) {
    display.print("DOOR: [OPEN] BREACH");
  } else if (currentDb > 78.0) {
    display.print("ACOUSTIC: ANOMALY!");
  } else {
    display.print("HARDWARE: NOMINAL");
  }

  // 5. Cloud Status Footer
  display.setCursor(2, 54);
  display.printf("NET:%s  ACK:%d", (WiFi.status() == WL_CONNECTED ? "OK" : "SIM"), packetCount);

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
    "\"acousticDb\":" + String(currentDb, 1) + ","
    "\"doorOpen\":" + (doorOpen ? "true" : "false") + "}";

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    String response = http.getString();
    packetCount++;

    // Parse policy and anomaly flags
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
  Serial.println("  SAPIENS SENTINEL S3 FIRMWARE BOOTING    ");
  Serial.println("==========================================");

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUTTON_TEST_PIN, INPUT_PULLUP);
  digitalWrite(BUZZER_PIN, LOW);

  // Initial chirp
  beep(1800, 80);

  // Initialize I2C OLED
  Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    display.begin(SSD1306_SWITCHCAPVCC, 0x3D);
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(12, 15);
  display.println("SAPIENS AGENT");
  display.setCursor(12, 30);
  display.println("MULTI-MODAL S3");
  display.setCursor(12, 45);
  display.println("Connecting WiFi...");
  display.display();

  // Initialize DHT Sensor
  dht.begin();

  // Initialize INMP441 Microphone
  setupI2SMic();

  // Connect Wi-Fi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 12) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
    beep(2400, 100);
    delay(50);
    beep(3000, 150);
  } else {
    Serial.println("\nWiFi offline. Running in Autonomous Sentinel Mode.");
  }
}

// ═══════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════
void loop() {
  unsigned long now = millis();

  // 1. Continuous Audio Sampling via INMP441
  float liveDb = readMicDecibels();
  currentDb = (currentDb * 0.7) + (liveDb * 0.3); // Smooth reading

  // Detect loud acoustic spikes (bearing chatter, clapping, shout)
  if (currentDb > 82.0) {
    doorOpen = true; // Flag anomaly trigger
  }

  // Check BOOT button (Manual test breach trigger)
  if (digitalRead(BUTTON_TEST_PIN) == LOW) {
    currentTemp = -8.5; // Trigger critical high temperature breach
    doorOpen = true;
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
    // Auto-recover test triggers if not holding button
    if (digitalRead(BUTTON_TEST_PIN) == HIGH && currentDb <= 80.0) {
      doorOpen = false;
      if (currentTemp > -12.0 && isnan(dht.readTemperature())) {
        currentTemp = -18.2;
      }
    }
  }

  // 4. Handle Buzzer Siren (Pulsing beep if unsuppressed breach)
  if (alarmActive && !policySuppressed) {
    if (now - lastBuzzerToggleTime >= 250) {
      lastBuzzerToggleTime = now;
      buzzerState = !buzzerState;
      if (buzzerState) {
        tone(BUZZER_PIN, 2200);
      } else {
        noTone(BUZZER_PIN);
      }
    }
  } else {
    noTone(BUZZER_PIN);
  }

  // 5. Refresh OLED Display at ~15 FPS
  updateOLED();
  delay(60);
}
