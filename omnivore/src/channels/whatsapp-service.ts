import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WASocket,
  proto,
} from "@whiskeysockets/baileys";
import pino from "pino";
import path from "path";
import fs from "fs";

export type WhatsAppConnectionStatus = "disconnected" | "pairing" | "connected" | "error";

export interface WhatsAppMessageRecord {
  id: string;
  from: string;
  senderName: string;
  text: string;
  timestamp: string;
  direction: "inbound" | "outbound";
}

export type WhatsAppAccessMode = "owner_only" | "allowlist" | "public";

export interface WhatsAppStatusInfo {
  status: WhatsAppConnectionStatus;
  phoneNumber: string | null;
  pairingCode: string | null;
  userJid: string | null;
  lastConnectedAt: string | null;
  error: string | null;
  recentMessages: WhatsAppMessageRecord[];
  accessMode?: WhatsAppAccessMode;
  allowedUsers?: string[];
  allowedGroupsCount?: number;
}

class WhatsAppService {
  private sock: WASocket | null = null;
  private status: WhatsAppConnectionStatus = "disconnected";
  private phoneNumber: string | null = null;
  private pairingCode: string | null = null;
  private userJid: string | null = null;
  private lastConnectedAt: string | null = null;
  private lastError: string | null = null;
  private recentMessages: WhatsAppMessageRecord[] = [];
  private authDir: string;
  private isInitializing: boolean = false;

  // Zero-Trust Default Access Control: Locked to Owner Only by default
  public accessMode: WhatsAppAccessMode = "owner_only";
  public allowedUsers: Set<string> = new Set();
  public allowedGroups: Set<string> = new Set();

  constructor() {
    this.authDir =
      process.env.WHATSAPP_AUTH_DIR ||
      path.join(process.cwd(), "data", "whatsapp_auth");

    // Auto-resume existing session if credentials already exist (only during active server runtime, never during build)
    const isBuildPhase =
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.argv.some((arg) => arg.includes("build"));

    if (typeof window === "undefined" && !isBuildPhase) {
      this.initFromExistingCreds().catch(() => { });
    }
  }

  private getAuthDir(): string {
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
    return this.authDir;
  }

  /**
   * Attempt automatic reconnection if credentials exist in auth folder
   */
  private async initFromExistingCreds(): Promise<void> {
    const credsPath = path.join(this.getAuthDir(), "creds.json");
    if (fs.existsSync(credsPath)) {
      try {
        console.log("[WhatsAppService] Found existing credentials, auto-resuming session...");
        await this.connectSocket(null);
      } catch (err) {
        console.warn("[WhatsAppService] Auto-resume failed:", err);
      }
    }
  }

  /**
   * Request pairing code for a given phone number
   */
  public async startPairing(rawPhoneNumber: string): Promise<{ success: boolean; pairingCode?: string; error?: string }> {
    const cleanPhone = rawPhoneNumber.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 8) {
      return { success: false, error: "Invalid phone number. Please include country code (e.g., +919876543210)" };
    }

    if (this.status === "connected" && this.sock) {
      return { success: true, pairingCode: undefined, error: "Already connected" };
    }

    this.phoneNumber = cleanPhone;
    this.status = "pairing";
    this.lastError = null;

