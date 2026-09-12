export type RiskLevel = 'low' | 'medium' | 'high' | 'blocked' | 'honeypot';

export interface ToolRiskEntry {
  riskLevel: RiskLevel;
  baseScore: number; // 0-100 base score before dynamic adjustment
  description: string;
  requiresApproval: boolean;
  category: string;
  isHoneypot?: boolean;
  // What factors amplify this tool's risk
  sensitiveArgs?: string[]; // args that bump score up if present
}

/**
 * Maps tool names to their risk classification.
 * baseScore: 0-100 base numeric risk.
 * Dynamic factors (recordScope, isProduction, recentBlocks) are applied on top.
 */
export const TOOL_RISK_REGISTRY: Record<string, ToolRiskEntry> = {
  // ── COLD-CHAIN / IoT TOOLS ───────────────────────────────────────────
  get_sensor_data: {
    riskLevel: 'low',
    baseScore: 5,
    description: 'Read latest sensor data from ESP32',
    requiresApproval: false,
    category: 'IoT / Hardware',
  },
  query_memory: {
    riskLevel: 'low',
    baseScore: 5,
    description: 'Retrieve relevant past experiences from vector memory',
    requiresApproval: false,
    category: 'Memory',
  },
  search_experiences: {
    riskLevel: 'low',
    baseScore: 5,
    description: 'Search historical experience records',
    requiresApproval: false,
    category: 'Memory',
  },
  db_read: {
    riskLevel: 'low',
    baseScore: 8,
    description: 'Read data from database',
    requiresApproval: false,
    category: 'Database',
  },
  get_patterns: {
    riskLevel: 'low',
    baseScore: 5,
    description: 'Retrieve learned behavioral patterns',
    requiresApproval: false,
    category: 'Memory',
  },
  get_agent_status: {
    riskLevel: 'low',
    baseScore: 3,
    description: 'Check current agent status',
    requiresApproval: false,
    category: 'System',
  },

  // ── EMAIL / CALENDAR ─────────────────────────────────────────────────
  gmail_read: {
    riskLevel: 'low',
    baseScore: 8,
    description: 'Read emails from Gmail inbox',
    requiresApproval: false,
    category: 'Email',
  },
  read_emails: {
    riskLevel: 'low',
    baseScore: 8,
    description: 'Scan and parse email messages',
    requiresApproval: false,
    category: 'Email',
  },
  read_calendar: {
    riskLevel: 'low',
    baseScore: 5,
    description: 'Inspect calendar events and scheduling',
    requiresApproval: false,
    category: 'Calendar',
  },
  gmail_send: {
    riskLevel: 'medium',
    baseScore: 45,
    description: 'Send an email via Gmail — external communication',
    requiresApproval: true,
    category: 'Email',
    sensitiveArgs: ['recipients', 'bcc', 'attachments'],
  },
  send_email: {
    riskLevel: 'medium',
    baseScore: 45,
    description: 'Send an email — external communication',
    requiresApproval: true,
    category: 'Email',
  },
  send_notification: {
    riskLevel: 'medium',
    baseScore: 38,
    description: 'Send notification via WhatsApp / Telegram / Discord',
    requiresApproval: true,
    category: 'Messaging',
  },
  gmail_delete: {
    riskLevel: 'high',
    baseScore: 72,
    description: 'Permanently delete emails from Gmail',
    requiresApproval: true,
    category: 'Email',
  },

  // ── E-COMMERCE / SHOPIFY ─────────────────────────────────────────────
  shopify_search: {
    riskLevel: 'low',
    baseScore: 6,
    description: 'Search Shopify product catalog',
    requiresApproval: false,
    category: 'E-Commerce',
  },
  shopify_read_order: {
    riskLevel: 'low',
    baseScore: 8,
    description: 'Read Shopify order details',
    requiresApproval: false,
    category: 'E-Commerce',
  },
  shopify_create_invoice: {
    riskLevel: 'low',
    baseScore: 20,
    description: 'Create a Shopify invoice (no charge yet)',
    requiresApproval: false,
    category: 'E-Commerce',
  },
  shopify_update_inventory: {
    riskLevel: 'medium',
    baseScore: 42,
    description: 'Update product inventory levels',
    requiresApproval: true,
    category: 'E-Commerce',
  },
  shopify_refund: {
    riskLevel: 'high',
    baseScore: 68,
    description: 'Issue a customer refund on Shopify',
    requiresApproval: true,
    category: 'E-Commerce',
    sensitiveArgs: ['amount', 'orderId'],
  },
  shopify_cancel_order: {
    riskLevel: 'high',
    baseScore: 65,
    description: 'Cancel a Shopify order — irreversible customer impact',
    requiresApproval: true,
    category: 'E-Commerce',
  },

  // ── PAYMENTS / STRIPE ────────────────────────────────────────────────
  stripe_read_customer: {
    riskLevel: 'low',
    baseScore: 10,
    description: 'Read Stripe customer profile and payment history',
    requiresApproval: false,
    category: 'Payments',
  },
  stripe_charge: {
    riskLevel: 'high',
    baseScore: 78,
    description: 'Charge a payment via Stripe — financial transaction',
    requiresApproval: true,
    category: 'Payments',
    sensitiveArgs: ['amount', 'currency', 'customerId'],
  },
  stripe_refund: {
    riskLevel: 'high',
    baseScore: 70,
    description: 'Issue a refund via Stripe — financial transaction',
    requiresApproval: true,
    category: 'Payments',
    sensitiveArgs: ['amount'],
  },

  // ── DATABASE / POSTGRES ──────────────────────────────────────────────
  postgres_read: {
    riskLevel: 'low',
    baseScore: 10,
    description: 'Read from PostgreSQL database (SELECT)',
    requiresApproval: false,
    category: 'Database',
  },
  db_write: {
    riskLevel: 'medium',
    baseScore: 48,
    description: 'Write / insert data to database',
    requiresApproval: true,
    category: 'Database',
  },
  postgres_update: {
    riskLevel: 'medium',
    baseScore: 52,
    description: 'UPDATE rows in PostgreSQL',
    requiresApproval: true,
    category: 'Database',
    sensitiveArgs: ['table', 'where', 'values'],
  },
  create_alert: {
    riskLevel: 'medium',
    baseScore: 35,
    description: 'Create a system alert',
    requiresApproval: true,
    category: 'System',
  },
  update_config: {
    riskLevel: 'medium',
    baseScore: 55,
    description: 'Update system configuration',
    requiresApproval: true,
    category: 'System',
  },

  // ── DEVOPS / GITHUB ──────────────────────────────────────────────────
  github_read: {
    riskLevel: 'low',
    baseScore: 8,
    description: 'Read GitHub repository, issues, or PRs',
    requiresApproval: false,
    category: 'DevOps',
  },
  github_comment: {
    riskLevel: 'medium',
    baseScore: 40,
    description: 'Post a comment on a GitHub issue or PR',
    requiresApproval: true,
    category: 'DevOps',
  },
  github_push: {
    riskLevel: 'high',
    baseScore: 75,
    description: 'Push code to a GitHub repository',
    requiresApproval: true,
    category: 'DevOps',
    sensitiveArgs: ['branch', 'force'],
  },
  github_merge_pr: {
    riskLevel: 'high',
    baseScore: 80,
    description: 'Merge a pull request — cannot be undone',
    requiresApproval: true,
    category: 'DevOps',
  },

  // ── BLOCKED: PERMANENTLY FORBIDDEN ──────────────────────────────────
  delete_record: {
    riskLevel: 'blocked',
    baseScore: 100,
    description: 'Delete a database record — PERMANENTLY BLOCKED',
    requiresApproval: false,
    category: 'Database',
  },
  postgres_delete: {
    riskLevel: 'blocked',
    baseScore: 100,
    description: 'DELETE from PostgreSQL — PERMANENTLY BLOCKED',
    requiresApproval: false,
    category: 'Database',
  },
  delete_all_customers: {
    riskLevel: 'blocked',
    baseScore: 100,
    description: 'Delete all customer records — PERMANENTLY BLOCKED',
    requiresApproval: false,
    category: 'Database',
  },
  execute_code: {
    riskLevel: 'blocked',
    baseScore: 100,
    description: 'Execute arbitrary code — PERMANENTLY BLOCKED',
    requiresApproval: false,
    category: 'System',
  },
  financial_action: {
    riskLevel: 'blocked',
    baseScore: 100,
    description: 'Unscoped financial transaction — PERMANENTLY BLOCKED',
    requiresApproval: false,
    category: 'Payments',
  },
  modify_guardrails: {
    riskLevel: 'blocked',
    baseScore: 100,
    description: 'Modify guardrail configuration — PERMANENTLY BLOCKED',
    requiresApproval: false,
    category: 'System',
  },
  emergency_compressor_cutoff: {
    riskLevel: 'blocked',
    baseScore: 95,
    description: 'Trip thermal relay — requires physical authorization',
    requiresApproval: false,
    category: 'IoT / Hardware',
  },
  customer_export_bulk: {
    riskLevel: 'blocked',
    baseScore: 95,
    description: 'Bulk export all customer data — BLOCKED by default',
    requiresApproval: false,
    category: 'Data',
  },

  // ── HONEYPOTS: TRAP TOOLS ────────────────────────────────────────────
  bypass_guardrails: {
    riskLevel: 'honeypot',
    baseScore: 100,
    description: '🍯 HONEYPOT: Attempting to bypass the guardrail engine',
    requiresApproval: false,
    category: 'Honeypot',
    isHoneypot: true,
  },
  emergency_override: {
    riskLevel: 'honeypot',
    baseScore: 100,
    description: '🍯 HONEYPOT: Emergency override attempt detected',
    requiresApproval: false,
    category: 'Honeypot',
    isHoneypot: true,
  },
  direct_db_access: {
    riskLevel: 'honeypot',
    baseScore: 100,
    description: '🍯 HONEYPOT: Direct database connection attempt',
    requiresApproval: false,
    category: 'Honeypot',
    isHoneypot: true,
  },
  export_all_no_limit: {
    riskLevel: 'honeypot',
    baseScore: 100,
    description: '🍯 HONEYPOT: Unlimited data export attempt',
    requiresApproval: false,
    category: 'Honeypot',
    isHoneypot: true,
  },
  disable_logging: {
    riskLevel: 'honeypot',
    baseScore: 100,
    description: '🍯 HONEYPOT: Attempting to disable audit logging',
    requiresApproval: false,
    category: 'Honeypot',
    isHoneypot: true,
  },
  web_search: {
    riskLevel: 'low',
    baseScore: 7,
    description: 'Search the web for information',
    requiresApproval: false,
    category: 'Research',
  },
};

