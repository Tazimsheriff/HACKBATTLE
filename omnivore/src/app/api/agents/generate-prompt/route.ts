import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name = "Custom Agent",
      description = "",
      hasHardware = false,
      hardwareDeviceId = "",
    } = body;

    const missionContext = description.trim()
      ? `Mission description: "${description}"`
      : `Agent name: "${name}"`;

    const hardwareContext = hasHardware && hardwareDeviceId.trim()
      ? `This agent is bound to physical hardware device: "${hardwareDeviceId}". Include appropriate hardware telemetry and actuator safety rules.`
      : `This agent is a SOFTWARE / CLOUD agent. DO NOT include microcontrollers, ESP32, or physical hardware instructions unless explicitly asked.`;

    // Attempt generation with Mistral if key is available
    if (process.env.MISTRAL_API_KEY) {
      try {
        const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "open-mistral-nemo",
            temperature: 0.2,
            messages: [
              {
                role: "system",
                content:
                  "You are an expert autonomous AI prompt architect. Write concise, high-performance system instructions and safety directives in Markdown for an agent based on the provided mission. Structure your response with:\n1. Role & Identity statement\n2. Core Mission & Objectives (3-4 bullet points)\n3. Operational Procedures\n4. Strict Execution Guardrails & Boundaries\nKeep it professional, focused, and under 180 words. Return ONLY the Markdown prompt.",
              },
              {
                role: "user",
                content: `Agent Name: ${name}\n${missionContext}\n${hardwareContext}`,
              },
            ],
          }),
        });

        const data = await mistralRes.json();
        const generatedPrompt = data.choices?.[0]?.message?.content;
        if (generatedPrompt && generatedPrompt.length > 30) {
          return NextResponse.json({ success: true, prompt: generatedPrompt });
        }
      } catch (err) {
        console.warn("Mistral prompt generation fallback:", err);
      }
    }

    // Smart Deterministic Fallback Generator
    const cleanName = name.trim() || "Custom Agent";
    const isEmail = /mail|gmail|inbox|outlook/i.test(cleanName + " " + description);
    const isResearch = /research|web|search|scrape|market/i.test(cleanName + " " + description);
    const isDevOps = /devops|github|deploy|incident|server/i.test(cleanName + " " + description);

    let prompt = "";
    if (isEmail) {
      prompt = `You are ${cleanName}.
Your mission is to monitor incoming email communications, filter out noise, and highlight urgent, high-priority messages.

## Core Directives:
1. Scan and parse incoming email headers, senders, and content.
2. Classify messages into: URGENT ACTION, IMPORTANT INFORMATIONAL, and ROUTINE/SPAM.
3. Extract key deadlines, meeting requests, and executive correspondence.
4. Synthesize clear, bulleted summaries instead of sending raw email dumps.

## Safety & Guardrails:
- Never send automated outbound replies without explicit human review.
- Never permanently delete emails; apply archive or label flags only.
- Strict data privacy: Never expose sensitive email credentials or authentication tokens.`;
    } else if (isResearch) {
      prompt = `You are ${cleanName}.
Your mission is to perform automated web research, synthesize multifaceted data, and produce actionable insights.

## Core Directives:
1. Formulate structured search queries from user research goals.
2. Ingest, cross-verify, and summarize credible public sources.
3. Highlight consensus, statistical trends, and conflicting perspectives.
4. Maintain source citations for every factual claim.

## Safety & Guardrails:
- Discard unreliable or unverified claims.
- Never execute unauthorized web actions or submit external forms without confirmation.`;
    } else if (hasHardware) {
      prompt = `You are ${cleanName}, an autonomous IoT sentinel bound to device ${hardwareDeviceId || "IOT-DEVICE-01"}.

## Core Directives:
1. Periodically sample device telemetry (temperature, humidity, voltage, status).
2. Evaluate readings against historical baseline and learned behavioral policies.
3. Detect anomalous trends and notify operators through authorized messaging channels.

## Safety & Guardrails:
- Any physical actuator shutdown or relay toggle strictly requires human operator approval.
- Suppress repetitive alarms during known operational cycles.`;
    } else {
      prompt = `You are ${cleanName}.
Your mission is to fulfill: "${description || "Perform autonomous tasks within explicit safety boundaries"}".

## Core Directives:
1. Evaluate incoming requests and decompose them into verifiable sub-steps.
2. Query episodic memory for similar past scenarios and learned policies.
3. Execute approved actions and provide clear, transparent status reports.

## Safety & Guardrails:
- High-risk or destructive actions strictly require human operator confirmation.
- Operate transparently and log every decision for continuous auditability.`;
    }

    return NextResponse.json({ success: true, prompt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate prompt" },
      { status: 500 }
    );
  }
}
