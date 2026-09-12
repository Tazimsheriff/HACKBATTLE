"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Activity,
  Brain,
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
} from "lucide-react";

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

export default function SapiensAgentStudio() {
  // Top view mode: "builder" (Sapiens Agent Builder Studio) vs "showcase" (Sapiens Frontier Landing)
  const [viewMode, setViewMode] = useState<"builder" | "showcase">("builder");

  // Modals state
  const [showChannelsModal, setShowChannelsModal] = useState(false);
  const [channelTab, setChannelTab] = useState<"whatsapp" | "discord" | "telegram">("whatsapp");
  const [channelToast, setChannelToast] = useState<string | null>(null);

  // Agents list
  const [agentsList, setAgentsList] = useState<AgentItem[]>([
    {
      id: "omnivore-cold-chain",
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
  ]);
  const [selectedAgentId, setSelectedAgentId] = useState("omnivore-cold-chain");


  // Channels Form
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [whatsAppRecipient, setWhatsAppRecipient] = useState("+1 555-0199");
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Builder Config State (synced with selectedAgent)
  const currentAgent = agentsList.find((a) => a.id === selectedAgentId) || agentsList[0];
  const [agentName, setAgentName] = useState(currentAgent.name);
  const [agentDesc, setAgentDesc] = useState(currentAgent.description || "");
  const [selectedModel, setSelectedModel] = useState(currentAgent.model);
  const [systemPrompt, setSystemPrompt] = useState(currentAgent.instructions || "");
  const [studioApiKey, setStudioApiKey] = useState("");
  const [showStudioApiKey, setShowStudioApiKey] = useState(false);
  const [enabledTools, setEnabledTools] = useState({
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
        localStorage.setItem("omnivore_active_agent_id", ag.id);
      }
    }
  }, [selectedAgentId, agentsList]);

  // Switch active agent
  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    if (typeof window !== "undefined") {
      localStorage.setItem("omnivore_active_agent_id", agentId);
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
  const [arenaTab, setArenaTab] = useState<"chat" | "oled" | "trace" | "approvals">("chat");

  // Chat / Runner State
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<
    Array<{
      role: "user" | "assistant" | "system";
      content: string;
      trace?: any[];
      policiesUsed?: string;
    }>
  >([
    {
      role: "assistant",
      content:
        "SAPIENS Cold-Chain Agent initialized. Connected to ESP32-S3 (COM4) on-device telemetry. Learned Policy #1 (Defrost Suppression) is active in system context.",
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
              const local = JSON.parse(localStorage.getItem("omnivore_custom_agents") || "[]");
              if (local.length) {
                const apiIds = new Set(d.agents.map((a: any) => a.id));
                const extra = local.filter((a: any) => !apiIds.has(a.id));
                list = [...extra, ...d.agents];
              }
            } catch (e) {}
          }
          setAgentsList(list);

          // Auto-select target agent if present in URL query or localStorage
          let targetId = selectedAgentId;
          if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            const queryId = urlParams.get("agentId");
            const storedId = localStorage.getItem("omnivore_active_agent_id");
            if (queryId && list.some((a: any) => a.id === queryId)) {
              targetId = queryId;
            } else if (storedId && list.some((a: any) => a.id === storedId)) {
              targetId = storedId;
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
            }
          }
        }
      }
    } catch (e) {
      console.warn("API state fetch fallback:", e);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const queryId = urlParams.get("agentId");
      const storedId = localStorage.getItem("omnivore_active_agent_id");
      if (queryId) setSelectedAgentId(queryId);
      else if (storedId) setSelectedAgentId(storedId);
    }
    fetchData();
    const handleFocus = () => {
      fetchData();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
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
          content: "Execution completed in fallback demo mode. Cold-chain status nominal.",
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
    <div className="min-h-screen bg-[#FAF8F5] text-[#0C0C0D] flex flex-col selection:bg-[#FA500F] selection:text-white font-sans">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* TOP NOTIFICATION TOAST                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {channelToast && (
        <div className="fixed top-3 right-4 z-50 px-4 py-2 rounded bg-neutral-900 text-white text-xs shadow-xl border border-neutral-700 flex items-center gap-2 animate-bounce">
          <span>{channelToast}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SAPIENS TOP NAVIGATION BAR                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-[#E6E2DA] bg-[#FAF8F5]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo & Agent Switcher */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setViewMode("showcase")}
            >
              {/* Sapiens Iconic Pixel Glyph */}
              <div className="grid grid-cols-3 gap-0.5 w-6 h-6 p-0.5 bg-[#FA500F] rounded-xs shadow-md shadow-[#FA500F]/20">
                <div className="bg-white"></div>
                <div className="bg-white"></div>
                <div className="bg-white"></div>
                <div className="bg-white"></div>
                <div className="bg-white"></div>
                <div className="bg-transparent"></div>
                <div className="bg-transparent"></div>
                <div className="bg-white"></div>
                <div className="bg-white"></div>
              </div>
              <span className="font-extrabold text-base tracking-tight text-[#0C0C0D] flex items-center gap-1">
                SAPIENS <span className="text-[#FA500F]">STUDIO</span>
              </span>
            </div>

            {/* Agent Switcher Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#EFECE6] px-2.5 py-1 rounded border border-[#E0DCD4] text-xs">
              <span className="text-neutral-500 font-mono text-[10px]">AGENT:</span>
              <select
                value={selectedAgentId}
                onChange={(e) => handleSelectAgent(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#0C0C0D] focus:outline-none cursor-pointer"
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
                className="ml-1.5 p-1 rounded bg-[#FA500F] hover:bg-[#ff6422] text-white transition flex items-center justify-center"
                title="Create New Agent (Opens Studio in New Window)"
              >
                <Plus className="w-3 h-3" />
              </a>
            </div>

            {/* Channels Button (WhatsApp, Discord, Telegram) */}
            <button
              onClick={() => setShowChannelsModal(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded bg-white hover:bg-neutral-50 text-xs font-bold text-[#0C0C0D] border border-[#E0DCD4] shadow-2xs transition"
            >
              <Share2 className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Connect Channels</span>
              <span className="flex items-center gap-1 ml-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] text-neutral-500 font-mono">3 Available</span>
              </span>
            </button>
          </div>

          {/* Right Actions & Status */}
          <div className="flex items-center gap-3">
            {/* View Mode Switcher Pill */}
            <div className="flex items-center rounded-md bg-[#EFECE6] p-0.5 border border-[#E0DCD4] text-xs">
              <button
                onClick={() => setViewMode("builder")}
                className={`px-3 py-1 rounded font-medium transition ${
                  viewMode === "builder"
                    ? "bg-[#FA500F] text-white shadow-sm font-bold"
                    : "text-neutral-600 hover:text-[#0C0C0D]"
                }`}
              >
                Studio Builder
              </button>
              <button
                onClick={() => setViewMode("showcase")}
                className={`px-3 py-1 rounded font-medium transition ${
                  viewMode === "showcase"
                    ? "bg-[#FA500F] text-white shadow-sm font-bold"
                    : "text-neutral-600 hover:text-[#0C0C0D]"
                }`}
              >
                Overview
              </button>
            </div>

            {/* Reset Demo Button */}
            <button
              onClick={async () => {
                await fetch("/api/demo/seed", { method: "POST" });
                fetchData();
              }}
              className="px-2.5 py-1 text-xs text-neutral-700 hover:text-black bg-white border border-[#E0DCD4] rounded shadow-2xs hover:bg-neutral-50 flex items-center gap-1.5 transition"
              title="Reset initial telemetry, defrost false alarms, and policies"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Demo
            </button>
          </div>
        </div>
      </header>



      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: CONNECT CHANNELS (WHATSAPP, DISCORD, TELEGRAM)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showChannelsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E6E2DA] max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#E6E2DA] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0C0C0D] flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#FA500F]" />
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
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-bold text-emerald-800">Baileys WhatsApp Socket Ready</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700">Auto-Approval Enabled</span>
                </div>

                <div>
                  <label className="font-bold text-neutral-800 block mb-1">Target Phone Number / Group</label>
                  <input
                    type="text"
                    value={whatsAppRecipient}
                    onChange={(e) => setWhatsAppRecipient(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded p-2 text-xs font-mono focus:outline-none focus:border-[#FA500F] focus:bg-white"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    When high-risk actions are quarantined, operators can reply <code className="font-bold text-[#FA500F]">APPROVE</code> directly via WhatsApp.
                  </p>
                </div>

                <div className="p-3 rounded bg-[#FAF8F5] border border-[#E6E2DA] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-neutral-900 block">Simulate Outbound WhatsApp Alert</span>
                    <span className="text-[11px] text-neutral-500">Sends cold-chain temperature telemetry card</span>
                  </div>
                  <button
                    onClick={() => handleTestChannel("whatsapp")}
                    disabled={isSendingTest}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                  >
                    Send Test Alert
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
                    className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded p-2 text-xs font-mono focus:outline-none focus:border-[#FA500F] focus:bg-white"
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
                      className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded p-2 text-xs font-mono focus:outline-none focus:border-[#FA500F] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-800 block mb-1">Chat ID</label>
                    <input
                      type="text"
                      placeholder="@channel or -100123..."
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded p-2 text-xs font-mono focus:outline-none focus:border-[#FA500F] focus:bg-white"
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
                className="px-4 py-2 bg-[#FA500F] hover:bg-[#ff6422] text-white font-bold text-xs rounded transition shadow-xs"
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
          <div className="lg:col-span-5 p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-56px)] bg-[#FAF8F5]">
            {/* Header: Agent Identity */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#FA500F] font-bold flex items-center gap-1.5">
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
                  className="w-full bg-transparent text-xl sm:text-2xl font-black tracking-tight text-[#0C0C0D] border-b border-[#E6E2DA] focus:border-[#FA500F] focus:outline-none pb-1"
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
                <span className="text-[10px] font-mono text-[#FA500F] font-semibold">Low Latency Tool Calling</span>
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-[#F7F5F0] border border-[#E6E2DA] text-xs text-[#0C0C0D] rounded p-2 focus:outline-none focus:border-[#FA500F] font-mono"
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
                  <Terminal className="w-3.5 h-3.5 text-[#FA500F]" />
                  Instructions (System Prompt)
                </label>
                <span className="text-[10px] font-mono text-neutral-500">
                  {policies.length} Learned Policies Injected
                </span>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
                className="w-full bg-[#F7F5F0] border border-[#E6E2DA] text-xs text-neutral-800 font-mono rounded p-2.5 focus:outline-none focus:border-[#FA500F] leading-relaxed resize-none focus:bg-white"
              />

              {/* Injected Policies Pill */}
              <div className="p-2.5 rounded bg-[#FFF7F2] border border-[#FA500F]/30 space-y-1">
                <span className="text-[10px] font-bold text-[#FA500F] uppercase tracking-wider block">
                  ⚡ Dynamically Injected Learned Policy:
                </span>
                {policies.slice(0, 1).map((p) => (
                  <div key={p.id} className="text-xs text-neutral-800 font-mono">
                    <span className="text-emerald-700 font-bold">&ldquo;{p.title}&rdquo;</span> — {p.action}
                  </div>
                ))}
              </div>
            </div>

            {/* Tools & Capabilities Checklist */}
            <div className="sapiens-card p-3.5 space-y-3">
              <label className="text-xs font-bold text-neutral-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-[#FA500F]" />
                  Tool Capabilities &amp; Risk Registry
                </span>
                <span className="text-[10px] text-neutral-500">Eve SDK Tools</span>
              </label>

              <div className="space-y-2 text-xs">
                {[
                  {
                    key: "read_emails",
                    name: "read_emails()",
                    desc: "Scan and parse Gmail inbox messages",
                    risk: "LOW",
                    riskColor: "bg-emerald-50 text-emerald-700 border-emerald-300",
                  },
                  {
                    key: "web_search",
                    name: "web_search()",
                    desc: "Live web search & research lookup",
                    risk: "LOW",
                    riskColor: "bg-emerald-50 text-emerald-700 border-emerald-300",
                  },
                  {
                    key: "get_sensor_data",
                    name: "get_sensor_data()",
                    desc: "Reads live ESP32 temperature & humidity via I2C",
                    risk: "LOW",
                    riskColor: "bg-emerald-50 text-emerald-700 border-emerald-300",
                  },
                  {
                    key: "query_memory",
                    name: "query_memory()",
                    desc: "Retrieves episodic memories & approved policies",
                    risk: "LOW",
                    riskColor: "bg-emerald-50 text-emerald-700 border-emerald-300",
                  },
                  {
                    key: "send_notification",
                    name: "send_notification()",
                    desc: "Multi-channel alerts (Telegram / WhatsApp / Discord)",
                    risk: "MED",
                    riskColor: "bg-amber-50 text-amber-800 border-amber-300",
                  },
                  {
                    key: "emergency_compressor_cutoff",
                    name: "emergency_compressor_cutoff()",
                    desc: "Thermal overload relay trip. STRICT APPROVAL GATED.",
                    risk: "HIGH",
                    riskColor: "bg-rose-50 text-rose-700 border-rose-300",
                  },
                ].map((tool) => (
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
                      checked={(enabledTools as any)[tool.key]}
                      onChange={(e) =>
                        setEnabledTools({ ...enabledTools, [tool.key]: e.target.checked })
                      }
                      className="accent-[#FA500F] w-4 h-4 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Continuous Learning & Policy Promotion */}
            <div className="sapiens-card p-3.5 space-y-3 border-[#FA500F]/30 bg-[#FFF9F5]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-[#FA500F]" />
                  Self-Learning Loop &amp; Candidate Review
                </span>
                <button
                  onClick={handleReflect}
                  disabled={isReflecting}
                  className="text-[10px] font-bold px-2.5 py-1 rounded bg-[#FA500F] hover:bg-[#ff6422] text-white transition flex items-center gap-1 shadow-xs"
                >
                  <RefreshCw className={`w-3 h-3 ${isReflecting ? "animate-spin" : ""}`} />
                  Trigger Reflection
                </button>
              </div>

              <div className="space-y-2">
                {patterns
                  .filter((p) => p.status === "candidate")
                  .map((pat) => (
                    <div
                      key={pat.id}
                      className="p-2.5 rounded bg-white border border-amber-300 flex flex-col gap-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-800">Candidate Pattern Detected</span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {pat.observationCount}x occurrences
                        </span>
                      </div>
                      <p className="text-xs text-neutral-700">{pat.description}</p>
                      <button
                        onClick={() => handleApprovePattern(pat.id)}
                        className="self-end px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded flex items-center gap-1 transition shadow-xs"
                      >
                        <Check className="w-3 h-3" />
                        Approve as Active Policy
                      </button>
                    </div>
                  ))}

                {patterns.filter((p) => p.status === "candidate").length === 0 && (
                  <p className="text-[11px] text-neutral-500 text-center py-2">
                    No candidate patterns pending approval. All historical reflections synthesized.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* RIGHT PANEL: TEST ARENA & TELEMETRY (WHITE MODE)            */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 flex flex-col h-[calc(100vh-56px)] bg-[#FFFFFF]">
            {/* Arena Sub-Navigation Tabs */}
            <div className="border-b border-[#E6E2DA] px-4 flex items-center justify-between bg-[#F7F5F0]">
              <div className="flex space-x-1">
                {[
                  { id: "chat", label: "Studio Chat Arena", icon: Bot },
                  { id: "oled", label: "ESP32 OLED Mirror", icon: Cpu },
                  { id: "trace", label: "Trace Inspector", icon: Layers },
                  {
                    id: "approvals",
                    label: "Approvals Inbox",
                    icon: Lock,
                    badge: approvals.filter((a) => a.status === "pending").length,
                  },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = arenaTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setArenaTab(tab.id as any)}
                      className={`flex items-center gap-1.5 py-3 px-3 text-xs font-medium border-b-2 transition ${
                        active
                          ? "border-[#FA500F] text-[#FA500F] font-bold bg-white"
                          : "border-transparent text-neutral-600 hover:text-black"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${active ? "text-[#FA500F]" : "text-neutral-500"}`} />
                      <span>{tab.label}</span>
                      {tab.badge ? (
                        <span className="ml-1 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-[#FA500F] text-white">
                          {tab.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Live ESP32 Quick Status Pill */}
              <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-neutral-600">
                  Temp:
                  <span
                    className={`font-bold ${
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
            </div>

            {/* Quick Test Injections Banner */}
            <div className="p-3 border-b border-[#E6E2DA] bg-[#FAF8F5] flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 font-bold mr-1">
                Inject Scenario:
              </span>
              <button
                onClick={() => handleSimulate(-18.2, 81.0, false, "Nominal Storage")}
                className="px-2.5 py-1 rounded bg-white hover:bg-neutral-50 text-neutral-800 border border-[#E0DCD4] text-xs font-medium transition shadow-2xs"
              >
                ❄️ Nominal (-18.2°C)
              </button>
              <button
                onClick={() => handleSimulate(-14.2, 87.0, false, "Defrost Spike")}
                className="px-2.5 py-1 rounded bg-[#FFF4ED] hover:bg-[#FFEADA] text-[#FA500F] border border-[#FA500F]/40 text-xs font-bold transition flex items-center gap-1 shadow-2xs"
              >
                <Sparkles className="w-3 h-3" /> Defrost Spike (-14.2°C)
              </button>
              <button
                onClick={() => handleSimulate(+2.8, 93.0, false, "Critical Breach")}
                className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-medium transition shadow-2xs"
              >
                🚨 Thermal Breach (+2.8°C)
              </button>
              <button
                onClick={() => handleSimulate(-15.0, 92.0, true, "Door Open")}
                className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-medium transition shadow-2xs"
              >
                🚪 Door Left Open
              </button>
            </div>

            {/* Content for Arena Tab 1: Chat Stream */}
            {arenaTab === "chat" && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white">
                {/* Message Log */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        m.role === "user" ? "items-end" : "items-start"
                      } space-y-1.5`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-neutral-500 font-bold">
                          {m.role === "user" ? "You" : m.role === "assistant" ? "Sapiens Agent" : "Hardware Event"}
                        </span>
                      </div>

                      <div
                        className={`p-3.5 rounded-lg max-w-[85%] text-xs leading-relaxed ${
                          m.role === "user"
                            ? "bg-[#FA500F] text-white shadow-sm font-medium"
                            : m.role === "system"
                            ? "bg-[#FFF9F5] border border-[#FA500F]/30 text-neutral-900 shadow-2xs"
                            : "bg-[#F7F5F0] border border-[#E6E2DA] text-neutral-900 shadow-2xs"
                        }`}
                      >
                        {m.content}

                        {/* Collapsible reasoning / step trace */}
                        {m.trace && m.trace.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[#E6E2DA] space-y-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#FA500F] font-bold block">
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
                <div className="p-4 border-t border-[#E6E2DA] bg-[#FAF8F5]">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder={`Prompt ${agentName} e.g., 'Evaluate container COLD-01 status at 02:00 UTC'...`}
                      className="flex-1 bg-white border border-[#E0DCD4] rounded-lg px-3.5 py-2.5 text-xs text-[#0C0C0D] placeholder:text-neutral-400 focus:outline-none focus:border-[#FA500F] font-mono shadow-xs"
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={isRunning}
                      className="px-4 py-2.5 bg-[#FA500F] hover:bg-[#ff6422] text-white font-bold text-xs rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isRunning ? "Running..." : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Content for Arena Tab 2: ESP32 OLED Mirror */}
            {arenaTab === "oled" && (
              <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-6 bg-white">
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-bold text-neutral-900 flex items-center justify-center gap-2">
                    <Cpu className="w-4 h-4 text-[#FA500F]" />
                    Physical SSD1306 OLED Mirror (ESP32-S3)
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Live pixel-accurate state rendered on the 128x64 display wired to GPIO 8 (SDA) and GPIO 9 (SCL).
                  </p>
                </div>

                {/* The OLED frame */}
                <div className="p-4 rounded-xl bg-[#111319] border-4 border-neutral-800 shadow-2xl">
                  <div className="w-[300px] h-[150px] bg-[#020508] border border-cyan-900 rounded p-3 font-mono text-cyan-300 flex flex-col justify-between select-none">
                    <div className="bg-cyan-300 text-black px-1 py-0.5 text-[10px] font-bold flex justify-between">
                      <span>SAPIENS // S3</span>
                      <span>{telemetry.doorOpen ? "ALARM" : "NOMINAL"}</span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-black">{telemetry.temperature.toFixed(1)} C</span>
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

                <div className="text-xs text-neutral-700 font-mono bg-[#F7F5F0] p-3 rounded border border-[#E6E2DA] text-center">
                  Firmware: <code className="text-[#FA500F] font-bold">src/sapiens_firmware.cpp</code> • Port: COM4
                </div>
              </div>
            )}

            {/* Content for Arena Tab 3: Trace Inspector */}
            {arenaTab === "trace" && (
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-white">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Agent Execution &amp; Tool Intercept Log
                </h3>
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-3 rounded bg-[#FAF8F5] border border-[#E6E2DA] space-y-1">
                    <div className="flex items-center justify-between text-[#FA500F] font-bold">
                      <span>TOOL: get_sensor_data()</span>
                      <span className="text-emerald-700">RISK: LOW (APPROVED)</span>
                    </div>
                    <p className="text-neutral-700">Returned: {JSON.stringify(telemetry)}</p>
                  </div>

                  <div className="p-3 rounded bg-[#FAF8F5] border border-[#E6E2DA] space-y-1">
                    <div className="flex items-center justify-between text-[#FA500F] font-bold">
                      <span>TOOL: query_memory()</span>
                      <span className="text-emerald-700">RISK: LOW (APPROVED)</span>
                    </div>
                    <p className="text-neutral-700">
                      Query: &ldquo;defrost spike 02:00 UTC&rdquo; → Matched Learned Policy #1 (96.4% confidence)
                    </p>
                  </div>

                  <div className="p-3 rounded bg-[#FAF8F5] border border-[#E6E2DA] space-y-1">
                    <div className="flex items-center justify-between text-[#FA500F] font-bold">
                      <span>TOOL: send_notification()</span>
                      <span className="text-amber-800">RISK: MED (POLICY-GATED)</span>
                    </div>
                    <p className="text-neutral-700">
                      Decision: Held during defrost window; routine log recorded without operator escalation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Content for Arena Tab 4: Approvals Inbox */}
            {arenaTab === "approvals" && (
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                    High-Risk Human Approval Queue
                  </h3>
                  <span className="text-xs text-neutral-500">Gated by Guardrail Engine</span>
                </div>

                <div className="space-y-3">
                  {approvals.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-lg bg-[#FFF9F5] border border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs"
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
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center gap-1 transition shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleResolveApproval(app.id, "rejected")}
                            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-rose-700 border border-rose-300 rounded flex items-center gap-1 transition shadow-xs"
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
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW 2: SAPIENS FRONTIER SHOWCASE (WHITE MODE)                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === "showcase" && (
        <div className="flex-1 bg-[#FAF8F5] text-[#0C0C0D] py-12 px-4 sm:px-8 lg:px-16 space-y-16 selection:bg-[#FA500F] selection:text-white">
          <div className="max-w-6xl mx-auto space-y-16">
            {/* Hero Section */}
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-6xl font-sapiens-display tracking-tight text-[#0C0C0D] max-w-2xl">
                Build your frontier with Studio.
              </h1>

              {/* Giant Electric Blue Banner (Frontier Studio Design) */}
              <div className="sapiens-card-blue p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Fine-tune, evaluate, and build frontier agents on any hardware stack.
                  </h2>
                  <p className="text-white/90 text-sm">
                    Autonomous agent workflows with real-time episodic reflection and deterministic guardrails.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href="/agents/create"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 rounded bg-black hover:bg-neutral-900 text-white font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Create Agent
                  </a>
                  <button
                    onClick={() => setViewMode("builder")}
                    className="px-6 py-3 rounded bg-white hover:bg-neutral-100 text-[#0066FF] font-bold text-sm shadow-md transition flex items-center gap-2"
                  >
                    Open Studio Builder <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Section 1: Build (Frontier Studio Design) */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl sm:text-4xl font-sapiens-display tracking-tight text-[#0C0C0D]">
                  Build.
                </h2>
                <p className="text-neutral-600 text-sm mt-1">
                  Develop custom agentic workflows that operate securely across your edge &amp; enterprise infrastructure.
                </p>
              </div>

              {/* Big Vivid Orange Backdrop Card */}
              <div className="sapiens-card-orange p-6 sm:p-8 shadow-lg space-y-4">
                <div className="bg-white rounded-lg p-4 sm:p-6 border border-neutral-200 text-[#0C0C0D] space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-mono text-neutral-600 ml-2">sapiens-cold-chain.agent.ts</span>
                    </div>
                    <span className="text-[10px] font-mono text-white bg-[#FA500F] px-2 py-0.5 rounded font-bold">
                      EVE RUNTIME
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="p-3 rounded bg-[#FAF8F5] border border-[#E6E2DA] space-y-1">
                      <span className="text-neutral-500 block text-[10px]">1. EPISODIC INGESTION</span>
                      <span className="text-emerald-700 font-bold">3 Defrost Cycles Logged</span>
                    </div>
                    <div className="p-3 rounded bg-[#FAF8F5] border border-[#E6E2DA] space-y-1">
                      <span className="text-neutral-500 block text-[10px]">2. STATISTICAL REFLECTION</span>
                      <span className="text-amber-800 font-bold">96.4% Confidence Pattern</span>
                    </div>
                    <div className="p-3 rounded bg-[#FAF8F5] border border-[#E6E2DA] space-y-1">
                      <span className="text-neutral-500 block text-[10px]">3. PROMPT INJECTION</span>
                      <span className="text-[#0066FF] font-bold">Policy #1 Live Enforced</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Sensors & Hardware (Frontier Studio Design) */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl sm:text-4xl font-sapiens-display tracking-tight text-[#0C0C0D]">
                  Sensors &amp; Multi-Channel.
                </h2>
                <p className="text-neutral-600 text-sm mt-1">
                  Connect physical microcontrollers and messaging channels (WhatsApp, Discord, Telegram) directly into the agent feedback loop.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="sapiens-card-blue p-6 rounded-lg text-white space-y-4 shadow-md">
                  <h3 className="text-xl font-bold">ESP32-S3 Microcontroller</h3>
                  <p className="text-xs text-white/90 leading-relaxed">
                    Sub-second HTTP telemetry streams directly into the anomaly detection engine. If a thermal breach exceeds -10°C, the agent initiates emergency response.
                  </p>
                  <div className="p-3 rounded bg-black/20 font-mono text-xs text-white">
                    I2C SDA: GPIO 8 • SCL: GPIO 9 • Port: COM4
                  </div>
                </div>

                <div className="p-6 rounded-lg border border-[#E6E2DA] bg-white shadow-sm space-y-4">
                  <h3 className="text-xl font-bold text-[#0C0C0D]">SSD1306 128x64 OLED Feedback</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    The microcontroller displays live agent decisions. When the learned defrost policy suppresses a false alarm, the physical OLED shows <code className="text-[#FA500F] font-bold">[POLICY]</code>.
                  </p>
                  <div className="p-3 rounded bg-[#FAF8F5] font-mono text-xs text-neutral-700 border border-[#EAE6DE]">
                    Live Status: -18.4°C • NOMINAL • COM4 ONLINE
                  </div>
                </div>

                <div className="p-6 rounded-lg border border-[#E6E2DA] bg-white shadow-sm space-y-4">
                  <h3 className="text-xl font-bold text-[#0C0C0D]">WhatsApp &amp; Discord Gateway</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Two-way messaging allows operators to receive formatted alert cards and approve high-risk commands remotely via chat.
                  </p>
                  <button
                    onClick={() => setShowChannelsModal(true)}
                    className="w-full py-2 bg-[#FA500F] hover:bg-[#ff6422] text-white text-xs font-bold rounded transition"
                  >
                    Configure Messaging Channels
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3: Guardrails & Trust (Frontier Studio Design) */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl sm:text-4xl font-sapiens-display tracking-tight text-[#0C0C0D]">
                  Guardrails.
                </h2>
                <p className="text-neutral-600 text-sm mt-1">
                  Deterministic boundaries and transparent Trust Scoring prevent hallucinated or dangerous actions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-lg bg-white border border-[#E6E2DA] space-y-2 shadow-xs">
                  <span className="text-[10px] font-mono font-bold text-[#FA500F] uppercase tracking-wider">
                    CALCULATED TRUST
                  </span>
                  <div className="text-3xl font-black text-[#0C0C0D] font-mono">92.4% (A+)</div>
                  <p className="text-xs text-neutral-600">
                    Computed transparently from safe tool executions, operator alignment, and low concept drift.
                  </p>
                </div>

                <div className="p-5 rounded-lg bg-white border border-[#E6E2DA] space-y-2 shadow-xs">
                  <span className="text-[10px] font-mono font-bold text-rose-600 uppercase tracking-wider">
                    HARDWARE GATING
                  </span>
                  <div className="text-3xl font-black text-[#0C0C0D] font-mono">Strict Human Sign-off</div>
                  <p className="text-xs text-neutral-600">
                    Actions categorized as High Risk (e.g. compressor shutdown) are quarantined until manually approved.
                  </p>
                </div>

                <div className="p-5 rounded-lg bg-white border border-[#E6E2DA] space-y-2 shadow-xs">
                  <span className="text-[10px] font-mono font-bold text-[#0066FF] uppercase tracking-wider">
                    POLICY PROMOTION
                  </span>
                  <div className="text-3xl font-black text-[#0C0C0D] font-mono">Candidate Review</div>
                  <p className="text-xs text-neutral-600">
                    Candidate patterns synthesized by the Reflection Engine require operator sign-off before entering production prompt.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom CTA Banner (Frontier Studio Design) */}
            <div className="sapiens-card-orange p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Build, customize and deploy AI solutions with complete control.
                </h2>
                <p className="text-white/90 text-xs">
                  graVITas Hackathon MVP • Autonomous Self-Learning &amp; Hardware Guardrail Agent Platform
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/agents/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded bg-white hover:bg-neutral-100 text-[#0C0C0D] font-bold text-xs uppercase tracking-wider shadow-md transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> New Agent
                </a>
                <button
                  onClick={() => setViewMode("builder")}
                  className="px-6 py-3 rounded bg-black hover:bg-neutral-900 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition"
                >
                  Launch Studio Builder
                </button>
              </div>
            </div>

            {/* Footer with Iconic Sapiens Pixel Logo Mark */}
            <footer className="pt-12 pb-8 border-t border-[#E6E2DA] flex flex-col items-center justify-center space-y-4">
              <div className="grid grid-cols-5 gap-1 w-12 h-12">
                {/* Row 1: S top bar */}
                <div className="bg-[#FA500F]"></div>
                <div className="bg-[#FA500F]"></div>
                <div className="bg-[#FA500F]"></div>
                <div className="bg-[#FA500F]"></div>
                <div className="bg-[#FA500F]"></div>
                {/* Row 2: S top left */}
                <div className="bg-[#FA500F]"></div>
                <div className="bg-transparent"></div>
                <div className="bg-transparent"></div>
                <div className="bg-transparent"></div>
                <div className="bg-transparent"></div>
                {/* Row 3: S middle bar */}
                <div className="bg-[#FA500F]"></div>
                <div className="bg-[#FA500F]"></div>
                <div className="bg-[#FA500F]"></div>
                <div className="bg-[#FA500F]"></div>
                <div className="bg-[#FA500F]"></div>
                {/* Row 4: S bottom right */}
                <div className="bg-transparent"></div>
                <div className="bg-transparent"></div>
                <div className="bg-transparent"></div>
                <div className="bg-transparent"></div>
                <div className="bg-[#FA500F]"></div>
                {/* Row 5: S bottom bar */}
                <div className="bg-[#FA500F]"></div>
                <div className="bg-[#FA500F]"></div>
                <div className="bg-[#FA500F]"></div>
                <div className="bg-[#FA500F]"></div>
                <div className="bg-[#FA500F]"></div>
              </div>
              <span className="text-xs text-neutral-500 font-mono font-bold tracking-wider">
                SAPIENS AGENT • Autonomous Self-Learning &amp; Guardrail AI Platform
              </span>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
