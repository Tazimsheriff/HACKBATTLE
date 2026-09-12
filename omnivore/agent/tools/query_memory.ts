import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "../../src/db/client";
import { experiences, patterns, policies } from "../../src/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Tool: query_memory
 * Risk: LOW — auto-approved
 *
 * Retrieves relevant past experiences and approved policies.
 * This is how the agent accesses its "memory" before deciding what to do.
 *
 * IMPORTANT: Memory (facts) ≠ Learning (behavior change).
 * Approved policies are the behavioral adaptations. Experiences are the raw data.
 */
export default defineTool({
  description:
    "Query past experiences and approved behavioral policies for a given situation. " +
    "Use this BEFORE deciding how to respond to an anomaly — the agent may have learned " +
    "how to handle similar situations differently from past outcomes.",
  inputSchema: z.object({
    agent_id: z.string().describe("The agent's ID"),
    situation_keywords: z
      .array(z.string())
      .describe(
        "Keywords describing the current situation (e.g., ['temperature_spike', 'door_open'])"
      ),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Maximum number of experiences to return"),
  }),
  execute: async ({ agent_id, situation_keywords, limit }) => {
    // Fetch recent experiences for this agent
    const recentExperiences = await db
      .select()
      .from(experiences)
      .where(eq(experiences.agentId, agent_id))
      .orderBy(desc(experiences.createdAt))
      .limit(20);

    // Simple keyword matching (no vector DB needed for MVP)
    const relevant = recentExperiences.filter((exp) => {
      const text = `${exp.situation} ${exp.decision} ${exp.action} ${exp.feedback ?? ""}`.toLowerCase();
      return situation_keywords.some((kw) => text.includes(kw.toLowerCase()));
    });

    // Fetch approved behavioral policies
    const approvedPolicies = await db
      .select()
      .from(policies)
      .where(and(eq(policies.agentId, agent_id), eq(policies.status, "approved")));

    // Fetch candidate patterns (for awareness, not behavior change)
    const candidatePatterns = await db
      .select()
      .from(patterns)
      .where(
        and(
          eq(patterns.agentId, agent_id),
          sql`status IN ('approved', 'candidate')`
        )
      )
      .orderBy(desc(patterns.confidence))
      .limit(5);

    return {
      relevant_experiences: relevant.slice(0, limit).map((e) => ({
        situation: e.situation,
        decision: e.decision,
        action: e.action,
        actual_outcome: e.actualOutcome,
        feedback: e.feedback,
        success: e.success,
        timestamp: e.createdAt,
      })),
      approved_policies: approvedPolicies.map((p) => ({
        title: p.title,
        condition: p.condition,
        action: p.action,
        confidence: p.confidence,
        note: "This is an APPROVED behavioral policy — it should influence your decision.",
      })),
      candidate_patterns: candidatePatterns.map((p) => ({
        description: p.description,
        observations: p.observationCount,
        confidence: p.confidence,
        status: p.status,
      })),
      summary: {
        total_experiences: recentExperiences.length,
        relevant_count: relevant.length,
        active_policies: approvedPolicies.length,
      },
    };
  },
});
