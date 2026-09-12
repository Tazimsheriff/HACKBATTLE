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
    model: "open-mistral-nemo",
    status: "active",
    tools: ["get_sensor_data", "query_memory", "send_notification", "emergency_compressor_cutoff"],
  },
  {
    id: "mistral-studio-sentinel",
    name: "Mistral Studio Sentinel",
    description: "Frontier autonomous agent running live on Mistral Agent Studio (open-mistral-nemo) with hardware OLED integration.",
    goal: "Preserve biological container integrity within optimal -18°C setpoints.",
    instructions: "You are OMNIVORE Cold-Chain Sentinel. Monitor temperatures and guard storage containers.",
    model: "open-mistral-nemo",
    status: "active",
    tools: ["get_sensor_data", "query_memory", "send_notification", "emergency_compressor_cutoff"],
  },
  {
    id: "pharmacy-vault-s3",
    name: "Pharmacy Vault S3",
    description: "Multi-sensor environmental monitor for temperature, humidity, and door aperture.",
    goal: "Maintain pharma storage humidity under 60% and temperature between 2°C and 8°C.",
    instructions: "Monitor refrigerated medications. Alert on door breaches lasting > 45 seconds.",
    model: "codestral-latest",
    status: "active",
    tools: ["get_sensor_data", "send_notification"],
  },
];

// In-memory runtime cache so created agents persist reliably in demo/local mode
const inMemoryAgentsStore = [...initialAgents];

export async function GET() {
  try {
    const list = await db.select().from(agents).orderBy(desc(agents.createdAt));
    if (list.length > 0) {
      const dbIds = new Set(list.map((a) => a.id));
      const extra = inMemoryAgentsStore.filter((a) => !dbIds.has(a.id));
      return NextResponse.json({ success: true, agents: [...extra, ...list] });
    }
  } catch (err) {
    // Database fallback
  }
  return NextResponse.json({ success: true, agents: inMemoryAgentsStore });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      description = "",
      goal = "",
      instructions = "",
      model = "open-mistral-nemo",
      tools = ["get_sensor_data", "query_memory", "send_notification"],
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Agent name is required" }, { status: 400 });
    }

    let mistralAgentId: string | null = null;
    if (process.env.MISTRAL_API_KEY) {
      try {
        const mRes = await fetch("https://api.mistral.ai/v1/agents", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            description: description || "Autonomous Agent with OMNIVORE guardrails",
            instructions: instructions || "Monitor telemetry and adhere to safety guardrails.",
            model: "open-mistral-nemo",
          }),
        });
        const mData = await mRes.json();
        if (mData.id) {
          mistralAgentId = mData.id;
        }
      } catch (mErr) {
        console.warn("Mistral Studio agent creation sync error:", mErr);
      }
    }

    const newAgent = {
      id: uuidv4(),
      name,
      description,
      goal: goal || name,
      instructions: instructions || `You are ${name}. Execute tasks safely within guardrail boundaries.`,
      model,
      tools,
      status: "active",
      metadata: mistralAgentId ? { mistralAgentId } : {},
    };

    // Store in-memory immediately so it's always returned in GET
    inMemoryAgentsStore.unshift(newAgent);

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
