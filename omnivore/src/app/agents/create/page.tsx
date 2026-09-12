"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  Loader2,
  Plus,
  ExternalLink,
  Search,
  Filter,
  X,
  Code2,
  CheckCircle2,
  Info,
  Key,
  Eye,
  EyeOff,
  Server,
} from "lucide-react";
import { AgentSkill, SKILLS_SH_CATALOG } from "@/skills/registry";

export default function CreateAgentPage() {
  const router = useRouter();

  // Agent State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [model, setModel] = useState("sapiens-frontier-nemo");
  const [temperature, setTemperature] = useState(0.2);

  // BYOK (Bring Your Own API Key)
  const [customApiKey, setCustomApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [customEndpoint, setCustomEndpoint] = useState("");

  // Hardware binding (completely optional)
  const [hasHardware, setHasHardware] = useState(false);
  const [hardwareDeviceId, setHardwareDeviceId] = useState("ESP32-S3-COLD-01");

  // Instructions
  const [instructions, setInstructions] = useState("");
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

  // Available Skills Registry
  const [availableSkills, setAvailableSkills] = useState<AgentSkill[]>(SKILLS_SH_CATALOG);
  const [selectedTools, setSelectedTools] = useState<string[]>([
    "query_memory",
    "send_notification",
  ]);
  const [skillCategoryFilter, setSkillCategoryFilter] = useState<string>("all");
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [isMatchingSkills, setIsMatchingSkills] = useState(false);
  const [skillsToast, setSkillsToast] = useState<string | null>(null);

  // Custom Skill Modal State
  const [showCustomSkillModal, setShowCustomSkillModal] = useState(false);
  const [customSkillPrompt, setCustomSkillPrompt] = useState("");
  const [isGeneratingSkill, setIsGeneratingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillFunction, setNewSkillFunction] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState<AgentSkill["category"]>("productivity");
  const [newSkillRisk, setNewSkillRisk] = useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [newSkillParams, setNewSkillParams] = useState<
    Array<{ name: string; type: string; required: boolean; description: string }>
  >([{ name: "input", type: "string", required: true, description: "Input data or query" }]);
  const [isSavingSkill, setIsSavingSkill] = useState(false);

  // Connected Channels
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

  // Fetch Skills & Saved BYOK Key on Mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("sapiens_custom_api_key");
      if (savedKey) setCustomApiKey(savedKey);
      const savedEndpoint = localStorage.getItem("sapiens_custom_endpoint");
      if (savedEndpoint) setCustomEndpoint(savedEndpoint);
    }

    fetch("/api/skills")
      .then((res) => res.json())
      .then((data) => {
        if (data.skills?.length) {
          setAvailableSkills(data.skills);
        }
      })
      .catch((err) => console.warn("Could not load skills catalog:", err));
  }, []);

  // Dynamic Prompt Generator powered by Sapiens Intelligence
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
          apiKey: customApiKey.trim() || undefined,
          endpoint: customEndpoint.trim() || undefined,
          model,
        }),
      });

      const data = await res.json();
      if (data.prompt) {
        setInstructions(data.prompt);

        // Also automatically discover skills for this mission!
        handleMatchSkillsFromRegistry();
      }
    } catch (err) {
      console.error("Prompt generation failed:", err);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Discover & Match Skills from skills.sh
  const handleMatchSkillsFromRegistry = async () => {
    if (!name.trim() && !description.trim()) {
      alert("Please enter an Agent Name or Mission Description so we can match skills from skills.sh.");
      return;
    }

    setIsMatchingSkills(true);
    try {
      const res = await fetch("/api/skills/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName: name,
          mission: description,
        }),
      });

      const data = await res.json();
      if (data.matchedIds?.length) {
        const unionTools = Array.from(new Set([...selectedTools, ...data.matchedIds]));
        setSelectedTools(unionTools);
        setSkillsToast(`Matched ${data.matchedIds.length} skills from skills.sh for this mission!`);
        setTimeout(() => setSkillsToast(null), 5000);
      }
    } catch (e) {
      console.error("Skills.sh matching error:", e);
    } finally {
      setIsMatchingSkills(false);
    }
  };

  // AI Auto-Draft Custom Skill using Sapiens Intelligence
  const handleAiDraftSkill = async () => {
    if (!customSkillPrompt.trim() && !description.trim()) {
      alert("Please enter a short description of what the skill should do.");
      return;
    }

    setIsGeneratingSkill(true);
    try {
      const res = await fetch("/api/skills/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: customSkillPrompt || description,
          mission: description,
          apiKey: customApiKey.trim() || undefined,
          endpoint: customEndpoint.trim() || undefined,
          model,
        }),
      });

      const data = await res.json();
      if (data.skill) {
        setNewSkillName(data.skill.name || "");
        setNewSkillFunction(data.skill.functionName || "");
        setNewSkillDesc(data.skill.description || "");
        setNewSkillCategory(data.skill.category || "productivity");
        setNewSkillRisk(data.skill.risk || "LOW");
        if (data.skill.parameters?.length) {
          setNewSkillParams(data.skill.parameters);
        }
      }
    } catch (e) {
      console.error("AI Skill generation error:", e);
    } finally {
      setIsGeneratingSkill(false);
    }
  };

  // Save and Register Custom Skill (Proper creation & validation)
  const handleSaveCustomSkill = async () => {
    if (!newSkillName.trim()) {
      alert("Please provide a Skill Name.");
      return;
    }
    if (!newSkillDesc.trim() || newSkillDesc.trim().length < 10) {
      alert("Please provide a descriptive explanation of what the skill executes (min 10 chars).");
      return;
    }

    setIsSavingSkill(true);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSkillName,
          functionName: newSkillFunction || newSkillName,
          description: newSkillDesc,
          category: newSkillCategory,
          risk: newSkillRisk,
          parameters: newSkillParams,
          source: "custom",
        }),
      });

      const data = await res.json();
      if (data.success && data.skill) {
        setAvailableSkills((prev) => [data.skill, ...prev.filter((s) => s.id !== data.skill.id)]);
        setSelectedTools((prev) => Array.from(new Set([...prev, data.skill.id])));
        setShowCustomSkillModal(false);
        setSkillsToast(`Custom skill ${data.skill.functionName} successfully created and registered!`);
        setTimeout(() => setSkillsToast(null), 5000);

        // Reset form
        setCustomSkillPrompt("");
        setNewSkillName("");
        setNewSkillFunction("");
        setNewSkillDesc("");
      } else {
        alert(data.error || "Failed to create skill.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving custom skill.");
    } finally {
      setIsSavingSkill(false);
    }
  };

  // Quick Starter Templates
  const handleApplyTemplate = (type: "gmail" | "research" | "devops" | "coldchain") => {
    if (type === "gmail") {
      setName("Gmail Priority Sentinel");
      setDescription("Monitor Gmail inbox, filter noise, extract urgent emails, and provide priority digests.");
      setGoal("Read Gmail inbox and surface actionable high-priority emails.");
      setHasHardware(false);
      setSelectedTools(["gmail_read_inbox", "gmail_send_digest", "query_memory", "send_notification"]);
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
      setSelectedTools(["web_search", "pdf_doc_reader", "query_memory", "send_notification"]);
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
      setSelectedTools(["github_issue_monitor", "database_query", "query_memory", "send_notification"]);
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
      setSelectedTools(["get_sensor_data", "emergency_relay_cutoff", "query_memory", "send_notification"]);
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
            apiKey: customApiKey.trim() || null,
            endpoint: customEndpoint.trim() || null,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.agent) {
        if (typeof window !== "undefined") {
          localStorage.setItem("sapiens_active_agent_id", data.agent.id);
          try {
            const local = JSON.parse(
              localStorage.getItem("sapiens_custom_agents") || "[]"
            );
            localStorage.setItem(
              "sapiens_custom_agents",
              JSON.stringify([data.agent, ...local.filter((a: any) => a.id !== data.agent.id)])
            );
          } catch (e) {}
        }
        router.push(`/?agentId=${data.agent.id}`);
      } else {
        alert(data.error || "Failed to create agent");
      }
    } catch (e) {
      console.error(e);
      alert("Error creating agent");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter skills based on category and search
  const filteredSkills = availableSkills.filter((s) => {
    if (skillCategoryFilter !== "all" && s.category !== skillCategoryFilter) {
      return false;
    }
    if (skillSearchQuery.trim()) {
      const q = skillSearchQuery.toLowerCase();
      const match =
        s.name.toLowerCase().includes(q) ||
        s.functionName.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0C0C0D] flex flex-col font-sans selection:bg-[#71ce34] selection:text-white">
      {/* Top Header */}
      <header className="border-b border-[#E6E2DA] bg-[#FAF8F5]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link
              href="/"
              className="p-1.5 rounded-lg hover:bg-[#EFECE6] text-neutral-600 hover:text-black transition flex items-center gap-1.5 text-xs font-semibold shrink-0 interactive-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Studio</span>
              <span className="sm:hidden">Studio</span>
            </Link>

            <span className="text-neutral-300">/</span>

            <div className="flex items-center gap-2 truncate">
              <Image
                src="/logo.png"
                alt="Sapiens Logo"
                width={20}
                height={20}
                className="w-5 h-5 object-contain rounded shrink-0"
              />
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-500 font-bold truncate">
                Sapiens Studio
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs text-neutral-600 hover:text-black font-medium transition interactive-btn"
            >
              Cancel
            </Link>
            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className="px-3 sm:px-4 py-2 rounded-lg bg-[#71ce34] hover:bg-[#62b62b] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer interactive-btn hover-lift"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Deploying..." : "Save & Launch"}</span>
              <span className="hidden sm:inline">{!isSubmitting && " Agent"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Form Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-sapiens-display tracking-tight text-[#0C0C0D]">
            Create a New Autonomous Agent
          </h1>
          <p className="text-xs text-neutral-600">
            Build custom software or hardware agents. Configure intelligence models, dynamic instructions, and skills from skills.sh.
          </p>
        </div>

        {/* Templates Selector */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#71ce34]" />
            Quick Starter Templates (Software &amp; Hardware)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handleApplyTemplate("gmail")}
              className="p-3.5 rounded-lg bg-white border border-[#E6E2DA] hover:border-[#71ce34] text-left transition shadow-2xs space-y-1 group cursor-pointer hover-lift interactive-btn"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0C0C0D] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#71ce34]" /> Gmail Sentinel
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
              className="p-3.5 rounded-lg bg-white border border-[#E6E2DA] hover:border-[#0066FF] text-left transition shadow-2xs space-y-1 group cursor-pointer hover-lift interactive-btn"
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
              className="p-3.5 rounded-lg bg-white border border-[#E6E2DA] hover:border-purple-500 text-left transition shadow-2xs space-y-1 group cursor-pointer hover-lift interactive-btn"
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
              className="p-3.5 rounded-lg bg-white border border-[#E6E2DA] hover:border-[#71ce34] text-left transition shadow-2xs space-y-1 group cursor-pointer hover-lift interactive-btn"
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
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#71ce34] font-mono flex items-center gap-2">
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
                  className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-2.5 text-xs text-[#0C0C0D] focus:outline-none focus:border-[#71ce34] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-800 block">Short Mission Description</label>
                <input
                  type="text"
                  placeholder="e.g. Read incoming Gmail messages and extract high-priority emails"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-2.5 text-xs text-[#0C0C0D] focus:outline-none focus:border-[#71ce34] focus:bg-white"
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
                    className="accent-[#71ce34] w-4 h-4 cursor-pointer"
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
                    className="w-full bg-white border border-[#E0DCD4] rounded p-2 text-xs font-mono text-[#0C0C0D] focus:outline-none focus:border-[#71ce34]"
                  />
                </div>
              ) : (
                <p className="text-[11px] text-neutral-500 mt-1">
                  This agent operates as a software assistant (Gmail, web research, automation). No microcontroller required.
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Model & Reasoning & BYOK */}
          <div className="p-6 rounded-xl bg-white border border-[#E6E2DA] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#0066FF] font-mono flex items-center gap-2">
                <Cpu className="w-4 h-4" /> 2. Intelligence &amp; Reasoning Core
              </h2>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition ${
                    customApiKey.trim()
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-blue-50 text-[#0066FF] border-blue-200"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${customApiKey.trim() ? "bg-emerald-500 animate-pulse" : "bg-[#0066FF]"}`} />
                  {customApiKey.trim() ? "⚡ Custom API Key Active (BYOK)" : "🟢 Platform Free Tier Active"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral-800 block">Base Foundation Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-2.5 text-xs font-mono text-[#0C0C0D] focus:outline-none focus:border-[#71ce34]"
                >
                  <option value="sapiens-frontier-nemo">sapiens-frontier-nemo (Sapiens Frontier • Free Tier • Recommended)</option>
                  <option value="sapiens-code-latest">sapiens-code-latest (Sapiens Code &amp; Logic)</option>
                  <option value="sapiens-small-latest">sapiens-small-latest (Sapiens Fast Tier)</option>
                  <option value="google/gemini-2.0-flash-001">gemini-2.0-flash-001 (Google Gemini)</option>
                  <option value="openai/gpt-4o">gpt-4o (OpenAI GPT-4o)</option>
                  <option value="anthropic/claude-3-5-sonnet">claude-3-5-sonnet (Anthropic Claude)</option>
                  <option value="custom-llm">custom-llm (Custom OpenAI-Compatible Endpoint)</option>
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
                  className="w-full accent-[#71ce34] cursor-pointer mt-2"
                />
              </div>
            </div>

            {/* BYOK: Bring Your Own API Key Container */}
            <div className="p-4 rounded-lg bg-[#FAF8F5] border border-[#E6E2DA] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#FA500F]" />
                  <span>Bring Your Own API Key (BYOK)</span>
                </label>
                <span className="text-[10px] font-mono text-neutral-500">
                  Optional • Leave blank to use platform tier
                </span>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={customApiKey}
                  onChange={(e) => {
                    setCustomApiKey(e.target.value);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("sapiens_custom_api_key", e.target.value);
                    }
                  }}
                  placeholder="Paste your private API key (e.g. sk-proj-..., AIzaSy..., or custom token)"
                  className="w-full bg-white border border-[#E0DCD4] rounded-lg pl-3 pr-20 py-2.5 text-xs font-mono text-[#0C0C0D] focus:outline-none focus:border-[#FA500F]"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  {customApiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomApiKey("");
                        if (typeof window !== "undefined") {
                          localStorage.removeItem("sapiens_custom_api_key");
                        }
                      }}
                      className="px-1.5 py-0.5 text-[10px] text-neutral-400 hover:text-rose-600 font-mono transition cursor-pointer"
                      title="Clear Key"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                    title={showApiKey ? "Hide Key" : "Show Key"}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-[11px] text-neutral-500">
                <Info className="w-3.5 h-3.5 shrink-0 text-[#FA500F] mt-0.5" />
                <span>
                  Provide your own API key to bypass shared rate limits, use private enterprise keys, or access custom model providers. Keys are stored safely in local browser storage and used for instructions generation, skill synthesis, and runtime execution.
                </span>
              </div>

              {model === "custom-llm" && (
                <div className="pt-2 border-t border-[#EAE6DE] space-y-1.5">
                  <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-[#0066FF]" />
                    <span>Custom API Base URL (OpenAI-compatible)</span>
                  </label>
                  <input
                    type="text"
                    value={customEndpoint}
                    onChange={(e) => {
                      setCustomEndpoint(e.target.value);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("sapiens_custom_endpoint", e.target.value);
                      }
                    }}
                    placeholder="https://api.openai.com/v1 or http://localhost:11434/v1"
                    className="w-full bg-white border border-[#E0DCD4] rounded-lg p-2.5 text-xs font-mono text-[#0C0C0D] focus:outline-none focus:border-[#FA500F]"
                  />
                  <p className="text-[10px] text-neutral-400 font-mono">
                    Target any OpenAI-compatible server: Ollama, vLLM, LM Studio, Groq, or OpenRouter.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Instructions (Custom or Auto-Generated) */}
          <div className="p-6 rounded-xl bg-white border border-[#E6E2DA] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 font-mono flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#71ce34]" /> 3. System Instructions &amp; Safety Directives
                </h2>
                <p className="text-[11px] text-neutral-500">
                  Write custom instructions or generate them dynamically based on your mission description.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAutoGeneratePrompt}
                disabled={isGeneratingPrompt}
                className="px-3.5 py-1.5 rounded-lg bg-[#71ce34]/10 hover:bg-[#71ce34]/20 border border-[#71ce34]/30 text-[#71ce34] font-bold text-xs flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPrompt ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating with Sapiens AI...</span>
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
                className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-3.5 text-xs font-mono text-neutral-900 focus:outline-none focus:border-[#71ce34] focus:bg-white leading-relaxed resize-y"
              />
            </div>
          </div>

          {/* Section 4: Capabilities & Tools (Integrated with skills.sh & Custom Skill Builder) */}
          <div className="p-6 rounded-xl bg-white border border-[#E6E2DA] shadow-xs space-y-5">
            {/* Header with Skills.sh Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0EBE1] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-700 font-mono flex items-center gap-2">
                    <Wrench className="w-4 h-4" /> 4. Capabilities &amp; Tool Access
                  </h2>
                  <a
                    href="https://skills.sh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#0066FF] border border-blue-200 hover:bg-blue-100 transition flex items-center gap-1 font-bold"
                  >
                    <span>skills.sh Hub</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Select pre-indexed tools from <span className="font-semibold text-neutral-700">skills.sh</span>, discover matching skills for your mission, or create your own custom tools.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleMatchSkillsFromRegistry}
                  disabled={isMatchingSkills}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  title="Search and match skills from skills.sh for this mission"
                >
                  {isMatchingSkills ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Matching skills.sh...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Match from skills.sh</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCustomSkillModal(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#71ce34] hover:bg-[#62b62b] text-white font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Custom Skill</span>
                </button>
              </div>
            </div>

            {/* Notification Toast */}
            {skillsToast && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2 font-medium animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{skillsToast}</span>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 text-xs">
                {[
                  { id: "all", label: "All Skills" },
                  { id: "productivity", label: "Productivity & Workspace" },
                  { id: "search", label: "Search & Web" },
                  { id: "communications", label: "Alerts & Channels" },
                  { id: "data", label: "Data & Memory" },
                  { id: "devops", label: "Cloud & DevOps" },
                  { id: "iot", label: "Hardware & IoT" },
                  { id: "custom", label: "Custom" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSkillCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition cursor-pointer interactive-btn ${
                      skillCategoryFilter === cat.id
                        ? "bg-[#0C0C0D] text-white font-bold"
                        : "bg-[#FAF8F5] hover:bg-[#EFECE6] text-neutral-700 border border-[#E6E2DA]"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={skillSearchQuery}
                  onChange={(e) => setSkillSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E0DCD4] text-xs text-neutral-800 focus:outline-none focus:border-[#71ce34] focus:bg-white"
                />
              </div>
            </div>

            {/* Skills Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {filteredSkills.map((skill) => {
                const isSelected = selectedTools.includes(skill.id);
                return (
                  <div
                    key={skill.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTools(selectedTools.filter((t) => t !== skill.id));
                      } else {
                        setSelectedTools([...selectedTools, skill.id]);
                      }
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer flex flex-col justify-between transition-all duration-200 hover-lift ${
                      isSelected
                        ? "bg-white border-[#71ce34] shadow-xs ring-1 ring-[#71ce34]/30"
                        : "bg-[#FAF8F5] border-[#EAE6DE] hover:border-neutral-400 opacity-80"
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-neutral-900 text-xs">
                            {skill.functionName}
                          </span>

                          {/* Source Badge */}
                          {skill.source === "skills.sh" ? (
                            <span className="px-1.5 py-0.2 text-[9px] font-mono border rounded bg-blue-50 text-[#0066FF] border-blue-200 font-bold">
                              skills.sh
                            </span>
                          ) : skill.source === "custom" ? (
                            <span className="px-1.5 py-0.2 text-[9px] font-mono border rounded bg-purple-50 text-purple-700 border-purple-200 font-bold">
                              custom
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 text-[9px] font-mono border rounded bg-neutral-100 text-neutral-600 border-neutral-300 font-bold">
                              core
                            </span>
                          )}

                          {/* Risk Badge */}
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-mono border rounded font-bold ${
                              skill.risk === "LOW"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : skill.risk === "MEDIUM"
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : "bg-rose-50 text-rose-700 border-rose-300"
                            }`}
                          >
                            {skill.risk}
                          </span>
                        </div>

                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="accent-[#71ce34] w-4 h-4 pointer-events-none shrink-0"
                        />
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-neutral-600 leading-relaxed">
                        {skill.description}
                      </p>
                    </div>

                    {/* Parameters Preview */}
                    {skill.parameters && skill.parameters.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-[#F0EBE1] flex items-center justify-between text-[10px] font-mono text-neutral-500">
                        <span>
                          params: {skill.parameters.map((p) => p.name).join(", ")}
                        </span>
                        <span className="capitalize text-neutral-400">
                          {skill.category}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredSkills.length === 0 && (
              <div className="p-8 text-center bg-[#FAF8F5] rounded-xl border border-dashed border-[#E0DCD4] space-y-2">
                <p className="text-xs text-neutral-600">No skills match the current filter.</p>
                <button
                  type="button"
                  onClick={() => setShowCustomSkillModal(true)}
                  className="px-3 py-1.5 bg-[#71ce34] text-white text-xs font-bold rounded shadow-xs"
                >
                  Create Custom Skill
                </button>
              </div>
            )}
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
                  className="accent-[#71ce34] w-4 h-4"
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
                  className="accent-[#71ce34] w-4 h-4"
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
                  className="accent-[#71ce34] w-4 h-4"
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
            className="px-6 py-2.5 rounded-lg bg-[#71ce34] hover:bg-[#62b62b] text-white font-bold text-xs shadow-md transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {isSubmitting ? "Deploying..." : "Save & Launch Agent in Studio"}
          </button>
        </div>
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: CREATE CUSTOM SKILL (WITH SAPIENS AI AUTODRAFT)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showCustomSkillModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#E6E2DA] max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-fade-in-scale">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E6E2DA] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#71ce34] text-white">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0C0C0D]">Create &amp; Register Custom Skill</h3>
                  <p className="text-[11px] text-neutral-500">
                    Compliant with <span className="font-semibold text-[#0066FF]">skills.sh</span> and Eve tool runtime.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomSkillModal(false)}
                className="text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AI Auto-Draft Prompt Banner */}
            <div className="p-3 rounded-xl bg-[#F2FAEE] border border-[#71ce34]/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#71ce34] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> AI Skill Architect (Sapiens Intelligence)
                </span>
                <span className="text-[10px] font-mono text-neutral-500">Auto-Generates Valid Schema</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Read Gmail inbox attachments and extract invoices..."
                  value={customSkillPrompt}
                  onChange={(e) => setCustomSkillPrompt(e.target.value)}
                  className="flex-1 bg-white border border-[#E0DCD4] rounded-lg p-2 text-xs text-[#0C0C0D] focus:outline-none focus:border-[#71ce34]"
                />
                <button
                  type="button"
                  onClick={handleAiDraftSkill}
                  disabled={isGeneratingSkill}
                  className="px-3 py-1.5 rounded-lg bg-[#71ce34] hover:bg-[#62b62b] text-white font-bold text-xs shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingSkill ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Draft</span>
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-800 block">Skill Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gmail Priority Filter"
                    value={newSkillName}
                    onChange={(e) => {
                      setNewSkillName(e.target.value);
                      if (!newSkillFunction) {
                        setNewSkillFunction(
                          e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_") + "()"
                        );
                      }
                    }}
                    className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-2 text-xs focus:outline-none focus:border-[#71ce34] focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-800 block">Function Signature *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. filter_urgent_emails()"
                    value={newSkillFunction}
                    onChange={(e) => setNewSkillFunction(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-[#71ce34] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-neutral-800 block">Category</label>
                  <select
                    value={newSkillCategory}
                    onChange={(e) => setNewSkillCategory(e.target.value as any)}
                    className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-2 text-xs focus:outline-none focus:border-[#71ce34]"
                  >
                    <option value="productivity">Productivity (Gmail, Office)</option>
                    <option value="search">Search &amp; Research</option>
                    <option value="data">Data &amp; Memory</option>
                    <option value="devops">DevOps &amp; Infrastructure</option>
                    <option value="communications">Communications &amp; Alerts</option>
                    <option value="iot">Hardware &amp; IoT</option>
                    <option value="custom">Custom Utility</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-neutral-800 block">Execution Risk Classification</label>
                  <select
                    value={newSkillRisk}
                    onChange={(e) => setNewSkillRisk(e.target.value as any)}
                    className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-2 text-xs font-bold focus:outline-none focus:border-[#71ce34]"
                  >
                    <option value="LOW">LOW (Read-only, auto-approved)</option>
                    <option value="MEDIUM">MEDIUM (Notifications, external webhooks)</option>
                    <option value="HIGH">HIGH (Physical relay cutoff, human gated)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-800 block">Operational Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain exactly what this skill executes, what APIs it calls, and when the agent should trigger it..."
                  value={newSkillDesc}
                  onChange={(e) => setNewSkillDesc(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-2 text-xs focus:outline-none focus:border-[#71ce34] focus:bg-white resize-none"
                />
              </div>

              {/* Parameters List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-neutral-800">Parameters Schema</label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewSkillParams([
                        ...newSkillParams,
                        { name: "", type: "string", required: true, description: "" },
                      ])
                    }
                    className="text-[10px] font-bold text-[#71ce34] hover:underline cursor-pointer"
                  >
                    + Add Parameter
                  </button>
                </div>

                {newSkillParams.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-[#FAF8F5] p-2 rounded-lg border border-[#EAE6DE]">
                    <input
                      type="text"
                      placeholder="name"
                      value={p.name}
                      onChange={(e) => {
                        const updated = [...newSkillParams];
                        updated[idx].name = e.target.value;
                        setNewSkillParams(updated);
                      }}
                      className="w-28 bg-white border border-[#E0DCD4] rounded p-1 text-xs font-mono"
                    />
                    <select
                      value={p.type}
                      onChange={(e) => {
                        const updated = [...newSkillParams];
                        updated[idx].type = e.target.value;
                        setNewSkillParams(updated);
                      }}
                      className="bg-white border border-[#E0DCD4] rounded p-1 text-xs font-mono"
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                    </select>
                    <input
                      type="text"
                      placeholder="description"
                      value={p.description}
                      onChange={(e) => {
                        const updated = [...newSkillParams];
                        updated[idx].description = e.target.value;
                        setNewSkillParams(updated);
                      }}
                      className="flex-1 bg-white border border-[#E0DCD4] rounded p-1 text-xs"
                    />
                    {newSkillParams.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setNewSkillParams(newSkillParams.filter((_, i) => i !== idx))}
                        className="text-neutral-400 hover:text-red-500 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E2DA]">
              <button
                type="button"
                onClick={() => setShowCustomSkillModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-600 hover:text-black cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomSkill}
                disabled={isSavingSkill}
                className="px-5 py-2 rounded-lg bg-[#71ce34] hover:bg-[#62b62b] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                {isSavingSkill ? "Registering Tool..." : "Validate & Register Skill"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
