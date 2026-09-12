import { db } from '../db/client';
import { sensorEvents, patterns } from '../db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

// ─────────────────────────────────────────────────────
// CONCEPT DRIFT DETECTION
// ─────────────────────────────────────────────────────

/**
 * Simple statistical concept drift detector.
 *
 * Compares the rolling 24-hour average against the 7-day baseline.
 * If the deviation exceeds 2 standard deviations, drift is detected.
 *
 * This demonstrates that the agent monitors for changing underlying data
 * distributions, not just new events.
 */
export async function detectConceptDrift(agentId: string): Promise<{
  driftDetected: boolean;
  metric: string;
  currentMean: number;
  baselineMean: number;
  deviationFactor: number;
}> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get last 24 hours of sensor data
  const recent = await db
    .select()
    .from(sensorEvents)
    .where(gte(sensorEvents.createdAt, yesterday));

  // Get 7-day baseline
  const baseline = await db
    .select()
    .from(sensorEvents)
    .where(gte(sensorEvents.createdAt, sevenDaysAgo));

  if (recent.length < 5 || baseline.length < 10) {
    return {
      driftDetected: false,
      metric: 'temperature',
      currentMean: 0,
      baselineMean: 0,
      deviationFactor: 0,
    };
  }

  // Calculate means
  const recentTemps = recent.filter((e) => e.temperature !== null).map((e) => e.temperature!);
  const baselineTemps = baseline.filter((e) => e.temperature !== null).map((e) => e.temperature!);

  const currentMean = mean(recentTemps);
  const baselineMean = mean(baselineTemps);
  const baselineStd = standardDeviation(baselineTemps);

  const deviationFactor = baselineStd > 0
    ? Math.abs(currentMean - baselineMean) / baselineStd
    : 0;

  const driftDetected = deviationFactor > 2.0;

  if (driftDetected) {
    console.log(
      `[Drift] Detected! Current mean: ${currentMean.toFixed(1)}°C, ` +
      `Baseline: ${baselineMean.toFixed(1)}°C, Deviation: ${deviationFactor.toFixed(2)}σ`
    );

    // Mark affected patterns for revalidation
    await db
      .update(patterns)
      .set({ requiresRevalidation: true, updatedAt: new Date() })
      .where(eq(patterns.agentId, agentId));
  }

  return { driftDetected, metric: 'temperature', currentMean, baselineMean, deviationFactor };
}

// ─────────────────────────────────────────────────────
// STATISTICAL HELPERS
// ─────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}
