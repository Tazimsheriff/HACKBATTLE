import { NextResponse } from "next/server";
import { getFirewallStats, getFirewallEventFeed } from "@/guardrails/engine";

const globalForFirewall = globalThis as unknown as {
  __sapiens_runtime_firewall_events?: any[];
};

export const RUNTIME_FIREWALL_EVENTS: any[] =
  globalForFirewall.__sapiens_runtime_firewall_events || [];

if (process.env.NODE_ENV !== "production") {
  globalForFirewall.__sapiens_runtime_firewall_events = RUNTIME_FIREWALL_EVENTS;
}

/**
 * GET /api/firewall/events
 * Returns live firewall event feed + aggregate stats for the Trust Center dashboard.
 * Query params: agentId (optional), limit (default 20)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "20");

    // Get live feed + stats in parallel
    const [events, stats] = await Promise.all([
      getFirewallEventFeed(agentId ?? "all", limit).catch(() => []),
      getFirewallStats(agentId).catch(() => null),
    ]);

    // Compute dynamic stats strictly from real runtime and persistent DB events
    const allEvents = [...RUNTIME_FIREWALL_EVENTS, ...events];
    const allowed = allEvents.filter((e) => e.decision === "allow").length;
    const requireApproval = allEvents.filter((e) => e.decision === "require_approval").length;
    const blocked = allEvents.filter((e) => e.decision === "block").length;
    const honeypots = allEvents.filter((e) => e.decision === "honeypot" || e.isHoneypot).length;
    const totalActions = allEvents.length;
    const trustScore = totalActions === 0
      ? 100
      : Math.max(10, Math.min(100, Math.round(100 - (blocked * 12) - (honeypots * 25))));

    const effectiveStats = (stats && stats.totalActions > 0)
      ? stats
      : {
          totalActions,
          allowed,
          requireApproval,
          blocked,
          honeypots,
          trustScore,
        };

    const effectiveEvents = allEvents.slice(0, limit);

    return NextResponse.json({
      success: true,
      stats: effectiveStats,
      events: effectiveEvents,
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      stats: {
        totalActions: 0,
        allowed: 0,
        requireApproval: 0,
        blocked: 0,
        honeypots: 0,
        trustScore: 100,
      },
      events: [],
    });
  }
}

/**
 * POST /api/firewall/events
 * Trigger a live firewall action/event and record it in real time.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.isSecurityViolation) {
      const secEvent = {
        id: body.id || `sec-${Date.now()}`,
        agentId: body.agentId || "sapiens-whatsapp-sentinel",
        toolName: body.toolName || "whatsapp_admin_kick",
        riskScore: body.riskScore || 98,
        riskLabel: "CRITICAL",
        decision: "block",
        reason: body.reason || "Unauthorized administrative command blocked by SAPIENS Firewall",
        createdAt: new Date().toISOString(),
        isHoneypot: false,
      };
      RUNTIME_FIREWALL_EVENTS.unshift(secEvent);
      if (RUNTIME_FIREWALL_EVENTS.length > 50) RUNTIME_FIREWALL_EVENTS.pop();
      return NextResponse.json({ success: true, event: secEvent });
    }

    const { toolName, agentId = "demo-agent", context = {} } = body;

    // Import here to avoid circular issues
    const { runGuardrail } = await import("@/guardrails/engine");

    const result = await runGuardrail({
      agentId,
      toolName,
      toolInput: context,
      isProduction: context.isProduction ?? true,
      recordScope: context.recordScope,
      hasPII: context.hasPII,
    });

    const eventRecord = {
      id: `evt-${Date.now()}`,
      agentId,
      toolName,
      riskScore: result.riskScore,
      riskLabel: result.label,
      decision: result.decision,
      reason: result.reasons[0] ?? "Evaluated by SAPIENS Firewall Engine",
      createdAt: new Date().toISOString(),
      isHoneypot: result.decision === "honeypot",
    };

    RUNTIME_FIREWALL_EVENTS.unshift(eventRecord);
    if (RUNTIME_FIREWALL_EVENTS.length > 50) RUNTIME_FIREWALL_EVENTS.pop();

    return NextResponse.json({
      success: true,
      decision: result.decision,
      riskScore: result.riskScore,
      event: eventRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
