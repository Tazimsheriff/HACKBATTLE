import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { agents } from "@/db/schema";
import { desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export const initialAgents = [
  {
    id: "sapiens-cold-chain",
    name: "Cold-Chain Guardian",
    description: "Autonomous medical storage monitor with continuous self-learning defrost adaptation and hardware guardrails.",
    goal: "Safeguard vaccine container COLD-01 at -18°C and suppress false alarms.",
    instructions: "Safeguard vaccine containers. Check past experiences for defrost cycles. Strictly require human approval for hardware cutoffs.",
    model: "sapiens-frontier-nemo",
    status: "active",
    tools: ["get_sensor_data", "query_memory", "send_notification", "emergency_compressor_cutoff"],
  },
  {
    id: "sapiens-autonomous-sentinel",
    name: "Sapiens Autonomous Sentinel",
    description: "Frontier autonomous agent with continuous episodic learning, multi-channel dispatch, and safety guardrails.",
    goal: "Safeguard operations with autonomous adaptation and deterministic human-in-the-loop boundaries.",
    instructions: "You are SAPIENS Autonomous Sentinel. Monitor operations, cross-reference past episodic experiences, and enforce strict execution boundaries.",
    model: "sapiens-frontier-nemo",
    status: "active",
    tools: ["get_sensor_data", "query_memory", "send_notification", "emergency_compressor_cutoff"],
  },
  {
    id: "pharmacy-vault-s3",
    name: "Pharmacy Vault S3",
    description: "Multi-sensor environmental monitor for temperature, humidity, and door aperture.",
    goal: "Maintain pharma storage humidity under 60% and temperature between 2°C and 8°C.",
    instructions: "Monitor refrigerated medications. Alert on door breaches lasting > 45 seconds.",
    model: "sapiens-code-latest",
    status: "active",
    tools: ["get_sensor_data", "send_notification"],
  },
];

// In-memory runtime cache so created agents persist reliably in demo/local mode
const inMemoryAgentsStore = [...initialAgents];

export async function GET() {
  try {
    const dbAgents = await db.select().from(agents).orderBy(desc(agents.createdAt));
    const merged = [...inMemoryAgentsStore];
    for (const dba of dbAgents) {
      if (!merged.some((a) => a.id === dba.id)) {
        merged.push({
          id: dba.id,
          name: dba.name,
          description: dba.description || "",
          goal: dba.goal || "",
          instructions: dba.instructions || "",
          model: dba.model,
          status: (dba.status as "active" | "paused" | "archived") || "active",
          tools: Array.isArray(dba.tools) ? (dba.tools as string[]) : [],
        });
      }
    }
    return NextResponse.json({ success: true, agents: merged });
  } catch (err) {
    return NextResponse.json({ success: true, agents: inMemoryAgentsStore });
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
      model = "sapiens-frontier-nemo",
      tools = ["get_sensor_data", "query_memory", "send_notification"],
      metadata = {},
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Agent name is required" }, { status: 400 });
    }

    let remoteAgentId: string | null = null;
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
            description: description || "Autonomous Agent with SAPIENS guardrails",
            instructions: instructions || "Monitor telemetry and adhere to safety guardrails.",
            model: "open-mistral-nemo",
          }),
        });
        const mData = await mRes.json();
        if (mData.id) {
          remoteAgentId = mData.id;
        }
      } catch (mErr) {
        console.warn("Remote agent creation sync fallback:", mErr);
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
      metadata: {
        ...metadata,
        ...(remoteAgentId ? { remoteAgentId } : {}),
      },
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
