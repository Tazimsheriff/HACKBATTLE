"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Shield,
  Activity,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
  Layers,
  Thermometer,
  Lock,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Sliders,
  Check,
  Eye,
  EyeOff,
  Key,
  Radio,
  FileText,
  Clock,
  Terminal,
  Send,
  ExternalLink,
  Code2,
  Wrench,
  Bot,
  Zap,
  ChevronRight,
  LayoutGrid,
  Plus,
  Share2,
  MessageSquare,
  MessageCircle,
  Hash,
  X,
  Copy,
  Phone,
} from "lucide-react";
import { SKILLS_SH_CATALOG } from "@/skills/registry";
import { AgentVisualRenderer } from "@/components/AgentVisualRenderer";

interface TelemetryData {
  deviceId: string;
  temperature: number;
  humidity: number;
  doorOpen: boolean;
  anomalyFlag: boolean;
  anomalyReason?: string;
  suppressedByPolicy?: boolean;
  policyMatchedRule?: string;
}

interface Pattern {
  id: string;
  description: string;
  condition: any;
  confidence: number;
  observationCount: number;
  status: string;
}

interface Policy {
  id: string;
  title: string;
  condition: string;
  action: string;
  confidence: number;
  status: string;
  approvedBy?: string;
}

interface Experience {
  id: string;
  situation: string;
  action: string;
  actualOutcome?: string;
  feedback?: string;
  success?: boolean;
  lesson?: string;
}

interface ApprovalItem {
  id: string;
  toolName: string;
  proposedAction: any;
  riskLevel: string;
  reason: string;
  status: string;
  riskScore?: number;
}

interface FirewallEvent {
  id: string;
  toolName: string;
  riskScore: number;
  riskLabel: string;
  decision: "allow" | "require_approval" | "block" | "honeypot";
  reason: string | null;
  createdAt: string | Date | null;
  isHoneypot: boolean;
}

interface FirewallStats {
  totalActions: number;
  allowed: number;
  requireApproval: number;
  blocked: number;
  honeypots: number;
  trustScore: number;
}

interface FirewallDemoResult {
  toolName: string;
  riskScore: number;
  label: string;
  decision: string;
  breakdown: { toolRisk: number; dataRisk: number; contextRisk: number; agentRisk: number };
  reasons: string[];
  summary: { icon: string; title: string; subtitle: string; color: string };
}

interface AgentItem {
  id: string;
  name: string;
  description?: string;
  goal?: string;
  instructions?: string;
  model: string;
  tools?: string[];
}

const getGreetingForAgent = (ag: AgentItem) => {
  const isHw = Boolean(
    (ag as any)?.metadata?.hasHardware === true ||
    (ag as any)?.hasHardware === true ||
    ag.id === "sapiens-cold-chain" ||
    ag.id === "omnivore-cold-chain" ||
    ag.id === "pharmacy-vault-s3" ||
    ag.tools?.includes("get_sensor_data") ||
    ag.tools?.includes("emergency_compressor_cutoff") ||
    ag.tools?.includes("emergency_relay_cutoff") ||
    (ag.name && (
      ag.name.toLowerCase().includes("cold-chain") ||
      ag.name.toLowerCase().includes("cold chain") ||
      ag.name.toLowerCase().includes("vaccine") ||
      ag.name.toLowerCase().includes("pharmacy") ||
      ag.name.toLowerCase().includes("esp32")
    ))
  );

  if (isHw) {
    return `${ag.name} initialized. Connected to ESP32-S3 (COM4) on-device telemetry. Hardware guardrails and sensor telemetry active.`;
  }
  return `${ag.name} initialized. Ready to assist with ${ag.goal || ag.description || "scheduling, calendar coordination, emails, and daily productivity"}. Select a scenario above or enter a prompt below to get started.`;
};

const INTEGRATIONS_SHOWCASE = [
  {
    name: "Gmail",
    category: "Email & Inbox",
    badge: "OAuth2",
    accent: "#EA4335",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z" fill="#F2F2F2"/>
        <path d="M22 6L12 13L2 6V18H4V8L12 14L20 8V18H22V6Z" fill="#EA4335"/>
        <path d="M2 6L12 13L22 6H2Z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    name: "Slack",
    category: "ChatOps",
    badge: "Real-time",
    accent: "#4A154B",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <path d="M6 15a2 2 0 1 1-2-2h2v2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5z" fill="#E01E5A"/>
        <path d="M9 6a2 2 0 1 1-2-2v2h2zm0 1a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5z" fill="#36C5F0"/>
        <path d="M18 9a2 2 0 1 1 2 2h-2V9zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5z" fill="#2EB67D"/>
        <path d="M15 18a2 2 0 1 1 2 2v-2h-2zm0-1a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z" fill="#ECB22E"/>
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    category: "Messaging",
    badge: "Direct API",
    accent: "#25D366",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill="#25D366"/>
        <path d="M17.5 14.5c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.8.9-.2.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5.1-.1.2-.2.3-.4.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4-.1-.1-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2 0 1.3.9 2.6 1.1 2.8.1.2 1.9 2.9 4.6 4 2.7 1.1 2.7.8 3.2.7.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.2-.3-.2-.5-.3z" fill="white"/>
      </svg>
    ),
  },
  {
    name: "Google Sheets",
    category: "Spreadsheets",
    badge: "Live Sync",
    accent: "#0F9D58",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="2" width="18" height="20" rx="3" fill="#0F9D58"/>
        <path d="M7 7h10v10H7z" fill="white" fillOpacity="0.2"/>
        <path d="M7 10h10M7 14h10M12 7v10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    name: "Notion",
    category: "Knowledge Base",
    badge: "Workspace",
    accent: "#000000",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#000000"/>
        <path d="M7 6.5h3l5 7.5V6.5h2.5v11h-3l-5-7.5v7.5H7v-11z" fill="#FFFFFF"/>
      </svg>
    ),
  },
  {
    name: "GitHub",
    category: "DevOps & CI/CD",
    badge: "Webhooks",
    accent: "#24292e",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    ),
  },
  {
    name: "PostgreSQL",
    category: "SQL Databases",
    badge: "Direct DB",
    accent: "#336791",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16.5c-3.5 0-5.5-2.2-5.5-5 0-2.3 1.5-4 4-4.5v1.2c-1.6.4-2.5 1.6-2.5 3.3 0 2 1.4 3.5 4 3.5 1.8 0 3-.8 3.5-2h-3v-1.5h4.8c.1.5.2 1 .2 1.5 0 2.2-1.3 3.5-2.5 3.5z" fill="#336791"/>
      </svg>
    ),
  },
  {
    name: "REST APIs",
    category: "HTTP Endpoints",
    badge: "Any Schema",
    accent: "#0066FF",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
  {
    name: "Webhooks",
    category: "Event Triggers",
    badge: "Push/Async",
    accent: "#FF4500",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#FF4500" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
  {
    name: "ESP32",
    category: "Hardware & IoT",
    badge: "GPIO Telemetry",
    accent: "#71ce34",
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#71ce34" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
        <rect x="9" y="9" width="6" height="6"/>
        <line x1="9" y1="1" x2="9" y2="4"/>
        <line x1="15" y1="1" x2="15" y2="4"/>
        <line x1="9" y1="20" x2="9" y2="23"/>
        <line x1="15" y1="20" x2="15" y2="23"/>
        <line x1="20" y1="9" x2="23" y2="9"/>
        <line x1="20" y1="14" x2="23" y2="14"/>
        <line x1="1" y1="9" x2="4" y2="9"/>
        <line x1="1" y1="14" x2="4" y2="14"/>
      </svg>
    ),
  },
];

const DEFAULT_STUDIO_AGENTS: AgentItem[] = [
  {
    id: "sapiens-cold-chain",
    name: "Cold-Chain Guardian",
    description: "Autonomous medical storage monitor with continuous self-learning defrost adaptation and hardware guardrails.",
    goal: "Safeguard vaccine container COLD-01 at -18°C and suppress false alarms.",
    instructions: `You are the SAPIENS Cold-Chain Agent. Your goal is to safeguard vaccine temperature containers at -18°C.
When reading sensor data:
1. Cross-reference temperature spikes against past episodic experiences.
2. If the anomaly matches known defrost routines (02:00 UTC), hold alarms.
3. If genuine breach > -10°C occurs, trigger emergency notification.
4. Any physical hardware cutoff requires strict human authorization.`,
    model: "google/gemini-2.0-flash-001",
    tools: ["get_sensor_data", "query_memory", "send_notification", "emergency_compressor_cutoff"],
  },
  {
    id: "pharmacy-vault-s3",
    name: "Pharmacy Vault S3",
    description: "Multi-sensor environmental monitor for temperature, humidity, and door aperture.",
    goal: "Maintain pharma storage humidity under 60% and temperature between 2°C and 8°C.",
    instructions: "Monitor refrigerated medications. Alert on door breaches lasting > 45 seconds.",
    model: "sapiens/frontier-reasoning",
    tools: ["get_sensor_data", "send_notification"],
  },
];

