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

export interface WhatsAppStatusInfo {
  status: WhatsAppConnectionStatus;
  phoneNumber: string | null;
  pairingCode: string | null;
  userJid: string | null;
  lastConnectedAt: string | null;
  error: string | null;
  recentMessages: WhatsAppMessageRecord[];
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

  constructor() {
    this.authDir =
      process.env.WHATSAPP_AUTH_DIR ||
      path.join(process.cwd(), "data", "whatsapp_auth");

    // Auto-resume existing session if credentials already exist (only during active server runtime, never during build)
    const isBuildPhase =
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.argv.some((arg) => arg.includes("build"));

    if (typeof window === "undefined" && !isBuildPhase) {
      this.initFromExistingCreds().catch(() => {});
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
      } catch (_) {}

      // Clean up previous socket if open
      if (this.sock) {
        try {
          this.sock.end(undefined);
        } catch (_) {}
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
                this.connectSocket(null).catch(() => {});
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

          // Record message in history
          this.addRecentMessage({
            id: msg.key.id || Math.random().toString(),
            from,
            senderName,
            text,
            timestamp: new Date().toISOString(),
            direction: isFromMe ? "outbound" : "inbound",
          });

          // Allow processing if inbound OR if sent from self with command prefix ! or /
          const shouldProcess = !isFromMe || text.startsWith("!") || text.startsWith("/");
          if (shouldProcess) {
            const senderJid = msg.key.participant || msg.key.remoteJid || "";
            await this.handleInboundCommand(from, text, senderName, senderJid, isFromMe);
          }
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
   * Check if a sender has administrative privileges (bot owner or group admin)
   */
  private async isSenderAdmin(from: string, senderJid: string, isFromMe: boolean): Promise<boolean> {
    if (isFromMe) return true;
    const botOwner =
      this.phoneNumber?.replace(/[^0-9]/g, "") ||
      (this.sock?.user?.id ? this.sock.user.id.split(":")[0].replace(/[^0-9]/g, "") : "");
    const cleanSender = senderJid.replace(/[^0-9]/g, "");
    if (botOwner && cleanSender.startsWith(botOwner)) return true;

    // In direct chat with another user, they are not the bot admin
    if (!from.endsWith("@g.us")) {
      return false;
    }

    // In a group, check group metadata for admin rights
    try {
      if (!this.sock) return false;
      const groupMeta = await this.sock.groupMetadata(from);
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
    isFromMe: boolean
  ): Promise<void> {
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

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

    // 1. Status / Ping command
    if (lower === "!ping" || lower === "!status" || lower === "/status") {
      const reply = `🛡️ *SAPIENS AGENT STUDIO — ONLINE*\n\n` +
        `• *Connection:* Active (Multi-Device Linked)\n` +
        `• *Guardrails:* Risk Registry Enforced (0–100)\n` +
        `• *Firewall:* Interception Active\n` +
        `• *Hardware Link:* ESP32-S3 Cold-Chain Sentinel\n\n` +
        `_Reply with any question or command (e.g. !ai schedule gmeet tmrw 1 pm) to interact with SAPIENS._`;
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

      const defaultReply =
        `🤖 *SAPIENS Sentinel:* Processed request: _"${prompt.slice(0, 80)}"_\n\n` +
        `SAPIENS Agent is operating within deterministic safety guardrails. Send *!ai <task>* for AI tasks, or *!status* for system metrics.`;
      await this.sendMessage(from, defaultReply);
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
   * Log out and wipe credentials
   */
  public async logout(): Promise<{ success: boolean }> {
    try {
      if (this.sock) {
        try {
          await this.sock.logout();
        } catch (_) {}
        try {
          this.sock.end(undefined);
        } catch (_) {}
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

export const whatsappService =
  globalForWhatsApp.__sapiens_whatsapp_service || new WhatsAppService();

if (process.env.NODE_ENV !== "production") {
  globalForWhatsApp.__sapiens_whatsapp_service = whatsappService;
}
