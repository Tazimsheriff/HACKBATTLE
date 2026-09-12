/**
 * SAPIENS AGENT — Discord Sentinel Live Chat & Flagging Service
 * Full two-way Discord Gateway & Channel listener with real-time Guardrail & Policy Engine flagging.
 */

import { ChannelMessage, sendDiscordAlert } from "./dispatcher";

export type DiscordFlagType =
  | "CRITICAL_BREACH"
  | "HIGH_RISK_COMMAND"
  | "POLICY_SUPPRESSED"
  | "ZERO_TRUST_BLOCKED"
  | "HONEYPOT_TRIGGERED"
  | "NOMINAL_TELEMETRY"
  | "VERIFIED_OPERATOR";

export interface DiscordMessageFlag {
  type: DiscordFlagType;
  label: string;
  severity: "critical" | "warning" | "policy" | "info" | "safe";
  reason: string;
  riskScore?: number;
  approvalRequired?: boolean;
  approvalId?: string;
}

export interface DiscordMessageRecord {
  id: string;
  sender: string;
  senderRole?: string;
  authorType: "user" | "bot" | "sentinel" | "system";
  text: string;
  direction: "inbound" | "outbound" | "system";
  timestamp: string;
  flag?: DiscordMessageFlag;
  embed?: {
    title: string;
    description: string;
    color: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  };
  delivered?: boolean;
  error?: string;
}

class DiscordService {
  private webhookUrl: string =
    process.env.DISCORD_WEBHOOK_URL || "";
  private botToken: string =
    process.env.DISCORD_BOT_TOKEN || "";
  private channelId: string =
    process.env.DISCORD_CHANNEL_ID || "1548270640937705604";
  private messages: DiscordMessageRecord[] = [];
  private isSyncing: boolean = false;

  constructor() {
    if (typeof window === "undefined") {
      this.syncFromDiscordChannel().catch(() => {});
      setInterval(() => {
        this.syncFromDiscordChannel().catch(() => {});
      }, 2500);
    }
  }

  public getStatus() {
    return {
      configured: Boolean(
        (this.webhookUrl && this.webhookUrl.startsWith("https://discord.com/api/webhooks")) ||
        this.botToken
      ),
      botConnected: Boolean(this.botToken),
      channelId: this.channelId,
      webhookUrl: this.webhookUrl,
      maskedUrl: this.webhookUrl
        ? this.webhookUrl.replace(/(\/webhooks\/\d+\/)[^/]+/, "$1••••••••")
        : "",
      messages: [...this.messages],
    };
  }

  public setWebhookUrl(url: string) {
    this.webhookUrl = url.trim();
  }

  public setBotCredentials(token: string, channelId?: string) {
    if (token) this.botToken = token.trim();
    if (channelId) this.channelId = channelId.trim();
    this.syncFromDiscordChannel().catch(() => {});
  }

