"use client";

import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { SKILLS_SH_CATALOG } from "@/skills/registry";

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
  ]);
  const [selectedAgentId, setSelectedAgentId] = useState("sapiens-cold-chain");

  // Channels Form
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [whatsAppRecipient, setWhatsAppRecipient] = useState("+1 555-0199");
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
    const configuredTools = currentAgent.tools || [];
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
      const storedId = localStorage.getItem("sapiens_active_agent_id");
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
                    ? "bg-[#71ce34] text-white shadow-sm font-bold"
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
                    className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded p-2 text-xs font-mono focus:outline-none focus:border-[#71ce34] focus:bg-white"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    When high-risk actions are quarantined, operators can reply <code className="font-bold text-[#71ce34]">APPROVE</code> directly via WhatsApp.
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
                        <span className="ml-1 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-[#71ce34] text-white animate-pulse-glow">
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
                        {m.content}

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
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW 2: SAPIENS FRONTIER SHOWCASE (WHITE MODE)                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === "showcase" && (
        <div className="flex-1 bg-[#FAF8F5] text-[#0C0C0D] py-8 sm:py-12 px-3 sm:px-8 lg:px-16 space-y-12 sm:space-y-16 selection:bg-[#71ce34] selection:text-white animate-fade-in">
          <div className="max-w-6xl mx-auto space-y-12 sm:space-y-16">
            {/* Hero Section */}
            <div className="space-y-5 sm:space-y-6">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-sapiens-display tracking-tight text-[#0C0C0D] max-w-2xl">
                Build your frontier with Studio.
              </h1>

              {/* Giant Electric Blue Banner (Frontier Studio Design) */}
              <div className="sapiens-card-blue p-6 sm:p-8 md:p-12 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover-lift">
                <div className="space-y-2 max-w-2xl">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
                    Fine-tune, evaluate, and build frontier agents on any hardware stack.
                  </h2>
                  <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
                    Autonomous agent workflows with real-time episodic reflection and deterministic guardrails.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
                  <a
                    href="/agents/create"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 sm:px-5 py-2.5 sm:py-3 rounded bg-black hover:bg-neutral-900 text-white font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center gap-1.5 interactive-btn hover-lift"
                  >
                    <Plus className="w-4 h-4" /> Create Agent
                  </a>
                  <button
                    onClick={() => setViewMode("builder")}
                    className="px-5 sm:px-6 py-2.5 sm:py-3 rounded bg-white hover:bg-neutral-100 text-[#0066FF] font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2 interactive-btn hover-lift"
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

              {/* Big Vivid Accent Backdrop Card */}
              <div className="sapiens-card-orange p-5 sm:p-8 shadow-lg space-y-4 hover-lift">
                <div className="bg-white rounded-lg p-4 sm:p-6 border border-neutral-200 text-[#0C0C0D] space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-mono text-neutral-600 ml-2">sapiens-cold-chain.agent.ts</span>
                    </div>
                    <span className="text-[10px] font-mono text-white bg-[#71ce34] px-2 py-0.5 rounded font-bold">
                      EVE RUNTIME
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-xs font-mono">
                    <div className="p-3 rounded bg-[#FAF8F5] border border-[#E6E2DA] space-y-1 hover-lift transition-all">
                      <span className="text-neutral-500 block text-[10px]">1. EPISODIC INGESTION</span>
                      <span className="text-emerald-700 font-bold">3 Defrost Cycles Logged</span>
                    </div>
                    <div className="p-3 rounded bg-[#FAF8F5] border border-[#E6E2DA] space-y-1 hover-lift transition-all">
                      <span className="text-neutral-500 block text-[10px]">2. STATISTICAL REFLECTION</span>
                      <span className="text-amber-800 font-bold">96.4% Confidence Pattern</span>
                    </div>
                    <div className="p-3 rounded bg-[#FAF8F5] border border-[#E6E2DA] space-y-1 hover-lift transition-all">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="sapiens-card-blue p-5 sm:p-6 rounded-lg text-white space-y-4 shadow-md hover-lift">
                  <h3 className="text-lg sm:text-xl font-bold">ESP32-S3 Microcontroller</h3>
                  <p className="text-xs text-white/90 leading-relaxed">
                    Sub-second HTTP telemetry streams directly into the anomaly detection engine. If a thermal breach exceeds -10°C, the agent initiates emergency response.
                  </p>
                  <div className="p-3 rounded bg-black/20 font-mono text-xs text-white break-all">
                    I2C SDA: GPIO 8 • SCL: GPIO 9 • Port: COM4
                  </div>
                </div>

                <div className="p-5 sm:p-6 rounded-lg border border-[#E6E2DA] bg-white shadow-sm space-y-4 hover-lift">
                  <h3 className="text-lg sm:text-xl font-bold text-[#0C0C0D]">SSD1306 128x64 OLED Feedback</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    The microcontroller displays live agent decisions. When the learned defrost policy suppresses a false alarm, the physical OLED shows <code className="text-[#71ce34] font-bold">[POLICY]</code>.
                  </p>
                  <div className="p-3 rounded bg-[#FAF8F5] font-mono text-xs text-neutral-700 border border-[#EAE6DE]">
                    Live Status: -18.4°C • NOMINAL • COM4 ONLINE
                  </div>
                </div>

                <div className="p-5 sm:p-6 rounded-lg border border-[#E6E2DA] bg-white shadow-sm space-y-4 hover-lift">
                  <h3 className="text-lg sm:text-xl font-bold text-[#0C0C0D]">WhatsApp &amp; Discord Gateway</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Two-way messaging allows operators to receive formatted alert cards and approve high-risk commands remotely via chat.
                  </p>
                  <button
                    onClick={() => setShowChannelsModal(true)}
                    className="w-full py-2 bg-[#71ce34] hover:bg-[#62b62b] text-white text-xs font-bold rounded transition interactive-btn hover-lift"
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="p-5 rounded-lg bg-white border border-[#E6E2DA] space-y-2 shadow-xs hover-lift">
                  <span className="text-[10px] font-mono font-bold text-[#71ce34] uppercase tracking-wider">
                    CALCULATED TRUST
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-[#0C0C0D] font-mono">92.4% (A+)</div>
                  <p className="text-xs text-neutral-600">
                    Computed transparently from safe tool executions, operator alignment, and low concept drift.
                  </p>
                </div>

                <div className="p-5 rounded-lg bg-white border border-[#E6E2DA] space-y-2 shadow-xs hover-lift">
                  <span className="text-[10px] font-mono font-bold text-rose-600 uppercase tracking-wider">
                    HARDWARE GATING
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-[#0C0C0D] font-mono">Strict Human Sign-off</div>
                  <p className="text-xs text-neutral-600">
                    Actions categorized as High Risk (e.g. compressor shutdown) are quarantined until manually approved.
                  </p>
                </div>

                <div className="p-5 rounded-lg bg-white border border-[#E6E2DA] space-y-2 shadow-xs hover-lift">
                  <span className="text-[10px] font-mono font-bold text-[#0066FF] uppercase tracking-wider">
                    POLICY PROMOTION
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-[#0C0C0D] font-mono">Candidate Review</div>
                  <p className="text-xs text-neutral-600">
                    Candidate patterns synthesized by the Reflection Engine require operator sign-off before entering production prompt.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom CTA Banner (Frontier Studio Design) */}
            <div className="sapiens-card-orange p-6 sm:p-8 md:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 hover-lift">
              <div className="space-y-1 text-center md:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Build, customize and deploy AI solutions with complete control.
                </h2>
                <p className="text-white/90 text-xs">
                  graVITas Hackathon MVP • Autonomous Self-Learning &amp; Hardware Guardrail Agent Platform
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                <a
                  href="/agents/create"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 sm:px-5 py-2.5 sm:py-3 rounded bg-white hover:bg-neutral-100 text-[#0C0C0D] font-bold text-xs uppercase tracking-wider shadow-md transition inline-flex items-center gap-1.5 interactive-btn hover-lift"
                >
                  <Plus className="w-3.5 h-3.5" /> New Agent
                </a>
                <button
                  onClick={() => setViewMode("builder")}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 rounded bg-black hover:bg-neutral-900 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition interactive-btn hover-lift"
                >
                  Launch Studio Builder
                </button>
              </div>
            </div>

            {/* Footer with Iconic Sapiens Logo */}
            <footer className="pt-12 pb-8 border-t border-[#E6E2DA] flex flex-col items-center justify-center space-y-3">
              <Image
                src="/logo.png"
                alt="Sapiens Logo"
                width={48}
                height={48}
                className="w-12 h-12 object-contain hover:scale-105 transition-transform duration-300"
              />
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
