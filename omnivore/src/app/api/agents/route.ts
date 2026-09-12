import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { agents } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";
import { getAllAgents, saveDiskAgent, AgentRecord } from "@/storage/agents";

export async function GET() {
  try {
    const list = await getAllAgents();
    return NextResponse.json({ success: true, agents: list });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch agents" },
      { status: 500 }
    );
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

    const newAgent: AgentRecord = {
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

    // 1. Permanently persist to data/agents.json on disk
    saveDiskAgent(newAgent);

    // 2. Also try DB insert if available
    try {
      await db.insert(agents).values(newAgent as any);
    } catch (dbErr) {
      // Disk storage is primary fallback
    }

    return NextResponse.json({ success: true, agent: newAgent });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create agent" },
      { status: 500 }
    );
  }
}