/**
 * Get the risk entry for a tool.
 * Defaults to 'medium' / score 50 for unknown tools — cautious by design.
 */
export function getToolRisk(toolName: string): ToolRiskEntry {
  return (
    TOOL_RISK_REGISTRY[toolName] ?? {
      riskLevel: 'medium',
      baseScore: 50,
      description: `Unknown tool: ${toolName} — treated with caution`,
      requiresApproval: true,
      category: 'Unknown',
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC RISK SCORING ENGINE
// Computes a 0-100 score based on tool, data scope, context, and agent history
// ─────────────────────────────────────────────────────────────────────────────

export interface RiskScoringContext {
  toolName: string;
  toolInput?: Record<string, unknown>;
  // Data risk factors
  recordScope?: number;        // How many records affected (1 → 10k)
  hasPII?: boolean;            // Does the data contain PII?
  isProduction?: boolean;      // Is this a production system?
  // Context risk factors
  isUnusualHour?: boolean;     // Outside 9am-6pm local time
  isHighFrequency?: boolean;   // More than 10 similar calls in last hour
  // Agent risk factors
  recentBlockCount?: number;   // Blocks in last 24h for this agent
  isNewAgent?: boolean;        // Agent less than 7 days old
}

export interface RiskScoreResult {
  score: number;               // 0–100
  label: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  decision: 'allow' | 'require_approval' | 'block' | 'honeypot';
  breakdown: {
    toolRisk: number;          // 0–100
    dataRisk: number;          // 0–100
    contextRisk: number;       // 0–100
    agentRisk: number;         // 0–100
  };
  reasons: string[];
}

export function calculateDynamicRiskScore(ctx: RiskScoringContext): RiskScoreResult {
  const entry = getToolRisk(ctx.toolName);
  const reasons: string[] = [];

  // ── HONEYPOT: immediate trap ───────────────────────────────────────
  if (entry.isHoneypot) {
    return {
      score: 100,
      label: 'CRITICAL',
      decision: 'honeypot',
      breakdown: { toolRisk: 100, dataRisk: 100, contextRisk: 100, agentRisk: 100 },
      reasons: [`🍯 Honeypot triggered: ${entry.description}`],
    };
  }

  // ── BLOCKED: no override ───────────────────────────────────────────
  if (entry.riskLevel === 'blocked') {
    return {
      score: 100,
      label: 'CRITICAL',
      decision: 'block',
      breakdown: { toolRisk: 100, dataRisk: 0, contextRisk: 0, agentRisk: 0 },
      reasons: [`Tool "${ctx.toolName}" is permanently blocked: ${entry.description}`],
    };
  }

  // ── Tool Risk (40% weight) ─────────────────────────────────────────
  let toolRisk = entry.baseScore;
  reasons.push(`Tool base risk: ${toolRisk}/100 (${entry.category})`);

  // Check for sensitive arguments that amplify risk
  if (entry.sensitiveArgs && ctx.toolInput) {
    const hasSensitiveArgs = entry.sensitiveArgs.some(
      (arg) => ctx.toolInput![arg] !== undefined && ctx.toolInput![arg] !== null
    );
    if (hasSensitiveArgs) {
      toolRisk = Math.min(100, toolRisk + 10);
      reasons.push('Sensitive arguments detected (+10)');
    }
  }

  // ── Data Risk (30% weight) ─────────────────────────────────────────
  let dataRisk = 0;
  if (ctx.recordScope) {
    if (ctx.recordScope > 10000) {
      dataRisk += 60;
      reasons.push(`Massive data scope: ${ctx.recordScope.toLocaleString()} records (+60)`);
    } else if (ctx.recordScope > 1000) {
      dataRisk += 40;
      reasons.push(`Large data scope: ${ctx.recordScope.toLocaleString()} records (+40)`);
    } else if (ctx.recordScope > 100) {
      dataRisk += 20;
      reasons.push(`Significant data scope: ${ctx.recordScope} records (+20)`);
    }
  }
  if (ctx.hasPII) {
    dataRisk += 25;
    reasons.push('PII data involved (+25)');
  }
  if (ctx.isProduction) {
    dataRisk += 15;
    reasons.push('Production environment (+15)');
  }
  dataRisk = Math.min(100, dataRisk);

  // ── Context Risk (15% weight) ──────────────────────────────────────
  let contextRisk = 0;
  if (ctx.isUnusualHour) {
    contextRisk += 20;
    reasons.push('Unusual execution hour (+20)');
  }
  if (ctx.isHighFrequency) {
    contextRisk += 15;
    reasons.push('High frequency pattern (+15)');
  }
  contextRisk = Math.min(100, contextRisk);

  // ── Agent Risk (15% weight) ────────────────────────────────────────
  let agentRisk = 0;
  if (ctx.isNewAgent) {
    agentRisk += 20;
    reasons.push('New agent (low trust history) (+20)');
  }
  if (ctx.recentBlockCount) {
    const blockPenalty = Math.min(40, ctx.recentBlockCount * 10);
    agentRisk += blockPenalty;
    reasons.push(`${ctx.recentBlockCount} recent block(s) (+${blockPenalty})`);
  }
  agentRisk = Math.min(100, agentRisk);

  // ── Composite Score (weighted average) ────────────────────────────
  const score = Math.round(
    toolRisk * 0.40 +
    dataRisk * 0.30 +
    contextRisk * 0.15 +
    agentRisk * 0.15
  );

  // ── Label & Decision ──────────────────────────────────────────────
  let label: RiskScoreResult['label'];
  let decision: RiskScoreResult['decision'];

  if (score >= 85) {
    label = 'CRITICAL';
    decision = 'block';
  } else if (score >= 50) {
    label = 'HIGH';
    decision = 'require_approval';
  } else if (score >= 25) {
    label = 'MEDIUM';
    decision = entry.requiresApproval ? 'require_approval' : 'allow';
  } else {
    label = 'LOW';
    decision = 'allow';
  }

  return {
    score,
    label,
    decision,
    breakdown: { toolRisk, dataRisk, contextRisk, agentRisk },
    reasons,
  };
}
