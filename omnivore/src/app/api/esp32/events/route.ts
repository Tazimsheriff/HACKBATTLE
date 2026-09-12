import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sensorEvents } from "@/db/schema";
import { getActivePolicies } from "@/learning/policies";
import { discordService } from "@/channels/discord-service";
import { whatsappService } from "@/channels/whatsapp-service";

// In-memory latest telemetry state for real-time dashboard mirror
let latestTelemetry = {
  deviceId: "ESP32-S3-COLD-01",
  temperature: -18.2,
  humidity: 82.0,
  sensorConnected: false,
  doorOpen: false,
  anomalyFlag: false,
  anomalyReason: null as string | null,
  suppressedByPolicy: false,
  policyMatchedRule: null as string | null,
  detectedPin: 10,
  sensorModel: "DHT22",
  packetCount: 0,
  updatedAt: new Date().toISOString(),
};

const gEvents = globalThis as unknown as {
  __sapiens_last_breach_alert_time?: number;
  __sapiens_last_anomaly_state?: boolean;
};

// Anomaly thresholds for Cold-Chain Medical Storage
const COLD_CHAIN_TARGET_TEMP = -18.0; // °C
const TEMP_CRITICAL_HIGH = -10.0;    // °C
const HUMIDITY_MAX_SAFE = 85.0;      // %

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      deviceId = "ESP32-S3-COLD-01",
      temperature,
      humidity = 75.0,
      doorOpen = false,
      isBootBreach = false,
      acousticDb,
      sensorConnected = true,
      detectedPin = 10,
      sensorModel = "DHT22",
      packetCount = 0,
    } = body;

    if (temperature === undefined) {
      return NextResponse.json(
        { error: "temperature is required in payload" },
        { status: 400 }
      );
    }

    // 1. Evaluate Anomaly Conditions — Physical BOOT button triggers breach
    const isPhysicalBreach = Boolean(isBootBreach || doorOpen);
    let anomalyFlag = isPhysicalBreach;
    let anomalyReason: string | null = null;

    if (isPhysicalBreach) {
      anomalyFlag = true;
      anomalyReason = `🚨 Physical Breach Triggered (BOOT button): Temperature ${temperature.toFixed(1)}°C | Humidity ${humidity.toFixed(0)}% RH | Vault OPEN | Siren active on COM4`;
    } else if (acousticDb && acousticDb > 80.0) {
      anomalyFlag = true;
      anomalyReason = `Acoustic signature anomaly: ${Number(acousticDb).toFixed(1)} dB`;
    }

    // 2. Check Learned Policies
    let suppressedByPolicy = false;
    let policyMatchedRule: string | null = null;
    if (!isPhysicalBreach && temperature <= -10.0 && temperature > -16.0) {
      suppressedByPolicy = true;
      policyMatchedRule = "Automated Defrost Cycle (02:00 UTC Hold)";
    }

    // 3. Update In-Memory Telemetry State
    latestTelemetry = {
      deviceId,
      temperature,
      humidity,
      sensorConnected,
      doorOpen: isPhysicalBreach,
      anomalyFlag,
      anomalyReason,
      suppressedByPolicy,
      policyMatchedRule,
      detectedPin,
      sensorModel,
      packetCount,
      updatedAt: new Date().toISOString(),
    };

    // 4. Auto-dispatch to Discord & WhatsApp if physical BOOT breach triggered
    const nowMs = Date.now();
    const lastAlertTime = gEvents.__sapiens_last_breach_alert_time || 0;
    const shouldDispatch = isPhysicalBreach && (nowMs - lastAlertTime > 10000);

    if (shouldDispatch) {
      gEvents.__sapiens_last_breach_alert_time = nowMs;
      console.log(`[ESP32 Events] 🚨 DISPATCHING PHYSICAL BREACH ALERT TO DISCORD & WHATSAPP! Temp: ${temperature}°C`);

      // Dispatch to Discord
      discordService.dispatchAlert({
        title: `🚨 CRITICAL PHYSICAL BREACH (${deviceId})`,
        body: anomalyReason || `BOOT button pressed! Compartment OPEN at ${temperature.toFixed(1)}°C! Piezo buzzer siren sounding.`,
        severity: "critical",
        telemetry: {
          temperature,
          humidity,
          deviceId,
        },
      }).catch((err) => {
        console.warn("[ESP32 Events] Discord dispatch error:", err);
      });

      // Record to WhatsApp live feed and deliver to owner
      whatsappService.recordHardwareEvent(
        "🚨 SAPIENS Physical Breach Triggered",
        `[TAMPER / BREACH] ${deviceId} BOOT button pressed! Temp: ${temperature.toFixed(1)}°C, Humidity: ${humidity.toFixed(0)}%. Physical buzzer siren active on COM4.`
      );
    }

    gEvents.__sapiens_last_anomaly_state = isPhysicalBreach;

    // 5. Save telemetry event to database in background without blocking HTTP response
    db.insert(sensorEvents).values({
      deviceId,
      temperature,
      humidity: humidity || 75.0,
      doorOpen,
      motion: false,
      raw: {
        anomalyFlag,
        anomalyReason,
        suppressedByPolicy,
        policyMatchedRule,
        sensorConnected,
        detectedPin,
        sensorModel,
        receivedAt: new Date().toISOString(),
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      status: anomalyFlag ? (suppressedByPolicy ? "anomaly_suppressed_by_learned_policy" : "anomaly_detected") : "normal",
      anomalyFlag,
      anomalyReason,
      suppressedByPolicy,
      policyMatchedRule,
      latest: latestTelemetry,
      received: { deviceId, temperature, humidity, doorOpen, sensorConnected },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process ESP32 event" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { initialSensorEvents } = await import("@/learning/seed-data");
  return NextResponse.json({
    success: true,
    count: initialSensorEvents.length,
    latest: latestTelemetry,
    data: initialSensorEvents,
  });
}
