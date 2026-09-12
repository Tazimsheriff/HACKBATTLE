import { NextResponse } from "next/server";
import { SKILLS_SH_CATALOG, AgentSkill } from "@/skills/registry";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mission = "", agentName = "" } = body;

    const query = (agentName + " " + mission).toLowerCase();

    // 1. Keyword relevance scoring against SKILLS_SH_CATALOG
    const scoredSkills = SKILLS_SH_CATALOG.map((skill) => {
      let score = 0;
      const haystack = (
        skill.name +
        " " +
        skill.description +
        " " +
        skill.category +
        " " +
        skill.functionName
      ).toLowerCase();

      // Check key domain terms
      if (query.includes("mail") || query.includes("gmail") || query.includes("inbox") || query.includes("slack") || query.includes("notion") || query.includes("jira")) {
        if (haystack.includes("mail") || haystack.includes("gmail") || haystack.includes("digest") || haystack.includes("slack") || haystack.includes("notion") || haystack.includes("jira")) score += 10;
      }
      if (query.includes("search") || query.includes("research") || query.includes("web") || query.includes("find") || query.includes("news")) {
        if (haystack.includes("search") || haystack.includes("web") || haystack.includes("document") || haystack.includes("news") || haystack.includes("scraper")) score += 10;
      }
      if (query.includes("devops") || query.includes("github") || query.includes("deploy") || query.includes("docker") || query.includes("cloud") || query.includes("aws")) {
        if (haystack.includes("github") || haystack.includes("docker") || haystack.includes("cloudwatch") || haystack.includes("ssh") || haystack.includes("ssl")) score += 10;
      }
      if (query.includes("sensor") || query.includes("temp") || query.includes("esp32") || query.includes("iot") || query.includes("cold") || query.includes("hardware") || query.includes("camera") || query.includes("mqtt") || query.includes("gps")) {
        if (haystack.includes("sensor") || haystack.includes("telemetry") || haystack.includes("relay") || haystack.includes("mqtt") || haystack.includes("modbus") || haystack.includes("camera") || haystack.includes("geofence")) score += 10;
      }
      if (query.includes("notify") || query.includes("alert") || query.includes("telegram") || query.includes("whatsapp") || query.includes("sms") || query.includes("call") || query.includes("pagerduty")) {
        if (haystack.includes("notification") || haystack.includes("broadcast") || haystack.includes("twilio") || haystack.includes("pagerduty") || haystack.includes("slack")) score += 8;
      }
      if (query.includes("data") || query.includes("database") || query.includes("sql") || query.includes("vector") || query.includes("stripe") || query.includes("csv")) {
        if (haystack.includes("database") || haystack.includes("vector") || haystack.includes("tabular") || haystack.includes("stripe")) score += 8;
      }

      // Memory is universally valuable
      if (skill.id === "query_memory") score += 5;

      return { skill, score };
    });

    // Sort by relevance
    const matchedSkills = scoredSkills
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.skill);

    // If query didn't match specific tools, provide a broad baseline
    const finalSkills = matchedSkills.length > 0 ? matchedSkills : SKILLS_SH_CATALOG.slice(0, 4);

    return NextResponse.json({
      success: true,
      matchedCount: finalSkills.length,
      matchedIds: finalSkills.map((s) => s.id),
      skills: finalSkills,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to match skills" },
      { status: 500 }
    );
  }
}
