import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "../../src/db/client";
import { experiences } from "../../src/db/schema";
import { desc, ilike, or } from "drizzle-orm";

/**
 * Tool: search_experiences
 * Searches previous incident experiences to evaluate if an anomaly has known precedent
 * Risk Level: LOW
 */
export default defineTool({
  description:
    "Searches the agent's episodic memory of past incidents, human interventions, and outcomes. Use this to determine if an anomaly is a recurring false alarm or has a known resolution.",
  inputSchema: z.object({
    keyword: z.string().describe("Keyword or phrase to search (e.g. 'defrost', 'spike', 'door open', 'battery')"),
    limit: z.number().int().min(1).max(20).default(5).describe("Number of past experiences to retrieve"),
  }),
  execute: async ({ keyword, limit }) => {
    try {
      const searchPattern = `%${keyword}%`;
      const records = await db
        .select()
        .from(experiences)
        .where(
          or(
            ilike(experiences.situation, searchPattern),
            ilike(experiences.action, searchPattern),
            ilike(experiences.feedback, searchPattern),
            ilike(experiences.lesson, searchPattern)
          )
        )
        .orderBy(desc(experiences.createdAt))
        .limit(limit);

      return {
        query: keyword,
        count: records.length,
        results: records.map((r) => ({
          id: r.id,
          situation: r.situation,
          actionTaken: r.action,
          outcome: r.actualOutcome,
          wasSuccessful: r.success,
          feedback: r.feedback,
          lesson: r.lesson,
          timestamp: r.createdAt,
        })),
      };
    } catch (error) {
      return {
        status: "error",
        error: error instanceof Error ? error.message : "Failed searching experiences",
      };
    }
  },
});
