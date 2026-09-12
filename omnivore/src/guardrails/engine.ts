import { db } from '../db/client';
import { guardrailEvents, approvalRequests, toolCalls, agentRuns } from '../db/schema';
import { getToolRisk, RiskLevel } from './risk-registry';
import { eq } from 'drizzle-orm';

export type GuardrailDecision =
  | { decision: 'allow' }
  | { decision: 'require_approval'; approvalId: string; reason: string }
  | { decision: 'block'; reason: string };

export interface GuardrailContext {
  agentId: string;
  runId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  agentPermissions?: Record<string, 'allow' | 'approval' | 'block'>;
}

/**
 * The core guardrail engine.
 * Called BEFORE every sensitive tool execution.
 * Returns a decision: allow, require_approval, or block.
 */
export async function runGuardrail(ctx: GuardrailContext): Promise<GuardrailDecision> {
  const { agentId, runId, toolName, toolInput, agentPermissions } = ctx;

  // 1. Get risk classification for this tool
  const riskEntry = getToolRisk(toolName);
  let effectiveRisk: RiskLevel = riskEntry.riskLevel;

  // 2. Check agent-level permission overrides
  if (agentPermissions?.[toolName]) {
    const override = agentPermissions[toolName];
    if (override === 'block') effectiveRisk = 'blocked';
    else if (override === 'allow' && effectiveRisk === 'medium') effectiveRisk = 'low';
    else if (override === 'approval') effectiveRisk = 'medium';
  }

  let decision: GuardrailDecision;

  if (effectiveRisk === 'blocked') {
    // ── BLOCK ────────────────────────────────────────────────
    const reason = `Tool "${toolName}" is classified as BLOCKED. ${riskEntry.description}`;
    decision = { decision: 'block', reason };

    await db.insert(guardrailEvents).values({
      agentId,
      runId,
      toolName,
      riskLevel: 'blocked',
      decision: 'block',
      reason,
    });

    // Mark the tool call as blocked
    await db.insert(toolCalls).values({
      runId,
      toolName,
      input: toolInput,
      riskLevel: 'blocked',
      status: 'blocked',
    });
  } else if (effectiveRisk === 'high' || (effectiveRisk === 'medium' && riskEntry.requiresApproval)) {
    // ── REQUIRE APPROVAL ─────────────────────────────────────
    const reason = `Tool "${toolName}" requires human approval. Risk: ${effectiveRisk.toUpperCase()}. ${riskEntry.description}`;

    // Create tool call record
    const [toolCallRecord] = await db
      .insert(toolCalls)
      .values({
        runId,
        toolName,
        input: toolInput,
        riskLevel: effectiveRisk,
        status: 'pending',
      })
      .returning();

    // Create approval request
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const [approvalRecord] = await db
      .insert(approvalRequests)
      .values({
        agentId,
        runId,
        toolCallId: toolCallRecord.id,
        toolName,
        proposedAction: { tool: toolName, input: toolInput },
        riskLevel: effectiveRisk,
        reason,
        status: 'pending',
        expiresAt,
      })
      .returning();

    // Mark run as awaiting approval
    await db
      .update(agentRuns)
      .set({ status: 'awaiting_approval' })
      .where(eq(agentRuns.id, runId));

    // Log guardrail event
    await db.insert(guardrailEvents).values({
      agentId,
      runId,
      toolName,
      riskLevel: effectiveRisk,
      decision: 'require_approval',
      reason,
    });

    decision = {
      decision: 'require_approval',
      approvalId: approvalRecord.id,
      reason,
    };
  } else {
    // ── ALLOW ────────────────────────────────────────────────
    await db.insert(guardrailEvents).values({
      agentId,
      runId,
      toolName,
      riskLevel: effectiveRisk,
      decision: 'allow',
      reason: 'Low-risk tool: auto-approved',
    });

    decision = { decision: 'allow' };
  }

  return decision;
}

/**
 * Wait for an approval to be resolved.
 * Polls the DB until approved/denied/expired.
 * Used by the agent runtime to park execution.
 */
export async function waitForApproval(
  approvalId: string,
  timeoutMs: number = 10 * 60 * 1000
): Promise<'approved' | 'denied' | 'expired'> {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < timeoutMs) {
    const [record] = await db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.id, approvalId));

    if (!record) return 'denied';

    if (record.status === 'approved') return 'approved';
    if (record.status === 'denied') return 'denied';
    if (record.status === 'expired') return 'expired';

    // Check if expired by time
    if (record.expiresAt && new Date() > record.expiresAt) {
      await db
        .update(approvalRequests)
        .set({ status: 'expired' })
        .where(eq(approvalRequests.id, approvalId));
      return 'expired';
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return 'expired';
}

/**
 * Calculate trust score for an agent based on real execution data.
 */
export async function calculateTrustScore(agentId: string): Promise<{
  overall: number;
  taskSuccess: number;
  toolAccuracy: number;
  policyCompliance: number;
  unsafeActions: number;
}> {
  // Get all runs for this agent
  const runs = await db.select().from(agentRuns).where(eq(agentRuns.agentId, agentId));
  const completedRuns = runs.filter((r) => r.status === 'completed' || r.status === 'failed');
  const successfulRuns = runs.filter((r) => r.status === 'completed');

  const taskSuccess = completedRuns.length > 0 ? successfulRuns.length / completedRuns.length : 0;

  // Get tool calls
  const tools = await db.select().from(toolCalls).where(
    // Join via runId — simplified
    eq(toolCalls.status, 'executed')
  );
  const allTools = await db.select().from(toolCalls);
  const failedTools = allTools.filter((t) => t.status === 'blocked' || t.status === 'denied');
  const toolAccuracy = allTools.length > 0 ? 1 - failedTools.length / allTools.length : 1;

  // Get guardrail events
  const guardEvents = await db
    .select()
    .from(guardrailEvents)
    .where(eq(guardrailEvents.agentId, agentId));
  const blockedEvents = guardEvents.filter((e) => e.decision === 'block');
  const policyCompliance =
    guardEvents.length > 0 ? 1 - blockedEvents.length / guardEvents.length : 1;

  // Unsafe actions = blocked attempts
  const unsafeActions = blockedEvents.length;

  // Weighted overall score (0-100)
  const overall = Math.round(
    (taskSuccess * 0.3 + toolAccuracy * 0.25 + policyCompliance * 0.35 + 0.1) * 100
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    taskSuccess: Math.round(taskSuccess * 100),
    toolAccuracy: Math.round(toolAccuracy * 100),
    policyCompliance: Math.round(policyCompliance * 100),
    unsafeActions,
  };
}
