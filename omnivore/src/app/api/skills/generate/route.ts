import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt = "", mission = "" } = body;

    const inputContext = prompt.trim() || mission.trim() || "Automated utility skill";

    let generated = {
      name: "Custom Agent Skill",
      functionName: "custom_task_execution()",
      description: "Execute specialized automated operation according to mission objectives.",
      category: "productivity",
      risk: "LOW",
      parameters: [
        { name: "input", type: "string", required: true, description: "Operational payload or query" },
        { name: "options", type: "string", required: false, description: "Configuration parameters" },
      ],
    };

    const userApiKey = body.apiKey?.trim();
    const userEndpoint = body.endpoint?.trim();
    const requestedModel = body.model || "open-mistral-nemo";

    const effectiveKey = userApiKey || process.env.MISTRAL_API_KEY || process.env.GEMINI_API_KEY;

    // If API Key is present (User BYOK or Platform Tier), generate with high-quality AI
    if (effectiveKey) {
      try {
        let endpointUrl = "https://api.mistral.ai/v1/chat/completions";
        let targetModel = "open-mistral-nemo";

        if (userEndpoint) {
          endpointUrl = userEndpoint.endsWith("/chat/completions")
            ? userEndpoint
            : `${userEndpoint.replace(/\/$/, "")}/chat/completions`;
          targetModel = requestedModel === "custom-llm" ? "gpt-4o" : requestedModel;
        } else if (effectiveKey.startsWith("AIzaSy")) {
          endpointUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
          targetModel = "gemini-2.0-flash";
        } else if (effectiveKey.startsWith("sk-proj-") || requestedModel.includes("gpt")) {
          endpointUrl = "https://api.openai.com/v1/chat/completions";
          targetModel = "gpt-4o";
        }

        const aiRes = await fetch(endpointUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${effectiveKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: targetModel,
            temperature: 0.2,
            messages: [
              {
                role: "system",
                content: `You are an AI Agent Skill Architect following the skills.sh & Eve tool specifications.
Given an agent mission or skill request, output a JSON object representing a properly defined tool:
{
  "name": "Human-readable Skill Name e.g. 'Gmail Priority Filter'",
  "functionName": "valid_snake_case_function_name() e.g. 'filter_urgent_emails()'",
  "description": "Clear 1-2 sentence description explaining what the skill executes and when the agent should call it.",
  "category": "productivity" | "search" | "devops" | "data" | "communications" | "iot" | "custom",
  "risk": "LOW" | "MEDIUM" | "HIGH", // LOW: read-only; MEDIUM: notifications/messages; HIGH: destructive/hardware cutoff
  "parameters": [
    { "name": "parameter_name", "type": "string" | "number" | "boolean", "required": boolean, "description": "Purpose of parameter" }
  ]
}
Return ONLY valid JSON. No markdown backticks, no commentary.`,
              },
              {
                role: "user",
                content: `Generate a proper skill for: "${inputContext}"`,
              },
            ],
          }),
        });

        const data = await aiRes.json();
        const rawContent = data.choices?.[0]?.message?.content?.trim() || "";
        const cleanJson = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed.name && parsed.functionName) {
          generated = {
            ...generated,
            ...parsed,
          };
        }
      } catch (err) {
        console.warn("AI skill generation fallback:", err);
      }
    }

    return NextResponse.json({ success: true, skill: generated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate skill" },
      { status: 500 }
    );
  }
}
