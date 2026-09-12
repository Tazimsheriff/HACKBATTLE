#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1

// User wiring
#define I2C_SDA_PIN 8
#define I2C_SCL_PIN 9

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

uint8_t oled_addr = 0x3C;
bool oled_found = false;
unsigned long counter = 0;

void scanI2C() {
  Serial.println("\n--- Scanning I2C Bus on SDA: 8, SCL: 9 ---");
  byte error, address;
  int nDevices = 0;

  for (address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();

    if (error == 0) {
      Serial.printf("I2C device found at address 0x%02X\n", address);
      if (address == 0x3C || address == 0x3D) {
        oled_addr = address;
        oled_found = true;
      }
      nDevices++;
    } else if (error == 4) {
      Serial.printf("Unknown error at address 0x%02X\n", address);
    }
  }

  if (nDevices == 0) {
    Serial.println("No I2C devices found! Check wiring: SDA->GPIO 8, SCK->GPIO 9, VDD->3V3, GND->GND");
  } else {
    Serial.printf("Scan complete. Total %d device(s) found.\n", nDevices);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==========================================");
  Serial.println("   ESP32-S3 OLED (SSD1306) Controller   ");
  Serial.println("==========================================");

  // Initialize I2C with specified GPIOs
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);

  scanI2C();

  // Try initializing with detected address or default 0x3C
  if (!display.begin(SSD1306_SWITCHCAPVCC, oled_addr)) {
    Serial.printf("SSD1306 initialization failed with address 0x%02X! Retrying 0x3D...\n", oled_addr);
    if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3D)) {
      Serial.println("SSD1306 allocation failed. Halting.");
      return;
    }
    oled_addr = 0x3D;
  }

  Serial.printf("OLED initialized successfully at 0x%02X!\n", oled_addr);

  // Initial splash animation
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(18, 12);
  display.println("ESP32-S3 READY");
  display.drawRect(10, 8, 108, 20, SSD1306_WHITE);
  
  display.setCursor(20, 36);
  display.println("OLED DISPLAY");
  display.setCursor(25, 48);
  display.println("SDA:8 SCL:9");
  display.display();
  delay(2000);
}

void loop() {
  display.clearDisplay();

  // Header Bar
  display.fillRect(0, 0, SCREEN_WIDTH, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setTextSize(1);
  display.setCursor(15, 2);
  display.print("HACKBATTLE // S3");

  // System info
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(2, 16);
  display.printf("Addr: 0x%02X  [I2C OK]", oled_addr);

  // Animated progress bar
  int barWidth = (counter * 4) % 100;
  display.drawRect(2, 28, 104, 8, SSD1306_WHITE);
  display.fillRect(4, 30, barWidth, 4, SSD1306_WHITE);

  // Counter & Uptime
  display.setCursor(2, 40);
  display.printf("Ticks: %lu", counter);

  unsigned long secs = millis() / 1000;
  display.setCursor(2, 52);
  display.printf("Uptime: %02lu:%02lu s", secs / 60, secs % 60);

  // Mini rotating icon / activity indicator
  int phase = (counter % 8);
  int cx = 118, cy = 48, r = 7;
  display.drawCircle(cx, cy, r, SSD1306_WHITE);
  if (phase % 2 == 0) {
    display.fillCircle(cx, cy, 3, SSD1306_WHITE);
  }

  display.display();

  Serial.printf("[RUNNING] Tick: %lu | Uptime: %lus\n", counter, secs);
  counter++;
  delay(200);
}
