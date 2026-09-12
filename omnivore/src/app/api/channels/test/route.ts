import { NextResponse } from "next/server";
import {
  sendDiscordAlert,
  sendTelegramAlert,
  sendWhatsAppAlert,
} from "@/channels/dispatcher";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { channel, config, message } = body;

    const payload = message || {
      title: "Cold-Chain Thermal Alert",
      body: "Container COLD-01 temperature rose to -14.2°C at 02:00 UTC.",
      severity: "warning",
      telemetry: {
        temperature: -14.2,
        humidity: 86,
        deviceId: "ESP32-S3-COLD-01",
      },
    };

    if (channel === "discord") {
      if (!config?.webhookUrl) {
        return NextResponse.json(
          { error: "Discord Webhook URL is required" },
          { status: 400 }
        );
      }
      const res = await sendDiscordAlert(config.webhookUrl, payload);
      return NextResponse.json(res);
    }

    if (channel === "telegram") {
      const botToken = config?.botToken || process.env.TELEGRAM_BOT_TOKEN;
      const chatId = config?.chatId || process.env.TELEGRAM_CHAT_ID;
      if (!botToken || !chatId) {
        return NextResponse.json(
          { error: "Telegram Bot Token and Chat ID are required" },
          { status: 400 }
        );
      }
      const res = await sendTelegramAlert(botToken, chatId, payload);
      return NextResponse.json(res);
    }

    if (channel === "whatsapp") {
      const recipient = config?.recipient || "+1234567890";
      const res = await sendWhatsAppAlert(recipient, payload);
      return NextResponse.json(res);
    }

    return NextResponse.json(
      { error: "Invalid channel specified. Must be 'discord', 'telegram', or 'whatsapp'" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Channel test failed" },
      { status: 500 }
    );
  }
}
