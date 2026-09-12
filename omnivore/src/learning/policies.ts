import { db } from "../db/client";
import { policies, patterns } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import type { Policy } from "../db/schema";

/**
 * Retrieves all currently approved behavioral policies.
 * These are injected into the agent's prompt during runtime.
 */
export async function getActivePolicies(): Promise<Policy[]> {
  try {
    return await db
      .select()
      .from(policies)
      .where(eq(policies.status, "approved"))
      .orderBy(desc(policies.createdAt));
  } catch (error) {
    console.warn("[policies] DB query failed, falling back to empty policy set:", error);
    return [];
  }
}

/**
 * Formats approved policies into clean markdown rules for injection into agent prompt.
 */
export async function getPromptInjectedPolicies(): Promise<string> {
  const active = await getActivePolicies();
  if (active.length === 0) {
    return "No active learned policies currently in effect.";
  }

  return active
    .map(
      (p, idx) =>
        `### Learned Policy #${idx + 1}: ${p.title}\n- IF: ${p.condition}\n- THEN: ${p.action}\n- Confidence: ${(p.confidence * 100).toFixed(1)}%\n- Source Pattern: ${p.patternId || "Human Verified"}`
    )
    .join("\n\n");
}

/**
 * Promote a candidate pattern to an active policy upon human approval.
 */
export async function approvePatternAsPolicy({
  patternId,
  approvedBy,
  customRule,
}: {
  patternId: string;
  approvedBy: string;
  customRule?: string;
}): Promise<Policy | null> {
  try {
    // 1. Fetch the pattern
    const [pattern] = await db
      .select()
      .from(patterns)
      .where(eq(patterns.id, patternId))
      .limit(1);

    if (!pattern) {
      throw new Error(`Pattern ${patternId} not found`);
    }

    // 2. Insert new approved policy matching schema.ts
    const [created] = await db
      .insert(policies)
      .values({
        patternId: pattern.id,
        title: customRule || pattern.description,
        condition: typeof pattern.condition === "object" ? JSON.stringify(pattern.condition) : String(pattern.condition),
        action: "Suppress emergency notification; hold alarm and monitor for 35 min",
        confidence: pattern.confidence || 0.95,
        status: "approved",
        approvedBy,
      })
      .returning();

    // 3. Mark pattern as approved
    await db
      .update(patterns)
      .set({
        status: "approved",
        updatedAt: new Date(),
      })
      .where(eq(patterns.id, patternId));

    return created;
  } catch (error) {
    console.error("[approvePatternAsPolicy] Error:", error);
    return null;
  }
}
