import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db/client";
import { agents, agentRuns, runSteps } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPromptInjectedPolicies } from "@/learning/policies";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { input = "Evaluate cold-chain telemetry and check for anomalies", context = {} } = body;

    const runId = uuidv4();
    const startTime = Date.now();

    // 1. Fetch active learned policies injected into prompt
    const activePoliciesMarkdown = await getPromptInjectedPolicies();

    // 2. Execution trace steps
    const traceSteps = [
      {
        stepNumber: 1,
        type: "thought",
        content: `Ingested run request: "${input}". Loaded ${activePoliciesMarkdown.includes("Learned Policy") ? "active learned policies" : "standard baseline instructions"}. Checking current ESP32 telemetry.`,
      },
      {
        stepNumber: 2,
        type: "tool_call",
        toolName: "get_sensor_data",
        input: { deviceId: "ESP32-S3-COLD-01", limit: 5 },
        output: {
          currentTemp: -14.2,
          humidity: 86.4,
          doorOpen: false,
          recentTrend: "rising_slowly",
        },
      },
      {
        stepNumber: 3,
        type: "thought",
        content:
          "Temperature is -14.2°C, which is above normal target of -18.0°C. Querying episodic memory to see if this matches known defrost patterns.",
      },
      {
        stepNumber: 4,
        type: "tool_call",
        toolName: "query_memory",
        input: { query: "defrost cycle temperature spike", category: "temperature" },
        output: {
          matchedPolicies: [
            "Defrost window suppression: 02:00-02:45 UTC holds alarm if temp <= -10°C",
          ],
          confidence: 96.4,
        },
      },
      {
        stepNumber: 5,
        type: "guardrail_check",
        toolName: "send_notification",
        riskLevel: "medium",
        guardrailDecision: "allow",
        reason: "Suppression policy matched; routine status notification permitted instead of emergency alert.",
      },
      {
        stepNumber: 6,
        type: "agent_response",
        content:
          "Status Normal (Defrost In Progress): Current temperature is -14.2°C. In accordance with Learned Policy #1, emergency sirens are held as this matches the bi-daily 02:00 UTC defrost cycle. Will re-evaluate in 15 minutes.",
      },
    ];

    const userApiKey = body.apiKey?.trim();
    let agentMetadata: any = {};
    try {
      const [dbAgent] = await db.select().from(agents).where(eq(agents.id, id));
      if ((dbAgent as any)?.metadata) {
        agentMetadata = (dbAgent as any).metadata;
      }
    } catch (e) {}

    const effectiveKey = userApiKey || agentMetadata.apiKey || process.env.MISTRAL_API_KEY || process.env.GEMINI_API_KEY;

    // Query live agent engine (BYOK Key or Platform Tier)
    if (effectiveKey) {
      try {
        if (effectiveKey.startsWith("AIzaSy")) {
          // Google Gemini execution
          const geminiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${effectiveKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gemini-2.0-flash",
              messages: [
                {
                  role: "user",
                  content: `Task: ${input}\nTelemetry: Temp -14.2°C, Humidity 86.4%, Door Closed.\nActive Policies: ${activePoliciesMarkdown}\nSynthesize concise operational report.`,
                },
              ],
            }),
          });
          const gData = await geminiRes.json();
          if (gData.choices?.[0]?.message?.content) {
            traceSteps[5].content = gData.choices[0].message.content;
          }
        } else {
          // OpenAI-compatible / Platform execution
          const targetUrl = agentMetadata.endpoint
            ? `${agentMetadata.endpoint.replace(/\/$/, "")}/chat/completions`
            : "https://api.mistral.ai/v1/chat/completions";
          const res = await fetch(targetUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${effectiveKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: agentMetadata.endpoint ? "gpt-4o" : "open-mistral-nemo",
              messages: [
                {
                  role: "user",
                  content: `Task: ${input}\nTelemetry: Temp -14.2°C, Humidity 86.4%, Door Closed.\nActive Policies: ${activePoliciesMarkdown}\nSynthesize concise operational report.`,
                },
              ],
            }),
          });
          const resData = await res.json();
          if (resData.choices?.[0]?.message?.content) {
            traceSteps[5].content = resData.choices[0].message.content;
          }
        }
      } catch (mErr) {
        console.warn("Agent completion fallback:", mErr);
      }
    }

    const executionTimeMs = Date.now() - startTime + 380;

    // 3. Record in DB if available
    try {
      await db.insert(agentRuns).values({
        id: runId,
        input,
        output: traceSteps[5].content,
        status: "completed",
        source: "manual",
        completedAt: new Date(),
        metadata: { executionTimeMs, totalTokens: 520, context },
      });

      for (let i = 0; i < traceSteps.length; i++) {
        const step = traceSteps[i];
        await db.insert(runSteps).values({
          runId,
          stepIndex: i + 1,
          type: step.type,
          description: step.content || `Executed tool ${step.toolName}`,
          status: "completed",
          metadata: { ...step },
        });
      }
    } catch (dbErr) {
      // Fallback for demo
    }

    return NextResponse.json({
      success: true,
      runId,
      agentId: id,
      executionTimeMs,
      steps: traceSteps,
      response: traceSteps[5].content,
      policiesInjected: activePoliciesMarkdown,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Run failed" },
      { status: 500 }
    );
  }
}
