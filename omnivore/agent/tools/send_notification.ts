import { defineTool } from "eve/tools";
import { z } from "zod";
import { db } from "../../src/db/client";
import { runGuardrail, waitForApproval } from "../../src/guardrails/engine";
import { runSteps } from "../../src/db/schema";

/**
 * Tool: send_notification
 * Risk: MEDIUM — requires human approval
 *
 * Sends a message to the warehouse manager via dashboard notification.
 * This tool is ALWAYS intercepted by the guardrail engine before executing.
 *
 * In the demo, approvals can be sent via:
 * - Dashboard UI (Approvals page)
 * - Telegram bot reply
 * - WhatsApp reply
 */
export default defineTool({
  description:
    "Send a notification message to the warehouse manager. " +
    "⚠️ MEDIUM RISK: This action requires human approval before executing. " +
    "Do not assume the notification will be sent immediately.",
  inputSchema: z.object({
    run_id: z.string().describe("Current agent run ID"),
    agent_id: z.string().describe("Agent ID"),
    recipient: z
      .enum(["warehouse_manager", "supervisor", "maintenance"])
      .describe("Who to notify"),
    subject: z.string().describe("Brief subject of the notification"),
    message: z.string().describe("The notification message to send"),
    urgency: z
      .enum(["low", "medium", "high", "critical"])
      .default("medium")
      .describe("Urgency level"),
  }),
  execute: async ({ run_id, agent_id, recipient, subject, message, urgency }) => {
    // 1. Run guardrail check
    const guardrailResult = await runGuardrail({
      agentId: agent_id,
      runId: run_id,
      toolName: "send_notification",
      toolInput: { recipient, subject, message, urgency },
    });

    if (guardrailResult.decision === "block") {
      return {
        success: false,
        status: "blocked",
        reason: guardrailResult.reason,
        message: "Notification BLOCKED by guardrail engine.",
      };
    }

    if (guardrailResult.decision === "require_approval") {
      // Log step: approval pending
      await db.insert(runSteps).values({
        runId: run_id,
        stepIndex: 99, // placeholder
        type: "approval",
        description: `⏸ Approval required for send_notification to ${recipient}`,
        status: "waiting",
        metadata: {
          approvalId: guardrailResult.approvalId,
          reason: guardrailResult.reason,
        },
      });

      // Wait for human approval (polling with timeout)
      const approvalOutcome = await waitForApproval(guardrailResult.approvalId, 10 * 60 * 1000);

      if (approvalOutcome === "approved") {
        // Execute the notification
        const result = await deliverNotification({ recipient, subject, message, urgency });

        // Log completion
        await db.insert(runSteps).values({
          runId: run_id,
          stepIndex: 100,
          type: "outcome",
          description: `✅ Notification sent to ${recipient}: "${subject}"`,
          status: "completed",
          metadata: { recipient, urgency, approvalOutcome },
        });

        return {
          success: true,
          status: "sent",
          recipient,
          subject,
          message,
          approvalId: guardrailResult.approvalId,
          note: "Notification sent after human approval.",
        };
      } else {
        return {
          success: false,
          status: approvalOutcome === "denied" ? "denied" : "expired",
          reason: `Approval was ${approvalOutcome}. Notification NOT sent.`,
          message: "Notification was NOT sent.",
        };
      }
    }

    // Low risk (shouldn't reach here for send_notification, but handle gracefully)
    const result = await deliverNotification({ recipient, subject, message, urgency });
    return { success: true, status: "sent", ...result };
  },
});

/**
 * Internal: Delivers the notification via available channels.
 * In production: sends via Telegram bot, WhatsApp, and dashboard.
 */
async function deliverNotification(opts: {
  recipient: string;
  subject: string;
  message: string;
  urgency: string;
}) {
  // Dashboard notification is always stored (via DB)
  // Telegram and WhatsApp are triggered here if configured

  const notificationText =
    `🚨 *OMNIVORE ALERT* [${opts.urgency.toUpperCase()}]\n` +
    `To: ${opts.recipient}\n` +
    `Subject: ${opts.subject}\n\n` +
    `${opts.message}\n\n` +
    `_Sent by OMNIVORE AGENT_`;

  // TODO: Telegram delivery (Milestone 7)
  // await telegramBot.sendMessage(MANAGER_CHAT_ID, notificationText, { parse_mode: 'Markdown' });

  // TODO: WhatsApp delivery (Milestone 7)
  // await whatsappClient.sendMessage(MANAGER_JID, notificationText);

  return {
    delivered_to: ["dashboard"],
    notification_text: notificationText,
    timestamp: new Date().toISOString(),
  };
}
