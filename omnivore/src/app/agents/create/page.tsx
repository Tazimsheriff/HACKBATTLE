"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  ArrowLeft,
  Sparkles,
  Cpu,
  Shield,
  Wrench,
  Terminal,
  Share2,
  Check,
  Zap,
  Mail,
  Globe,
  HardDrive,
  Loader2,
  RefreshCw,
  Info,
} from "lucide-react";

export default function CreateAgentPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [model, setModel] = useState("open-mistral-nemo");
  const [temperature, setTemperature] = useState(0.2);

  // Hardware binding is completely optional
  const [hasHardware, setHasHardware] = useState(false);
  const [hardwareDeviceId, setHardwareDeviceId] = useState("ESP32-S3-COLD-01");

  // Instructions start clean and adapt to the user's mission
  const [instructions, setInstructions] = useState("");
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

  // Tools list
  const [selectedTools, setSelectedTools] = useState<string[]>([
    "query_memory",
    "send_notification",
  ]);

  const [selectedChannels, setSelectedChannels] = useState<{
    whatsapp: boolean;
    telegram: boolean;
    discord: boolean;
  }>({
    whatsapp: true,
    telegram: true,
    discord: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic Prompt Generator powered by Mistral AI
  const handleAutoGeneratePrompt = async () => {
    if (!name.trim() && !description.trim()) {
      alert("Please enter an Agent Name or Short Mission Description first.");
      return;
    }

    setIsGeneratingPrompt(true);
    try {
      const res = await fetch("/api/agents/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "Custom Autonomous Agent",
          description: description || "Autonomous workflow assistant",
          hasHardware,
          hardwareDeviceId: hasHardware ? hardwareDeviceId : "",
        }),
      });

      const data = await res.json();
      if (data.prompt) {
        setInstructions(data.prompt);

        // Auto-select relevant tools based on mission
        const fullText = (name + " " + description).toLowerCase();
        const newTools = new Set(selectedTools);
        if (fullText.includes("mail") || fullText.includes("gmail") || fullText.includes("inbox")) {
          newTools.add("read_emails");
        }
        if (fullText.includes("search") || fullText.includes("web") || fullText.includes("research")) {
          newTools.add("web_search");
        }
        if (fullText.includes("sensor") || fullText.includes("temperature") || hasHardware) {
          newTools.add("get_sensor_data");
        }
        setSelectedTools(Array.from(newTools));
      }
    } catch (err) {
      console.error("Prompt generation failed:", err);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Diverse Template Quick Loader
  const handleApplyTemplate = (type: "gmail" | "research" | "devops" | "coldchain") => {
    if (type === "gmail") {
      setName("Gmail Priority Sentinel");
      setDescription("Monitor Gmail inbox, filter noise, extract urgent emails, and provide priority digests.");
      setGoal("Read Gmail inbox and surface actionable high-priority emails.");
      setHasHardware(false);
      setSelectedTools(["read_emails", "query_memory", "send_notification"]);
      setInstructions(`# **GMAIL PRIORITY SENTINEL**
**Role:** Autonomous Email Intelligence & Prioritization Assistant

### **Core Mission & Objectives**
- **Scan & Filter:** Parse incoming Gmail messages to distinguish urgent action items from routine correspondence and spam.
- **Categorize:** Label emails as CRITICAL (deadlines/executive), IMPORTANT (actionable), or ROUTINE (newsletters/FYI).
- **Digest:** Deliver concise email summaries and daily digests to configured notification channels.
- **Escalation:** Immediately alert user on high-priority threads.

### **Safety & Guardrails**
- Never send automated email replies without explicit human review.
- Never delete or permanently modify email records.
- Preserve strict confidentiality and credential isolation.`);
    } else if (type === "research") {
      setName("Web Research & Market Sentinel");
      setDescription("Perform automated web research, synthesize data sources, and compile executive briefings.");
      setGoal("Conduct structured web research and produce factual analytical summaries.");
      setHasHardware(false);
      setSelectedTools(["web_search", "query_memory", "send_notification"]);
      setInstructions(`# **WEB RESEARCH & MARKET SENTINEL**
**Role:** Autonomous Intelligence & Source Synthesis Analyst

### **Core Mission & Objectives**
- **Formulate Queries:** Transform research topics into targeted search queries.
- **Synthesize Sources:** Retrieve, verify, and cross-reference public domain information.
- **Deliver Briefings:** Format findings into clear, structured Markdown reports with citations.

### **Safety & Guardrails**
- Cross-validate factual claims against at least two independent sources.
- Never submit external web forms or conduct automated transactions.`);
    } else if (type === "devops") {
      setName("DevOps & Incident Sentinel");
      setDescription("Track error webhooks, query deployment health, and manage incident responses.");
      setGoal("Monitor system telemetry and alert on deployment regressions.");
      setHasHardware(false);
      setSelectedTools(["database_query", "query_memory", "send_notification"]);
      setInstructions(`# **DEVOPS & INCIDENT SENTINEL**
**Role:** Infrastructure Watchdog & Incident Triage Agent

### **Core Mission & Objectives**
- **Monitor Health:** Analyze deployment webhooks, server error spikes, and latency logs.
- **Triage Incidents:** Correlate telemetry spikes against recent code deployments.
- **Notify On-Call:** Broadcast high-severity incidents to Discord/Telegram.

### **Safety & Guardrails**
- Automated rollback actions require human authorization.
- Never disclose production API tokens or environment secrets in public logs.`);
    } else if (type === "coldchain") {
      setName("Vaccine Storage Sentinel");
      setDescription("Ultra-low temperature monitor with automated defrost cycle learning and OLED mirror.");
      setGoal("Maintain container COLD-01 at -18°C and suppress false alarms.");
      setHasHardware(true);
      setHardwareDeviceId("ESP32-S3-COLD-01");
      setSelectedTools(["get_sensor_data", "query_memory", "send_notification", "emergency_relay_cutoff"]);
      setInstructions(`# **VACCINE STORAGE SENTINEL**
**Role:** IoT Physical Storage Sentinel (ESP32-S3-COLD-01)

### **Core Mission & Objectives**
- **Monitor Telemetry:** Continuously sample temperature and door aperture from ESP32 sensors.
- **Learn Routines:** Check episodic memory for authorized defrost cycles (02:00 UTC) and hold false alarms.
- **Guard Cold-Chain:** Trigger priority sirens if temperature exceeds critical thresholds outside defrost windows.

### **Safety & Guardrails**
- Compressor shutoff or hardware breaker actions strictly require human authorization.`);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      alert("Please provide an agent name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          goal: goal || description || name,
          instructions: instructions || `You are ${name}. Carry out tasks safely within defined guardrails.`,
          model,
          tools: selectedTools,
          metadata: {
            hasHardware,
            hardwareDeviceId: hasHardware ? hardwareDeviceId : null,
          },
        }),
      });

      if (res.ok) {
        router.push("/");
      } else {
        alert("Failed to create agent");
      }
    } catch (e) {
      console.error(e);
      alert("Error creating agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0C0C0D] flex flex-col font-sans selection:bg-[#FA500F] selection:text-white">
      {/* Top Header */}
      <header className="border-b border-[#E6E2DA] bg-[#FAF8F5]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-1.5 rounded hover:bg-[#EFECE6] text-neutral-600 hover:text-black transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Studio</span>
            </Link>

            <span className="text-neutral-300">/</span>

            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#FA500F] text-white">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500 font-bold">
                Agent Creator Studio
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-1.5 rounded text-xs text-neutral-600 hover:text-black font-medium"
            >
              Cancel
            </Link>
            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="px-4 py-2 rounded bg-[#FA500F] hover:bg-[#ff6422] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting ? "Deploying..." : "Save & Launch Agent"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Form Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-mistral-display tracking-tight text-[#0C0C0D]">
            Create a New Autonomous Agent
          </h1>
          <p className="text-xs text-neutral-600">
            Build custom software or hardware agents. Configure intelligence models, instructions, and safety guardrails.
          </p>
        </div>

        {/* Templates Selector */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FA500F]" />
            Quick Starter Templates (Software &amp; Hardware)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handleApplyTemplate("gmail")}
              className="p-3.5 rounded-lg bg-white border border-[#E6E2DA] hover:border-[#FA500F] text-left transition shadow-2xs space-y-1 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0C0C0D] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#FA500F]" /> Gmail Sentinel
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                  Software
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Filters inbox, flags urgent messages, digests high-priority emails.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyTemplate("research")}
              className="p-3.5 rounded-lg bg-white border border-[#E6E2DA] hover:border-[#0066FF] text-left transition shadow-2xs space-y-1 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0C0C0D] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#0066FF]" /> Web Research
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                  Software
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Gathers online intelligence, synthesizes facts, and compiles briefs.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyTemplate("devops")}
              className="p-3.5 rounded-lg bg-white border border-[#E6E2DA] hover:border-purple-500 text-left transition shadow-2xs space-y-1 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0C0C0D] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-600" /> DevOps Sentinel
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                  Software
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Monitors error webhooks, logs, and deployment regressions.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyTemplate("coldchain")}
              className="p-3.5 rounded-lg bg-white border border-[#E6E2DA] hover:border-[#FA500F] text-left transition shadow-2xs space-y-1 group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0C0C0D] flex items-center gap-1.5">
                  ❄️ Cold-Chain IoT
                </span>
                <span className="text-[10px] font-mono text-cyan-700 bg-cyan-50 px-1.5 py-0.2 rounded font-bold">
                  Hardware
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                ESP32 telemetry, defrost learning, and physical OLED mirror.
              </p>
            </button>
          </div>
        </div>

        {/* Form Sections */}
        <div className="space-y-6">
          {/* Section 1: Identity & Scope */}
          <div className="p-6 rounded-xl bg-white border border-[#E6E2DA] shadow-xs space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#FA500F] font-mono flex items-center gap-2">
              <Bot className="w-4 h-4" /> 1. Agent Identity &amp; Scope
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral-800 block">Agent Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gmail Priority Sentinel, Research Analyst, DevOps Watchdog"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-2.5 text-xs text-[#0C0C0D] focus:outline-none focus:border-[#FA500F] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-800 block">Short Mission Description</label>
                <input
                  type="text"
                  placeholder="e.g. Read incoming Gmail messages and extract high-priority emails"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-2.5 text-xs text-[#0C0C0D] focus:outline-none focus:border-[#FA500F] focus:bg-white"
                />
              </div>
            </div>

            {/* Optional Hardware Binding - Clean toggle */}
            <div className="pt-2 border-t border-[#F0EBE1]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hardwareToggle"
                    checked={hasHardware}
                    onChange={(e) => setHasHardware(e.target.checked)}
                    className="accent-[#FA500F] w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="hardwareToggle" className="text-xs font-bold text-neutral-800 cursor-pointer">
                    Connect to Physical Hardware / Microcontroller (Optional)
                  </label>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  hasHardware ? "bg-cyan-50 text-cyan-700" : "bg-emerald-50 text-emerald-700"
                }`}>
                  {hasHardware ? "Hardware Connected" : "Software / Cloud Only"}
                </span>
              </div>

              {hasHardware ? (
                <div className="mt-3 p-3 rounded-lg bg-[#FAF8F5] border border-[#E0DCD4] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-neutral-800">Target Microcontroller / Device ID</label>
                    <span className="text-[10px] font-mono text-neutral-500">e.g. ESP32-S3-COLD-01, Arduino-01</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. ESP32-S3-COLD-01"
                    value={hardwareDeviceId}
                    onChange={(e) => setHardwareDeviceId(e.target.value)}
                    className="w-full bg-white border border-[#E0DCD4] rounded p-2 text-xs font-mono text-[#0C0C0D] focus:outline-none focus:border-[#FA500F]"
                  />
                </div>
              ) : (
                <p className="text-[11px] text-neutral-500 mt-1">
                  This agent operates as a software assistant (Gmail, web research, automation). No microcontroller required.
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Model & Reasoning */}
          <div className="p-6 rounded-xl bg-white border border-[#E6E2DA] shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0066FF] font-mono flex items-center gap-2">
              <Cpu className="w-4 h-4" /> 2. Intelligence &amp; Reasoning Core
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral-800 block">Base Foundation Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-2.5 text-xs font-mono text-[#0C0C0D] focus:outline-none focus:border-[#FA500F]"
                >
                  <option value="open-mistral-nemo">open-mistral-nemo (Mistral Studio • Free Tier • Recommended)</option>
                  <option value="codestral-latest">codestral-latest (Mistral Code &amp; Logic)</option>
                  <option value="mistral-small-latest">mistral-small-latest (Mistral Studio)</option>
                  <option value="google/gemini-2.0-flash-001">google/gemini-2.0-flash-001 (Fast Fallback)</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-neutral-800">Reasoning Temperature: {temperature}</label>
                  <span className="text-[10px] font-mono text-neutral-500">Deterministic</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-[#FA500F] cursor-pointer mt-2"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Instructions (Custom or Auto-Generated) */}
          <div className="p-6 rounded-xl bg-white border border-[#E6E2DA] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 font-mono flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#FA500F]" /> 3. System Instructions &amp; Safety Directives
                </h2>
                <p className="text-[11px] text-neutral-500">
                  Write custom instructions or generate them dynamically based on your mission description.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAutoGeneratePrompt}
                disabled={isGeneratingPrompt}
                className="px-3.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-[#FA500F]/30 text-[#FA500F] font-bold text-xs flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPrompt ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating with Mistral...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate from Mission</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-1">
              <textarea
                rows={9}
                placeholder={`Define how this agent processes tasks, what sources it reads, and what safety boundaries it must observe.

Tip: Click 'Generate from Mission' above to automatically draft tailored instructions from your Agent Name and Description!`}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-3.5 text-xs font-mono text-neutral-900 focus:outline-none focus:border-[#FA500F] focus:bg-white leading-relaxed resize-y"
              />
            </div>
          </div>

          {/* Section 4: Capabilities & Tools */}
          <div className="p-6 rounded-xl bg-white border border-[#E6E2DA] shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-700 font-mono flex items-center gap-2">
                <Wrench className="w-4 h-4" /> 4. Capabilities &amp; Tool Access
              </h2>
              <p className="text-[11px] text-neutral-500">
                Choose the tools this agent is authorized to invoke. Tools are classified by execution risk.
              </p>
            </div>

            {/* Software Capabilities */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-700 block uppercase tracking-wider font-mono">
                Software &amp; Productivity Tools
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  {
                    id: "read_emails",
                    name: "read_emails()",
                    desc: "Scan and parse Gmail inbox messages",
                    risk: "LOW",
                    color: "bg-emerald-50 text-emerald-700 border-emerald-300",
                  },
                  {
                    id: "web_search",
                    name: "web_search()",
                    desc: "Real-time web search and research lookups",
                    risk: "LOW",
                    color: "bg-emerald-50 text-emerald-700 border-emerald-300",
                  },
                  {
                    id: "query_memory",
                    name: "query_memory()",
                    desc: "Episodic memory & learned behavior query",
                    risk: "LOW",
                    color: "bg-emerald-50 text-emerald-700 border-emerald-300",
                  },
                  {
                    id: "send_notification",
                    name: "send_notification()",
                    desc: "Broadcast alerts via WhatsApp, Discord, Telegram",
                    risk: "MEDIUM",
                    color: "bg-amber-50 text-amber-800 border-amber-300",
                  },
                  {
                    id: "database_query",
                    name: "database_query()",
                    desc: "Read records, audit logs, and application state",
                    risk: "LOW",
                    color: "bg-emerald-50 text-emerald-700 border-emerald-300",
                  },
                ].map((tool) => (
                  <div
                    key={tool.id}
                    onClick={() => {
                      if (selectedTools.includes(tool.id)) {
                        setSelectedTools(selectedTools.filter((t) => t !== tool.id));
                      } else {
                        setSelectedTools([...selectedTools, tool.id]);
                      }
                    }}
                    className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition ${
                      selectedTools.includes(tool.id)
                        ? "bg-white border-[#FA500F] shadow-2xs"
                        : "bg-[#FAF8F5] border-[#EAE6DE] opacity-60"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-neutral-900">{tool.name}</span>
                        <span className={`px-1.5 py-0.2 text-[9px] font-mono border rounded ${tool.color}`}>
                          {tool.risk}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500">{tool.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.id)}
                      onChange={() => {}}
                      className="accent-[#FA500F] w-4 h-4 pointer-events-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Hardware Capabilities */}
            <div className="space-y-2 pt-2 border-t border-[#F0EBE1]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700 block uppercase tracking-wider font-mono">
                  Physical Hardware &amp; IoT Tools (Optional)
                </span>
                {!hasHardware && (
                  <span className="text-[10px] text-neutral-400 font-mono italic">
                    Enable hardware binding in Section 1 to use with physical devices
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  {
                    id: "get_sensor_data",
                    name: "get_sensor_data()",
                    desc: "Sample real-time I2C/SPI sensor telemetry from device",
                    risk: "LOW",
                    color: "bg-emerald-50 text-emerald-700 border-emerald-300",
                  },
                  {
                    id: "emergency_relay_cutoff",
                    name: "emergency_relay_cutoff()",
                    desc: "Physical actuator cutoff (Strict Human Approval Gated)",
                    risk: "HIGH",
                    color: "bg-rose-50 text-rose-700 border-rose-300",
                  },
                ].map((tool) => (
                  <div
                    key={tool.id}
                    onClick={() => {
                      if (selectedTools.includes(tool.id)) {
                        setSelectedTools(selectedTools.filter((t) => t !== tool.id));
                      } else {
                        setSelectedTools([...selectedTools, tool.id]);
                      }
                    }}
                    className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition ${
                      selectedTools.includes(tool.id)
                        ? "bg-white border-[#FA500F] shadow-2xs"
                        : "bg-[#FAF8F5] border-[#EAE6DE] opacity-60"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-neutral-900">{tool.name}</span>
                        <span className={`px-1.5 py-0.2 text-[9px] font-mono border rounded ${tool.color}`}>
                          {tool.risk}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500">{tool.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.id)}
                      onChange={() => {}}
                      className="accent-[#FA500F] w-4 h-4 pointer-events-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5: Channels */}
          <div className="p-6 rounded-xl bg-white border border-[#E6E2DA] shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-purple-700 font-mono flex items-center gap-2">
              <Share2 className="w-4 h-4" /> 5. Connected Messaging Channels
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E6E2DA] flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-bold text-neutral-900 block">WhatsApp</span>
                  <span className="text-[10px] text-neutral-500">Baileys Gateway</span>
                </div>
                <input
                  type="checkbox"
                  checked={selectedChannels.whatsapp}
                  onChange={(e) =>
                    setSelectedChannels({ ...selectedChannels, whatsapp: e.target.checked })
                  }
                  className="accent-[#FA500F] w-4 h-4"
                />
              </label>

              <label className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E6E2DA] flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-bold text-neutral-900 block">Discord</span>
                  <span className="text-[10px] text-neutral-500">Channel Webhooks</span>
                </div>
                <input
                  type="checkbox"
                  checked={selectedChannels.discord}
                  onChange={(e) =>
                    setSelectedChannels({ ...selectedChannels, discord: e.target.checked })
                  }
                  className="accent-[#FA500F] w-4 h-4"
                />
              </label>

              <label className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E6E2DA] flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-bold text-neutral-900 block">Telegram</span>
                  <span className="text-[10px] text-neutral-500">Bot API</span>
                </div>
                <input
                  type="checkbox"
                  checked={selectedChannels.telegram}
                  onChange={(e) =>
                    setSelectedChannels({ ...selectedChannels, telegram: e.target.checked })
                  }
                  className="accent-[#FA500F] w-4 h-4"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 flex items-center justify-end gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg border border-[#E0DCD4] bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition"
          >
            Cancel
          </Link>
          <button
            onClick={handleCreate}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg bg-[#FA500F] hover:bg-[#ff6422] text-white font-bold text-xs shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {isSubmitting ? "Deploying..." : "Save & Launch Agent in Studio"}
          </button>
        </div>
      </main>
    </div>
  );
}
