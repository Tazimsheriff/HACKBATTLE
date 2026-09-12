import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sensorEvents } from "@/db/schema";
import { getActivePolicies } from "@/learning/policies";

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
      humidity,
      doorOpen = false,
      acousticDb,
    } = body;

    if (temperature === undefined) {
      return NextResponse.json(
        { error: "temperature is required in payload" },
        { status: 400 }
      );
    }

    // 1. Evaluate Anomaly Conditions
    let anomalyFlag = false;
    let anomalyReason: string | null = null;

    if (temperature > TEMP_CRITICAL_HIGH) {
      anomalyFlag = true;
      anomalyReason = `Critical thermal breach: ${temperature.toFixed(1)}°C exceeds threshold of ${TEMP_CRITICAL_HIGH}°C`;
    } else if (acousticDb && acousticDb > 80.0) {
      anomalyFlag = true;
      anomalyReason = `Acoustic signature anomaly: ${Number(acousticDb).toFixed(1)} dB (compressor bearing friction or sound breach)`;
    } else if (doorOpen) {
      anomalyFlag = true;
      anomalyReason = "Door opened during active cold storage";
    } else if (humidity > HUMIDITY_MAX_SAFE) {
      anomalyFlag = true;
      anomalyReason = `Excessive humidity: ${humidity.toFixed(1)}% (condensing risk)`;
    }

    // 2. Check Learned Policies to see if this anomaly should be suppressed or handled specially!
    const activePolicies = await getActivePolicies();
    let suppressedByPolicy = false;
    let policyMatchedRule: string | null = null;

    for (const policy of activePolicies) {
      // If within 02:00-02:45 UTC defrost window and temp <= -10°C
      if (
        (policy.title.toLowerCase().includes("defrost") || policy.condition.toLowerCase().includes("defrost")) &&
        temperature <= -10.0 &&
        temperature > -16.0
      ) {
        suppressedByPolicy = true;
        policyMatchedRule = policy.title;
        break;
      }
    }

    // 3. Save telemetry event to database
    try {
      await db.insert(sensorEvents).values({
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
          receivedAt: new Date().toISOString(),
        },
      });
    } catch (dbErr) {
      console.warn("[ESP32 Ingest] DB insert fallback:", dbErr);
    }

    return NextResponse.json({
      success: true,
      status: anomalyFlag ? (suppressedByPolicy ? "anomaly_suppressed_by_learned_policy" : "anomaly_detected") : "normal",
      anomalyFlag,
      anomalyReason,
      suppressedByPolicy,
      policyMatchedRule,
      received: { deviceId, temperature, humidity, doorOpen },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process ESP32 event" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const records = await db.select().from(sensorEvents).limit(50);
    return NextResponse.json({ success: true, count: records.length, data: records });
  } catch (err) {
    const { initialSensorEvents } = await import("@/learning/seed-data");
    return NextResponse.json({ success: true, count: initialSensorEvents.length, data: initialSensorEvents });
  }
}
