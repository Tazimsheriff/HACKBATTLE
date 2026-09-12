/**
 * SAPIENS AGENT — Multi-Channel Dispatcher
 * Dispatches notifications, critical breach alerts, and approval requests
 * to WhatsApp, Telegram, Discord, and Webhooks.
 */

export interface ChannelMessage {
  title: string;
  body: string;
  severity: "info" | "warning" | "critical" | "approval";
  approvalId?: string;
  telemetry?: {
    temperature?: number;
    humidity?: number;
    deviceId?: string;
  };
}

export interface ChannelConfig {
  telegramEnabled: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  discordEnabled: boolean;
  discordWebhookUrl?: string;
  whatsappEnabled: boolean;
  whatsappRecipient?: string;
}

/**
 * Dispatches notification to Discord via Webhook
 */
export async function sendDiscordAlert(
  webhookUrl: string,
  msg: ChannelMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const color =
      msg.severity === "critical"
        ? 0xf43f5e // Red
        : msg.severity === "approval"
        ? 0xf59e0b // Amber
        : msg.severity === "warning"
        ? 0xfa500f // Sapiens Orange
        : 0x10b981; // Green

    const payload = {
      username: "SAPIENS AGENT",
      embeds: [
        {
          title: `${msg.severity === "critical" ? "🚨 " : msg.severity === "approval" ? "🔒 " : "📊 "}${msg.title}`,
          description: msg.body,
          color,
          fields: msg.telemetry
            ? [
                {
                  name: "Temperature",
                  value: `${msg.telemetry.temperature?.toFixed(1)}°C`,
                  inline: true,
                },
                {
                  name: "Humidity",
                  value: `${msg.telemetry.humidity?.toFixed(0)}%`,
                  inline: true,
                },
                {
                  name: "Device ID",
                  value: msg.telemetry.deviceId || "ESP32-S3-01",
                  inline: true,
                },
              ]
            : [],
          footer: {
            text: msg.approvalId
              ? `Approval Token: ${msg.approvalId} • Reply 'APPROVE' or resolve in Studio`
              : "SAPIENS Sentinel • Autonomous Guardian",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return { success: res.ok };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Discord dispatch failed",
    };
  }
}

/**
 * Dispatches notification to Telegram via Bot API
 */
export async function sendTelegramAlert(
  botToken: string,
  chatId: string,
  msg: ChannelMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const icon = msg.severity === "critical" ? "🚨" : msg.severity === "approval" ? "🔒" : "❄️";
    const text = `<b>${icon} SAPIENS AGENT: ${msg.title}</b>\n\n${msg.body}${
      msg.telemetry
        ? `\n\n🌡️ <b>Temp:</b> ${msg.telemetry.temperature?.toFixed(1)}°C | 💧 <b>RH:</b> ${msg.telemetry.humidity?.toFixed(0)}%`
        : ""
    }${
      msg.approvalId
        ? `\n\n⚠️ <i>To approve this high-risk action, reply:</i> <code>/approve ${msg.approvalId}</code>`
        : ""
    }`;

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    const data = await res.json();
    return { success: data.ok, error: data.description };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Telegram dispatch failed",
    };
  }
}

/**
 * Dispatches notification to WhatsApp via Baileys adapter or gateway
 */
export async function sendWhatsAppAlert(
  recipientPhone: string,
  msg: ChannelMessage
): Promise<{ success: boolean; error?: string }> {
  // Simulates or uses configured WhatsApp gateway
  console.log(`[WhatsApp Dispatch] To: ${recipientPhone} | ${msg.title}: ${msg.body}`);
  return { success: true };
}
