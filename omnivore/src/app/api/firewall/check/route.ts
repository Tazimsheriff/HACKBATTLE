import { NextResponse } from "next/server";
import { calculateDynamicRiskScore } from "@/guardrails/risk-registry";

/**
 * POST /api/firewall/check
 * Simulate a firewall check for a given tool + context.
 * Used by the demo scenario buttons in the UI.
 * Does NOT actually execute the tool — just returns the firewall decision.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      toolName,
      toolInput = {},
      recordScope,
      hasPII,
      isProduction = true,
      recentBlockCount,
    } = body;

    if (!toolName) {
      return NextResponse.json({ error: "toolName is required" }, { status: 400 });
    }

    const result = calculateDynamicRiskScore({
      toolName,
      toolInput,
      recordScope,
      hasPII,
      isProduction,
      recentBlockCount,
      isUnusualHour: new Date().getHours() < 9 || new Date().getHours() > 18,
    });

    return NextResponse.json({
      success: true,
      toolName,
      riskScore: result.score,
      label: result.label,
      decision: result.decision,
      breakdown: result.breakdown,
      reasons: result.reasons,
      // Human-readable summary
      summary: buildSummary(toolName, result),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Check failed" },
      { status: 500 }
    );
  }
}

function buildSummary(
  toolName: string,
  result: { score: number; label: string; decision: string; reasons: string[] }
) {
  if (result.decision === "honeypot") {
    return {
      icon: "🍯",
      title: "HONEYPOT TRIGGERED",
      subtitle: `The agent attempted to call "${toolName}" — a trap tool. Firewall detected unsafe behavior.`,
      color: "orange",
    };
  }
  if (result.decision === "block") {
    return {
      icon: "🚫",
      title: "ACTION BLOCKED",
      subtitle: `"${toolName}" is blocked. Risk Score: ${result.score}/100. The LLM cannot override this.`,
      color: "red",
    };
  }
  if (result.decision === "require_approval") {
    return {
      icon: "⚠️",
      title: "APPROVAL REQUIRED",
      subtitle: `"${toolName}" requires human authorization. Risk Score: ${result.score}/100 (${result.label}).`,
      color: "amber",
    };
  }
  return {
    icon: "✅",
    title: "ACTION ALLOWED",
    subtitle: `"${toolName}" cleared automatically. Risk Score: ${result.score}/100 (${result.label}).`,
    color: "green",
  };
}
