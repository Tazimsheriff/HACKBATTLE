import { db } from "../db/client";
import {
  sensorEvents,
  experiences,
  patterns,
  policies,
  approvalRequests,
} from "../db/schema";
import { v4 as uuidv4 } from "uuid";

export const initialSensorEvents = [
  {
    deviceId: "ESP32-S3-COLD-01",
    temperature: -18.4,
    humidity: 82.1,
    doorOpen: false,
    motion: false,
    raw: { compressorRpm: 2400, batteryLevel: 98, ambientTemp: 22.4 },
  },
  {
    deviceId: "ESP32-S3-COLD-01",
    temperature: -18.2,
    humidity: 83.0,
    doorOpen: false,
    motion: false,
    raw: { compressorRpm: 2380, batteryLevel: 98, ambientTemp: 22.5 },
  },
  {
    deviceId: "ESP32-S3-COLD-01",
    temperature: -14.1,
    humidity: 88.5,
    doorOpen: false,
    motion: false,
    raw: { compressorRpm: 0, defrostHeater: true, ambientTemp: 22.6 },
  },
];

export const initialExperiences = [
  {
    id: uuidv4(),
    situation: "Temperature spike to -13.8°C at 02:00 UTC (expected -18.0°C)",
    context: { temp: -13.8, cycle: "defrost", durationMinutes: 32 },
    decision: "Escalate alert to facility manager",
    action: "Triggered Telegram emergency alert to Facility Manager",
    expectedOutcome: "Immediate technician dispatch",
    actualOutcome: "Manager marked False Alarm: standard automated defrost cycle",
    feedback: "Do not alert for defrost cycle if temp stays below -10°C for under 40 minutes.",
    success: false,
    lesson: "Temperature rises during bi-daily defrost cycles do not indicate container seal failure.",
    confidence: 0.85,
    unknownPattern: false,
    processed: true,
  },
  {
    id: uuidv4(),
    situation: "Temperature spike to -14.2°C at 02:05 UTC (expected -18.0°C)",
    context: { temp: -14.2, cycle: "defrost", durationMinutes: 28 },
    decision: "High priority SMS dispatch",
    action: "Triggered high-priority SMS & automated call",
    expectedOutcome: "Acknowledge breach",
    actualOutcome: "False alarm acknowledged. Normal defrost cycle confirmed.",
    feedback: "Defrost cycle occurs every 48 hours at 02:00 UTC. Suppress alert.",
    success: false,
    lesson: "Second occurrence of 02:00 UTC defrost elevation.",
    confidence: 0.9,
    unknownPattern: false,
    processed: true,
  },
  {
    id: uuidv4(),
    situation: "Temperature spike to -13.9°C at 02:02 UTC",
    context: { temp: -13.9, cycle: "defrost", durationMinutes: 35 },
    decision: "Escalate to tier-2 response team",
    action: "Auto-escalated to tier-2 incident response team",
    expectedOutcome: "Refrigerant check",
    actualOutcome: "Operator override: Identified as 3rd recurrent defrost cycle.",
    feedback: "System should learn this pattern: defrost happens at 02:00 UTC.",
    success: false,
    lesson: "Confirmed 3-event recurrent temporal pattern. High statistical significance.",
    confidence: 0.95,
    unknownPattern: true,
    processed: true,
  },
];

export const initialPatterns = [
  {
    id: uuidv4(),
    description: "Repeated temperature rise of +4°C to +5°C between 02:00-02:45 UTC with defrost heater active. Resolves automatically within 40 minutes.",
    condition: {
      timeWindow: "02:00-02:45 UTC",
      maxAllowedTemp: -10.0,
      suppressionMinutes: 35,
    },
    observationCount: 3,
    successCount: 0,
    failureCount: 3,
    confidence: 0.96,
    status: "approved",
  },
  {
    id: uuidv4(),
    description: "Loading dock door micro-aperture: Door sensor reports brief 3-5 second openings during forklift transfers causing humidity rise of +12% without thermal breach.",
    condition: {
      maxDurationSec: 15,
      maxTempVariance: 0.8,
    },
    observationCount: 5,
    successCount: 4,
    failureCount: 1,
    confidence: 0.84,
    status: "candidate",
  },
];

export const initialPolicies = [
  {
    id: uuidv4(),
    patternId: initialPatterns[0].id,
    title: "Defrost Cycle Suppression Policy",
    condition: "Between 02:00-02:45 UTC AND temperature <= -10.0°C",
    action: "Hold emergency escalation sirens; monitor temperature trend for 35 minutes",
    conditionStructured: {
      timeRange: "02:00-02:45 UTC",
      tempThresholdMax: -10.0,
      maxHoldDurationMinutes: 35,
    },
    confidence: 0.96,
    status: "approved",
    approvedBy: "Chief Logistics Officer (Dr. Aris)",
  },
];

export const initialApprovals = [
  {
    id: uuidv4(),
    toolName: "emergency_compressor_cutoff",
    proposedAction: { containerId: "COLD-01", cutoffDurationSec: 600 },
    riskLevel: "high",
    reason: "High-risk hardware cutoff requires human authorization to prevent product spoilage",
    status: "pending",
  },
];

/**
 * Seed helper to populate PostgreSQL database or provide fallback in-memory state
 */
export async function seedDemoData() {
  try {
    // Check if experiences already seeded
    const existing = await db.select().from(experiences).limit(1);
    if (existing.length > 0) {
      return { status: "already_seeded", message: "Database already contains demo telemetry" };
    }

    // Insert experiences
    for (const exp of initialExperiences) {
      await db.insert(experiences).values(exp as any);
    }

    // Insert patterns
    for (const pat of initialPatterns) {
      await db.insert(patterns).values(pat as any);
    }

    // Insert policies
    for (const pol of initialPolicies) {
      await db.insert(policies).values(pol as any);
    }

    // Insert sensor events
    for (const evt of initialSensorEvents) {
      await db.insert(sensorEvents).values(evt as any);
    }

    // Insert approval request
    for (const app of initialApprovals) {
      await db.insert(approvalRequests).values(app as any);
    }

    return { status: "success", message: "SAPIENS AGENT demo state successfully seeded!" };
  } catch (err) {
    console.warn("[seedDemoData] Note: Could not write directly to DB (mock mode active):", err);
    return { status: "fallback", message: "Demo data available in memory fallback" };
  }
}
