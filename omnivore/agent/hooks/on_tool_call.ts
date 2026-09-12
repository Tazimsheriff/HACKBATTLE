import { runGuardrail } from "../../src/guardrails/engine";

export interface ToolCallContext {
  runId: string;
  toolName: string;
  parameters: Record<string, unknown>;
  agentId?: string;
  userId?: string;
}

/**
 * Pre-execution guardrail hook for agent tools.
 * Returns { allowed: true } or { allowed: false, reason: string, approvalRequestId?: string }
 */
export async function onToolCall({
  runId,
  toolName,
  parameters,
  agentId = "omnivore-cold-chain",
}: ToolCallContext): Promise<{
  allowed: boolean;
  reason?: string;
  approvalRequestId?: string;
  decision: "allow" | "require_approval" | "block";
}> {
  const result = await runGuardrail({
    agentId,
    runId,
    toolName,
    toolInput: parameters,
  });

  if (result.decision === "block") {
    return {
      allowed: false,
      reason: result.reason,
      decision: "block",
    };
  }

  if (result.decision === "require_approval") {
    return {
      allowed: false,
      reason: `Execution halted. High-risk action requires human sign-off: ${result.reason}`,
      approvalRequestId: result.approvalId,
      decision: "require_approval",
    };
  }

  return {
    allowed: true,
    decision: "allow",
  };
}
