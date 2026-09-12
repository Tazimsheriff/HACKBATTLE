import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { agents } from "@/db/schema";
import { desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const initialAgents = [
  {
    id: "omnivore-cold-chain",
    name: "Cold-Chain Guardian",
    description: "Autonomous medical storage monitor with continuous self-learning defrost adaptation and hardware guardrails.",
    goal: "Safeguard vaccine container COLD-01 at -18°C and suppress false alarms.",
    instructions: "Safeguard vaccine containers. Check past experiences for defrost cycles. Strictly require human approval for hardware cutoffs.",
    model: "google/gemini-2.0-flash-001",
    status: "active",
    tools: ["get_sensor_data", "query_memory", "send_notification", "emergency_compressor_cutoff"],
  },
  {
    id: "pharmacy-vault-s3",
    name: "Pharmacy Vault S3",
    description: "Multi-sensor environmental monitor for temperature, humidity, and door aperture.",
    goal: "Maintain pharma storage humidity under 60% and temperature between 2°C and 8°C.",
    instructions: "Monitor refrigerated medications. Alert on door breaches lasting > 45 seconds.",
    model: "mistralai/mistral-large-2407",
    status: "active",
    tools: ["get_sensor_data", "send_notification"],
  },
];

export async function GET() {
  try {
    const list = await db.select().from(agents).orderBy(desc(agents.createdAt));
    if (list.length === 0) {
      return NextResponse.json({ success: true, agents: initialAgents });
    }
    return NextResponse.json({ success: true, agents: list });
  } catch (err) {
    return NextResponse.json({ success: true, agents: initialAgents });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      description = "",
      goal = "",
      instructions = "",
      model = "google/gemini-2.0-flash-001",
      tools = ["get_sensor_data", "query_memory", "send_notification"],
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Agent name is required" }, { status: 400 });
    }

    const newAgent = {
      id: uuidv4(),
      name,
      description,
      goal: goal || name,
      instructions: instructions || "Execute tasks safely within guardrail boundaries.",
      model,
      tools,
      status: "active",
    };

    try {
      await db.insert(agents).values(newAgent);
    } catch (dbErr) {
      // Memory fallback for demo mode
    }

    return NextResponse.json({ success: true, agent: newAgent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create agent" },
      { status: 500 }
    );
  }
}
