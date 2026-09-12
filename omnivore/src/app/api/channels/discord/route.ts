import { NextResponse } from "next/server";
import { discordService } from "@/channels/discord-service";

export async function GET() {
  try {
    await discordService.syncFromDiscordChannel();
    const status = discordService.getStatus();
    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get Discord status" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, webhookUrl, message, text, sender, telemetry } = body;

    // 1. Configure Webhook
    if (action === "configure" || webhookUrl !== undefined) {
      discordService.setWebhookUrl(webhookUrl || "");
      return NextResponse.json({
        success: true,
        message: "Discord webhook updated successfully",
        ...discordService.getStatus(),
      });
    }

    // 2. Chat Inbound Message (evaluates guardrail flags & generates bot response)
    if (action === "chat" || text) {
      const chatText = (text || message?.body || "").trim();
      if (!chatText) {
        return NextResponse.json({ error: "Text is required for Discord chat" }, { status: 400 });
      }

      const result = await discordService.handleUserChat(
        chatText,
        sender || "Operator (@tazim)",
        telemetry
      );

      return NextResponse.json({
        success: true,
        ...result,
        ...discordService.getStatus(),
      });
    }

    // 3. Dispatch Sentinel Alert
    if (action === "send" || message) {
      const payload = message || {
        title: "Cold-Chain Thermal Telemetry",
        body: "ESP32-S3 telemetry heartbeat dispatched from SAPIENS Sentinel.",
        severity: "info",
        telemetry: {
          temperature: -18.2,
          humidity: 82,
          deviceId: "ESP32-S3-COLD-01",
        },
      };

      const result = await discordService.dispatchAlert(payload);
      return NextResponse.json({
        success: result.success,
        error: result.error,
        ...discordService.getStatus(),
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process Discord request" },
      { status: 500 }
    );
  }
}