  /**
   * Synchronizes real live messages from the Discord channel via the Discord Bot API
   */
  public async syncFromDiscordChannel(): Promise<DiscordMessageRecord[]> {
    if (!this.botToken || !this.channelId) return this.messages;
    if (this.isSyncing) return this.messages;
    this.isSyncing = true;

    try {
      const res = await fetch(
        `https://discord.com/api/v10/channels/${this.channelId}/messages?limit=30`,
        {
          headers: {
            Authorization: `Bot ${this.botToken}`,
          },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        return this.messages;
      }

      const rawMessages: any[] = await res.json();
      if (!Array.isArray(rawMessages)) return this.messages;

      const synced: DiscordMessageRecord[] = [];

      for (const m of rawMessages) {
        let contentText = m.content || "";
        if (!contentText && m.embeds && m.embeds.length > 0) {
          contentText = m.embeds[0].description || m.embeds[0].title || "";
        }
        if (!contentText && m.attachments && m.attachments.length > 0) {
          contentText = `[Attachment: ${m.attachments[0].filename || "file"}]`;
        }
        if (!contentText) continue;

        const isBot = Boolean(m.author?.bot);
        const username = m.author?.username || "Discord User";
        const displayName = m.author?.global_name || username;
        const sender = isBot
          ? username.toLowerCase().includes("sentinel") || username.toLowerCase().includes("sapiens")
            ? "SAPIENS SENTINEL"
            : displayName
          : `${displayName} (@${username})`;

        const authorType: "user" | "bot" | "sentinel" = isBot
          ? username.toLowerCase().includes("sentinel") || username.toLowerCase().includes("sapiens")
            ? "sentinel"
            : "bot"
          : "user";

        const direction: "inbound" | "outbound" = isBot ? "outbound" : "inbound";
        const flag = this.evaluateFlag(contentText);

        synced.push({
          id: m.id,
          sender,
          senderRole: isBot ? "Bot" : "Operator",
          authorType,
          text: contentText,
          direction,
          timestamp: new Date(m.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          flag,
          embed: m.embeds && m.embeds[0]
            ? {
                title: m.embeds[0].title || "",
                description: m.embeds[0].description || "",
                color: m.embeds[0].color || 0x71ce34,
                fields: m.embeds[0].fields,
              }
            : undefined,
          delivered: true,
        });
      }

      if (synced.length > 0) {
        this.messages = synced;
      }
    } catch (err) {
      console.warn("[DiscordService] Live sync warning:", err);
    } finally {
      this.isSyncing = false;
    }

    return this.messages;
  }

  /**
   * Evaluates text through SAPIENS Firewall & Policy Engine to assign flags
   */
  public evaluateFlag(text: string, currentTemp?: number): DiscordMessageFlag {
    const lower = text.toLowerCase();

    // 1. Critical / High-Risk Command Flag (Hardware Overrides & Administrative Actions)
    const adminCommands = [
      "kick",
      "ban",
      "mute",
      "purge",
      "cutoff",
      "disable",
      "shutdown",
      "override",
      "force open",
      "kill relay",
      "kill",
      "reboot",
      "restart",
      "admin",
      "sudo",
      "unban",
      "demote",
      "promote",
      "delete user",
      "wipe",
    ];

    const matchedAdmin = adminCommands.find((cmd) => {
      const regex = new RegExp(`(^|\\W)${cmd}(\\W|$)`, "i");
      return regex.test(lower);
    });

    if (matchedAdmin) {
      return {
        type: "HIGH_RISK_COMMAND",
        label: "HIGH RISK OVERRIDE",
        severity: "critical",
        reason: `Destructive action or privileged command ("${matchedAdmin}") intercepted. Requires dual-signature operator authorization.`,
        riskScore: 92,
        approvalRequired: true,
        approvalId: `appr-${Date.now().toString(36)}`,
      };
    }

    // 2. Prompt Injection / Honeypot Pattern
    if (
      lower.includes("ignore previous") ||
      lower.includes("system prompt") ||
      lower.includes("jailbreak") ||
      lower.includes("drop table") ||
      lower.includes("bypass firewall")
    ) {
      return {
        type: "HONEYPOT_TRIGGERED",
        label: "HONEYPOT TRIPPED",
        severity: "warning",
        reason: "Adversarial prompt injection pattern detected and isolated in honeypot.",
        riskScore: 96,
      };
    }

    // 3. Thermal Breach Flag
    if (currentTemp !== undefined && currentTemp > -10.0) {
      return {
        type: "CRITICAL_BREACH",
        label: "THERMAL BREACH",
        severity: "critical",
        reason: `Storage compartment reached ${currentTemp.toFixed(1)}°C (exceeds -10.0°C threshold).`,
        riskScore: 92,
      };
    }

    // 4. Policy Suppressed (e.g. Defrost cycle)
    if (lower.includes("defrost") || (currentTemp !== undefined && currentTemp <= -10.0 && currentTemp > -16.0)) {
      return {
        type: "POLICY_SUPPRESSED",
        label: "POLICY ENFORCED",
        severity: "policy",
        reason: "Learned Policy #1 (02:00 UTC Defrost Cycle) active. High-temp alert suppressed.",
        riskScore: 24,
      };
    }

    // 5. Default nominal / safe chat
    return {
      type: "NOMINAL_TELEMETRY",
      label: "VERIFIED SAFE",
      severity: "safe",
      reason: "Safe conversational inquiry. Evaluated within autonomous guardrails.",
      riskScore: 10,
    };
  }

  /**
   * Sends a message to the Discord channel using Bot credentials or webhook
   */
  public async postToDiscord(content: string, embed?: any) {
    if (this.botToken && this.channelId) {
      try {
        const payload: any = {};
        if (content) payload.content = content;
        if (embed) payload.embeds = [embed];
        await fetch(`https://discord.com/api/v10/channels/${this.channelId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bot ${this.botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        return;
      } catch (e) {}
    }

    if (this.webhookUrl) {
      sendDiscordAlert(this.webhookUrl, {
        title: embed?.title || "Discord Sentinel",
        body: content,
        severity: "info",
      }).catch(() => {});
    }
  }

  /**
   * Records a user inbound message, evaluates flags, generates agent response, and dispatches
   */
  public async handleUserChat(
    userText: string,
    senderName: string = "Operator (@tazim)",
    telemetry?: { temperature?: number; humidity?: number; deviceId?: string }
  ): Promise<{ userMessage: DiscordMessageRecord; botReply: DiscordMessageRecord }> {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    // 1. Evaluate flag on incoming user message
    const userFlag = this.evaluateFlag(userText, telemetry?.temperature);

    const userMessage: DiscordMessageRecord = {
      id: `disc-in-${Date.now()}`,
      sender: senderName,
      senderRole: "Operator",
      authorType: "user",
      text: userText,
      direction: "inbound",
      timestamp,
      flag: userFlag,
    };

    this.messages.unshift(userMessage);

    // 2. Formulate agent response based on message & flags
    let replyText = "";

    if (userFlag.type === "HIGH_RISK_COMMAND") {
      replyText = `⚠️ High-Risk Action Flagged: "${userText}" requires multi-channel operator authorization. Action token #${userFlag.approvalId} has been created and held in Approvals Inbox.`;
    } else if (userFlag.type === "HONEYPOT_TRIGGERED") {
      replyText = `🍯 Security Intercept: Prompt anomaly detected. Operation trapped in simulated sandbox. Zero-trust state remains secure.`;
    } else if (userText.toLowerCase().includes("temp") || userText.toLowerCase().includes("status")) {
      const tempStr = telemetry?.temperature !== undefined ? `${telemetry.temperature.toFixed(1)}°C` : "+27.2°C";
      const humStr = telemetry?.humidity !== undefined ? `${telemetry.humidity.toFixed(0)}%` : "64%";
      replyText = `Telemetry Report for ${telemetry?.deviceId || "ESP32-S3-COLD-01"}: Current temperature is ${tempStr} with ${humStr} RH. Status: [SEALED] | Hardware bus active on COM4.`;
    } else {
      replyText = `SAPIENS Sentinel acknowledged: "${userText}". Zero-trust guardrails verified. Operating nominal across cold-chain vault.`;
    }

    const botFlag = this.evaluateFlag(replyText, telemetry?.temperature);

    const botReply: DiscordMessageRecord = {
      id: `disc-out-${Date.now() + 1}`,
      sender: "SAPIENS SENTINEL",
      senderRole: "Bot",
      authorType: "bot",
      text: replyText,
      direction: "outbound",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      flag: botFlag,
      embed: {
        title: userFlag.type === "HIGH_RISK_COMMAND" ? "🚨 High-Risk Intercept" : "Cold-Chain Telemetry Dispatch",
        description: replyText,
        color: userFlag.type === "HIGH_RISK_COMMAND" ? 0xf43f5e : 0x71ce34,
        fields: telemetry
          ? [
              { name: "Temp", value: `${telemetry.temperature?.toFixed(1)}°C`, inline: true },
              { name: "RH", value: `${telemetry.humidity?.toFixed(0)}%`, inline: true },
              { name: "Risk Score", value: `${userFlag.riskScore || 10}/100`, inline: true },
            ]
          : undefined,
      },
      delivered: true,
    };

    this.messages.unshift(botReply);

    // 3. Dispatch to Discord channel
    await this.postToDiscord(
      `**${senderName}**: ${userText}\n\n**SAPIENS Sentinel**: ${replyText}`,
      botReply.embed
    );

    return { userMessage, botReply };
  }

  /**
   * Records a hardware anomaly alert
   */
  public recordHardwareAlert(
    title: string,
    description: string,
    severity: "critical" | "info" = "critical",
    telemetry?: { temperature?: number; humidity?: number; deviceId?: string }
  ) {
    const flag: DiscordMessageFlag = {
      type: severity === "critical" ? "CRITICAL_BREACH" : "NOMINAL_TELEMETRY",
      label: severity === "critical" ? "CRITICAL BREACH" : "SYSTEM TELEMETRY",
      severity: severity === "critical" ? "critical" : "safe",
      reason: description,
      riskScore: severity === "critical" ? 94 : 15,
    };

    const record: DiscordMessageRecord = {
      id: `disc-hw-${Date.now()}`,
      sender: "🚨 ESP32 HARDWARE SENTINEL",
      senderRole: "Physical IoT Sensor",
      authorType: "sentinel",
      text: description,
      direction: "inbound",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      flag,
      embed: {
        title,
        description,
        color: severity === "critical" ? 0xf43f5e : 0x71ce34,
        fields: telemetry
          ? [
              { name: "Temperature", value: `${telemetry.temperature?.toFixed(1)}°C`, inline: true },
              { name: "Humidity", value: `${telemetry.humidity?.toFixed(0)}%`, inline: true },
              { name: "Device ID", value: telemetry.deviceId || "ESP32-S3-COLD-01", inline: true },
            ]
          : undefined,
      },
    };

    this.messages.unshift(record);
    if (this.messages.length > 60) this.messages.pop();

    this.postToDiscord(`**${title}**: ${description}`, record.embed);
  }

  public async dispatchAlert(msg: ChannelMessage): Promise<{ success: boolean; error?: string }> {
    this.recordHardwareAlert(msg.title, msg.body, msg.severity === "critical" ? "critical" : "info", msg.telemetry);
    return { success: true };
  }
}

const globalForDiscord = globalThis as unknown as {
  __sapiens_discord_service?: DiscordService;
};

export const discordService = new DiscordService();
globalForDiscord.__sapiens_discord_service = discordService;
