import { db } from '../db/client';
import { experiences, patterns, policies } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { NewExperience, Experience } from '../db/schema';

// ─────────────────────────────────────────────────────
// EXPERIENCE CAPTURE
// ─────────────────────────────────────────────────────

export interface ExperienceInput {
  agentId: string;
  runId: string;
  situation: string;
  context: Record<string, unknown>;
  decision: string;
  action: string;
  expectedOutcome?: string;
  actualOutcome?: string;
  feedback?: string;
  success?: boolean;
  unknownPattern?: boolean;
}

/**
 * Captures a meaningful agent experience after a run completes.
 * This is the first step of the learning pipeline.
 */
export async function captureExperience(input: ExperienceInput): Promise<Experience> {
  const [experience] = await db
    .insert(experiences)
    .values({
      agentId: input.agentId,
      runId: input.runId,
      situation: input.situation,
      context: input.context,
      decision: input.decision,
      action: input.action,
      expectedOutcome: input.expectedOutcome,
      actualOutcome: input.actualOutcome,
      feedback: input.feedback,
      success: input.success,
      unknownPattern: input.unknownPattern ?? false,
      processed: false,
    })
    .returning();

  return experience;
}

/**
 * Fetch unprocessed experiences for a given agent.
 */
export async function getUnprocessedExperiences(agentId: string): Promise<Experience[]> {
  return db
    .select()
    .from(experiences)
    .where(and(eq(experiences.agentId, agentId), eq(experiences.processed, false)));
}

/**
 * Mark experiences as processed after the reflection pipeline runs.
 */
export async function markExperiencesProcessed(experienceIds: string[]): Promise<void> {
  for (const id of experienceIds) {
    await db
      .update(experiences)
      .set({ processed: true })
      .where(eq(experiences.id, id));
  }
}

// ─────────────────────────────────────────────────────
// UNKNOWN PATTERN DETECTION
// ─────────────────────────────────────────────────────

interface SensorContext {
  temperature?: number;
  humidity?: number;
  door_open?: boolean;
  duration_minutes?: number;
}

/**
 * Checks if the current sensor context matches any known pattern.
 * If not, the situation is flagged as an UNKNOWN PATTERN.
 *
 * The agent should increase uncertainty and require human approval
 * when an unknown pattern is detected.
 */
export async function detectUnknownPattern(
  agentId: string,
  context: SensorContext
): Promise<{ isUnknown: boolean; matchedPatterns: string[] }> {
  const approvedPatterns = await db
    .select()
    .from(patterns)
    .where(and(eq(patterns.agentId, agentId), eq(patterns.status, 'approved')));

  const matchedPatterns: string[] = [];

  for (const pattern of approvedPatterns) {
    const condition = pattern.condition as Record<string, unknown>;
    const matches = evaluateCondition(condition, context);
    if (matches) {
      matchedPatterns.push(pattern.id);
    }
  }

  return {
    isUnknown: matchedPatterns.length === 0 && approvedPatterns.length > 0,
    matchedPatterns,
  };
}

/**
 * Simple condition evaluator for structured pattern conditions.
 * Checks if current context matches the pattern's IF clause.
 */
function evaluateCondition(
  condition: Record<string, unknown>,
  context: SensorContext
): boolean {
  const checks: boolean[] = [];

  if (condition.temperature_above !== undefined && context.temperature !== undefined) {
    checks.push(context.temperature > (condition.temperature_above as number));
  }
  if (condition.temperature_below !== undefined && context.temperature !== undefined) {
    checks.push(context.temperature < (condition.temperature_below as number));
  }
  if (condition.door_open !== undefined && context.door_open !== undefined) {
    checks.push(context.door_open === condition.door_open);
  }
  if (condition.duration_below !== undefined && context.duration_minutes !== undefined) {
    checks.push(context.duration_minutes < (condition.duration_below as number));
  }

  return checks.length > 0 && checks.every(Boolean);
}

// ─────────────────────────────────────────────────────
// APPROVED POLICY LOADER (for prompt injection)
// ─────────────────────────────────────────────────────

/**
 * Loads all approved behavioral policies for an agent.
 * These are injected into the agent's system prompt before each run
 * to change future behavior — this is the ADAPTATION step.
 */
export async function loadApprovedPolicies(agentId: string): Promise<string> {
  const approvedPolicies = await db
    .select()
    .from(policies)
    .where(and(eq(policies.agentId, agentId), eq(policies.status, 'approved')));

  if (approvedPolicies.length === 0) return '';

  const policyLines = approvedPolicies.map(
    (p, i) =>
      `LEARNED BEHAVIOR ${i + 1} (confidence: ${Math.round(p.confidence * 100)}%):\n` +
      `IF: ${p.condition}\n` +
      `THEN: ${p.action}`
  );

  return (
    '\n\n[LEARNED BEHAVIORAL POLICIES — These override default behavior]\n' +
    policyLines.join('\n\n') +
    '\n'
  );
}
