"""
SAPIENS AGENT — ESP32-S3 Serial Telemetry & Breach Bridge
Listens to COM4 and pushes live hardware telemetry & breach triggers directly to SAPIENS Agent.
"""

import serial
import json
import urllib.request
import time
import sys

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

COM_PORT = 'COM4'
BAUD_RATE = 115200
API_URL = 'http://127.0.0.1:3000/api/esp32/events'

latest_temp = 28.5
latest_hum = 65.0

def post_event(payload):
    global latest_temp, latest_hum
    try:
        if "temperature" in payload:
            latest_temp = payload["temperature"]
        if "humidity" in payload:
            latest_hum = payload["humidity"]
        data_bytes = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(API_URL, data=data_bytes, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            res_json = json.loads(resp.read().decode('utf-8'))
            is_anomaly = res_json.get('anomalyFlag', False)
            suppressed = res_json.get('suppressedByPolicy', False)
            
            if is_anomaly and not suppressed:
                print(f"[🚨 BREACH DISPATCHED] Actual Temp: {payload.get('temperature')}°C | Vault Door: {payload.get('doorOpen')} -> Dispatched to Discord & WhatsApp!", flush=True)
            elif is_anomaly and suppressed:
                print(f"[🛡️ DEFROST SUPPRESSED] Temp: {payload.get('temperature')}°C -> Policy #1 active.", flush=True)
            else:
                print(f"[● Telemetry Stream] Actual Temp: {payload.get('temperature')}°C | Hum: {payload.get('humidity')}%", flush=True)
    except Exception as post_err:
        print(f"[-] HTTP POST error: {post_err}", flush=True)

print(f"[*] Starting SAPIENS Serial Bridge on {COM_PORT} at {BAUD_RATE} baud...", flush=True)
print(f"[*] Forwarding to {API_URL}", flush=True)

while True:
    try:
        ser = serial.Serial(COM_PORT, BAUD_RATE, timeout=2)
        print(f"[+] Connected to {COM_PORT}! Listening for physical hardware events...", flush=True)
        
        while True:
            raw_line = ser.readline()
            if not raw_line:
                continue
            line = raw_line.decode('utf-8', errors='ignore').strip()
            if not line:
                continue
            
            # Print incoming serial activity
            if "[DHT" in line or "[BOOT" in line or "[TELEMETRY" in line:
                print(f"[COM4] {line}", flush=True)
            
            if "[TELEMETRY_JSON]" in line:
                json_part = line.split("[TELEMETRY_JSON]", 1)[1].strip()
                try:
                    payload = json.loads(json_part)
                    post_event(payload)
                except Exception as parse_err:
                    print(f"[-] JSON parse error: {parse_err}", flush=True)
                    
            elif "[BOOT ALARM]" in line:
                print(f"[🔥 BUTTON TRIGGER DETECTED] BOOT button pressed on {COM_PORT}! Dispatching breach alert...", flush=True)
                post_event({
                    "deviceId": "ESP32-S3-COLD-01",
                    "temperature": latest_temp,
                    "humidity": latest_hum,
                    "doorOpen": True,
                    "isBootBreach": True,
                    "sensorConnected": True,
                    "packetCount": 999
                })
                
    except serial.SerialException as se:
        print(f"[!] Serial port {COM_PORT} not ready ({se}). Retrying in 2s...", flush=True)
        time.sleep(2)
    except Exception as ex:
        print(f"[-] Unexpected error: {ex}. Retrying...", flush=True)
        time.sleep(2)
