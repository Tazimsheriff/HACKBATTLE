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

    // If Mistral API Key is present, generate with high-quality AI
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

        const data = await mistralRes.json();
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
        console.warn("Mistral skill generation fallback:", err);
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
