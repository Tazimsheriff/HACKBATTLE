import OpenAI from 'openai';
import { db } from '../db/client';
import { patterns, policies, experiences } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { getUnprocessedExperiences, markExperiencesProcessed } from './experience';
import type { Experience } from '../db/schema';

const useMistral = !!process.env.MISTRAL_API_KEY;
const isGoogleGeminiKey = !useMistral && !!process.env.GEMINI_API_KEY;
const apiKey =
  process.env.MISTRAL_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.OPENROUTER_API_KEY ||
  'sk-or-placeholder';

const baseURL = useMistral
  ? 'https://api.mistral.ai/v1'
  : isGoogleGeminiKey
  ? 'https://generativelanguage.googleapis.com/v1beta/openai/'
  : 'https://openrouter.ai/api/v1';

const openrouter = new OpenAI({
  apiKey,
  baseURL,
  defaultHeaders: useMistral
    ? {}
    : isGoogleGeminiKey
    ? {}
    : {
        'HTTP-Referer': 'https://omnivore-agent.vercel.app',
        'X-Title': 'OMNIVORE AGENT Learning Engine',
      },
});



// ─────────────────────────────────────────────────────
// REFLECTION (LLM-powered pattern detection)
// ─────────────────────────────────────────────────────

interface CandidatePattern {
  description: string;
  condition: string;          // Human-readable IF clause
  action: string;             // Human-readable THEN action
  conditionStructured: Record<string, unknown>; // Machine-readable
  confidence: number;
  reasoning: string;
}

/**
 * The Reflection Engine — the heart of self-learning.
 *
 * Takes a batch of experiences and asks the LLM:
 * "Do you see a recurring pattern here that should change future behavior?"
 *
 * This is called sparingly (once per batch, not per event) to minimize LLM costs.
 */
export async function runReflection(agentId: string): Promise<void> {
  const unprocessed = await getUnprocessedExperiences(agentId);

  if (unprocessed.length < 3) {
    // Not enough experiences to detect a pattern yet
    return;
  }

  console.log(`[Reflection] Running for agent ${agentId} with ${unprocessed.length} experiences`);

  // Format experiences for LLM
  const experienceSummaries = unprocessed.map((e, i) => `
Experience ${i + 1}:
- Situation: ${e.situation}
- Context: ${JSON.stringify(e.context)}
- Decision: ${e.decision}
- Action: ${e.action}
- Expected: ${e.expectedOutcome ?? 'N/A'}
- Actual: ${e.actualOutcome ?? 'N/A'}
- Feedback: ${e.feedback ?? 'None'}
- Success: ${e.success ?? 'Unknown'}
`).join('\n---\n');

  const prompt = `You are the reflection engine of an autonomous AI agent called OMNIVORE AGENT.
You are analyzing a batch of recent agent experiences to identify recurring patterns that should change future behavior.

IMPORTANT DISTINCTION:
- Memory = storing facts ("the door was opened")
- Learning = changing future behavior ("when door opens + temperature spikes < 5 min, monitor instead of alerting")

Recent experiences:
${experienceSummaries}

Analyze these experiences and respond with a JSON object:
{
  "pattern_detected": boolean,
  "description": "Short description of the pattern",
  "condition": "Human-readable IF condition (e.g., 'temperature > 30°C AND door is open AND duration < 5 minutes')",
  "action": "Human-readable THEN behavior change (e.g., 'monitor and wait instead of immediately escalating')",
  "condition_structured": {
    // Machine-readable condition fields:
    // temperature_above, temperature_below, door_open, duration_below, humidity_above
  },
  "confidence": 0.0-1.0,
  "reasoning": "Why this pattern is reliable or not"
}

If no clear actionable pattern exists, set "pattern_detected": false.
Only detect patterns that would meaningfully change the agent's future behavior.
Return ONLY the JSON object, no markdown.`;

  try {
    const response = await openrouter.chat.completions.create({
      model: useMistral
        ? 'open-mistral-nemo'
        : isGoogleGeminiKey
        ? 'gemini-2.0-flash'
        : 'google/gemini-2.0-flash-001',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 800,
    });

    const rawJson = response.choices[0]?.message?.content?.trim() ?? '{}';

    // Parse the response
    let candidate: CandidatePattern & { pattern_detected: boolean };
    try {
      candidate = JSON.parse(rawJson);
    } catch {
      console.error('[Reflection] Failed to parse LLM response:', rawJson);
      await markExperiencesProcessed(unprocessed.map((e) => e.id));
      return;
    }

    if (!candidate.pattern_detected) {
      console.log('[Reflection] No pattern detected in this batch');
      await markExperiencesProcessed(unprocessed.map((e) => e.id));
      return;
    }

    // Store the candidate pattern
    await storePattern(agentId, candidate, unprocessed);
    await markExperiencesProcessed(unprocessed.map((e) => e.id));

    console.log(`[Reflection] Pattern detected: "${candidate.description}" (confidence: ${candidate.confidence})`);
  } catch (error) {
    console.error('[Reflection] Error during reflection:', error);
  }
}

