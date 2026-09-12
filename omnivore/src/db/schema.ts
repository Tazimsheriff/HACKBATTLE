import {
  pgTable,
  uuid,
  text,
  boolean,
  real,
  integer,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─────────────────────────────────────────────────────
// AGENTS
// ─────────────────────────────────────────────────────
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  goal: text('goal').notNull(),
  instructions: text('instructions').notNull(),
  model: text('model').notNull().default('google/gemini-2.0-flash'),
  tools: jsonb('tools').notNull().default([]),
  memoryConfig: jsonb('memory_config').notNull().default({ enabled: true, contextWindow: 10 }),
  learningConfig: jsonb('learning_config').notNull().default({
    enabled: true,
    confidenceThreshold: 0.85,
    minObservations: 5,
    requireApproval: false,
  }),
  guardrailConfig: jsonb('guardrail_config').notNull().default({
    enabled: true,
    autoApproveBelow: 'low',
    blockAbove: 'high',
  }),
  permissions: jsonb('permissions').notNull().default({}),
  triggers: jsonb('triggers').notNull().default(['manual']),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────────────────
// AGENT RUNS
// ─────────────────────────────────────────────────────
export const agentRuns = pgTable('agent_runs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid('agent_id').references(() => agents.id),
  input: text('input').notNull(),
  output: text('output'),
  status: text('status').notNull().default('running'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  source: text('source').default('manual'), // manual | api | whatsapp | telegram | esp32 | webhook
  channelId: text('channel_id'),
  metadata: jsonb('metadata').default({}),
});

// ─────────────────────────────────────────────────────
// TOOL CALLS
// ─────────────────────────────────────────────────────
export const toolCalls = pgTable('tool_calls', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  runId: uuid('run_id').references(() => agentRuns.id),
  toolName: text('tool_name').notNull(),
  input: jsonb('input').notNull(),
  output: jsonb('output'),
  riskLevel: text('risk_level').notNull().default('low'),
  status: text('status').notNull().default('pending'),
  durationMs: integer('duration_ms'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────────────────
// RUN STEPS (execution trace)
// ─────────────────────────────────────────────────────
export const runSteps = pgTable('run_steps', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  runId: uuid('run_id').references(() => agentRuns.id),
  stepIndex: integer('step_index').notNull(),
  type: text('type').notNull(), // plan | tool_call | guardrail | approval | outcome | learning
  description: text('description').notNull(),
  status: text('status').notNull().default('completed'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────────────────
// EXPERIENCES
// ─────────────────────────────────────────────────────
export const experiences = pgTable('experiences', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid('agent_id').references(() => agents.id),
  runId: uuid('run_id').references(() => agentRuns.id),
  situation: text('situation').notNull(),
  context: jsonb('context').notNull(),
  decision: text('decision').notNull(),
  action: text('action').notNull(),
  expectedOutcome: text('expected_outcome'),
  actualOutcome: text('actual_outcome'),
  feedback: text('feedback'),
  success: boolean('success'),
  lesson: text('lesson'),
  confidence: real('confidence').default(0),
  unknownPattern: boolean('unknown_pattern').default(false),
  processed: boolean('processed').default(false), // has been through reflection pipeline
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────────────────
// PATTERNS
// ─────────────────────────────────────────────────────
export const patterns = pgTable('patterns', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid('agent_id').references(() => agents.id),
  description: text('description').notNull(),
  condition: jsonb('condition').notNull(),
  observationCount: integer('observation_count').default(0),
  successCount: integer('success_count').default(0),
  failureCount: integer('failure_count').default(0),
  confidence: real('confidence').default(0),
  status: text('status').default('candidate'), // candidate | approved | rejected | deprecated
  sourceExperienceIds: jsonb('source_experience_ids').default([]),
  requiresRevalidation: boolean('requires_revalidation').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────────────────
// POLICIES (behavioral rules)
// ─────────────────────────────────────────────────────
export const policies = pgTable('policies', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid('agent_id').references(() => agents.id),
  patternId: uuid('pattern_id').references(() => patterns.id),
  title: text('title').notNull(),
  condition: text('condition').notNull(), // human-readable IF condition
  action: text('action').notNull(), // human-readable THEN action
  conditionStructured: jsonb('condition_structured'),
  confidence: real('confidence').notNull(),
  status: text('status').default('candidate'), // candidate | under_review | approved | rejected
  approvedBy: text('approved_by'), // 'auto' or user id
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────────────────
// EVALUATIONS
// ─────────────────────────────────────────────────────
export const evaluations = pgTable('evaluations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid('agent_id').references(() => agents.id),
  testName: text('test_name').notNull(),
  expected: text('expected').notNull(),
  actual: text('actual'),
  score: real('score'),
  passed: boolean('passed'),
  metadata: jsonb('metadata').default({}),
  ranAt: timestamp('ran_at', { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────────────────
// APPROVAL REQUESTS (human-in-the-loop)
// ─────────────────────────────────────────────────────
export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid('agent_id').references(() => agents.id),
  runId: uuid('run_id').references(() => agentRuns.id),
  toolCallId: uuid('tool_call_id').references(() => toolCalls.id),
  toolName: text('tool_name').notNull(),
  proposedAction: jsonb('proposed_action').notNull(),
  riskLevel: text('risk_level').notNull(),
  reason: text('reason').notNull(),
  status: text('status').default('pending'), // pending | approved | denied | expired
  responseBy: text('response_by'),
  responseAt: timestamp('response_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────────────────
// GUARDRAIL EVENTS
// ─────────────────────────────────────────────────────
export const guardrailEvents = pgTable('guardrail_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid('agent_id').references(() => agents.id),
  runId: uuid('run_id').references(() => agentRuns.id),
  toolName: text('tool_name').notNull(),
  riskLevel: text('risk_level').notNull(),
  decision: text('decision').notNull(), // allow | require_approval | block
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────────────────
// SENSOR EVENTS (ESP32)
// ─────────────────────────────────────────────────────
export const sensorEvents = pgTable('sensor_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  deviceId: text('device_id').notNull().default('esp32-s3-01'),
  temperature: real('temperature'),
  humidity: real('humidity'),
  doorOpen: boolean('door_open'),
  motion: boolean('motion'),
  raw: jsonb('raw').notNull(),
  triggeredRunId: uuid('triggered_run_id').references(() => agentRuns.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─────────────────────────────────────────────────────
// TYPES (inferred from schema)
// ─────────────────────────────────────────────────────
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;
export type ToolCall = typeof toolCalls.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type NewExperience = typeof experiences.$inferInsert;
export type Pattern = typeof patterns.$inferSelect;
export type Policy = typeof policies.$inferSelect;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type SensorEvent = typeof sensorEvents.$inferSelect;
