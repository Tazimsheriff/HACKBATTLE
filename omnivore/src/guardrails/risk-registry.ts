export type RiskLevel = 'low' | 'medium' | 'high' | 'blocked';

export interface ToolRiskEntry {
  riskLevel: RiskLevel;
  description: string;
  requiresApproval: boolean;
}

/**
 * Maps tool names to their risk classification.
 * This is the source of truth for guardrail decisions.
 */
export const TOOL_RISK_REGISTRY: Record<string, ToolRiskEntry> = {
  // ── LOW RISK: Execute automatically ──────────────────────
  get_sensor_data: {
    riskLevel: 'low',
    description: 'Read latest sensor data from ESP32',
    requiresApproval: false,
  },
  query_memory: {
    riskLevel: 'low',
    description: 'Retrieve relevant past experiences',
    requiresApproval: false,
  },
  search_experiences: {
    riskLevel: 'low',
    description: 'Search historical experience records',
    requiresApproval: false,
  },
  db_read: {
    riskLevel: 'low',
    description: 'Read data from database',
    requiresApproval: false,
  },
  get_patterns: {
    riskLevel: 'low',
    description: 'Retrieve learned behavioral patterns',
    requiresApproval: false,
  },
  get_agent_status: {
    riskLevel: 'low',
    description: 'Check current agent status',
    requiresApproval: false,
  },

  // ── MEDIUM RISK: Require human approval ──────────────────
  send_notification: {
    riskLevel: 'medium',
    description: 'Send external notification (WhatsApp/Telegram)',
    requiresApproval: true,
  },
  create_alert: {
    riskLevel: 'medium',
    description: 'Create a system alert',
    requiresApproval: true,
  },
  db_write: {
    riskLevel: 'medium',
    description: 'Write data to database',
    requiresApproval: true,
  },
  send_email: {
    riskLevel: 'medium',
    description: 'Send an email',
    requiresApproval: true,
  },
  update_config: {
    riskLevel: 'medium',
    description: 'Update system configuration',
    requiresApproval: true,
  },

  // ── HIGH RISK: Block entirely ─────────────────────────────
  delete_record: {
    riskLevel: 'blocked',
    description: 'Delete a database record (BLOCKED)',
    requiresApproval: false,
  },
  execute_code: {
    riskLevel: 'blocked',
    description: 'Execute arbitrary code (BLOCKED)',
    requiresApproval: false,
  },
  financial_action: {
    riskLevel: 'blocked',
    description: 'Perform a financial transaction (BLOCKED)',
    requiresApproval: false,
  },
  modify_guardrails: {
    riskLevel: 'blocked',
    description: 'Modify guardrail configuration (BLOCKED)',
    requiresApproval: false,
  },
};

/**
 * Get the risk entry for a tool. Defaults to 'medium' for unknown tools
 * — unknown tools are treated cautiously.
 */
export function getToolRisk(toolName: string): ToolRiskEntry {
  return (
    TOOL_RISK_REGISTRY[toolName] ?? {
      riskLevel: 'medium',
      description: `Unknown tool: ${toolName}`,
      requiresApproval: true,
    }
  );
}
