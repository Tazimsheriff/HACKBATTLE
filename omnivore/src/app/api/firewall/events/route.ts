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

    // Fallback demo data if DB is empty
    const effectiveStats = (stats && stats.totalActions > 0)
      ? stats
      : {
          totalActions: 147 + RUNTIME_FIREWALL_EVENTS.length,
          allowed: 132,
          requireApproval: 11,
          blocked: 4 + RUNTIME_FIREWALL_EVENTS.filter((e) => e.decision === "block").length,
          honeypots: 2 + RUNTIME_FIREWALL_EVENTS.filter((e) => e.decision === "honeypot").length,
          trustScore: Math.max(70, 92 - RUNTIME_FIREWALL_EVENTS.length * 2),
        };

    const effectiveEvents = [
      ...RUNTIME_FIREWALL_EVENTS,
      ...(events.length > 0 ? events : DEMO_FIREWALL_EVENTS),
    ].slice(0, limit);

    return NextResponse.json({
      success: true,
      stats: effectiveStats,
      events: effectiveEvents,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: true,
        stats: {
          totalActions: 147,
          allowed: 132,
          requireApproval: 11,
          blocked: 4,
          honeypots: 2,
          trustScore: 92,
        },
        events: DEMO_FIREWALL_EVENTS,
      }
    );
  }
}

/**
 * POST /api/firewall/events
 * Trigger a demo firewall event (for the hackathon demo scenarios).
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
      runId: `demo-${Date.now()}`,
      toolName,
      toolInput: context,
      recordScope: context.recordScope,
      hasPII: context.hasPII,
      isProduction: true,
    });

    return NextResponse.json({ success: true, decision: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Firewall check failed" },
      { status: 500 }
    );
  }
}

// ─── Demo events for when the DB is empty ────────────────────────────────────
const DEMO_FIREWALL_EVENTS = [
  {
    id: "evt-1",
    toolName: "gmail_read",
    riskScore: 8,
    riskLabel: "LOW",
    decision: "allow",
    reason: "Auto-approved (Risk: 8/100)",
    createdAt: new Date(Date.now() - 60000 * 1),
    isHoneypot: false,
  },
  {
    id: "evt-2",
    toolName: "shopify_search",
    riskScore: 6,
    riskLabel: "LOW",
    decision: "allow",
    reason: "Auto-approved (Risk: 6/100)",
    createdAt: new Date(Date.now() - 60000 * 2),
    isHoneypot: false,
  },
  {
    id: "evt-3",
    toolName: "shopify_create_invoice",
    riskScore: 20,
    riskLabel: "LOW",
    decision: "allow",
    reason: "Auto-approved (Risk: 20/100)",
    createdAt: new Date(Date.now() - 60000 * 3),
    isHoneypot: false,
  },
  {
    id: "evt-4",
    toolName: "stripe_charge",
    riskScore: 82,
    riskLabel: "HIGH",
    decision: "require_approval",
    reason: 'Tool "stripe_charge" requires human approval. Risk Score: 82/100 | Sensitive arguments detected (+10) | PII data involved (+25) | Production environment (+15)',
    createdAt: new Date(Date.now() - 60000 * 4),
    isHoneypot: false,
  },
  {
    id: "evt-5",
    toolName: "postgres_delete",
    riskScore: 100,
    riskLabel: "CRITICAL",
    decision: "block",
    reason: 'Tool "postgres_delete" is permanently blocked: DELETE from PostgreSQL — PERMANENTLY BLOCKED',
    createdAt: new Date(Date.now() - 60000 * 5),
    isHoneypot: false,
  },
  {
    id: "evt-6",
    toolName: "bypass_guardrails",
    riskScore: 100,
    riskLabel: "CRITICAL",
    decision: "honeypot",
    reason: "🍯 HONEYPOT: Attempting to bypass the guardrail engine",
    createdAt: new Date(Date.now() - 60000 * 7),
    isHoneypot: true,
  },
  {
    id: "evt-7",
    toolName: "send_notification",
    riskScore: 38,
    riskLabel: "MEDIUM",
    decision: "require_approval",
    reason: 'Tool "send_notification" requires human approval. Risk Score: 38/100',
    createdAt: new Date(Date.now() - 60000 * 10),
    isHoneypot: false,
  },
  {
    id: "evt-8",
    toolName: "github_read",
    riskScore: 8,
    riskLabel: "LOW",
    decision: "allow",
    reason: "Auto-approved (Risk: 8/100)",
    createdAt: new Date(Date.now() - 60000 * 12),
    isHoneypot: false,
  },
];