// ─────────────────────────────────────────────────────
// STATISTICAL VALIDATION
// ─────────────────────────────────────────────────────

async function storePattern(
  agentId: string,
  candidate: CandidatePattern,
  sourceExperiences: Experience[]
): Promise<void> {
  // Count successes and failures from source experiences
  const successCount = sourceExperiences.filter((e) => e.success === true).length;
  const failureCount = sourceExperiences.filter((e) => e.success === false).length;
  const observationCount = sourceExperiences.length;

  // Statistical confidence = successes / total
  const statisticalConfidence =
    observationCount > 0 ? successCount / observationCount : 0;

  // Blend LLM confidence with statistical confidence
  const blendedConfidence = (candidate.confidence + statisticalConfidence) / 2;
  const finalConfidence = Math.round(blendedConfidence * 100) / 100;

  // Determine status based on confidence threshold
  const status = finalConfidence >= 0.85 ? 'approved' : 'candidate';

  // Check for existing similar pattern (avoid duplicates)
  const existing = await db
    .select()
    .from(patterns)
    .where(and(eq(patterns.agentId, agentId), eq(patterns.description, candidate.description)));

  if (existing.length > 0) {
    // Update existing pattern
    const existingPattern = existing[0];
    const newObservations = existingPattern.observationCount! + observationCount;
    const newSuccesses = existingPattern.successCount! + successCount;
    const newFailures = existingPattern.failureCount! + failureCount;
    const newConfidence = newObservations > 0 ? newSuccesses / newObservations : 0;
    const newStatus = newConfidence >= 0.85 ? 'approved' : existingPattern.status!;

    await db
      .update(patterns)
      .set({
        observationCount: newObservations,
        successCount: newSuccesses,
        failureCount: newFailures,
        confidence: Math.round(newConfidence * 100) / 100,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(patterns.id, existingPattern.id));

    // If pattern just got approved, generate a policy
    if (newStatus === 'approved' && existingPattern.status !== 'approved') {
      await generatePolicy(agentId, existingPattern.id, candidate, newConfidence);
    }
  } else {
    // Create new pattern
    const [newPattern] = await db
      .insert(patterns)
      .values({
        agentId,
        description: candidate.description,
        condition: { structured: candidate.conditionStructured, human: candidate.condition },
        observationCount,
        successCount,
        failureCount,
        confidence: finalConfidence,
        status,
        sourceExperienceIds: sourceExperiences.map((e) => e.id),
      })
      .returning();

    // If already approved, generate policy immediately
    if (status === 'approved') {
      await generatePolicy(agentId, newPattern.id, candidate, finalConfidence);
    }
  }
}

// ─────────────────────────────────────────────────────
// POLICY GENERATION
// ─────────────────────────────────────────────────────

async function generatePolicy(
  agentId: string,
  patternId: string,
  candidate: CandidatePattern,
  confidence: number
): Promise<void> {
  await db.insert(policies).values({
    agentId,
    patternId,
    title: candidate.description,
    condition: candidate.condition,
    action: candidate.action,
    conditionStructured: candidate.conditionStructured,
    confidence,
    status: 'approved',
    approvedBy: 'auto',
  });

  console.log(`[Learning] Policy auto-approved: "${candidate.description}"`);
}

/**
 * Convenience wrapper for API and dashboard triggers
 */
export async function runReflectionCycle(
  param?: number | string
): Promise<{ success: boolean; message: string }> {
  const agentId = typeof param === "string" ? param : "omnivore-cold-chain";
  await runReflection(agentId);
  return {
    success: true,
    message: `Reflection cycle executed for agent ${agentId}`,
  };
}