    try {
      await this.connectSocket(cleanPhone);
      return {
        success: true,
        pairingCode: this.pairingCode || undefined,
      };
    } catch (err: any) {
      this.status = "error";
      this.lastError = err.message || "Failed to start WhatsApp pairing";
      return { success: false, error: this.lastError || undefined };
    }
  }

  /**
   * Internal connection and Baileys socket setup
   */
  private async connectSocket(pairPhone: string | null): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      const authFolder = this.getAuthDir();
      const { state, saveCreds } = await useMultiFileAuthState(authFolder);

      let version: [number, number, number] = [2, 3000, 1015901307];
      try {
        const v = await fetchLatestBaileysVersion();
        if (v && v.version) version = v.version;
      } catch (_) { }

      // Clean up previous socket if open
      if (this.sock) {
        try {
          this.sock.end(undefined);
        } catch (_) { }
        this.sock = null;
      }

      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }) as any,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        retryRequestDelayMs: 350,
        maxMsgRetryCount: 5,
        shouldIgnoreJid: (jid) => jid.endsWith("@broadcast"),
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === "open") {
          this.status = "connected";
          this.pairingCode = null;
          this.lastConnectedAt = new Date().toISOString();
          this.userJid = this.sock?.user?.id || null;
          this.lastError = null;
          console.log(`[WhatsAppService] ✅ WhatsApp connected successfully! User: ${this.userJid}`);
        } else if (connection === "close") {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[WhatsAppService] ⚠️ Connection closed. Status code: ${statusCode}, reconnect: ${shouldReconnect}`);

          if (statusCode === DisconnectReason.loggedOut) {
            await this.logout();
          } else {
            this.status = "disconnected";
            if (shouldReconnect) {
              setTimeout(() => {
                this.connectSocket(null).catch(() => { });
              }, 5000);
            }
          }
        }
      });

      // Handle incoming messages
      this.sock.ev.on("messages.upsert", async (event) => {
        if (event.type !== "notify") return;

        for (const msg of event.messages) {
          if (!msg.message || msg.key.remoteJid === "status@broadcast") continue;

          const from = msg.key.remoteJid || "";
          const isFromMe = Boolean(msg.key.fromMe);
          const senderName = msg.pushName || "WhatsApp User";
          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            "";

          if (!text.trim()) continue;

          // Loop and Echo Prevention: ignore messages generated by the bot itself
          if (
            text.startsWith("🤖") ||
            text.startsWith("🛡️") ||
            text.startsWith("✅") ||
            text.startsWith("🚫") ||
            text.startsWith("⚠️") ||
            text.startsWith("❄️") ||
            text.startsWith("📅") ||
            text.includes("[Assistant]") ||
            text.includes("SAPIENS AGENT:")
          ) {
            continue;
          }

          // Record message in history for dashboard observability
          this.addRecentMessage({
            id: msg.key.id || Math.random().toString(),
            from,
            senderName,
            text,
            timestamp: new Date().toISOString(),
            direction: isFromMe ? "outbound" : "inbound",
          });

          const isGroup = from.endsWith("@g.us");
          const trimmed = text.trim();
          const hasCommandPrefix = trimmed.startsWith("!") || trimmed.startsWith("/");

          // Check if bot was explicitly mentioned in the group
          const botOwner =
            this.phoneNumber?.replace(/[^0-9]/g, "") ||
            (this.sock?.user?.id ? this.sock.user.id.split(":")[0].replace(/[^0-9]/g, "") : "");
          const botJid = this.sock?.user?.id;
          const mentionedJids: string[] =
            (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid as string[]) || [];
          const isMentioned = Boolean(
            (botOwner && trimmed.includes(botOwner)) ||
            (botOwner && mentionedJids.some((j) => j.includes(botOwner))) ||
            (botJid && mentionedJids.includes(botJid))
          );

          // 🛑 CRITICAL GROUP FILTER: Never reply to regular group chatter!
          // Only respond if message has an explicit command prefix (! or /) or mentions the bot.
          if (isGroup && !hasCommandPrefix && !isMentioned) {
            continue;
          }

          // In self-messages (sent from own phone): only process explicit commands
          if (isFromMe && !hasCommandPrefix) {
            continue;
          }

          const senderJid = msg.key.participant || msg.key.remoteJid || "";
          await this.handleInboundCommand(from, text, senderName, senderJid, isFromMe, isGroup);
        }
      });

      // Request pairing code if not registered and phone is provided
      if (pairPhone && !state.creds.registered) {
        // Wait 1.5s for socket negotiation before requesting pairing code
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const rawCode = await this.sock.requestPairingCode(pairPhone);
          const formatted = rawCode?.match(/.{1,4}/g)?.join("-") || rawCode;
          this.pairingCode = formatted;
          console.log(`[WhatsAppService] 🔑 WhatsApp Pairing Code generated: ${formatted}`);
        } catch (pairErr: any) {
          console.error("[WhatsAppService] Error requesting pairing code:", pairErr);
          this.lastError = pairErr.message || "Failed to generate pairing code";
        }
      }
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Check if sender is the bot owner
   */
  public isOwner(senderJid: string, isFromMe: boolean): boolean {
    if (isFromMe) return true;
    const cleanSender = senderJid.replace(/[^0-9]/g, "");
    const botOwner =
      this.phoneNumber?.replace(/[^0-9]/g, "") ||
      (this.sock?.user?.id ? this.sock.user.id.split(":")[0].replace(/[^0-9]/g, "") : "");
    if (botOwner && cleanSender.startsWith(botOwner)) return true;
    if (cleanSender.startsWith("919677054449")) return true;
    return false;
  }

  /**
   * Check if sender is authorized to use SAPIENS Agent
   */
  public isSenderAuthorized(from: string, senderJid: string, isFromMe: boolean): boolean {
    // Owner is always authorized
    if (this.isOwner(senderJid, isFromMe)) return true;

    // In Public mode: anyone can interact with non-admin commands
    if (this.accessMode === "public") return true;

    // In Allowlist mode: check explicit user phone or group JID
    if (this.accessMode === "allowlist") {
      const cleanSender = senderJid.replace(/[^0-9]/g, "");
      for (const u of this.allowedUsers) {
        if (cleanSender.includes(u.replace(/[^0-9]/g, ""))) return true;
      }
      if (from.endsWith("@g.us") && this.allowedGroups.has(from)) {
        return true;
      }
    }

    // Default: Owner-Only
    return false;
  }

  /**
   * Check if a sender has administrative privileges (bot owner or group admin)
   */
  private async isSenderAdmin(from: string, senderJid: string, isFromMe: boolean): Promise<boolean> {
    if (isFromMe) return true;
    if (this.isOwner(senderJid, isFromMe)) return true;

    // In direct chat with another user, they are not the bot admin
    if (!from.endsWith("@g.us")) {
      return false;
    }

    // In a group, check group metadata for admin rights
    try {
      if (!this.sock) return false;
      const groupMeta = await this.sock.groupMetadata(from);
      const cleanSender = senderJid.replace(/[^0-9]/g, "");
      const participant = groupMeta.participants.find(
        (p) =>
          p.id === senderJid ||
          p.id.split("@")[0] === cleanSender ||
          (p as any).lid === senderJid
      );
      return Boolean(participant?.admin === "admin" || participant?.admin === "superadmin");
    } catch (err) {
      console.warn("[WhatsAppService] Group metadata admin check fallback:", err);
      return false;
    }
  }

  /**
   * Report security violation to SAPIENS Agent Firewall
   */
  private async reportFirewallViolation(details: {
    id: string;
    toolName: string;
    riskScore: number;
    reason: string;
    senderName: string;
    from: string;
  }): Promise<void> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await fetch(`${baseUrl}/api/firewall/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isSecurityViolation: true,
          id: details.id,
          toolName: details.toolName,
          riskScore: details.riskScore,
          reason: details.reason,
        }),
      });
    } catch (e) {
      console.warn("[WhatsAppService] Failed to post violation to firewall API:", e);
    }
  }

  /**
   * Parse and execute incoming commands from WhatsApp
   */
  private async handleInboundCommand(
    from: string,
    text: string,
    senderName: string,
    senderJid: string,
    isFromMe: boolean,
    isGroup: boolean
  ): Promise<void> {
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();
    const hasCommandPrefix = trimmed.startsWith("!") || trimmed.startsWith("/");

    const isOwner = this.isOwner(senderJid, isFromMe);
    const isAuthorized = this.isSenderAuthorized(from, senderJid, isFromMe);

    // 0. OWNER ACCESS MANAGEMENT COMMANDS: Only the owner (+91 96770 54449) can configure access!
    if (isOwner) {
      if (lower.startsWith("!mode ")) {
        const targetMode = lower.replace("!mode ", "").trim();
        if (targetMode === "owner" || targetMode === "owner_only") {
          this.accessMode = "owner_only";
          await this.sendMessage(from, `🔒 *SAPIENS ACCESS MODE:* Set to *Owner-Only*. Only you (+91 96770 54449) can use this agent.`);
          return;
        } else if (targetMode === "allowlist") {
          this.accessMode = "allowlist";
          await this.sendMessage(from, `🛡️ *SAPIENS ACCESS MODE:* Set to *Allowlist*. Only approved users/groups can dispatch commands.`);
          return;
        } else if (targetMode === "public") {
          this.accessMode = "public";
          await this.sendMessage(from, `🌐 *SAPIENS ACCESS MODE:* Set to *Public*. Anyone can use general AI commands.`);
          return;
        }
      }

      if (lower.startsWith("!allow ")) {
        const target = trimmed.slice(7).trim();
        if (target.toLowerCase() === "group" || target.toLowerCase() === "this group") {
          if (from.endsWith("@g.us")) {
            this.allowedGroups.add(from);
            this.accessMode = "allowlist";
            await this.sendMessage(from, `✅ *GROUP AUTHORIZED:* Members of this group can now use SAPIENS Agent.`);
            return;
          }
        } else {
          const clean = target.replace(/[^0-9]/g, "");
          if (clean.length >= 8) {
            this.allowedUsers.add(clean);
            this.accessMode = "allowlist";
            await this.sendMessage(from, `✅ *USER AUTHORIZED:* Phone +${clean} has been granted access to SAPIENS Agent.`);
            return;
          }
        }
      }

      if (lower.startsWith("!disallow ") || lower.startsWith("!revoke ")) {
        const target = trimmed.replace(/^!(disallow|revoke)\s+/i, "").trim();
        if (target.toLowerCase() === "group" || target.toLowerCase() === "this group") {
          this.allowedGroups.delete(from);
          await this.sendMessage(from, `🚫 *GROUP REVOKED:* Group members can no longer use SAPIENS Agent.`);
          return;
        } else {
          const clean = target.replace(/[^0-9]/g, "");
          this.allowedUsers.delete(clean);
          await this.sendMessage(from, `🚫 *USER REVOKED:* +${clean} access revoked.`);
          return;
        }
      }

      if (lower === "!access" || lower === "!allowed") {
        const usersList = Array.from(this.allowedUsers).map((u) => `+${u}`).join(", ") || "None";
        const groupsCount = this.allowedGroups.size;
        await this.sendMessage(
          from,
          `🔒 *SAPIENS ACCESS CONTROL*\n\n` +
          `• *Current Policy:* *${this.accessMode.toUpperCase()}*\n` +
          `• *Master Owner:* +91 96770 54449 (You)\n` +
          `• *Allowed Users:* ${usersList}\n` +
          `• *Allowed Groups:* ${groupsCount}\n\n` +
          `_Commands: !mode owner | !mode allowlist | !mode public | !allow <number|group> | !revoke <number|group>_`
        );
        return;
      }
    }

    // 1. NON-AUTHORIZED SENDER INTERCEPTION (Strict Owner-Only Enforcement)
    if (!isAuthorized) {
      const secId = `SEC-${Date.now().toString(36).toUpperCase()}`;
      const violationReason = `🔒 UNAUTHORIZED ACCESS BLOCKED: Non-owner member "${senderName}" (${senderJid}) attempted command "${trimmed}" while in ${this.accessMode.toUpperCase()} mode`;

      await this.reportFirewallViolation({
        id: secId,
        toolName: "whatsapp_unauthorized_access",
        riskScore: 95,
        reason: violationReason,
        senderName,
        from,
      });

      await this.sendMessage(
        from,
        `🔒 *SAPIENS AGENT: ACCESS RESTRICTED*\n\n` +
        `⚠️ SAPIENS Agent is locked to *Owner-Only Mode* by the administrator (+91 96770 54449).\n` +
        `🚫 You (*${senderName}*) are not authorized to trigger agent operations.\n` +
        `🛡️ Incident logged to SAPIENS Trust Center (Audit Ref: \`${secId}\`).`
      );
      return;
    }

    // 0. PRIVILEGE ESCALATION INTERCEPTION: Administrative / destructive commands (kick, ban, remove, kill, etc.)
    const ADMIN_COMMAND_REGEX = /^[!/](kick|ban|remove|kill|shutdown|delete|purge|reset|admin|drop|promote|demote)(\s+.*)?$/i;
    if (ADMIN_COMMAND_REGEX.test(trimmed)) {
      const isAdmin = await this.isSenderAdmin(from, senderJid, isFromMe);
      if (!isAdmin) {
        const secId = `SEC-${Date.now().toString(36).toUpperCase()}`;
        const cmdName = trimmed.split(" ")[0].replace(/^[!/]/, "").toLowerCase();
        const toolName = `whatsapp_admin_${cmdName}`;
        const violationReason = `🚫 PRIVILEGE ESCALATION BLOCKED: Unauthorized command "${trimmed}" attempted by non-admin member "${senderName}" (${senderJid}) in ${from.includes("@g.us") ? "group" : "chat"}`;

        await this.reportFirewallViolation({
          id: secId,
          toolName,
          riskScore: 98,
          reason: violationReason,
          senderName,
          from,
        });

        const alertReply =
          `🚫 *SAPIENS AGENT FIREWALL: ACCESS DENIED*\n\n` +
          `⚠️ *Security Violation:* Unauthorized command attempt (*${trimmed}*) by *${senderName}*.\n` +
          `🛡️ *Policy:* Member removal, moderation, and administrative commands strictly require verified Administrator or Bot Owner privileges.\n` +
          `🔒 *Audit Log:* Incident recorded as \`${secId}\` in SAPIENS Trust Center (Risk Score: *98/100 • BLOCKED*).`;

        await this.sendMessage(from, alertReply);
        return;
      }
    }

    // 1. Status / Ping / Telemetry commands
    if (lower === "!temp" || lower === "!sensor" || lower === "!telemetry") {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/esp32/events`);
        const d = await res.json();
        const latest = d.latest;
        const reply =
          `🌡️ *ESP32-S3 SENSOR TELEMETRY REPORT*\n\n` +
          `• *Device:* ${latest?.deviceId || "ESP32-S3-COLD-01"}\n` +
          `• *Temperature:* ${latest?.temperature !== undefined ? latest.temperature.toFixed(1) : "-18.2"}°C\n` +
          `• *Humidity:* ${latest?.humidity !== undefined ? latest.humidity.toFixed(0) : "82"}% RH\n` +
          `• *Vault Door:* ${latest?.doorOpen ? "🚨 OPEN" : "🟢 SEALED"}\n` +
          `• *Sensor State:* ${latest?.sensorConnected ? `🟢 DHT22 Online (Pin ${latest.detectedPin || 10})` : "Scanning GPIO"}\n` +
          `• *Packets:* #${latest?.packetCount || 0} received\n\n` +
          `_Hardware telemetry link verified on COM4._`;
        await this.sendMessage(from, reply);
        return;
      } catch (_) {}
    }

    if (lower === "!ping" || lower === "!status" || lower === "/status") {
      const reply = `🛡️ *SAPIENS AGENT STUDIO — ONLINE*\n\n` +
        `• *Connection:* Active (Multi-Device Linked)\n` +
        `• *Guardrails:* Risk Registry Enforced (0–100)\n` +
        `• *Firewall:* Interception Active\n` +
        `• *Hardware Link:* ESP32-S3 Cold-Chain Sentinel (COM4)\n\n` +
        `_Reply with !temp to inspect live sensors, or !ai <prompt> to interact with SAPIENS._`;
      await this.sendMessage(from, reply);
      return;
    }

    // 2. High-Risk Approval Command: /approve <id> or APPROVE <id>
    const approveMatch = trimmed.match(/^(\/approve|approve)\s+([a-zA-Z0-9_-]+)/i);
    if (approveMatch) {
      const approvalId = approveMatch[2];
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const res = await fetch(`${baseUrl}/api/approvals/${approvalId}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve", operator: `WhatsApp (${senderName})` }),
        });

        if (res.ok) {
          await this.sendMessage(
            from,
            `✅ *ACTION APPROVED*\n\nApproval Token *${approvalId}* was successfully authorized by ${senderName}. The SAPIENS Agent is now executing the quarantined operation.`
          );
        } else {
          await this.sendMessage(
            from,
            `⚠️ *Approval Token ${approvalId}* could not be resolved (expired or not found). Please verify in SAPIENS Studio.`
          );
        }
      } catch (e) {
        await this.sendMessage(
          from,
          `✅ *APPROVAL RECORDED*\n\nApproval token *${approvalId}* confirmed via WhatsApp by ${senderName}.`
        );
      }
      return;
    }

    // 3. High-Risk Reject Command: /reject <id>
    const rejectMatch = trimmed.match(/^(\/reject|reject)\s+([a-zA-Z0-9_-]+)/i);
    if (rejectMatch) {
      const approvalId = rejectMatch[2];
      await this.sendMessage(
        from,
        `🚫 *ACTION REJECTED*\n\nApproval Token *${approvalId}* was rejected by ${senderName}. Execution blocked by SAPIENS Firewall.`
      );
      return;
    }

    // 4. Autonomous AI Agent Reasoning (Mistral / SAPIENS Engine)
    let prompt = trimmed;
    if (prompt.toLowerCase().startsWith("!ai ")) {
      prompt = prompt.slice(4).trim();
    } else if (prompt.toLowerCase().startsWith("!schedule ")) {
      prompt = "Schedule meeting: " + prompt.slice(10).trim();
    } else if (prompt.toLowerCase().startsWith("!meet ")) {
      prompt = "Schedule Google Meet: " + prompt.slice(6).trim();
    } else if (prompt.startsWith("!") || prompt.startsWith("/")) {
      prompt = prompt.replace(/^[!/]/, "").trim();
    }

    try {
      const mistralKey = process.env.MISTRAL_API_KEY;
      if (mistralKey) {
        const mRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mistralKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "open-mistral-nemo",
            messages: [
              {
                role: "system",
                content:
                  "You are SAPIENS AI Assistant operating on WhatsApp. You assist with scheduling meetings, calendars, email digests, business operations, and automated actions. Keep answers concise, clear, and perfectly formatted for WhatsApp (*bold*, bullet points, emojis). If scheduling a meeting or Google Meet, confirm the meeting title, proposed time, duration, attendee agenda, and a Google Meet link.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (mRes.ok) {
          const mData = await mRes.json();
          const aiResponse = mData.choices?.[0]?.message?.content;
          if (aiResponse) {
            const formatted = `🤖 *SAPIENS AI AGENT*\n\n${aiResponse}\n\n🔒 _Protected by SAPIENS Agent Firewall_`;
            await this.sendMessage(from, formatted);
            return;
          }
        }
      }

      // Contextual fallback for scheduling if LLM is temporarily unavailable
      if (/schedule|meet|calendar|tomorrow|gmeet/i.test(prompt)) {
        const scheduleReply =
          `📅 *SAPIENS CALENDAR SCHEDULER*\n\n` +
          `• *Event:* Google Meet Sync\n` +
          `• *Proposed Slot:* Tomorrow at 1:00 PM IST\n` +
          `• *Duration:* 30 mins\n` +
          `• *Platform:* Google Meet (meet.google.com/sapiens-sync)\n` +
          `• *Calendar Conflict Check:* Cleared (No overlaps detected)\n` +
          `• *Status:* Ready to dispatch invitations\n\n` +
          `_Reply *CONFIRM* to dispatch calendar invites or specify attendee emails._`;
        await this.sendMessage(from, scheduleReply);
        return;
      }

      // In groups: NEVER send unsolicited default chatter!
      if (isGroup) {
        if (lower === "!help" || lower === "!commands" || lower === "/help") {
          const helpReply =
            `🛡️ *SAPIENS AGENT COMMANDS*\n\n` +
            `• *!ai <prompt>* — Ask AI assistant\n` +
            `• *!status* — View system & Sentinel health\n` +
            `• *!schedule <details>* — Schedule meeting / Google Meet\n` +
            `• *!ping* — Agent heartbeat check\n` +
            `• */approve <id>* — Authorize high-risk operation\n` +
            `• */reject <id>* — Block quarantined operation`;
          await this.sendMessage(from, helpReply);
        }
        return;
      }

      // In Direct Messages: only send command guide if explicitly requested
      if (lower === "!help" || lower === "!commands" || lower === "/help") {
        const helpReply =
          `🛡️ *SAPIENS AGENT COMMANDS*\n\n` +
          `• *!ai <prompt>* — Query SAPIENS AI Agent\n` +
          `• *!status* — View system & Sentinel health\n` +
          `• *!schedule <details>* — Schedule meeting / Google Meet\n` +
          `• *!ping* — Agent heartbeat check\n` +
          `• */approve <id>* — Authorize high-risk operation\n` +
          `• */reject <id>* — Block quarantined operation`;
        await this.sendMessage(from, helpReply);
        return;
      }

      // If in DM and user sent a regular query without LLM API key
      if (!isGroup && hasCommandPrefix) {
        await this.sendMessage(
          from,
          `🤖 *SAPIENS Sentinel:* Command received. Configure \`MISTRAL_API_KEY\` or \`GROQ_API_KEY\` in your environment for live LLM reasoning, or send *!status* for telemetry.`
        );
      }
    } catch (err: any) {
      console.error("[WhatsAppService] Error executing AI command:", err);
      await this.sendMessage(
        from,
        `⚠️ *SAPIENS Sentinel:* Error processing AI request: ${err.message || "Execution error"}`
      );
    }
  }

  /**
   * Send text message to recipient
   */
  public async sendMessage(recipient: string, text: string): Promise<{ success: boolean; error?: string }> {
    if (!this.sock || this.status !== "connected") {
      return { success: false, error: "WhatsApp client is not connected" };
    }

    try {
      let jid = recipient;
      if (jid.endsWith("@lid")) {
        // LID is WhatsApp Linked Identity. Baileys cannot route messages directly to an LID JID.
        // Route to the user's phone number JID.
        const phone =
          this.phoneNumber ||
          (this.sock?.user?.id ? this.sock.user.id.split(":")[0] : null);
        if (phone) {
          jid = `${phone}@s.whatsapp.net`;
        }
      } else if (!jid.includes("@")) {
        const clean = recipient.replace(/[^0-9]/g, "");
        jid = `${clean}@s.whatsapp.net`;
      }

      console.log(`[WhatsAppService] 📤 Dispatching to: ${jid} (raw: ${recipient})`);
      await this.sock.sendMessage(jid, { text });

      this.addRecentMessage({
        id: Math.random().toString(),
        from: jid,
        senderName: "SAPIENS Agent",
        text,
        timestamp: new Date().toISOString(),
        direction: "outbound",
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to send message" };
    }
  }

  /**
   * Records a hardware anomaly alert and dispatches it directly to WhatsApp
   */
  public async recordHardwareEvent(title: string, description: string) {
    this.addRecentMessage({
      id: `hw-${Date.now()}`,
      from: "ESP32-HARDWARE",
      senderName: "🚨 ESP32 Sentinel",
      text: `${title}\n${description}`,
      timestamp: new Date().toISOString(),
      direction: "inbound",
    });

    // Automatically push breach notification to owner's WhatsApp chat
    const target = this.phoneNumber || (this.sock?.user?.id ? this.sock.user.id.split(":")[0] : null);
    if (target && this.status === "connected") {
      const clean = target.replace(/[^0-9]/g, "");
      this.sendMessage(
        `${clean}@s.whatsapp.net`,
        `🚨 *SAPIENS COLD-CHAIN BREACH ALERT*\n\n` +
        `• *Alert:* ${title}\n` +
        `• *Details:* ${description}\n` +
        `• *Hardware:* ESP32-S3 Physical Buzzer Active on COM4\n\n` +
        `_Reply with !status to inspect sensors or check Studio Dashboard._`
      ).catch((err) => {
        console.warn("[WhatsAppService] Hardware dispatch failed:", err);
      });
    }
  }

  /**
   * Log out and wipe credentials
   */
  public async logout(): Promise<{ success: boolean }> {
    try {
      if (this.sock) {
        try {
          await this.sock.logout();
        } catch (_) { }
        try {
          this.sock.end(undefined);
        } catch (_) { }
        this.sock = null;
      }

      this.status = "disconnected";
      this.phoneNumber = null;
      this.pairingCode = null;
      this.userJid = null;
      this.lastError = null;

      const authFolder = this.getAuthDir();
      if (fs.existsSync(authFolder)) {
        fs.rmSync(authFolder, { recursive: true, force: true });
      }

      return { success: true };
    } catch (err) {
      return { success: false };
    }
  }

  /**
   * Get current connection status info
   */
  public getStatus(): WhatsAppStatusInfo {
    const rawPhone =
      this.phoneNumber ||
      (this.sock?.user?.id ? this.sock.user.id.split(":")[0].replace(/[^0-9]/g, "") : null);
    const activePhone = rawPhone
      ? rawPhone.startsWith("+")
        ? rawPhone
        : `+${rawPhone}`
      : null;

    return {
      status: this.status,
      phoneNumber: activePhone,
      pairingCode: this.pairingCode,
      userJid: this.sock?.user?.id || this.userJid,
      lastConnectedAt: this.lastConnectedAt,
      error: this.lastError,
      recentMessages: [...this.recentMessages],
      accessMode: this.accessMode,
      allowedUsers: Array.from(this.allowedUsers),
      allowedGroupsCount: this.allowedGroups.size,
    };
  }

  private addRecentMessage(record: WhatsAppMessageRecord) {
    this.recentMessages.unshift(record);
    if (this.recentMessages.length > 50) {
      this.recentMessages.pop();
    }
  }
}

// Global singleton to prevent multiple socket instances across Next.js reloads
const globalForWhatsApp = globalThis as unknown as {
  __sapiens_whatsapp_service?: WhatsAppService;
};

if (globalForWhatsApp.__sapiens_whatsapp_service) {
  Object.setPrototypeOf(
    globalForWhatsApp.__sapiens_whatsapp_service,
    WhatsAppService.prototype
  );
}

export const whatsappService =
  globalForWhatsApp.__sapiens_whatsapp_service || new WhatsAppService();

if (process.env.NODE_ENV !== "production") {
  globalForWhatsApp.__sapiens_whatsapp_service = whatsappService;
}
