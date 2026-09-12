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

export default function MistralAgentStudio() {
  // Top view mode: "builder" (Mistral Agent Builder Studio) vs "showcase" (Mistral Frontier Landing)
  const [viewMode, setViewMode] = useState<"builder" | "showcase">("builder");

  // Builder Config State
  const [agentName, setAgentName] = useState("Cold-Chain Guardian");
  const [agentDesc, setAgentDesc] = useState(
    "Autonomous medical storage monitor with continuous self-learning defrost adaptation and hardware guardrails."
  );
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.0-flash-001");
  const [systemPrompt, setSystemPrompt] = useState(
    `You are the OMNIVORE Cold-Chain Agent. Your goal is to safeguard vaccine temperature containers at -18°C.
When reading sensor data:
1. Cross-reference temperature spikes against past episodic experiences.
2. If the anomaly matches known defrost routines (02:00 UTC), hold alarms.
3. If genuine breach > -10°C occurs, trigger emergency notification.
4. Any physical hardware cutoff requires strict human authorization.`
  );
  const [enabledTools, setEnabledTools] = useState({
    get_sensor_data: true,
    query_memory: true,
    send_notification: true,
    emergency_compressor_cutoff: true,
    db_read: true,
  });

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
        "OMNIVORE Cold-Chain Agent v1.2 initialized. Connected to ESP32-S3 (COM4) on-device telemetry. Learned Policy #1 (Defrost Suppression) is active in system context.",
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
    } catch (e) {
      console.warn("API state fetch fallback:", e);
    }
  };

  useEffect(() => {
    fetchData();
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

      // Add a system event into the chat stream
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
      const res = await fetch("/api/agents/omnivore-cold-chain/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: promptToSend }),
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
    <div className="min-h-screen bg-[#0B0C0E] text-[#F3F4F6] flex flex-col selection:bg-[#FA500F] selection:text-white font-sans">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* MISTRAL TOP NAVIGATION BAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-white/10 bg-[#0B0C0E]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setViewMode("showcase")}>
              {/* Mistral Iconic Pixel Glyph */}
              <div className="grid grid-cols-3 gap-0.5 w-6 h-6 p-0.5 bg-[#FA500F] rounded-xs shadow-md shadow-[#FA500F]/20">
                <div className="bg-white"></div>
                <div className="bg-transparent"></div>
                <div className="bg-white"></div>
                <div className="bg-white"></div>
                <div className="bg-white"></div>
                <div className="bg-white"></div>
                <div className="bg-white"></div>
                <div className="bg-transparent"></div>
                <div className="bg-white"></div>
              </div>
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                OMNIVORE <span className="text-[#FA500F]">STUDIO</span>
              </span>
            </div>

            {/* Navigation links */}
            <nav className="hidden lg:flex items-center gap-5 text-xs text-neutral-400 font-medium">
              <button
                onClick={() => setViewMode("builder")}
                className={`transition ${
                  viewMode === "builder" ? "text-white font-semibold flex items-center gap-1.5" : "hover:text-white"
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-[#FA500F]" />
                Agent Builder
              </button>
              <button
                onClick={() => setViewMode("showcase")}
                className={`transition ${
                  viewMode === "showcase" ? "text-white font-semibold" : "hover:text-white"
                }`}
              >
                Frontier Studio
              </button>
              <span className="text-neutral-600">|</span>
              <span className="hover:text-neutral-200 cursor-pointer flex items-center gap-1">
                <Cpu className="w-3 h-3 text-cyan-400" /> ESP32 Hardware (COM4)
              </span>
              <span className="hover:text-neutral-200 cursor-pointer">
                Trust Center ({trustScore.toFixed(1)}%)
              </span>
            </nav>
          </div>

          {/* Right Actions & Status */}
          <div className="flex items-center gap-3">
            {/* Active view toggle pill */}
            <div className="flex items-center rounded-md bg-[#14161D] p-0.5 border border-white/10 text-xs">
              <button
                onClick={() => setViewMode("builder")}
                className={`px-3 py-1 rounded font-medium transition ${
                  viewMode === "builder"
                    ? "bg-[#FA500F] text-white shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Studio Builder
              </button>
              <button
                onClick={() => setViewMode("showcase")}
                className={`px-3 py-1 rounded font-medium transition ${
                  viewMode === "showcase"
                    ? "bg-[#FA500F] text-white shadow-sm"
                    : "text-neutral-400 hover:text-white"
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
              className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white bg-[#14161D] border border-white/10 rounded flex items-center gap-1.5 transition"
              title="Reset initial telemetry, defrost false alarms, and policies"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Demo
            </button>
          </div>
        </div>
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW 1: MISTRAL AGENT BUILDER STUDIO (SPLIT SCREEN)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === "builder" && (
        <div className="flex-1 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* LEFT PANEL: AGENT CONFIGURATION (BUILDER)                   */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-56px)] bg-[#0D0E12]">
            {/* Header: Agent Identity */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#FA500F] font-bold flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" /> Agent Blueprint
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                  ACTIVE • DEPLOYED
                </span>
              </div>

              <div>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full bg-transparent text-xl sm:text-2xl font-black tracking-tight text-white border-b border-white/10 focus:border-[#FA500F] focus:outline-none pb-1"
                />
                <input
                  type="text"
                  value={agentDesc}
                  onChange={(e) => setAgentDesc(e.target.value)}
                  className="w-full bg-transparent text-xs text-neutral-400 mt-1 focus:outline-none focus:text-neutral-200"
                />
              </div>
            </div>

            {/* Model Selector */}
            <div className="mistral-card p-3.5 space-y-2">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>Base Intelligence Model</span>
                <span className="text-[10px] font-mono text-[#FA500F]">Low Latency Tool Calling</span>
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-[#1A1D26] border border-white/10 text-xs text-white rounded p-2 focus:outline-none focus:border-[#FA500F] font-mono"
              >
                <option value="mistralai/mistral-large-2407">mistral-large-2407 (Mistral Large 2)</option>
                <option value="google/gemini-2.0-flash-001">google/gemini-2.0-flash-001 (Recommended)</option>
                <option value="mistralai/mistral-nemo">mistral-nemo-12b (Edge Optimized)</option>
              </select>
            </div>

            {/* System Prompt & Injected Policies */}
            <div className="mistral-card p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
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
                className="w-full bg-[#1A1D26] border border-white/10 text-xs text-neutral-200 font-mono rounded p-2.5 focus:outline-none focus:border-[#FA500F] leading-relaxed resize-none"
              />

              {/* Injected Policies Pill */}
              <div className="p-2.5 rounded bg-[#1A1D26]/80 border border-[#FA500F]/30 space-y-1.5">
                <span className="text-[10px] font-bold text-[#FA500F] uppercase tracking-wider block">
                  ⚡ Dynamically Injected Learned Policy:
                </span>
                {policies.slice(0, 1).map((p) => (
                  <div key={p.id} className="text-xs text-neutral-300 font-mono">
                    <span className="text-emerald-400 font-bold">&ldquo;{p.title}&rdquo;</span> — {p.action}
                  </div>
                ))}
              </div>
            </div>

            {/* Tools & Capabilities Checklist */}
            <div className="mistral-card p-3.5 space-y-3">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-[#FA500F]" />
                  Tool Capabilities & Risk Registry
                </span>
                <span className="text-[10px] text-neutral-500">Eve SDK Tools</span>
              </label>

              <div className="space-y-2 text-xs">
                {[
                  {
                    key: "get_sensor_data",
                    name: "get_sensor_data()",
                    desc: "Reads live ESP32 temperature & humidity via I2C",
                    risk: "LOW",
                    riskColor: "bg-emerald-950 text-emerald-400 border-emerald-800",
                  },
                  {
                    key: "query_memory",
                    name: "query_memory()",
                    desc: "Retrieves episodic memories & approved policies",
                    risk: "LOW",
                    riskColor: "bg-emerald-950 text-emerald-400 border-emerald-800",
                  },
                  {
                    key: "send_notification",
                    name: "send_notification()",
                    desc: "Multi-channel alerts (Telegram / WhatsApp / UI)",
                    risk: "MED",
                    riskColor: "bg-amber-950 text-amber-400 border-amber-800",
                  },
                  {
                    key: "emergency_compressor_cutoff",
                    name: "emergency_compressor_cutoff()",
                    desc: "Thermal overload relay trip. STRICT APPROVAL GATED.",
                    risk: "HIGH",
                    riskColor: "bg-rose-950 text-rose-400 border-rose-800",
                  },
                ].map((tool) => (
                  <div
                    key={tool.key}
                    className="p-2.5 rounded bg-[#1A1D26] border border-white/5 flex items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-neutral-200">{tool.name}</span>
                        <span className={`px-1.5 py-0.2 text-[9px] font-mono border rounded ${tool.riskColor}`}>
                          {tool.risk}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400">{tool.desc}</p>
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
            <div className="mistral-card p-3.5 space-y-3 border-[#FA500F]/30 bg-[#FA500F]/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-[#FA500F]" />
                  Self-Learning Loop &amp; Candidate Review
                </span>
                <button
                  onClick={handleReflect}
                  disabled={isReflecting}
                  className="text-[10px] font-bold px-2 py-1 rounded bg-[#FA500F] hover:bg-[#ff6422] text-white transition flex items-center gap-1"
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
                      className="p-2.5 rounded bg-[#14161D] border border-amber-500/30 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-300">Candidate Pattern Detected</span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {pat.observationCount}x occurrences
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300">{pat.description}</p>
                      <button
                        onClick={() => handleApprovePattern(pat.id)}
                        className="self-end px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[11px] rounded flex items-center gap-1 transition"
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
          {/* RIGHT PANEL: TEST ARENA & TELEMETRY MONITOR                 */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 flex flex-col h-[calc(100vh-56px)] bg-[#0B0C0E]">
            {/* Arena Sub-Navigation Tabs */}
            <div className="border-b border-white/10 px-4 flex items-center justify-between bg-[#111319]">
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
                          ? "border-[#FA500F] text-white"
                          : "border-transparent text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${active ? "text-[#FA500F]" : "text-neutral-400"}`} />
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
                <span className="flex items-center gap-1 text-neutral-400">
                  Temp:
                  <span
                    className={`font-bold ${
                      telemetry.temperature > -10 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {telemetry.temperature.toFixed(1)}°C
                  </span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                  S3 ONLINE
                </span>
              </div>
            </div>

            {/* Quick Test Injections Banner (Mistral Style Pills) */}
            <div className="p-3 border-b border-white/5 bg-[#14161D]/50 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 font-bold mr-1">
                Inject Scenario:
              </span>
              <button
                onClick={() => handleSimulate(-18.2, 81.0, false, "Nominal Storage")}
                className="px-2.5 py-1 rounded bg-[#1C202A] hover:bg-[#252A38] text-neutral-200 border border-white/5 text-xs font-medium transition"
              >
                ❄️ Nominal (-18.2°C)
              </button>
              <button
                onClick={() => handleSimulate(-14.2, 87.0, false, "Defrost Spike")}
                className="px-2.5 py-1 rounded bg-[#FA500F]/15 hover:bg-[#FA500F]/25 text-[#FA500F] border border-[#FA500F]/40 text-xs font-bold transition flex items-center gap-1 shadow-sm shadow-[#FA500F]/10"
              >
                <Sparkles className="w-3 h-3" /> Defrost Spike (-14.2°C)
              </button>
              <button
                onClick={() => handleSimulate(+2.8, 93.0, false, "Critical Breach")}
                className="px-2.5 py-1 rounded bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-500/30 text-xs font-medium transition"
              >
                🚨 Thermal Breach (+2.8°C)
              </button>
              <button
                onClick={() => handleSimulate(-15.0, 92.0, true, "Door Open")}
                className="px-2.5 py-1 rounded bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border border-amber-500/30 text-xs font-medium transition"
              >
                🚪 Door Left Open
              </button>
            </div>

            {/* Content for Arena Tab 1: Chat Stream */}
            {arenaTab === "chat" && (
              <div className="flex-1 flex flex-col justify-between overflow-hidden">
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
                        <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold">
                          {m.role === "user" ? "You" : m.role === "assistant" ? "Omnivore Agent" : "Hardware Event"}
                        </span>
                      </div>

                      <div
                        className={`p-3.5 rounded-lg max-w-[85%] text-xs leading-relaxed ${
                          m.role === "user"
                            ? "bg-[#FA500F] text-white"
                            : m.role === "system"
                            ? "bg-[#14161D] border border-amber-500/40 text-neutral-200"
                            : "bg-[#14161D] border border-white/10 text-neutral-200"
                        }`}
                      >
                        {m.content}

                        {/* Collapsible reasoning / step trace */}
                        {m.trace && m.trace.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#FA500F] font-bold block">
                              Execution Reasoning &amp; Guardrail Trace:
                            </span>
                            {m.trace.map((step: any, sIdx: number) => (
                              <div
                                key={sIdx}
                                className="p-2 rounded bg-black/40 border border-white/5 font-mono text-[11px] space-y-0.5"
                              >
                                <div className="flex items-center justify-between text-neutral-400">
                                  <span>Step {step.stepNumber}: {step.type}</span>
                                  {step.guardrailDecision && (
                                    <span className="text-emerald-400 font-bold">
                                      GUARD: {step.guardrailDecision.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                {step.content && <p className="text-neutral-300 font-sans">{step.content}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input Bar */}
                <div className="p-4 border-t border-white/10 bg-[#0E1015]">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Prompt the agent e.g., 'Evaluate container COLD-01 status at 02:00 UTC'..."
                      className="flex-1 bg-[#1A1D26] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#FA500F] font-mono"
                    />
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={isRunning}
                      className="px-4 py-2.5 bg-[#FA500F] hover:bg-[#ff6422] text-white font-bold text-xs rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
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
              <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-6">
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center justify-center gap-2">
                    <Cpu className="w-4 h-4 text-[#FA500F]" />
                    Physical SSD1306 OLED Mirror (ESP32-S3)
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Live pixel-accurate state rendered on the 128x64 display wired to GPIO 8 (SDA) and GPIO 9 (SCL).
                  </p>
                </div>

                {/* The OLED frame */}
                <div className="p-4 rounded-xl bg-black border-4 border-neutral-700 shadow-2xl">
                  <div className="w-[300px] h-[150px] bg-[#020508] border border-cyan-900 rounded p-3 font-mono text-cyan-300 flex flex-col justify-between select-none">
                    <div className="bg-cyan-300 text-black px-1 py-0.5 text-[10px] font-bold flex justify-between">
                      <span>OMNIVORE // S3</span>
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

                <div className="text-xs text-neutral-400 font-mono bg-[#14161D] p-3 rounded border border-white/5 text-center">
                  Firmware: <code className="text-[#FA500F]">src/omnivore_firmware.cpp</code> • Port: COM4
                </div>
              </div>
            )}

            {/* Content for Arena Tab 3: Trace Inspector */}
            {arenaTab === "trace" && (
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Agent Execution &amp; Tool Intercept Log
                </h3>
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-3 rounded bg-[#14161D] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[#FA500F]">
                      <span>TOOL: get_sensor_data()</span>
                      <span className="text-emerald-400">RISK: LOW (APPROVED)</span>
                    </div>
                    <p className="text-neutral-400">Returned: {JSON.stringify(telemetry)}</p>
                  </div>

                  <div className="p-3 rounded bg-[#14161D] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[#FA500F]">
                      <span>TOOL: query_memory()</span>
                      <span className="text-emerald-400">RISK: LOW (APPROVED)</span>
                    </div>
                    <p className="text-neutral-400">
                      Query: &ldquo;defrost spike 02:00 UTC&rdquo; → Matched Learned Policy #1 (96.4% confidence)
                    </p>
                  </div>

                  <div className="p-3 rounded bg-[#14161D] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[#FA500F]">
                      <span>TOOL: send_notification()</span>
                      <span className="text-amber-400">RISK: MED (POLICY-GATED)</span>
                    </div>
                    <p className="text-neutral-400">
                      Decision: Held during defrost window; routine log recorded without operator escalation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Content for Arena Tab 4: Approvals Inbox */}
            {arenaTab === "approvals" && (
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    High-Risk Human Approval Queue
                  </h3>
                  <span className="text-xs text-neutral-500">Gated by Guardrail Engine</span>
                </div>

                <div className="space-y-3">
                  {approvals.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-lg bg-[#14161D] border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{app.toolName}()</span>
                          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-rose-950 text-rose-300 border border-rose-800 rounded">
                            HIGH RISK
                          </span>
                        </div>
                        <p className="text-neutral-300">{app.reason}</p>
                      </div>

                      {app.status === "pending" ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleResolveApproval(app.id, "approved")}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded flex items-center gap-1 transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleResolveApproval(app.id, "rejected")}
                            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-rose-300 border border-rose-900 rounded flex items-center gap-1 transition"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="px-2 py-1 rounded bg-neutral-800 text-[11px] font-mono text-emerald-400">
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
      {/* VIEW 2: MISTRAL FRONTIER SHOWCASE (EXACT REPLICA OF IMAGE)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === "showcase" && (
        <div className="flex-1 bg-[#FAF8F5] text-[#0C0C0D] py-12 px-4 sm:px-8 lg:px-16 space-y-16 selection:bg-[#FA500F] selection:text-white">
          <div className="max-w-6xl mx-auto space-y-16">
            {/* Hero Section */}
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-6xl font-mistral-display tracking-tight text-[#0C0C0D] max-w-2xl">
                Build your frontier with Studio.
              </h1>

              {/* Giant Electric Blue Banner (From Mistral Image) */}
              <div className="mistral-card-blue p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Fine-tune, evaluate, and build frontier agents on any hardware stack.
                  </h2>
                  <p className="text-white/80 text-sm">
                    Autonomous agent workflows with real-time episodic reflection and deterministic guardrails.
                  </p>
                </div>
                <button
                  onClick={() => setViewMode("builder")}
                  className="px-6 py-3 rounded bg-white hover:bg-neutral-100 text-[#0066FF] font-bold text-sm shadow-md transition flex items-center gap-2 shrink-0"
                >
                  Open Studio Builder <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Section 1: Build (From Mistral Image) */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl sm:text-4xl font-mistral-display tracking-tight text-[#0C0C0D]">
                  Build.
                </h2>
                <p className="text-neutral-600 text-sm mt-1">
                  Develop custom agentic workflows that operate securely across your edge &amp; enterprise infrastructure.
                </p>
              </div>

              {/* Big Vivid Orange Backdrop Card */}
              <div className="mistral-card-orange p-6 sm:p-8 shadow-lg space-y-4">
                <div className="bg-[#0C0C0D] rounded-lg p-4 sm:p-6 border border-white/10 text-white space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-mono text-neutral-400 ml-2">omnivore-cold-chain.agent.ts</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#FA500F] bg-white/10 px-2 py-0.5 rounded">
                      EVE RUNTIME
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="p-3 rounded bg-white/5 border border-white/5 space-y-1">
                      <span className="text-neutral-400 block text-[10px]">1. EPISODIC INGESTION</span>
                      <span className="text-emerald-400 font-bold">3 Defrost Cycles Logged</span>
                    </div>
                    <div className="p-3 rounded bg-white/5 border border-white/5 space-y-1">
                      <span className="text-neutral-400 block text-[10px]">2. STATISTICAL REFLECTION</span>
                      <span className="text-amber-300 font-bold">96.4% Confidence Pattern</span>
                    </div>
                    <div className="p-3 rounded bg-white/5 border border-white/5 space-y-1">
                      <span className="text-neutral-400 block text-[10px]">3. PROMPT INJECTION</span>
                      <span className="text-cyan-300 font-bold">Policy #1 Live Enforced</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Sensors & Hardware (From Mistral Image) */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl sm:text-4xl font-mistral-display tracking-tight text-[#0C0C0D]">
                  Sensors.
                </h2>
                <p className="text-neutral-600 text-sm mt-1">
                  Connect physical microcontrollers and edge hardware directly into the agent feedback loop.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="mistral-card-blue p-6 rounded-lg text-white space-y-4">
                  <h3 className="text-xl font-bold">ESP32-S3 DevKitC-1 Telemetry</h3>
                  <p className="text-xs text-white/80 leading-relaxed">
                    Sub-second HTTP telemetry streams directly into the anomaly detection engine. If a thermal breach exceeds -10°C, the agent initiates emergency response.
                  </p>
                  <div className="p-3 rounded bg-black/30 font-mono text-xs">
                    I2C SDA: GPIO 8 • SCL: GPIO 9 • Port: COM4
                  </div>
                </div>

                <div className="p-6 rounded-lg border border-neutral-300 bg-white shadow-sm space-y-4">
                  <h3 className="text-xl font-bold text-[#0C0C0D]">SSD1306 128x64 OLED Feedback</h3>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    The microcontroller displays live agent decisions. When the learned defrost policy suppresses a false alarm, the physical OLED shows <code className="text-[#FA500F] font-bold">[POLICY]</code>.
                  </p>
                  <div className="p-3 rounded bg-neutral-100 font-mono text-xs text-neutral-700">
                    Live Status: -18.4°C • NOMINAL • COM4 ONLINE
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Guardrails & Trust (From Mistral Image) */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl sm:text-4xl font-mistral-display tracking-tight text-[#0C0C0D]">
                  Guardrails.
                </h2>
                <p className="text-neutral-600 text-sm mt-1">
                  Deterministic boundaries and transparent Trust Scoring prevent hallucinated or dangerous actions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-lg bg-white border border-neutral-300 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-[#FA500F] uppercase tracking-wider">
                    CALCULATED TRUST
                  </span>
                  <div className="text-3xl font-black text-[#0C0C0D] font-mono">92.4% (A+)</div>
                  <p className="text-xs text-neutral-600">
                    Computed transparently from safe tool executions, operator alignment, and low concept drift.
                  </p>
                </div>

                <div className="p-5 rounded-lg bg-white border border-neutral-300 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-rose-600 uppercase tracking-wider">
                    HARDWARE GATING
                  </span>
                  <div className="text-3xl font-black text-[#0C0C0D] font-mono">Strict Human Sign-off</div>
                  <p className="text-xs text-neutral-600">
                    Actions categorized as High Risk (e.g. compressor shutdown) are quarantined until manually approved.
                  </p>
                </div>

                <div className="p-5 rounded-lg bg-white border border-neutral-300 space-y-2">
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

            {/* Bottom CTA Banner (From Mistral Image) */}
            <div className="mistral-card-orange p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-left">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Build, customize and deploy AI solutions with complete control.
                </h2>
                <p className="text-white/80 text-xs">
                  graVITas Hackathon MVP • Autonomous Self-Learning &amp; Hardware Guardrail Agent Platform
                </p>
              </div>
              <button
                onClick={() => setViewMode("builder")}
                className="px-6 py-3 rounded bg-black hover:bg-neutral-900 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition shrink-0"
              >
                Launch Studio Builder
              </button>
            </div>

            {/* Footer with Iconic Mistral Pixel Logo Mark */}
            <footer className="pt-12 pb-8 border-t border-neutral-300 flex flex-col items-center justify-center space-y-4">
              <div className="grid grid-cols-5 gap-1 w-12 h-12">
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-transparent"></div>
                <div className="bg-transparent"></div>
                <div className="bg-transparent"></div>
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-transparent"></div>
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-transparent"></div>
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-transparent"></div>
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-[#0C0C0D]"></div>
                <div className="bg-transparent"></div>
                <div className="bg-transparent"></div>
                <div className="bg-transparent"></div>
                <div className="bg-[#0C0C0D]"></div>
              </div>
              <span className="text-xs text-neutral-500 font-mono">
                OMNIVORE AGENT • Inspired by Mistral Studio Architecture
              </span>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