export default function SapiensAgentStudio() {
  // Top view mode: "builder" (Sapiens Agent Builder Studio) vs "showcase" (Sapiens Frontier Landing)
  const [viewMode, setViewMode] = useState<"builder" | "showcase">("builder");

  // Modals state
  const [showChannelsModal, setShowChannelsModal] = useState(false);
  const [channelTab, setChannelTab] = useState<"whatsapp" | "discord" | "telegram">("whatsapp");
  const [channelToast, setChannelToast] = useState<string | null>(null);

  // Agents list — always start with the server-safe default to avoid hydration mismatches.
  // Custom agents from localStorage are merged in a useEffect after mount.
  const [agentsList, setAgentsList] = useState<AgentItem[]>(DEFAULT_STUDIO_AGENTS);

  // Selected agent ID — always start with a stable default; localStorage/URL is applied after mount.
  const [selectedAgentId, setSelectedAgentId] = useState<string>("sapiens-cold-chain");

  // Channels Form
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [whatsAppRecipient, setWhatsAppRecipient] = useState("+91 96770 54449");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Builder Config State (synced with selectedAgent)
  const currentAgent = agentsList.find((a) => a.id === selectedAgentId) || agentsList[0];

  const isHardwareAgent = useMemo(() => {
    return Boolean(
      (currentAgent as any)?.metadata?.hasHardware === true ||
      (currentAgent as any)?.hasHardware === true ||
      currentAgent.id === "sapiens-cold-chain" ||
      currentAgent.id === "omnivore-cold-chain" ||
      currentAgent.id === "pharmacy-vault-s3" ||
      currentAgent.tools?.includes("get_sensor_data") ||
      currentAgent.tools?.includes("emergency_compressor_cutoff") ||
      currentAgent.tools?.includes("emergency_relay_cutoff") ||
      (currentAgent.name && (
        currentAgent.name.toLowerCase().includes("cold-chain") ||
        currentAgent.name.toLowerCase().includes("cold chain") ||
        currentAgent.name.toLowerCase().includes("vaccine") ||
        currentAgent.name.toLowerCase().includes("pharmacy") ||
        currentAgent.name.toLowerCase().includes("esp32")
      ))
    );
  }, [currentAgent]);

  const agentToolsList = useMemo(() => {
    let configuredTools = [...(currentAgent.tools || [])];
    const agentText = (
      currentAgent.name +
      " " +
      (currentAgent.description || "") +
      " " +
      (currentAgent.goal || "") +
      " " +
      (currentAgent.instructions || "")
    ).toLowerCase();

    // Auto-wire relevant skills from skills.sh if agent is a charting / database / BI agent
    if (
      agentText.includes("chart") ||
      agentText.includes("diagram") ||
      agentText.includes("flowchart") ||
      agentText.includes("database")
    ) {
      if (!configuredTools.includes("visual_chart_generator")) configuredTools.push("visual_chart_generator");
      if (!configuredTools.includes("flowchart_diagram_builder")) configuredTools.push("flowchart_diagram_builder");
      if (!configuredTools.includes("database_bi_reporter")) configuredTools.push("database_bi_reporter");
    }

    if (configuredTools.length > 0) {
      return configuredTools.map((tId) => {
        const found = SKILLS_SH_CATALOG.find(
          (s) =>
            s.id === tId ||
            s.functionName.replace("()", "") === tId ||
            s.name.toLowerCase() === tId.toLowerCase()
        );
        if (found) {
          return {
            key: tId,
            name: found.functionName,
            desc: found.description,
            risk: found.risk,
            riskColor:
              found.risk === "HIGH"
                ? "bg-rose-50 text-rose-700 border-rose-300"
                : found.risk === "MEDIUM"
                ? "bg-amber-50 text-amber-800 border-amber-300"
                : "bg-emerald-50 text-emerald-700 border-emerald-300",
          };
        }
        return {
          key: tId,
          name: `${tId}()`,
          desc: "Active agent capability registered with safety guardrails",
          risk: "LOW" as const,
          riskColor: "bg-emerald-50 text-emerald-700 border-emerald-300",
        };
      });
    }

    if (isHardwareAgent) {
      return [
        {
          key: "get_sensor_data",
          name: "get_sensor_data()",
          desc: "Reads live ESP32 temperature & humidity via I2C",
          risk: "LOW" as const,
          riskColor: "bg-emerald-50 text-emerald-700 border-emerald-300",
        },
        {
          key: "query_memory",
          name: "query_memory()",
          desc: "Retrieves episodic memories & approved policies",
          risk: "LOW" as const,
          riskColor: "bg-emerald-50 text-emerald-700 border-emerald-300",
        },
        {
          key: "send_notification",
          name: "send_notification()",
          desc: "Multi-channel alerts (Telegram / WhatsApp / Discord)",
          risk: "MED" as const,
          riskColor: "bg-amber-50 text-amber-800 border-amber-300",
        },
        {
          key: "emergency_compressor_cutoff",
          name: "emergency_compressor_cutoff()",
          desc: "Thermal overload relay trip. STRICT APPROVAL GATED.",
          risk: "HIGH" as const,
          riskColor: "bg-rose-50 text-rose-700 border-rose-300",
        },
      ];
    }

    return [
      {
        key: "read_calendar",
        name: "read_calendar()",
        desc: "Inspect calendar events, attendees, and scheduling conflicts",
        risk: "LOW" as const,
        riskColor: "bg-emerald-50 text-emerald-700 border-emerald-300",
      },
      {
        key: "read_emails",
        name: "read_emails()",
        desc: "Scan and parse unread Gmail inbox messages",
        risk: "LOW" as const,
        riskColor: "bg-emerald-50 text-emerald-700 border-emerald-300",
      },
      {
        key: "web_search",
        name: "web_search()",
        desc: "Live web search & research lookup",
        risk: "LOW" as const,
        riskColor: "bg-emerald-50 text-emerald-700 border-emerald-300",
      },
      {
        key: "query_memory",
        name: "query_memory()",
        desc: "Retrieves past task context & user preferences",
        risk: "LOW" as const,
        riskColor: "bg-emerald-50 text-emerald-700 border-emerald-300",
      },
      {
        key: "send_notification",
        name: "send_notification()",
        desc: "Multi-channel alerts (Telegram / WhatsApp / Discord)",
        risk: "MED" as const,
        riskColor: "bg-amber-50 text-amber-800 border-amber-300",
      },
    ];
  }, [currentAgent, isHardwareAgent]);

  const [agentName, setAgentName] = useState(currentAgent.name);
  const [agentDesc, setAgentDesc] = useState(currentAgent.description || "");
  const [selectedModel, setSelectedModel] = useState(currentAgent.model);
  const [systemPrompt, setSystemPrompt] = useState(currentAgent.instructions || "");
  const [studioApiKey, setStudioApiKey] = useState("");
  const [showStudioApiKey, setShowStudioApiKey] = useState(false);
  const [enabledTools, setEnabledTools] = useState<Record<string, boolean>>({
    read_emails: true,
    web_search: true,
    get_sensor_data: true,
    query_memory: true,
    send_notification: true,
    emergency_compressor_cutoff: true,
    db_read: true,
  });

  // Automatically sync Blueprint Form whenever selectedAgentId or agentsList changes
  useEffect(() => {
    const ag = agentsList.find((a) => a.id === selectedAgentId);
    if (ag) {
      setAgentName(ag.name);
      setAgentDesc(ag.description || "");
      setSelectedModel(ag.model);
      setSystemPrompt(ag.instructions || "");
      if (typeof window !== "undefined") {
        localStorage.setItem("sapiens_active_agent_id", ag.id);
      }
      setMessages((prev) => {
        if (prev.length <= 1) {
          return [{ role: "assistant", content: getGreetingForAgent(ag) }];
        }
        return prev;
      });
    }
  }, [selectedAgentId, agentsList]);

  // Switch active agent
  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    if (typeof window !== "undefined") {
      localStorage.setItem("sapiens_active_agent_id", agentId);
      const url = new URL(window.location.href);
      url.searchParams.set("agentId", agentId);
      window.history.replaceState({}, "", url.toString());
    }
    const ag = agentsList.find((a) => a.id === agentId);
    if (ag) {
      setAgentName(ag.name);
      setAgentDesc(ag.description || "");
      setSelectedModel(ag.model);
      setSystemPrompt(ag.instructions || "");
      setMessages([{ role: "assistant", content: getGreetingForAgent(ag) }]);
    }
  };

  // Test Channel
  const handleTestChannel = async (channel: "whatsapp" | "discord" | "telegram") => {
    setIsSendingTest(true);
    try {
      const config =
        channel === "discord"
          ? { webhookUrl: discordWebhook }
          : channel === "telegram"
          ? { botToken: telegramToken, chatId: telegramChatId }
          : { recipient: whatsAppRecipient };

      const res = await fetch("/api/channels/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, config }),
      });
      const data = await res.json();
      if (data.success) {
        setChannelToast(`✅ Test alert successfully routed to ${channel.toUpperCase()}!`);
      } else {
        setChannelToast(`⚠️ Notice: ${data.error || "Simulated test packet recorded"}`);
      }
      setTimeout(() => setChannelToast(null), 4000);
    } catch (e) {
      setChannelToast("❌ Failed sending channel test");
      setTimeout(() => setChannelToast(null), 4000);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Arena Right Tab State
  const [arenaTab, setArenaTab] = useState<"chat" | "oled" | "trace" | "approvals" | "firewall" | "whatsapp">("chat");

  // WhatsApp Agent Live Integration State
  const [waStatus, setWaStatus] = useState<"disconnected" | "pairing" | "connected" | "error">("disconnected");
  const [waPhoneNumber, setWaPhoneNumber] = useState("");
  const [waPairingCode, setWaPairingCode] = useState<string | null>(null);
  const [waLinkedJid, setWaLinkedJid] = useState<string | null>(null);
  const [waIsLoading, setWaIsLoading] = useState(false);
  const [waCopied, setWaCopied] = useState(false);
  const [waMessages, setWaMessages] = useState<
    Array<{
      id: string;
      from: string;
      senderName: string;
      text: string;
      timestamp: string;
      direction: "inbound" | "outbound";
    }>
  >([]);
  const [waCustomMessage, setWaCustomMessage] = useState("");

  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch("/api/channels/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data.status || "disconnected");
        if (data.pairingCode) setWaPairingCode(data.pairingCode);
        if (data.userJid) setWaLinkedJid(data.userJid);
        if (data.phoneNumber) {
          setWaPhoneNumber(data.phoneNumber);
          setWhatsAppRecipient(data.phoneNumber);
        } else if (data.userJid) {
          const raw = data.userJid.split(":")[0].replace(/[^0-9]/g, "");
          setWaPhoneNumber("+" + raw);
          setWhatsAppRecipient("+" + raw);
        }
        if (data.recentMessages) setWaMessages(data.recentMessages);
      }
    } catch (_) {}
  };

  const handleStartWhatsAppPairing = async (overrideNumber?: string) => {
    const target = (overrideNumber || waPhoneNumber || whatsAppRecipient || "").trim();
    if (!target) {
      alert("Please enter your WhatsApp phone number with country code (e.g., +91 98765 43210)");
      return;
    }
    setWaIsLoading(true);
    try {
      const res = await fetch("/api/channels/whatsapp/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: target }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.pairingCode) {
          setWaPairingCode(data.pairingCode);
          setWaStatus("pairing");
          setChannelToast("🔑 Pairing code generated! Enter in WhatsApp > Linked Devices.");
        } else {
          setWaStatus("connected");
          setChannelToast("✅ WhatsApp client is active!");
        }
      } else {
        alert(data.error || "Failed to generate pairing code");
      }
    } catch (e: any) {
      alert(e.message || "Failed to connect to WhatsApp API");
    } finally {
      setWaIsLoading(false);
      fetchWhatsAppStatus();
    }
  };

  const handleWhatsAppLogout = async () => {
    if (!confirm("Are you sure you want to disconnect WhatsApp and remove credentials?")) return;
    setWaIsLoading(true);
    try {
      await fetch("/api/channels/whatsapp/logout", { method: "POST" });
      setWaStatus("disconnected");
      setWaPairingCode(null);
      setWaLinkedJid(null);
      setChannelToast("WhatsApp session disconnected");
    } catch (_) {
    } finally {
      setWaIsLoading(false);
      fetchWhatsAppStatus();
    }
  };

  const handleSendWhatsAppCustom = async () => {
    const target = (waPhoneNumber || whatsAppRecipient || "").trim();
    if (!target || !waCustomMessage.trim()) return;
    setWaIsLoading(true);
    try {
      const res = await fetch("/api/channels/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: target,
          text: waCustomMessage,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setWaCustomMessage("");
        setChannelToast("Message sent to WhatsApp!");
        fetchWhatsAppStatus();
      } else {
        alert(d.error || "Failed to dispatch WhatsApp message");
      }
    } catch (e: any) {
      alert(e.message || "Network error");
    } finally {
      setWaIsLoading(false);
    }
  };

  const copyPairingCode = () => {
    if (!waPairingCode) return;
    navigator.clipboard.writeText(waPairingCode.replace("-", ""));
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 2000);
  };

  // Chat / Runner State
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<
    Array<{
      role: "user" | "assistant" | "system";
      content: string;
      trace?: any[];
      policiesUsed?: string;
    }>
  >(() => [
    {
      role: "assistant",
      content: getGreetingForAgent(currentAgent),
    },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  // Live Telemetry
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    deviceId: "ESP32-S3-COLD-01",
    temperature: -18.4,
    humidity: 82.0,
    doorOpen: false,
    anomalyFlag: false,
  });

  // Learning & Approvals Data
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [trustScore, setTrustScore] = useState(92.4);
  const [isReflecting, setIsReflecting] = useState(false);

  // Firewall State
  const [firewallEvents, setFirewallEvents] = useState<FirewallEvent[]>([]);
  const [firewallStats, setFirewallStats] = useState<FirewallStats>({
    totalActions: 147, allowed: 132, requireApproval: 11, blocked: 4, honeypots: 2, trustScore: 92,
  });
  const [firewallModal, setFirewallModal] = useState<FirewallDemoResult | null>(null);
  const [honeypotAlert, setHoneypotAlert] = useState<string | null>(null);
  const [activeFirewallDemo, setActiveFirewallDemo] = useState<string | null>(null);

  const agentApprovals = useMemo(() => {
    if (isHardwareAgent) return approvals;
    return approvals.filter(
      (a) =>
        a.toolName !== "emergency_compressor_cutoff" &&
        a.toolName !== "emergency_relay_cutoff" &&
        a.toolName !== "get_sensor_data"
    );
  }, [approvals, isHardwareAgent]);

  useEffect(() => {
    if (!isHardwareAgent && arenaTab === "oled") {
      setArenaTab("chat");
    }
  }, [isHardwareAgent, arenaTab]);

  // Fetch Firewall Event Feed
  const fetchFirewallData = async () => {
    try {
      const res = await fetch(`/api/firewall/events?agentId=${selectedAgentId}&limit=25`);
      if (res.ok) {
        const d = await res.json();
        if (d.events?.length) setFirewallEvents(d.events);
        if (d.stats) {
          setFirewallStats(d.stats);
          setTrustScore(d.stats.trustScore);
        }
      }
    } catch (e) {
      // use defaults
    }
  };

  // Run a demo firewall scenario
  const handleFirewallDemo = async (toolName: string, context: Record<string, any> = {}) => {
    setActiveFirewallDemo(toolName);
    try {
      const res = await fetch("/api/firewall/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName, toolInput: context, isProduction: true, hasPII: context.hasPII, recordScope: context.recordScope }),
      });
      const data = await res.json();
      if (data.success) {
        setFirewallModal(data);
        if (data.decision === "honeypot") {
          setHoneypotAlert(`🍯 HONEYPOT TRIGGERED — Agent tried: ${toolName}`);
          setTimeout(() => setHoneypotAlert(null), 8000);
        }
        // Add to feed
        setFirewallEvents(prev => [{
          id: `demo-${Date.now()}`,
          toolName,
          riskScore: data.riskScore,
          riskLabel: data.label,
          decision: data.decision,
          reason: data.reasons?.[0] ?? null,
          createdAt: new Date(),
          isHoneypot: data.decision === "honeypot",
        }, ...prev.slice(0, 24)]);
        // Update stats
        setFirewallStats(prev => ({
          ...prev,
          totalActions: prev.totalActions + 1,
          allowed: data.decision === "allow" ? prev.allowed + 1 : prev.allowed,
          requireApproval: data.decision === "require_approval" ? prev.requireApproval + 1 : prev.requireApproval,
          blocked: data.decision === "block" ? prev.blocked + 1 : prev.blocked,
          honeypots: data.decision === "honeypot" ? prev.honeypots + 1 : prev.honeypots,
        }));
      }
    } catch (e) {
      console.error("Firewall demo error:", e);
    } finally {
      setActiveFirewallDemo(null);
    }
  };

  // Fetch initial API state
  const fetchData = async () => {
    // Load saved BYOK API Key
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("sapiens_custom_api_key");
      if (savedKey) setStudioApiKey(savedKey);
    }

    try {
      const patRes = await fetch("/api/learning/patterns");
      if (patRes.ok) {
        const d = await patRes.json();
        setPatterns(d.patterns || []);
        setPolicies(d.policies || []);
        setExperiences(d.experiences || []);
      }

      const appRes = await fetch("/api/approvals");
      if (appRes.ok) {
        const d = await appRes.json();
        setApprovals(d.approvals || []);
      }

      const metRes = await fetch("/api/metrics");
      if (metRes.ok) {
        const d = await metRes.json();
        if (d.metrics?.trustScore) setTrustScore(d.metrics.trustScore);
      }

      const agRes = await fetch("/api/agents");
      if (agRes.ok) {
        const d = await agRes.json();
        if (d.agents?.length) {
          let list = d.agents;
          if (typeof window !== "undefined") {
            try {
              const local = JSON.parse(
                localStorage.getItem("sapiens_custom_agents") || "[]"
              );
              if (local.length) {
                const apiIds = new Set(d.agents.map((a: any) => a.id));
                const extra = local.filter((a: any) => !apiIds.has(a.id));
                list = [...extra, ...d.agents];
              }
              // Keep localStorage updated with any disk/DB custom agents
              const customFromApi = d.agents.filter(
                (a: any) => a.id !== "sapiens-cold-chain" && a.id !== "pharmacy-vault-s3" && a.id !== "sapiens-autonomous-sentinel"
              );
              if (customFromApi.length) {
                const mergedCustom = [...customFromApi];
                if (local.length) {
                  for (const l of local) {
                    if (!mergedCustom.some((c) => c.id === l.id)) {
                      mergedCustom.push(l);
                    }
                  }
                }
                localStorage.setItem("sapiens_custom_agents", JSON.stringify(mergedCustom));
              }
            } catch (e) {}
          }
          setAgentsList(list);

          // Auto-select target agent if present in URL query or localStorage
          let targetId = selectedAgentId;
          if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const queryId = urlParams.get("agentId");
            const storedId = localStorage.getItem("sapiens_active_agent_id");
            if (queryId && list.some((a: any) => a.id === queryId)) {
              targetId = queryId;
            } else if (storedId && list.some((a: any) => a.id === storedId)) {
              targetId = storedId;
            }
            const viewParam = urlParams.get("view");
            if (viewParam === "showcase" || viewParam === "landing" || viewParam === "hero") {
              setViewMode("showcase");
            }
          }

          if (targetId && list.some((a: any) => a.id === targetId)) {
            setSelectedAgentId(targetId);
            const ag = list.find((a: any) => a.id === targetId);
            if (ag) {
              setAgentName(ag.name);
              setAgentDesc(ag.description || "");
              setSelectedModel(ag.model);
              setSystemPrompt(ag.instructions || "");
              if (typeof window !== "undefined") {
                localStorage.setItem("sapiens_active_agent_id", ag.id);
              }
              setMessages((prev) => {
                if (prev.length <= 1) {
                  return [{ role: "assistant", content: getGreetingForAgent(ag) }];
                }
                return prev;
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("API state fetch fallback:", e);
      // If the API is down, still restore custom agents + active selection from localStorage
      try {
        const local = JSON.parse(localStorage.getItem("sapiens_custom_agents") || "[]");
        if (Array.isArray(local) && local.length > 0) {
          const defaultIds = new Set(DEFAULT_STUDIO_AGENTS.map((d) => d.id));
          const customOnly = local.filter((a: any) => !defaultIds.has(a.id));
          const merged = [...customOnly, ...DEFAULT_STUDIO_AGENTS];
          setAgentsList(merged);

          const storedId = localStorage.getItem("sapiens_active_agent_id");
          const urlParams = new URLSearchParams(window.location.search);
          const queryId = urlParams.get("agentId");
          const targetId = (queryId && merged.some((a) => a.id === queryId))
            ? queryId
            : (storedId && merged.some((a) => a.id === storedId))
              ? storedId
              : merged[0]?.id;

          if (targetId) {
            setSelectedAgentId(targetId);
            const ag = merged.find((a) => a.id === targetId);
            if (ag) {
              setAgentName(ag.name);
              setAgentDesc(ag.description || "");
              setSelectedModel(ag.model);
              setSystemPrompt(ag.instructions || "");
            }
          }
        }
      } catch (_) {}
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const queryId = urlParams.get("agentId");
      const storedId = localStorage.getItem("sapiens_active_agent_id");
      if (queryId) setSelectedAgentId(queryId);
      else if (storedId) setSelectedAgentId(storedId);
    }
    fetchData();
    fetchFirewallData();
    fetchWhatsAppStatus();
    const handleFocus = () => {
      fetchData();
      fetchFirewallData();
      fetchWhatsAppStatus();
    };
    window.addEventListener("focus", handleFocus);
    // Poll firewall events every 8s and WhatsApp status every 6s
    const firewallPoll = setInterval(fetchFirewallData, 8000);
    const waPoll = setInterval(fetchWhatsAppStatus, 6000);
    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(firewallPoll);
      clearInterval(waPoll);
    };
  }, []);

  // Send Telemetry Simulation
  const handleSimulate = async (temp: number, humidity: number, door: boolean, label: string) => {
    try {
      const res = await fetch("/api/esp32/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: "ESP32-S3-COLD-01",
          temperature: temp,
          humidity,
          doorOpen: door,
        }),
      });
      const data = await res.json();
      setTelemetry({
        deviceId: "ESP32-S3-COLD-01",
        temperature: temp,
        humidity,
        doorOpen: door,
        anomalyFlag: data.anomalyFlag,
        anomalyReason: data.anomalyReason,
        suppressedByPolicy: data.suppressedByPolicy,
        policyMatchedRule: data.policyMatchedRule,
      });

      if (data.suppressedByPolicy) {
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: `🛡️ [LEARNED POLICY ENFORCED] Temperature rose to ${temp}°C. Alert suppressed by rule: "${data.policyMatchedRule}". Container is in standard automated defrost cycle.`,
          },
        ]);
      } else if (data.anomalyFlag) {
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: `🚨 [ANOMALY DETECTED] Temperature breached safe threshold: ${temp}°C! Reason: ${data.anomalyReason}.`,
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Run Agent Execution
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || chatInput;
    if (!promptToSend.trim()) return;

    const userMsg = { role: "user" as const, content: promptToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setChatInput("");
    setIsRunning(true);

    try {
      const res = await fetch(`/api/agents/${selectedAgentId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: promptToSend,
          apiKey: studioApiKey.trim() || undefined,
          isHardware: isHardwareAgent,
          agentName: currentAgent.name,
          agentGoal: currentAgent.goal,
          agentInstructions: systemPrompt || currentAgent.instructions,
          agentTools: currentAgent.tools,
        }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response || "Run completed successfully.",
          trace: data.steps,
          policiesUsed: data.policiesInjected,
        },
      ]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isHardwareAgent
            ? "Execution completed in fallback demo mode. Cold-chain status nominal."
            : "Execution completed in fallback demo mode. Task processed safely within guardrails.",
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  // Promote Candidate Pattern to Policy
  const handleApprovePattern = async (patternId: string) => {
    try {
      await fetch("/api/learning/approve-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patternId, approvedBy: "Studio Admin" }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Resolve Human Approval
  const handleResolveApproval = async (id: string, decision: "approved" | "rejected") => {
    try {
      await fetch(`/api/approvals/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, approvedBy: "Studio Lead" }),
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Reflection
  const handleReflect = async () => {
    setIsReflecting(true);
    try {
      await fetch("/api/learning/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 5 }),
      });
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsReflecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0C0C0D] flex flex-col selection:bg-[#71ce34] selection:text-white font-sans">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP NOTIFICATION TOAST                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {channelToast && (
        <div className="fixed top-3 right-4 z-50 px-4 py-2 rounded bg-neutral-900 text-white text-xs shadow-xl border border-neutral-700 flex items-center gap-2 animate-bounce">
          <span>{channelToast}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* HONEYPOT ALERT BANNER                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      {honeypotAlert && (
        <div className="fixed top-14 left-0 right-0 z-50 flex items-center justify-center px-4 py-2.5 bg-orange-600 text-white text-xs font-bold shadow-2xl animate-bounce border-b-2 border-orange-400">
          <span className="mr-3 text-sm">🍯</span>
          <span>{honeypotAlert}</span>
          <span className="ml-3 text-sm">🍯</span>
          <button onClick={() => setHoneypotAlert(null)} className="ml-6 text-orange-200 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FIREWALL BLOCK MODAL                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {firewallModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className={`bg-white rounded-2xl border-2 ${
            firewallModal.decision === "honeypot" ? "border-orange-400" :
            firewallModal.decision === "block" ? "border-rose-400" :
            firewallModal.decision === "require_approval" ? "border-amber-400" : "border-emerald-400"
          } max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fade-in-scale`}>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className={`text-2xl font-black tracking-tight ${
                  firewallModal.decision === "honeypot" ? "text-orange-600" :
                  firewallModal.decision === "block" ? "text-rose-600" :
                  firewallModal.decision === "require_approval" ? "text-amber-700" : "text-emerald-700"
                }`}>
                  {firewallModal.summary.icon} {firewallModal.summary.title}
                </div>
                <div className="text-xs font-mono text-neutral-500">
                  🔐 SAPIENS AGENT FIREWALL — Real-Time Interception
                </div>
              </div>
              <button onClick={() => setFirewallModal(null)} className="text-neutral-400 hover:text-black text-lg leading-none">×</button>
            </div>

            {/* Tool + Score */}
            <div className="p-4 rounded-xl bg-neutral-950 text-white font-mono text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 text-xs uppercase tracking-wider">Action</span>
                <span className="font-bold text-cyan-300">{firewallModal.toolName}()</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 text-xs uppercase tracking-wider">Risk Score</span>
                <span className={`text-2xl font-black ${
                  firewallModal.riskScore >= 85 ? "text-rose-400" :
                  firewallModal.riskScore >= 50 ? "text-amber-400" : "text-emerald-400"
                }`}>{firewallModal.riskScore}/100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 text-xs uppercase tracking-wider">Decision</span>
                <span className={`font-bold text-sm px-2 py-0.5 rounded ${
                  firewallModal.decision === "honeypot" ? "bg-orange-500/20 text-orange-300" :
                  firewallModal.decision === "block" ? "bg-rose-500/20 text-rose-300" :
                  firewallModal.decision === "require_approval" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"
                }`}>{firewallModal.summary.title}</span>
              </div>
            </div>

            {/* Risk Breakdown */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Risk Factor Breakdown</div>
              {([
                { label: "Tool Risk", value: firewallModal.breakdown.toolRisk, weight: "40%" },
                { label: "Data Risk", value: firewallModal.breakdown.dataRisk, weight: "30%" },
                { label: "Context Risk", value: firewallModal.breakdown.contextRisk, weight: "15%" },
                { label: "Agent Risk", value: firewallModal.breakdown.agentRisk, weight: "15%" },
              ]).map(({ label, value, weight }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-neutral-600 w-24">{label}</span>
                  <div className="flex-1 bg-neutral-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        value >= 70 ? "bg-rose-500" : value >= 40 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-neutral-800 w-12 text-right">{value}/100</span>
                  <span className="text-[10px] text-neutral-400 w-8">{weight}</span>
                </div>
              ))}
            </div>

            {/* Reasons */}
            <div className="space-y-1">
              <div className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Reason</div>
              {firewallModal.reasons.slice(0, 4).map((r, i) => (
                <div key={i} className="text-xs text-neutral-700 flex items-start gap-2">
                  <span className="text-neutral-400 mt-0.5">•</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>

            {firewallModal.decision !== "allow" && (
              <div className="p-3 rounded-lg bg-neutral-900 text-white text-xs font-mono text-center font-bold tracking-wide">
                ⚡ The LLM cannot override this decision.
              </div>
            )}

            <button
              onClick={() => setFirewallModal(null)}
              className="w-full py-2.5 rounded-lg bg-[#71ce34] hover:bg-[#62b62b] text-white font-bold text-sm transition"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SAPIENS TOP NAVIGATION BAR                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-[#E6E2DA] bg-[#FAF8F5]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Logo & Agent Switcher */}
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0">
            <div
              className="flex items-center gap-2 cursor-pointer shrink-0 hover:opacity-90 transition-opacity"
              onClick={() => setViewMode("showcase")}
            >
              {/* Sapiens Official Logo */}
              <Image
                src="/logo.png"
                alt="Sapiens Logo"
                width={28}
                height={28}
                className="w-7 h-7 object-contain rounded transition-transform duration-300 hover:scale-105"
                priority
              />
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#0C0C0D] flex items-center gap-1">
                SAPIENS <span className="text-[#71ce34]">STUDIO</span>
              </span>
            </div>

            {/* Agent Switcher Dropdown */}
            <div className="flex items-center gap-1 bg-[#EFECE6] px-2 sm:px-2.5 py-1 rounded border border-[#E0DCD4] text-xs max-w-[140px] xs:max-w-[170px] sm:max-w-[240px] md:max-w-none">
              <span className="text-neutral-500 font-mono text-[9px] sm:text-[10px] hidden xs:inline">AGENT:</span>
              <select
                value={selectedAgentId}
                onChange={(e) => handleSelectAgent(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#0C0C0D] focus:outline-none cursor-pointer truncate max-w-[90px] xs:max-w-[120px] sm:max-w-[180px]"
              >
                {agentsList.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name}
                  </option>
                ))}
              </select>
              <a
                href="/agents/create"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 p-1 rounded bg-[#71ce34] hover:bg-[#62b62b] text-white transition flex items-center justify-center interactive-btn shrink-0"
                title="Create New Agent (Opens Studio in New Window)"
              >
                <Plus className="w-3 h-3" />
              </a>
            </div>

            {/* Channels Button (WhatsApp, Discord, Telegram) - Desktop */}
            <button
              onClick={() => setShowChannelsModal(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded bg-white hover:bg-neutral-50 text-xs font-bold text-[#0C0C0D] border border-[#E0DCD4] shadow-2xs transition interactive-btn hover-lift shrink-0"
            >
              <Share2 className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Connect Channels</span>
              <span className="flex items-center gap-1 ml-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-neutral-500 font-mono">3 Active</span>
              </span>
            </button>
          </div>

          {/* Right Actions & Status */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Mobile Channels Button */}
            <button
              onClick={() => setShowChannelsModal(true)}
              className="flex lg:hidden p-1.5 rounded bg-white hover:bg-neutral-50 text-neutral-700 border border-[#E0DCD4] text-xs font-bold interactive-btn transition"
              title="Connect Channels"
            >
              <Share2 className="w-3.5 h-3.5 text-[#0066FF]" />
            </button>

            {/* View Mode Switcher Pill */}
            <div className="flex items-center rounded-md bg-[#EFECE6] p-0.5 border border-[#E0DCD4] text-xs">
              <button
                onClick={() => setViewMode("builder")}
                className={`px-2 sm:px-3 py-1 rounded font-medium transition-all duration-200 interactive-btn text-[11px] sm:text-xs ${
                  viewMode === "builder"
                    ? "bg-[#71ce34] text-white shadow-sm font-bold"
                    : "text-neutral-600 hover:text-[#0C0C0D]"
                }`}
              >
                <span className="hidden sm:inline">Studio Builder</span>
                <span className="inline sm:hidden">Studio</span>
              </button>
              <button
                onClick={() => setViewMode("showcase")}
                className={`px-2 sm:px-3 py-1 rounded font-medium transition-all duration-200 interactive-btn text-[11px] sm:text-xs ${
                  viewMode === "showcase"
                    ? "bg-[#0066FF] text-white shadow-sm font-bold"
                    : "text-neutral-600 hover:text-[#0C0C0D]"
                }`}
              >
                <span className="hidden sm:inline">Hero Landing</span>
                <span className="inline sm:hidden">Hero</span>
              </button>
            </div>

            {/* Reset Demo Button */}
            <button
              onClick={async () => {
                await fetch("/api/demo/seed", { method: "POST" });
                fetchData();
              }}
              className="p-1.5 sm:px-2.5 sm:py-1 text-xs text-neutral-700 hover:text-black bg-white border border-[#E0DCD4] rounded shadow-2xs hover:bg-neutral-50 flex items-center gap-1.5 transition interactive-btn"
              title="Reset initial telemetry, defrost false alarms, and policies"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>



      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: CONNECT CHANNELS (WHATSAPP, DISCORD, TELEGRAM)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showChannelsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-[#E6E2DA] max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-5 animate-fade-in-scale max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6E2DA] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0C0C0D] flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#71ce34]" />
                  Multi-Channel Messaging Integrations
                </h3>
                <p className="text-xs text-neutral-500">
                  Deliver breach alerts &amp; receive high-risk approvals directly via WhatsApp, Telegram, or Discord.
                </p>
              </div>
              <button
                onClick={() => setShowChannelsModal(false)}
                className="text-neutral-400 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Channel Tabs */}
            <div className="grid grid-cols-3 gap-2 border-b border-[#E6E2DA] pb-2">
              <button
                onClick={() => setChannelTab("whatsapp")}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded transition ${
                  channelTab === "whatsapp"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                    : "bg-[#FAF8F5] text-neutral-600 hover:text-black"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
              </button>
              <button
                onClick={() => setChannelTab("discord")}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded transition ${
                  channelTab === "discord"
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-300"
                    : "bg-[#FAF8F5] text-neutral-600 hover:text-black"
                }`}
              >
                <Hash className="w-3.5 h-3.5 text-indigo-600" /> Discord
              </button>
              <button
                onClick={() => setChannelTab("telegram")}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded transition ${
                  channelTab === "telegram"
                    ? "bg-sky-50 text-sky-700 border border-sky-300"
                    : "bg-[#FAF8F5] text-neutral-600 hover:text-black"
                }`}
              >
                <Send className="w-3.5 h-3.5 text-sky-600" /> Telegram
              </button>
            </div>

            {/* TAB: WHATSAPP */}
            {channelTab === "whatsapp" && (
              <div className="space-y-4 text-xs">
                {/* Connection Status Banner */}
                <div className={`p-3 rounded border flex items-center justify-between transition-colors ${
                  waStatus === "connected"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : waStatus === "pairing"
                    ? "bg-amber-50 border-amber-300 text-amber-900"
                    : "bg-neutral-50 border-[#E6E2DA] text-neutral-800"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      waStatus === "connected"
                        ? "bg-emerald-500 animate-pulse"
                        : waStatus === "pairing"
                        ? "bg-amber-500 animate-ping"
                        : "bg-neutral-400"
                    }`}></span>
                    <div>
                      <span className="font-bold block">
                        {waStatus === "connected"
                          ? "WhatsApp Multi-Device Active"
                          : waStatus === "pairing"
                          ? "Pairing in Progress (Awaiting Phone Confirmation)"
                          : "WhatsApp Disconnected"}
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {waLinkedJid ? `Linked: ${waLinkedJid}` : "Headless Baileys Socket Engine"}
                      </span>
                    </div>
                  </div>
                  {waStatus === "connected" ? (
                    <button
                      onClick={handleWhatsAppLogout}
                      disabled={waIsLoading}
                      className="px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-200 rounded transition hover:bg-rose-100"
                    >
                      Disconnect
                    </button>
                  ) : null}
                </div>

                {/* PAIRING CODE DISPLAY CARD (When active) */}
                {waPairingCode && waStatus === "pairing" && (
                  <div className="p-4 rounded-xl bg-neutral-900 text-white space-y-3 shadow-lg border border-neutral-700 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#71ce34] font-bold">
                        🔑 WhatsApp 8-Digit Pairing Code:
                      </span>
                      <span className="text-[10px] text-neutral-400">Expires in 2 mins</span>
                    </div>
                    
                    <div className="flex items-center justify-center gap-3 py-2 bg-neutral-950 rounded-lg border border-neutral-800">
                      <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-[#71ce34]">
                        {waPairingCode}
                      </span>
                      <button
                        onClick={copyPairingCode}
                        className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition flex items-center gap-1 text-[11px] font-mono"
                        title="Copy code without dash"
                      >
                        {waCopied ? <Check className="w-3.5 h-3.5 text-[#71ce34]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{waCopied ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-neutral-300 bg-neutral-800/50 p-3 rounded-lg">
                      <span className="font-bold text-white block mb-1">How to Link on Your Phone:</span>
                      <p>1. Open <b>WhatsApp</b> on your mobile device</p>
                      <p>2. Go to <b>Settings</b> (iOS) or <b>⋮ Menu</b> (Android) &gt; <b>Linked Devices</b></p>
                      <p>3. Tap <b>Link a Device</b> &gt; tap <b>"Link with phone number instead"</b> at bottom</p>
                      <p>4. Enter the 8-character code shown above</p>
                    </div>
                  </div>
                )}

                {/* PHONE NUMBER INPUT & GENERATE CODE */}
                <div className="space-y-2">
                  <label className="font-bold text-neutral-800 block">
                    Phone Number (With Country Code)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={waPhoneNumber || whatsAppRecipient}
                      onChange={(e) => {
                        setWaPhoneNumber(e.target.value);
                        setWhatsAppRecipient(e.target.value);
                      }}
                      className="flex-1 bg-[#FAF8F5] border border-[#E0DCD4] rounded p-2 text-xs font-mono focus:outline-none focus:border-[#71ce34] focus:bg-white"
                    />
                    <button
                      onClick={() => handleStartWhatsAppPairing()}
                      disabled={waIsLoading}
                      className="px-3.5 py-2 rounded bg-neutral-900 hover:bg-black text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0"
                    >
                      {waIsLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Phone className="w-3.5 h-3.5 text-[#71ce34]" />
                      )}
                      <span>{waStatus === "connected" ? "Re-Pair Device" : "Request Pairing Code"}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Enter the phone number you want to connect to SAPIENS. The pairing code is generated securely by the Baileys multi-device engine on your server/Railway.
                  </p>
                </div>

                {/* TEST ALERT BUTTON */}
                <div className="p-3 rounded bg-[#FAF8F5] border border-[#E6E2DA] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-neutral-900 block">Send Outbound Verification Alert</span>
                    <span className="text-[11px] text-neutral-500">Dispatches thermal card &amp; approval token</span>
                  </div>
                  <button
                    onClick={() => handleTestChannel("whatsapp")}
                    disabled={isSendingTest || waStatus !== "connected"}
                    className={`px-3 py-1.5 rounded font-bold text-xs transition ${
                      waStatus === "connected"
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                        : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                    }`}
                  >
                    {isSendingTest ? "Sending..." : "Send Test Alert"}
                  </button>
                </div>
              </div>
            )}

            {/* TAB: DISCORD */}
            {channelTab === "discord" && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                    <span className="font-bold text-indigo-900">Discord Webhook Dispatcher</span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-700">Embed Formatting Active</span>
                </div>

                <div>
                  <label className="font-bold text-neutral-800 block mb-1">Discord Webhook URL</label>
                  <input
                    type="text"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={discordWebhook}
                    onChange={(e) => setDiscordWebhook(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded p-2 text-xs font-mono focus:outline-none focus:border-[#71ce34] focus:bg-white"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Paste your Discord channel webhook to stream real-time temperature graph cards &amp; breaches.
                  </p>
                </div>

                <div className="p-3 rounded bg-[#FAF8F5] border border-[#E6E2DA] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-neutral-900 block">Dispatch Sample Discord Embed</span>
                    <span className="text-[11px] text-neutral-500">Includes thermal telemetry and approval token</span>
                  </div>
                  <button
                    onClick={() => handleTestChannel("discord")}
                    disabled={isSendingTest}
                    className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                  >
                    Test Discord Webhook
                  </button>
                </div>
              </div>
            )}

            {/* TAB: TELEGRAM */}
            {channelTab === "telegram" && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-sky-50 border border-sky-200 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                    <span className="font-bold text-sky-900">Telegram Bot API</span>
                  </div>
                  <span className="text-[10px] font-mono text-sky-700">Bidirectional Commands</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-neutral-800 block mb-1">Bot Token</label>
                    <input
                      type="text"
                      placeholder="123456:ABC-DEF..."
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded p-2 text-xs font-mono focus:outline-none focus:border-[#71ce34] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-800 block mb-1">Chat ID</label>
                    <input
                      type="text"
                      placeholder="@channel or -100123..."
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded p-2 text-xs font-mono focus:outline-none focus:border-[#71ce34] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="p-3 rounded bg-[#FAF8F5] border border-[#E6E2DA] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-neutral-900 block">Dispatch Sample Telegram Message</span>
                    <span className="text-[11px] text-neutral-500">Test two-way /approve command card</span>
                  </div>
                  <button
                    onClick={() => handleTestChannel("telegram")}
                    disabled={isSendingTest}
                    className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition"
                  >
                    Test Telegram Alert
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-[#E6E2DA]">
              <button
                onClick={() => setShowChannelsModal(false)}
                className="px-4 py-2 bg-[#71ce34] hover:bg-[#62b62b] text-white font-bold text-xs rounded transition shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW 1: SAPIENS AGENT BUILDER STUDIO (WHITE MODE SPLIT)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === "builder" && (
        <div className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E6E2DA]">
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* LEFT PANEL: AGENT CONFIGURATION (WHITE MODE)                */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 p-3.5 sm:p-5 lg:p-6 space-y-5 lg:space-y-6 overflow-y-auto lg:max-h-[calc(100vh-56px)] bg-[#FAF8F5] animate-fade-in">
            {/* Header: Agent Identity */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#71ce34] font-bold flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" /> Agent Blueprint
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowChannelsModal(true)}
                    className="px-2 py-0.5 text-[10px] font-bold text-[#0066FF] bg-blue-50 border border-blue-200 rounded flex items-center gap-1 hover:bg-blue-100 transition"
                  >
                    <Share2 className="w-3 h-3" /> Channels Active
                  </button>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-300 rounded font-bold">
                    DEPLOYED
                  </span>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full bg-transparent text-xl sm:text-2xl font-black tracking-tight text-[#0C0C0D] border-b border-[#E6E2DA] focus:border-[#71ce34] focus:outline-none pb-1"
                />
                <input
                  type="text"
                  value={agentDesc}
                  onChange={(e) => setAgentDesc(e.target.value)}
                  className="w-full bg-transparent text-xs text-neutral-600 mt-1 focus:outline-none focus:text-neutral-900"
                />
              </div>
            </div>

            {/* Model Selector & BYOK */}
            <div className="sapiens-card p-3.5 space-y-3">
              <label className="text-xs font-bold text-neutral-800 flex items-center justify-between">
                <span>Base Intelligence Model</span>
                <span className="text-[10px] font-mono text-[#71ce34] font-semibold">Low Latency Tool Calling</span>
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-[#F7F5F0] border border-[#E6E2DA] text-xs text-[#0C0C0D] rounded p-2 focus:outline-none focus:border-[#71ce34] font-mono"
              >
                <option value="sapiens-reasoning-frontier">sapiens-frontier (Deep Reasoning Engine)</option>
                <option value="sapiens-edge-nemo">sapiens-nemo-12b (Edge Optimized)</option>
                <option value="google/gemini-2.0-flash-001">gemini-2.0-flash-001 (Google Gemini)</option>
                <option value="openai/gpt-4o">gpt-4o (OpenAI GPT-4o)</option>
                <option value="anthropic/claude-3-5-sonnet">claude-3-5-sonnet (Anthropic Claude)</option>
              </select>

              {/* BYOK API Key Input */}
              <div className="pt-2 border-t border-[#EAE6DE] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-neutral-700 flex items-center gap-1.5">
                    <Key className="w-3 h-3 text-[#FA500F]" />
                    <span>API Key (BYOK)</span>
                  </label>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    studioApiKey.trim()
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                      : "bg-neutral-100 text-neutral-600"
                  }`}>
                    {studioApiKey.trim() ? "⚡ Custom Key Active" : "🟢 Free Tier Active"}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showStudioApiKey ? "text" : "password"}
                    value={studioApiKey}
                    onChange={(e) => {
                      setStudioApiKey(e.target.value);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("sapiens_custom_api_key", e.target.value);
                      }
                    }}
                    placeholder="Custom API Key (Optional BYOK)"
                    className="w-full bg-[#F7F5F0] border border-[#E6E2DA] rounded pl-2 pr-7 py-1.5 text-[11px] font-mono text-[#0C0C0D] focus:outline-none focus:border-[#FA500F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStudioApiKey(!showStudioApiKey)}
                    className="absolute right-2 text-neutral-400 hover:text-neutral-700 transition"
                    title={showStudioApiKey ? "Hide Key" : "Show Key"}
                  >
                    {showStudioApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* System Prompt & Injected Policies */}
            <div className="sapiens-card p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#71ce34]" />
                  Instructions (System Prompt)
                </label>
                <span className="text-[10px] font-mono text-neutral-500">
                  Execution Guardrails Active
                </span>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
                className="w-full bg-[#F7F5F0] border border-[#E6E2DA] text-xs text-neutral-800 font-mono rounded p-2.5 focus:outline-none focus:border-[#71ce34] leading-relaxed resize-none focus:bg-white"
              />

              {/* Guardrail Verification Pill */}
              <div className="p-2.5 rounded bg-[#F2FAEE] border border-[#71ce34]/30 flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-700 font-medium flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#71ce34]" />
                  Deterministic Guardrail Engine Active
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-300 rounded font-bold">
                  VERIFIED
                </span>
              </div>
            </div>

            {/* Tools & Capabilities Checklist */}
            <div className="sapiens-card p-3.5 space-y-3">
              <label className="text-xs font-bold text-neutral-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-[#71ce34]" />
                  Tool Capabilities &amp; Risk Registry
                </span>
                <span className="text-[10px] text-neutral-500">Active Skills ({agentToolsList.length})</span>
              </label>

              <div className="space-y-2 text-xs">
                {agentToolsList.map((tool) => (
                  <div
                    key={tool.key}
                    className="p-2.5 rounded bg-[#FAF8F5] border border-[#EAE6DE] flex items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-neutral-900">{tool.name}</span>
                        <span className={`px-1.5 py-0.2 text-[9px] font-mono border rounded ${tool.riskColor}`}>
                          {tool.risk}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-600">{tool.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enabledTools[tool.key] !== false}
                      onChange={(e) =>
                        setEnabledTools({ ...enabledTools, [tool.key]: e.target.checked })
                      }
                      className="accent-[#71ce34] w-4 h-4 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* ───────────────────────────── TRUST CENTER PANEL ────── */}
            <div className="sapiens-card p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#71ce34]" />
                  Trust Center
                </label>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  firewallStats.trustScore >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
                  firewallStats.trustScore >= 60 ? "bg-amber-50 text-amber-700 border-amber-300" :
                  "bg-rose-50 text-rose-700 border-rose-300"
                }`}>
                  Trust: {firewallStats.trustScore}%
                </span>
              </div>

              {/* Trust Score Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-neutral-500">Agent Trust Score</span>
                  <span className={`font-bold ${
                    firewallStats.trustScore >= 80 ? "text-emerald-600" :
                    firewallStats.trustScore >= 60 ? "text-amber-600" : "text-rose-600"
                  }`}>{firewallStats.trustScore}%</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      firewallStats.trustScore >= 80 ? "bg-emerald-500" :
                      firewallStats.trustScore >= 60 ? "bg-amber-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${firewallStats.trustScore}%` }}
                  />
                </div>
              </div>

              {/* Stat counters */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <span className="text-emerald-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Allowed</span>
                  <span className="font-mono font-bold text-emerald-800">{firewallStats.allowed}</span>
                </div>
                <div className="p-2 rounded bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <span className="text-amber-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Approval</span>
                  <span className="font-mono font-bold text-amber-800">{firewallStats.requireApproval}</span>
                </div>
                <div className="p-2 rounded bg-rose-50 border border-rose-200 flex items-center justify-between">
                  <span className="text-rose-700 font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> Blocked</span>
                  <span className="font-mono font-bold text-rose-800">{firewallStats.blocked}</span>
                </div>
                <div className="p-2 rounded bg-orange-50 border border-orange-200 flex items-center justify-between">
                  <span className="text-orange-700 font-medium">🍯 Honeypots</span>
                  <span className="font-mono font-bold text-orange-800">{firewallStats.honeypots}</span>
                </div>
              </div>

              {/* Firewall Demo Scenarios */}
              <div className="pt-1 border-t border-[#EAE6DE] space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-bold">Firewall Demo Scenarios</div>
                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                  <button
                    onClick={() => handleFirewallDemo("gmail_read")}
                    disabled={activeFirewallDemo !== null}
                    className="text-left px-2.5 py-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium hover:bg-emerald-100 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>✅</span> Gmail Read — Risk: 8/100 (AUTO)
                  </button>
                  <button
                    onClick={() => handleFirewallDemo("stripe_charge", { amount: 50000, customerId: "cus_123", hasPII: true })}
                    disabled={activeFirewallDemo !== null}
                    className="text-left px-2.5 py-1.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-medium hover:bg-amber-100 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>⚠️</span> Stripe ₹50k Charge — Risk: ~82/100
                  </button>
                  <button
                    onClick={() => handleFirewallDemo("postgres_delete", { table: "customers", where: "*" })}
                    disabled={activeFirewallDemo !== null}
                    className="text-left px-2.5 py-1.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-medium hover:bg-rose-100 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>🚫</span> Delete All Records — BLOCKED
                  </button>
                  <button
                    onClick={() => handleFirewallDemo("bypass_guardrails")}
                    disabled={activeFirewallDemo !== null}
                    className="text-left px-2.5 py-1.5 rounded bg-orange-50 border border-orange-200 text-orange-800 font-bold hover:bg-orange-100 transition disabled:opacity-50 flex items-center gap-2 relative overflow-hidden"
                  >
                    <span>🍯</span> Try Bypass — HONEYPOT TRAP
                    {firewallStats.honeypots > 0 && (
                      <span className="ml-auto px-1 py-0.5 bg-orange-600 text-white text-[9px] font-mono rounded">×{firewallStats.honeypots}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleFirewallDemo("customer_export_bulk", { recordScope: 50000, hasPII: true })}
                    disabled={activeFirewallDemo !== null}
                    className="text-left px-2.5 py-1.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-medium hover:bg-rose-100 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <span>🚫</span> Export 50k Customer Records
                  </button>
                </div>
                {activeFirewallDemo && (
                  <div className="text-[10px] font-mono text-[#71ce34] animate-pulse flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#71ce34] animate-ping"></span>
                    Firewall intercepting {activeFirewallDemo}...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* RIGHT PANEL: TEST ARENA & TELEMETRY (WHITE MODE)            */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 flex flex-col min-h-[500px] lg:h-[calc(100vh-56px)] bg-[#FFFFFF] animate-fade-in">
            {/* Arena Sub-Navigation Tabs */}
            <div className="border-b border-[#E6E2DA] px-2 sm:px-4 flex items-center justify-between bg-[#F7F5F0] overflow-x-auto no-scrollbar">
              <div className="flex space-x-1 shrink-0 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { id: "chat", label: "Studio Chat Arena", icon: Bot },
                  ...(isHardwareAgent ? [{ id: "oled", label: "ESP32 OLED Mirror", icon: Cpu }] : []),
                  { id: "trace", label: "Trace Inspector", icon: Layers },
                  {
                    id: "approvals",
                    label: "Approvals Inbox",
                    icon: Lock,
                    badge: agentApprovals.filter((a) => a.status === "pending").length,
                  },
                  {
                    id: "firewall",
                    label: "🔥 Firewall",
                    icon: Shield,
                    badge: firewallStats.honeypots > 0 ? firewallStats.honeypots : 0,
                    badgeColor: "bg-orange-500",
                  },
                  {
                    id: "whatsapp",
                    label: "📱 WhatsApp Agent",
                    icon: MessageSquare,
                    badge: waStatus === "connected" ? "Live" : waStatus === "pairing" ? "Pair" : undefined,
                    badgeColor: waStatus === "connected" ? "bg-emerald-600" : "bg-amber-500",
                  },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = arenaTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setArenaTab(tab.id as any)}
                      className={`flex items-center gap-1.5 py-2.5 sm:py-3 px-2.5 sm:px-3 text-xs font-medium border-b-2 transition-all duration-200 interactive-btn shrink-0 ${
                        active
                          ? "border-[#71ce34] text-[#71ce34] font-bold bg-white"
                          : "border-transparent text-neutral-600 hover:text-black hover:bg-neutral-100/50"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${active ? "text-[#71ce34]" : "text-neutral-500"}`} />
                      <span className="whitespace-nowrap">{tab.label}</span>
                      {tab.badge ? (
                        <span className={`ml-1 px-1.5 py-0.2 text-[9px] font-bold rounded-full text-white animate-pulse-glow ${
                          (tab as any).badgeColor ?? "bg-[#71ce34]"
                        }`}>
                          {tab.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Quick Status Pill */}
              {isHardwareAgent ? (
                <div className="hidden md:flex items-center gap-2.5 text-xs font-mono shrink-0 pl-2">
                  <span className="flex items-center gap-1.5 text-neutral-600">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>Temp:</span>
                    <span
                      className={`font-bold transition-colors ${
                        telemetry.temperature > -10 ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      {telemetry.temperature.toFixed(1)}°C
                    </span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold">
                    S3 ONLINE
                  </span>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2 text-xs font-mono shrink-0 pl-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold">
                    🟢 CLOUD RUNTIME READY
                  </span>
                </div>
              )}
            </div>

            {/* Quick Test Injections Banner */}
            <div className="p-2.5 sm:p-3 border-b border-[#E6E2DA] bg-[#FAF8F5] flex items-center gap-1.5 sm:gap-2 text-xs overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 font-bold mr-1 shrink-0">
                Inject Scenario:
              </span>
              {isHardwareAgent ? (
                <>
                  <button
                    onClick={() => handleSimulate(-18.2, 81.0, false, "Nominal Storage")}
                    className="shrink-0 interactive-btn hover-lift px-2.5 py-1 rounded bg-white hover:bg-neutral-50 text-neutral-800 border border-[#E0DCD4] text-[11px] sm:text-xs font-medium transition shadow-2xs"
                  >
                    ❄️ Nominal (-18.2°C)
                  </button>
                  <button
                    onClick={() => handleSimulate(-14.2, 87.0, false, "Defrost Spike")}
                    className="shrink-0 interactive-btn hover-lift px-2.5 py-1 rounded bg-[#F2FAEE] hover:bg-[#E5F6DE] text-[#71ce34] border border-[#71ce34]/40 text-[11px] sm:text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                  >
                    <Sparkles className="w-3 h-3" /> Defrost Spike (-14.2°C)
                  </button>
                  <button
                    onClick={() => handleSimulate(+2.8, 93.0, false, "Critical Breach")}
                    className="shrink-0 interactive-btn hover-lift px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-[11px] sm:text-xs font-medium transition shadow-2xs"
                  >
                    🚨 Thermal Breach (+2.8°C)
                  </button>
                  <button
                    onClick={() => handleSimulate(-15.0, 92.0, true, "Door Open")}
                    className="shrink-0 interactive-btn hover-lift px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] sm:text-xs font-medium transition shadow-2xs"
                  >
                    🚪 Door Left Open
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() =>
                      handleSendMessage(
                        "Schedule Conflict: I have an overlapping client sync and team standup tomorrow at 2:00 PM. Review priorities and suggest resolution."
                      )
                    }
                    className="shrink-0 interactive-btn hover-lift px-2.5 py-1 rounded bg-white hover:bg-neutral-50 text-neutral-800 border border-[#E0DCD4] text-[11px] sm:text-xs font-medium transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    📅 Schedule Conflict
                  </button>
                  <button
                    onClick={() =>
                      handleSendMessage(
                        "Scan VIP Inbox: Parse unread urgent emails from leadership and draft an executive briefing."
                      )
                    }
                    className="shrink-0 interactive-btn hover-lift px-2.5 py-1 rounded bg-[#F2FAEE] hover:bg-[#E5F6DE] text-[#71ce34] border border-[#71ce34]/40 text-[11px] sm:text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    ✉️ Scan VIP Inbox
                  </button>
                  <button
                    onClick={() =>
                      handleSendMessage(
                        "Daily Agenda: Synthesize my calendar commitments, tasks, and focus time blocks for today."
                      )
                    }
                    className="shrink-0 interactive-btn hover-lift px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] sm:text-xs font-medium transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    📋 Daily Agenda
                  </button>
                  <button
                    onClick={() =>
                      handleSendMessage(
                        "Broadcast Digest: Draft and format a project update summary to send via multi-channel notification."
                      )
                    }
                    className="shrink-0 interactive-btn hover-lift px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 text-[11px] sm:text-xs font-medium transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    🚀 Broadcast Digest
                  </button>
                </>
              )}
            </div>

            {/* Content for Arena Tab 1: Chat Stream */}
            {arenaTab === "chat" && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white">
                {/* Message Log */}
                <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3 sm:space-y-4">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col animate-fade-in ${
                        m.role === "user" ? "items-end" : "items-start"
                      } space-y-1.5`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold">
                          {m.role === "user" ? "You" : m.role === "assistant" ? "Sapiens Agent" : "Hardware Event"}
                        </span>
                      </div>

                      <div
                        className={`p-3 sm:p-3.5 rounded-xl max-w-[92%] sm:max-w-[80%] text-xs leading-relaxed transition-all ${
                          m.role === "user"
                            ? "bg-[#71ce34] text-white shadow-sm font-medium rounded-tr-xs"
                            : m.role === "system"
                            ? "bg-[#F4FBF0] border border-[#71ce34]/30 text-neutral-900 shadow-2xs rounded-tl-xs"
                            : "bg-[#F7F5F0] border border-[#E6E2DA] text-neutral-900 shadow-2xs rounded-tl-xs"
                        }`}
                      >
                        {m.role === "assistant" ? (
                          <AgentVisualRenderer content={m.content} />
                        ) : (
                          <span className="whitespace-pre-wrap">{m.content}</span>
                        )}

                        {/* Collapsible reasoning / step trace */}
                        {m.trace && m.trace.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[#E6E2DA] space-y-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#71ce34] font-bold block">
                              Execution Reasoning &amp; Guardrail Trace:
                            </span>
                            {m.trace.map((step: any, sIdx: number) => (
                              <div
                                key={sIdx}
                                className="p-2.5 rounded bg-white border border-[#E6E2DA] font-mono text-[11px] space-y-0.5 shadow-2xs"
                              >
                                <div className="flex items-center justify-between text-neutral-600">
                                  <span>Step {step.stepNumber}: {step.type}</span>
                                  {step.guardrailDecision && (
                                    <span className="text-emerald-700 font-bold">
                                      GUARD: {step.guardrailDecision.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                {step.content && <p className="text-neutral-800 font-sans">{step.content}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input Bar */}
                <div className="p-2.5 sm:p-4 border-t border-[#E6E2DA] bg-[#FAF8F5]">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder={
                        isHardwareAgent
                          ? `Prompt ${agentName} e.g., 'Evaluate container COLD-01 status at 02:00 UTC'...`
                          : `Prompt ${agentName} e.g., 'Schedule a 30-min sync with team tomorrow at 2 PM'...`
                      }
                      className="flex-1 bg-white border border-[#E0DCD4] rounded-lg px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs text-[#0C0C0D] placeholder:text-neutral-400 focus:outline-none focus:border-[#71ce34] focus:ring-1 focus:ring-[#71ce34]/30 font-mono shadow-xs transition"
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={isRunning}
                      className="px-3 sm:px-4 py-2 sm:py-2.5 bg-[#71ce34] hover:bg-[#62b62b] text-white font-bold text-xs rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 shadow-xs interactive-btn shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{isRunning ? "Running..." : "Send"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Content for Arena Tab 2: ESP32 OLED Mirror */}
            {arenaTab === "oled" && (
              <div className="flex-1 p-4 sm:p-6 flex flex-col items-center justify-center space-y-4 sm:space-y-6 bg-white animate-fade-in overflow-y-auto">
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-bold text-neutral-900 flex items-center justify-center gap-2">
                    <Cpu className="w-4 h-4 text-[#71ce34]" />
                    Physical SSD1306 OLED Mirror (ESP32-S3)
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-md px-2">
                    Live pixel-accurate state rendered on the 128x64 display wired to GPIO 8 (SDA) and GPIO 9 (SCL).
                  </p>
                </div>

                {/* The OLED frame */}
                <div className="w-full max-w-[320px] sm:max-w-[360px] p-3 sm:p-4 rounded-xl bg-[#111319] border-4 border-neutral-800 shadow-2xl transition-transform duration-300 hover:scale-[1.02]">
                  <div className="w-full aspect-[2/1] bg-[#020508] border border-cyan-900/80 rounded p-3 font-mono text-cyan-300 flex flex-col justify-between select-none shadow-[inset_0_0_20px_rgba(0,255,255,0.06)]">
                    <div className="bg-cyan-300 text-black px-1 py-0.5 text-[10px] font-bold flex justify-between">
                      <span>SAPIENS // S3</span>
                      <span>{telemetry.doorOpen ? "ALARM" : "NOMINAL"}</span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl sm:text-3xl font-black">{telemetry.temperature.toFixed(1)} C</span>
                      <span className="text-[10px] border border-cyan-400 px-1 rounded">
                        {telemetry.suppressedByPolicy
                          ? "POLICY"
                          : telemetry.temperature > -10
                          ? "ALERT"
                          : "SAFE"}
                      </span>
                    </div>

                    <div className="text-[10px] text-cyan-400/90 flex justify-between">
                      <span>RH:{telemetry.humidity.toFixed(0)}%</span>
                      <span>Door:{telemetry.doorOpen ? "OPEN" : "CLOSED"}</span>
                    </div>

                    <div className="text-[9px] text-cyan-500 border-t border-cyan-900 pt-0.5 flex justify-between">
                      <span>Tx: 1,842 pkts</span>
                      <span>WIFI OK [COM4]</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-neutral-700 font-mono bg-[#F7F5F0] p-2.5 sm:p-3 rounded border border-[#E6E2DA] text-center max-w-sm">
                  Firmware: <code className="text-[#71ce34] font-bold">src/sapiens_firmware.cpp</code> • Port: COM4
                </div>
              </div>
            )}

            {/* Content for Arena Tab 3: Trace Inspector */}
            {arenaTab === "trace" && (
              <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-4 bg-white animate-fade-in">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Agent Execution &amp; Tool Intercept Log
                </h3>
                <div className="space-y-2.5 font-mono text-xs">
                  {isHardwareAgent ? (
                    <>
                      <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E6E2DA] space-y-1 hover-lift transition-all">
                        <div className="flex items-center justify-between text-[#71ce34] font-bold">
                          <span>TOOL: get_sensor_data()</span>
                          <span className="text-emerald-700">RISK: LOW (APPROVED)</span>
                        </div>
                        <p className="text-neutral-700 break-all">Returned: {JSON.stringify(telemetry)}</p>
                      </div>

                      <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E6E2DA] space-y-1 hover-lift transition-all">
                        <div className="flex items-center justify-between text-[#71ce34] font-bold">
                          <span>TOOL: query_memory()</span>
                          <span className="text-emerald-700">RISK: LOW (APPROVED)</span>
                        </div>
                        <p className="text-neutral-700">
                          Query: &ldquo;defrost spike 02:00 UTC&rdquo; → Matched Learned Policy #1 (96.4% confidence)
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E6E2DA] space-y-1 hover-lift transition-all">
                        <div className="flex items-center justify-between text-[#71ce34] font-bold">
                          <span>TOOL: send_notification()</span>
                          <span className="text-amber-800">RISK: MED (POLICY-GATED)</span>
                        </div>
                        <p className="text-neutral-700">
                          Decision: Held during defrost window; routine log recorded without operator escalation.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E6E2DA] space-y-1 hover-lift transition-all">
                        <div className="flex items-center justify-between text-[#71ce34] font-bold">
                          <span>TOOL: read_calendar()</span>
                          <span className="text-emerald-700">RISK: LOW (APPROVED)</span>
                        </div>
                        <p className="text-neutral-700">
                          Inspect upcoming schedule: Found 1 potential meeting overlap at 14:00. Suggested alternate slot at 15:30.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E6E2DA] space-y-1 hover-lift transition-all">
                        <div className="flex items-center justify-between text-[#71ce34] font-bold">
                          <span>TOOL: read_emails()</span>
                          <span className="text-emerald-700">RISK: LOW (APPROVED)</span>
                        </div>
                        <p className="text-neutral-700">
                          Query: &ldquo;is:unread label:urgent&rdquo; → Parsed 2 high-priority messages from leadership.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E6E2DA] space-y-1 hover-lift transition-all">
                        <div className="flex items-center justify-between text-[#71ce34] font-bold">
                          <span>TOOL: send_notification()</span>
                          <span className="text-amber-800">RISK: MED (GUARDRAIL-GATED)</span>
                        </div>
                        <p className="text-neutral-700">
                          Decision: Drafted digest dispatched to configured channels (WhatsApp / Discord / Telegram).
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Content for Arena Tab 4: Approvals Inbox */}
            {arenaTab === "approvals" && (
              <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-4 bg-white animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                    High-Risk Human Approval Queue
                  </h3>
                  <span className="text-xs text-neutral-500">Gated by Guardrail Engine</span>
                </div>

                <div className="space-y-3">
                  {agentApprovals.map((app) => (
                    <div
                      key={app.id}
                      className="p-3.5 sm:p-4 rounded-lg bg-[#F4FBF0] border border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 text-xs shadow-2xs hover-lift transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-neutral-900">{app.toolName}()</span>
                          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-rose-50 text-rose-700 border border-rose-300 rounded font-bold">
                            HIGH RISK
                          </span>
                        </div>
                        <p className="text-neutral-700">{app.reason}</p>
                      </div>

                      {app.status === "pending" ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleResolveApproval(app.id, "approved")}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center gap-1 transition shadow-xs interactive-btn hover-lift"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleResolveApproval(app.id, "rejected")}
                            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-rose-700 border border-rose-300 rounded flex items-center gap-1 transition shadow-xs interactive-btn hover-lift"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="px-2 py-1 rounded bg-neutral-100 text-[11px] font-mono text-emerald-700 font-bold border border-neutral-300">
                          STATUS: {app.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}

                  {agentApprovals.length === 0 && (
                    <div className="p-8 rounded-lg bg-[#FAF8F5] border border-[#E6E2DA] text-center space-y-2">
                      <Shield className="w-6 h-6 text-[#71ce34] mx-auto" />
                      <h4 className="text-xs font-bold text-neutral-800">No Pending Approvals</h4>
                      <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                        All autonomous operations are within safe parameters. Any high-risk tool execution will automatically pause and queue here for authorization.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content for Arena Tab 5: Firewall Event Feed */}
            {arenaTab === "firewall" && (
              <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-4 bg-white animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-[#71ce34]" />
                    Live Firewall Event Stream
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">LIVE — auto-refreshing</span>
                  </div>
                </div>

                {/* Trust Center Quick Stats */}
                <div className="grid grid-cols-5 gap-2 text-xs">
                  {[
                    { label: "Total", value: firewallStats.totalActions, color: "bg-neutral-50 border-neutral-200 text-neutral-800" },
                    { label: "✅ Allow", value: firewallStats.allowed, color: "bg-emerald-50 border-emerald-200 text-emerald-800" },
                    { label: "⚠️ Hold", value: firewallStats.requireApproval, color: "bg-amber-50 border-amber-200 text-amber-800" },
                    { label: "🚫 Block", value: firewallStats.blocked, color: "bg-rose-50 border-rose-200 text-rose-800" },
                    { label: "🍯 Honey", value: firewallStats.honeypots, color: "bg-orange-50 border-orange-200 text-orange-800" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`p-2 rounded border ${color} text-center`}>
                      <div className="font-mono font-bold text-base">{value}</div>
                      <div className="text-[10px] font-medium">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Trust Score */}
                <div className="p-3 rounded-lg bg-neutral-950 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#71ce34]" /> Agent Trust Score
                    </span>
                    <span className={`text-2xl font-black ${
                      firewallStats.trustScore >= 80 ? "text-emerald-400" :
                      firewallStats.trustScore >= 60 ? "text-amber-400" : "text-rose-400"
                    }`}>{firewallStats.trustScore}%</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        firewallStats.trustScore >= 80 ? "bg-emerald-500" :
                        firewallStats.trustScore >= 60 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${firewallStats.trustScore}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-neutral-400 text-center">
                    {firewallStats.honeypots > 0
                      ? `⚠️ ${firewallStats.honeypots} honeypot(s) detected — trust score penalized`
                      : "✅ No unsafe behavior detected"}
                  </div>
                </div>

                {/* Live Event Feed */}
                <div className="space-y-2 font-mono text-xs">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold">
                    Recent Firewall Decisions
                  </div>
                  {firewallEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className={`p-2.5 rounded-lg border flex items-center gap-3 transition-all hover-lift ${
                        evt.decision === "honeypot"
                          ? "bg-orange-50 border-orange-200"
                          : evt.decision === "block"
                          ? "bg-rose-50 border-rose-200"
                          : evt.decision === "require_approval"
                          ? "bg-amber-50 border-amber-200"
                          : "bg-emerald-50 border-emerald-100"
                      }`}
                    >
                      <span className="text-base shrink-0">
                        {evt.decision === "honeypot" ? "🍯" :
                         evt.decision === "block" ? "🚫" :
                         evt.decision === "require_approval" ? "⚠️" : "✅"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900 truncate">{evt.toolName}()</span>
                          <span className={`px-1.5 py-0.2 text-[9px] rounded font-bold border ${
                            evt.riskScore >= 85 ? "bg-rose-100 text-rose-700 border-rose-300" :
                            evt.riskScore >= 50 ? "bg-amber-100 text-amber-700 border-amber-300" :
                            evt.riskScore >= 25 ? "bg-orange-100 text-orange-700 border-orange-300" :
                            "bg-emerald-100 text-emerald-700 border-emerald-300"
                          }`}>{evt.riskScore}/100</span>
                        </div>
                        {evt.reason && (
                          <div className="text-[10px] text-neutral-500 truncate mt-0.5">{evt.reason}</div>
                        )}
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        evt.decision === "honeypot" ? "bg-orange-200 text-orange-800" :
                        evt.decision === "block" ? "bg-rose-200 text-rose-800" :
                        evt.decision === "require_approval" ? "bg-amber-200 text-amber-800" :
                        "bg-emerald-200 text-emerald-800"
                      }`}>
                        {evt.decision === "require_approval" ? "HOLD" : evt.decision.toUpperCase()}
                      </span>
                    </div>
                  ))}
                  {firewallEvents.length === 0 && (
                    <div className="p-8 rounded-lg bg-[#FAF8F5] border border-[#E6E2DA] text-center space-y-2">
                      <Shield className="w-6 h-6 text-[#71ce34] mx-auto" />
                      <p className="text-xs text-neutral-500">No firewall events yet. Run the demo scenarios to see the firewall in action.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content for Arena Tab 6: WhatsApp Agent Command Center */}
            {arenaTab === "whatsapp" && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                  {/* Top Status & Overview Card */}
                  <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs transition-colors ${
                    waStatus === "connected"
                      ? "bg-emerald-50/70 border-emerald-300"
                      : waStatus === "pairing"
                      ? "bg-amber-50/70 border-amber-300"
                      : "bg-[#FAF8F5] border-[#E6E2DA]"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg text-white ${
                        waStatus === "connected" ? "bg-emerald-600" : waStatus === "pairing" ? "bg-amber-500" : "bg-neutral-700"
                      }`}>
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-neutral-900 text-sm">SAPIENS WhatsApp Agent</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                            waStatus === "connected"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : waStatus === "pairing"
                              ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                              : "bg-neutral-200 text-neutral-700 border-neutral-300"
                          }`}>
                            {waStatus === "connected" ? "● CONNECTED" : waStatus === "pairing" ? "⏳ AWAITING CODE" : "DISCONNECTED"}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-600 mt-0.5">
                          {waStatus === "connected"
                            ? `Active Session linked to ${waLinkedJid || waPhoneNumber || "WhatsApp"}`
                            : waStatus === "pairing"
                            ? "Pairing code generated. Enter on mobile device."
                            : "Connect your personal or business WhatsApp to receive alerts and approve high-risk actions."}
                        </p>
                        {waStatus === "connected" && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-900 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md">
                              🔒 Policy: Owner-Only (+91 96770 54449)
                            </span>
                            <span className="text-neutral-600 text-[10px]">
                              Zero-trust active: Only the master owner can dispatch commands. Others are blocked & logged.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={fetchWhatsAppStatus}
                        className="p-1.5 rounded border border-[#E0DCD4] bg-white hover:bg-neutral-50 text-neutral-700 text-xs flex items-center gap-1 transition"
                        title="Refresh WhatsApp status"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      {waStatus === "connected" ? (
                        <button
                          onClick={handleWhatsAppLogout}
                          disabled={waIsLoading}
                          className="px-3 py-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowChannelsModal(true)}
                          className="px-3 py-1.5 rounded bg-[#71ce34] hover:bg-[#62b82c] text-white text-xs font-bold transition flex items-center gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Pair Device</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* PAIRING CONSOLE (Visible when not connected or pairing) */}
                  {waStatus !== "connected" && (
                    <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E2DA] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-[#71ce34]" /> Link WhatsApp via Phone Number &amp; Pairing Code
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">No QR Code Scanning Needed</span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Phone number e.g. +91 98765 43210"
                          value={waPhoneNumber}
                          onChange={(e) => setWaPhoneNumber(e.target.value)}
                          className="flex-1 bg-white border border-[#E0DCD4] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#71ce34]"
                        />
                        <button
                          onClick={() => handleStartWhatsAppPairing()}
                          disabled={waIsLoading}
                          className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
                        >
                          {waIsLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Key className="w-3.5 h-3.5 text-[#71ce34]" />
                          )}
                          <span>Request Pairing Code</span>
                        </button>
                      </div>

                      {waPairingCode && waStatus === "pairing" && (
                        <div className="p-4 rounded-xl bg-neutral-900 text-white space-y-3 shadow-md border border-neutral-700 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-[#71ce34] font-bold">
                              🔑 Your 8-Digit Pairing Code:
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">Expires in ~2 mins</span>
                          </div>

                          <div className="flex items-center justify-center gap-4 py-2.5 bg-neutral-950 rounded-lg border border-neutral-800">
                            <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-[#71ce34]">
                              {waPairingCode}
                            </span>
                            <button
                              onClick={copyPairingCode}
                              className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white transition flex items-center gap-1.5 text-xs font-mono"
                            >
                              {waCopied ? <Check className="w-4 h-4 text-[#71ce34]" /> : <Copy className="w-4 h-4" />}
                              <span>{waCopied ? "Copied" : "Copy"}</span>
                            </button>
                          </div>

                          <div className="p-3 bg-neutral-800/60 rounded-lg text-xs space-y-1 text-neutral-300">
                            <p className="font-bold text-white mb-1">Steps on Mobile Device:</p>
                            <p>1. Open WhatsApp &gt; <b>Settings / Menu (⋮)</b> &gt; <b>Linked Devices</b></p>
                            <p>2. Tap <b>Link a Device</b>, then select <b>"Link with phone number instead"</b> at the bottom</p>
                            <p>3. Enter the code <code className="text-[#71ce34] font-bold font-mono">{waPairingCode}</code></p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* LIVE WHATSAPP MESSAGE STREAM */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#71ce34]" /> Live WhatsApp Activity Feed
                      </h4>
                      <span className="text-[10px] font-mono text-neutral-500">
                        {waMessages.length} event{waMessages.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-[380px] overflow-y-auto">
                      {waMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-xl border text-xs space-y-1 transition-all animate-fade-in ${
                            msg.direction === "inbound"
                              ? "bg-white border-neutral-200 text-neutral-900 mr-4"
                              : "bg-[#F4FBF0] border-[#71ce34]/30 text-neutral-900 ml-4"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold font-mono text-[10px] flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                msg.direction === "inbound" ? "bg-sky-500" : "bg-[#71ce34]"
                              }`}></span>
                              {msg.direction === "inbound" ? `📱 ${msg.senderName}` : "🛡️ SAPIENS Sentinel"}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-400">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed text-neutral-800 text-[11px] font-mono">
                            {msg.text}
                          </p>
                        </div>
                      ))}

                      {waMessages.length === 0 && (
                        <div className="p-8 rounded-xl bg-[#FAF8F5] border border-[#E6E2DA] text-center space-y-2">
                          <MessageCircle className="w-8 h-8 text-neutral-400 mx-auto" />
                          <p className="font-bold text-neutral-700 text-xs">No WhatsApp messages yet</p>
                          <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                            When paired, any messages received on your WhatsApp number will trigger SAPIENS Agent reasoning, and outbound breach alerts will be mirrored here.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Custom Dispatch Console */}
                <div className="p-3 sm:p-4 border-t border-[#E6E2DA] bg-[#FAF8F5] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-600">
                    <span>Direct WhatsApp Dispatcher</span>
                    <span className="flex items-center gap-1.5 font-bold">
                      <span className="text-neutral-500">To:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-[10px]">
                        {waPhoneNumber || (waLinkedJid ? "+" + waLinkedJid.split(":")[0].replace(/[^0-9]/g, "") : whatsAppRecipient)}
                      </span>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type message or alert to dispatch to WhatsApp..."
                      value={waCustomMessage}
                      onChange={(e) => setWaCustomMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendWhatsAppCustom()}
                      disabled={waStatus !== "connected"}
                      className="flex-1 bg-white border border-[#E0DCD4] rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#71ce34] disabled:bg-neutral-100 disabled:text-neutral-400"
                    />
                    <button
                      onClick={handleSendWhatsAppCustom}
                      disabled={waIsLoading || waStatus !== "connected" || !waCustomMessage.trim()}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-300 text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW 2: SAPIENS HERO LANDING SHOWCASE                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === "showcase" && (
        <div className="flex-1 bg-[#FAF8F5] text-[#0C0C0D] py-8 sm:py-14 px-4 sm:px-8 lg:px-16 space-y-16 sm:space-y-20 selection:bg-[#0066FF] selection:text-white animate-fade-in">
          <div className="max-w-6xl mx-auto space-y-16 sm:space-y-20">

            {/* 1. HERO SECTION */}
            <div className="space-y-6 text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0066FF]/10 border border-[#0066FF]/20 text-[#0066FF] text-xs font-mono font-bold tracking-widest uppercase">
                <Sparkles className="w-3.5 h-3.5" /> SAPIENS STUDIO
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-sapiens-display tracking-tight text-[#0C0C0D] leading-[1.08]">
                Your one-stop platform for AI automation.
              </h1>

              <p className="text-xl sm:text-2xl text-neutral-800 font-medium max-w-3xl mx-auto leading-snug">
                Build, connect, automate, and deploy AI agents — without the complexity.
              </p>

              <p className="text-neutral-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                Create powerful workflow automations in minutes by connecting the tools and services you already use. Bring your own API keys or start instantly with supported platform free tiers.
              </p>

              <div className="pt-2">
                <span className="inline-block text-xs sm:text-sm font-mono font-bold text-[#0C0C0D] bg-neutral-100 px-3.5 py-1.5 rounded-md border border-[#E6E2DA]">
                  Build fast. Deploy faster. Stay protected.
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                <a
                  href="/agents/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-lg bg-black hover:bg-neutral-900 text-white font-bold text-sm shadow-xl transition inline-flex items-center gap-2 interactive-btn hover-lift"
                >
                  <Plus className="w-4 h-4" /> Build Your Agent →
                </a>
                <button
                  onClick={() => setViewMode("builder")}
                  className="px-6 py-3.5 rounded-lg bg-white hover:bg-neutral-50 text-[#0C0C0D] border border-[#D5D0C5] font-bold text-sm shadow-sm transition inline-flex items-center gap-2 interactive-btn hover-lift"
                >
                  <LayoutGrid className="w-4 h-4 text-[#0066FF]" /> Explore Automations
                </button>
              </div>
            </div>

            {/* 2. CONNECT EVERYTHING YOU USE (SLIDESHOW MARQUEE) */}
            <div className="space-y-6">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <h2 className="text-2xl sm:text-3xl font-sapiens-display tracking-tight text-[#0C0C0D]">
                  Connect everything you use
                </h2>
                <p className="text-base sm:text-lg font-medium text-neutral-800">
                  Your tools. Your workflows. One platform.
                </p>
                <p className="text-xs sm:text-sm text-neutral-600">
                  Connect your favourite integrations and let SAPIENS orchestrate them into intelligent workflows.
                </p>
              </div>

              {/* Moving Integration Slideshow */}
              <div className="relative overflow-hidden py-4 border-y border-[#E6E2DA] bg-white/70 backdrop-blur-xs rounded-2xl shadow-xs">
                <div className="flex animate-marquee gap-3.5">
                  {[...INTEGRATIONS_SHOWCASE, ...INTEGRATIONS_SHOWCASE, ...INTEGRATIONS_SHOWCASE].map((item, idx) => (
                    <div
                      key={`${item.name}-${idx}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-[#E6E2DA] shadow-xs hover:shadow-md hover:border-[#0066FF]/40 transition-all shrink-0 hover-lift group cursor-default"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#FAF8F5] border border-[#EAE6DE] group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-[#0C0C0D] flex items-center gap-1.5">
                          {item.name}
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-semibold">
                            {item.badge}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono">{item.category}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-center text-xs font-mono text-neutral-400">
                Gmail → Slack → WhatsApp → Google Sheets → Notion → GitHub → PostgreSQL → REST APIs → Webhooks → ESP32
              </p>
            </div>

            {/* 3. BUILD AN AGENT IN UNDER A MINUTE */}
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl font-sapiens-display tracking-tight text-[#0C0C0D]">
                  Build an agent in under a minute
                </h2>
                <p className="text-neutral-700 text-base font-medium">
                  Describe what you want. SAPIENS builds the workflow.
                </p>
              </div>

              <div className="sapiens-card-blue p-6 sm:p-8 rounded-2xl shadow-xl space-y-6 hover-lift text-white">
                {/* Workflow Diagram */}
                <div className="bg-black/25 backdrop-blur-md rounded-xl p-5 sm:p-7 border border-white/15 space-y-4">
                  <div className="text-xs font-mono font-bold tracking-wider text-white/80 uppercase">
                    Execution Flow Architecture
                  </div>

                  {/* Flow Diagram Interactive Cards */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center">
                    {/* Goal */}
                    <div className="w-full md:flex-1 p-4 rounded-lg bg-white text-[#0C0C0D] shadow-md border border-white/20">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-bold">Initiator</div>
                      <div className="text-base font-bold flex items-center justify-center gap-1.5 mt-0.5">
                        <Sparkles className="w-4 h-4 text-[#0066FF]" /> Your Goal
                      </div>
                      <div className="text-[11px] text-neutral-600 mt-1">Prompt, webhook, or trigger</div>
                    </div>

                    <ArrowRight className="w-5 h-5 text-white shrink-0 hidden md:block" />
                    <div className="text-white text-xs md:hidden font-mono">↓</div>

                    {/* Agent */}
                    <div className="w-full md:flex-1 p-4 rounded-lg bg-black/40 text-white shadow-md border border-white/25">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-blue-300 font-bold">Orchestrator</div>
                      <div className="text-base font-bold flex items-center justify-center gap-1.5 mt-0.5">
                        <Bot className="w-4 h-4 text-cyan-400" /> AI Agent
                      </div>
                      <div className="text-[11px] text-white/80 mt-1">SAPIENS reasoning engine</div>
                    </div>

                    <ArrowRight className="w-5 h-5 text-white shrink-0 hidden md:block" />
                    <div className="text-white text-xs md:hidden font-mono">↓</div>

                    {/* Pipeline Sequence */}
                    <div className="w-full md:flex-2 p-4 rounded-lg bg-white/15 backdrop-blur-sm text-white shadow-md border border-white/20">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">Dynamic Pipeline</div>
                      <div className="flex items-center justify-center gap-2 mt-1 font-mono text-xs sm:text-sm font-bold flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-white/20">Plan</span>
                        <span>→</span>
                        <span className="px-2 py-0.5 rounded bg-white/20">Tools</span>
                        <span>→</span>
                        <span className="px-2 py-0.5 rounded bg-white/20">Actions</span>
                        <span>→</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-400/30 text-emerald-200">Result</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6 Features Checklist Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 pt-2">
                  {[
                    "Visual agent builder",
                    "Pre-built workflow components",
                    "API & tool integrations",
                    "Custom instructions",
                    "Multi-step execution",
                    "Test before deployment",
                  ].map((feat, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 p-3 rounded-lg bg-white/10 backdrop-blur-xs border border-white/15 text-xs sm:text-sm font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/15 flex items-center justify-between flex-wrap gap-3">
                  <span className="text-sm font-bold text-white tracking-wide">
                    From idea to working automation in minutes.
                  </span>
                  <a
                    href="/agents/create"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded bg-white text-[#0066FF] hover:bg-neutral-100 font-bold text-xs uppercase tracking-wider shadow transition inline-flex items-center gap-1.5"
                  >
                    Open Visual Builder <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* 4. BRING YOUR OWN KEYS. OR START FREE. */}
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl font-sapiens-display tracking-tight text-[#0C0C0D]">
                  Bring Your Own Keys. Or Start Free.
                </h2>
                <p className="text-neutral-600 text-sm sm:text-base">
                  Use your own API keys for maximum flexibility and control, or use available <strong className="text-[#0C0C0D]">platform-managed/free-tier credentials</strong> to get started without complicated setup.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* BYOK Card */}
                <div className="p-6 rounded-2xl bg-white border border-[#E6E2DA] shadow-sm hover:shadow-md transition-all space-y-4 hover-lift">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0C0C0D]">Bring Your Own Key (BYOK)</h3>
                    <p className="text-xs sm:text-sm text-neutral-600 mt-1 leading-relaxed">
                      Connect your existing Mistral, OpenAI, Anthropic, Groq, or OpenRouter keys. You retain 100% ownership of your limits, rate tiers, and private quotas.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#EAE6DE] font-mono text-xs text-neutral-700 flex items-center justify-between">
                    <span>Keys Stored Encrypted</span>
                    <span className="text-emerald-600 font-bold">CLIENT PRIVACY</span>
                  </div>
                </div>

                {/* Free Tier Card */}
                <div className="p-6 rounded-2xl bg-white border border-[#E6E2DA] shadow-sm hover:shadow-md transition-all space-y-4 hover-lift">
                  <div className="w-10 h-10 rounded-xl bg-[#0066FF]/10 border border-[#0066FF]/20 flex items-center justify-center text-[#0066FF]">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0C0C0D]">Platform-Managed / Start Free</h3>
                    <p className="text-xs sm:text-sm text-neutral-600 mt-1 leading-relaxed">
                      Zero configuration required. Spin up automated agent workflows instantly using free platform allowances without managing credit balances or third-party accounts.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#EAE6DE] font-mono text-xs text-neutral-700 flex items-center justify-between">
                    <span>Instant Spin-Up</span>
                    <span className="text-[#0066FF] font-bold">NO CREDIT CARD REQ</span>
                  </div>
                </div>
              </div>

              {/* Tag Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 py-2">
                {["BYOK", "Flexible Models", "Multiple Integrations", "No Lock-In"].map((tag, i) => (
                  <span
                    key={i}
                    className="px-3.5 py-1.5 rounded-full bg-white border border-[#D5D0C5] text-xs font-mono font-bold text-[#0C0C0D] shadow-xs"
                  >
                    • {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 5. GUARDRAILS BUILT INTO EVERY WORKFLOW */}
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl font-sapiens-display tracking-tight text-[#0C0C0D]">
                  Guardrails built into every workflow
                </h2>
                <p className="text-lg font-medium text-neutral-800">
                  Automation shouldn't mean losing control.
                </p>
                <p className="text-xs sm:text-sm text-neutral-600">
                  SAPIENS evaluates agent actions before they reach your connected systems.
                </p>
              </div>

              {/* Guardrails Decision Card */}
              <div className="sapiens-card-orange p-6 sm:p-8 rounded-2xl shadow-xl space-y-6 hover-lift">
                <div className="bg-white rounded-xl p-5 sm:p-7 border border-neutral-200 shadow-md space-y-6">
                  {/* Decision Tree Visual */}
                  <div className="flex flex-col items-center text-center space-y-3">
                    {/* Agent Action Node */}
                    <div className="px-6 py-3 rounded-lg bg-neutral-900 text-white font-mono text-xs sm:text-sm font-bold tracking-wider shadow-sm">
                      AGENT ACTION
                    </div>

                    <div className="text-neutral-400 font-mono text-xs">↓</div>

                    {/* Risk Check Node */}
                    <div className="px-6 py-3 rounded-lg bg-[#0066FF] text-white font-mono text-xs sm:text-sm font-bold tracking-wider shadow-sm flex items-center gap-2">
                      <Shield className="w-4 h-4" /> RISK CHECK
                    </div>

                    <div className="text-neutral-400 font-mono text-xs">↓</div>

                    {/* Outcome Branches */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-1">
                      {/* ALLOW */}
                      <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-1 hover-lift transition">
                        <div className="font-mono text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ALLOW
                        </div>
                        <p className="text-[11px] text-emerald-900 font-medium leading-tight">
                          Low-risk queries &amp; read actions execute automatically with sub-second response.
                        </p>
                      </div>

                      {/* APPROVAL */}
                      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-center space-y-1 hover-lift transition">
                        <div className="font-mono text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center justify-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-amber-600" /> APPROVAL
                        </div>
                        <p className="text-[11px] text-amber-900 font-medium leading-tight">
                          State mutations, emails &amp; external updates pause for human operator review.
                        </p>
                      </div>

                      {/* BLOCK */}
                      <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-center space-y-1 hover-lift transition">
                        <div className="font-mono text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center justify-center gap-1">
                          <XCircle className="w-4 h-4 text-rose-600" /> BLOCK
                        </div>
                        <p className="text-[11px] text-rose-900 font-medium leading-tight">
                          Violations, unauthorized tools &amp; prompt injection attempts are rejected immediately.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guardrail Policy Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-white font-mono text-xs font-bold">
                  {[
                    "Permissions",
                    "Risk Controls",
                    "Human Approval",
                    "Policy Enforcement",
                    "Audit Logs",
                  ].map((item, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded bg-black/25 backdrop-blur-xs border border-white/20"
                    >
                      • {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 6. TRUST EVERY ACTION (7 PILLARS) */}
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl font-sapiens-display tracking-tight text-[#0C0C0D]">
                  Trust every action
                </h2>
                <p className="text-lg font-medium text-neutral-800">
                  Know what your agents are doing.
                </p>
                <p className="text-xs sm:text-sm text-neutral-600">
                  SAPIENS provides complete visibility into agent execution with:
                </p>
              </div>

              {/* 7 Pillars Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    icon: "🔐",
                    title: "Permission controls",
                    desc: "Fine-grained, tool-by-tool execution permissions with strict read/write boundaries.",
                  },
                  {
                    icon: "🛡️",
                    title: "Action-level guardrails",
                    desc: "Deterministic safety assertions applied at runtime before invoking external APIs.",
                  },
                  {
                    icon: "👤",
                    title: "Human-in-the-loop approvals",
                    desc: "Quarantine high-impact actions for operator review via web interface or chat channels.",
                  },
                  {
                    icon: "🧪",
                    title: "Evaluation harnesses",
                    desc: "Automated regression testing suites to benchmark agent accuracy and drift resistance.",
                  },
                  {
                    icon: "🍯",
                    title: "Honeypots for unsafe behaviour",
                    desc: "Active canaries and traps detecting jailbreaks, prompt injections, and rogue tool use.",
                  },
                  {
                    icon: "📋",
                    title: "Execution logs & audit trails",
                    desc: "Immutable chronological trace records of every thought, tool invocation, and API payload.",
                  },
                  {
                    icon: "🚨",
                    title: "Real-time security events",
                    desc: "Instant notifications and circuit breaker trips upon any unauthorized attempt.",
                  },
                ].map((pillar, idx) => (
                  <div
                    key={idx}
                    className={`p-5 rounded-xl bg-white border border-[#E6E2DA] shadow-xs hover:shadow-md hover:border-[#0066FF]/40 transition-all space-y-2 hover-lift ${
                      idx === 6 ? "sm:col-span-2 lg:col-span-1" : ""
                    }`}
                  >
                    <div className="text-2xl">{pillar.icon}</div>
                    <h3 className="text-sm font-bold text-[#0C0C0D] flex items-center gap-1.5">
                      {pillar.title}
                    </h3>
                    <p className="text-xs text-neutral-600 leading-relaxed">{pillar.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. CLOSING CTA BANNER */}
            <div className="sapiens-card-orange p-6 sm:p-10 md:p-12 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 hover-lift">
              <div className="space-y-2 text-center md:text-left">
                <div className="text-xs font-mono uppercase tracking-widest text-white/90 font-bold">
                  SAPIENS STUDIO
                </div>
                <h2 className="text-2xl sm:text-4xl font-sapiens-display font-bold text-white tracking-tight">
                  Automate with confidence.
                </h2>
                <p className="text-white/95 text-xs sm:text-sm italic font-medium">
                  Build fast. Deploy faster. Stay in control.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
                <a
                  href="/agents/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-lg bg-white hover:bg-neutral-100 text-[#0C0C0D] font-bold text-xs uppercase tracking-wider shadow-md transition inline-flex items-center gap-1.5 interactive-btn hover-lift"
                >
                  <Plus className="w-3.5 h-3.5" /> Build Your Agent →
                </a>
                <button
                  onClick={() => setViewMode("builder")}
                  className="px-5 py-3 rounded-lg bg-black hover:bg-neutral-900 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition interactive-btn hover-lift"
                >
                  Launch Studio Builder
                </button>
              </div>
            </div>

            {/* Footer with Iconic Sapiens Logo */}
            <footer className="pt-12 pb-8 border-t border-[#E6E2DA] flex flex-col items-center justify-center space-y-3 text-center">
              <Image
                src="/logo.png"
                alt="Sapiens Logo"
                width={48}
                height={48}
                className="w-12 h-12 object-contain hover:scale-105 transition-transform duration-300"
              />
              <div className="text-xs text-neutral-600 font-mono font-bold tracking-wider">
                SAPIENS STUDIO • Workflow Automation &amp; Guardrail AI Platform
              </div>
              <p className="text-[11px] text-neutral-400 font-mono">
                Build fast. Deploy faster. Stay protected.
              </p>
            </footer>

          </div>
        </div>
      )}
    </div>
  );
}
