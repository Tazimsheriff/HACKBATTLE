import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "../../src/db/client";
import { sql } from "drizzle-orm";

/**
 * Tool: db_read
 * Safe read-only tool allowing the agent to inspect telemetry or run history
 * Risk Level: LOW (Read-only, no side effects)
 */
export default defineTool({
  description:
    "Execute safe, read-only queries against system tables (e.g. sensor_events, experiences, patterns, policies, guardrail_events) to diagnose anomalies or retrieve historical metrics.",
  inputSchema: z.object({
    tableName: z
      .enum([
        "sensor_events",
        "experiences",
        "patterns",
        "policies",
        "guardrail_events",
        "approval_requests",
      ])
      .describe("Table to query"),
    limit: z.number().int().min(1).max(50).default(10).describe("Max records to fetch"),
    filterKey: z
      .string()
      .optional()
      .describe("Optional column name to filter on (e.g. 'status')"),
    filterValue: z.string().optional().describe("Optional value for the filter"),
  }),
  execute: async ({ tableName, limit, filterKey, filterValue }) => {
    try {
      let query;
      if (filterKey && filterValue) {
        query = sql.raw(
          `SELECT * FROM ${tableName} WHERE ${filterKey.replace(/[^a-zA-Z0-9_]/g, "")} = '${filterValue.replace(/'/g, "''")}' ORDER BY created_at DESC LIMIT ${limit}`
        );
      } else {
        query = sql.raw(`SELECT * FROM ${tableName} ORDER BY created_at DESC LIMIT ${limit}`);
      }

      const rows = await db.execute(query);
      return {
        status: "success",
        count: (rows as unknown[]).length,
        data: rows,
      };
    } catch (error) {
      return {
        status: "error",
        error: error instanceof Error ? error.message : "Database read failed",
      };
    }
  },
});
