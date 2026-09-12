import { captureExperience } from "../../src/learning/experience";
import { db } from "../../src/db/client";
import { agentRuns } from "../../src/db/schema";
import { eq } from "drizzle-orm";

export interface TurnEndContext {
  runId: string;
  triggerEvent: string;
  actionTaken: string;
  outcome: string;
  wasSuccessful: boolean;
  agentId?: string;
  category?: string;
  metadata?: Record<string, unknown>;
  latencyMs?: number;
  tokensUsed?: number;
}

/**
 * Post-execution turn hook.
 * Stores experience telemetry into DB and checks if automatic reflection is triggered.
 */
export async function onTurnEnd({
  runId,
  triggerEvent,
  actionTaken,
  outcome,
  wasSuccessful,
  agentId = "sapiens-cold-chain",
  category = "system",
  metadata = {},
  latencyMs = 0,
  tokensUsed = 0,
}: TurnEndContext) {
  try {
    // 1. Capture experience into self-learning episodic memory
    const experience = await captureExperience({
      agentId,
      runId,
      situation: triggerEvent,
      decision: `Execute action: ${actionTaken}`,
      action: actionTaken,
      expectedOutcome: "Resolve incident safely",
      actualOutcome: outcome,
      success: wasSuccessful,
      context: { ...metadata, category },
      unknownPattern: !wasSuccessful,
    });

    // 2. Update agent run record if exists
    await db
      .update(agentRuns)
      .set({
        status: wasSuccessful ? "completed" : "failed",
        completedAt: new Date(),
        metadata: {
          totalTokens: tokensUsed,
          executionTimeMs: latencyMs,
        },
      })
      .where(eq(agentRuns.id, runId));

    return {
      success: true,
      experienceId: experience.id,
      unknownPatternFlag: experience.unknownPattern,
    };
  } catch (error) {
    console.error("[onTurnEnd] Error recording experience:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Turn completion hook failed",
    };
  }
}
