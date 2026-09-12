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
  Sliders,
  Play,
} from "lucide-react";

export default function CreateAgentPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [model, setModel] = useState("open-mistral-nemo");
  const [temperature, setTemperature] = useState(0.2);
  const [hardwareDeviceId, setHardwareDeviceId] = useState("ESP32-S3-COLD-01");
  const [instructions, setInstructions] = useState(
    `You are an autonomous guardian agent. Your goal is to monitor sensor telemetry, evaluate anomalies against learned episodic memory, and enforce strict execution boundaries.
1. When receiving telemetry, cross-reference with historical patterns.
2. If an anomaly matches an authorized routine, hold emergency alarms.
3. If genuine breach occurs, trigger priority notifications.
4. Any hardware shutdown requires explicit human authorization.`
  );

  const [selectedTools, setSelectedTools] = useState<string[]>([
    "get_sensor_data",
    "query_memory",
    "send_notification",
    "emergency_compressor_cutoff",
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

  // Template Quick Loader
  const handleApplyTemplate = (type: "coldchain" | "pharma" | "industrial") => {
    if (type === "coldchain") {
      setName("Vaccine Storage Sentinel");
      setDescription("Ultra-low temperature monitor with automated defrost cycle learning.");
      setGoal("Maintain container COLD-01 at -18°C and suppress false alarms.");
      setHardwareDeviceId("ESP32-S3-COLD-01");
      setInstructions(`You are the Vaccine Storage Sentinel.
Your mission is to maintain vaccine cold-storage at -18°C.
- Read ESP32 sensor telemetry via get_sensor_data.
- Check past episodic experiences for bi-daily 02:00 UTC defrost cycles.
- Suppress sirens if temp rises to -14°C during scheduled defrost.
- Never shut down compressor without human authorization.`);
    } else if (type === "pharma") {
      setName("Pharma Cleanroom Monitor");
      setDescription("Environmental monitor tracking relative humidity and door micro-apertures.");
      setGoal("Keep cleanroom humidity under 60% and monitor airlock duration.");
      setHardwareDeviceId("ESP32-S3-CLEANROOM");
      setInstructions(`You are the Pharma Cleanroom Monitor.
Your mission is to preserve pharmaceutical integrity.
- Monitor relative humidity and door seal sensors.
- If door stays open for > 45 seconds, notify cleanroom supervisor.
- Learn routine forklift transfer patterns to prevent spurious alerts.`);
    } else if (type === "industrial") {
      setName("Thermal Overload Watchdog");
      setDescription("High-current motor and compressor guardian protecting against thermal runaway.");
      setGoal("Prevent compressor stator burnout while maintaining uptime.");
      setHardwareDeviceId("ESP32-S3-MOTOR-01");
      setInstructions(`You are the Thermal Overload Watchdog.
- Monitor compressor thermal rise rate (°C per minute).
- If temperature delta exceeds +6.0°C/min, enter high-alert quarantine.
- Request human authorization before initiating emergency breaker cutoff.`);
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
          instructions,
          model,
          tools: selectedTools,
        }),
      });

      if (res.ok) {
        // Redirect back to studio builder
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
              className="px-4 py-2 rounded bg-[#FA500F] hover:bg-[#ff6422] text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
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
            Configure agent identity, reasoning models, hardware bindings, and deterministic guardrail boundaries.
          </p>
        </div>

        {/* Templates Selector */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FA500F]" />
            Quick Starter Templates
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleApplyTemplate("coldchain")}
              className="p-3.5 rounded-lg bg-white border border-[#E6E2DA] hover:border-[#FA500F] text-left transition shadow-2xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0C0C0D]">❄️ Vaccine Cold-Chain</span>
                <span className="text-[10px] font-mono text-[#FA500F] bg-orange-50 px-1.5 py-0.2 rounded font-bold">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Auto-learns defrost cycles and suppresses false alarms.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyTemplate("pharma")}
              className="p-3.5 rounded-lg bg-white border border-[#E6E2DA] hover:border-[#FA500F] text-left transition shadow-2xs space-y-1"
            >
              <span className="text-xs font-bold text-[#0C0C0D] block">💊 Cleanroom Monitor</span>
              <p className="text-[11px] text-neutral-500">
                Monitors airlocks, relative humidity, and door micro-apertures.
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleApplyTemplate("industrial")}
              className="p-3.5 rounded-lg bg-white border border-[#E6E2DA] hover:border-[#FA500F] text-left transition shadow-2xs space-y-1"
            >
              <span className="text-xs font-bold text-[#0C0C0D] block">⚡ Thermal Watchdog</span>
              <p className="text-[11px] text-neutral-500">
                Guards high-power compressors against thermal runaway.
              </p>
            </button>
          </div>
        </div>

        {/* Form Sections */}
        <div className="space-y-6">
          {/* Section 1: Identity */}
          <div className="p-6 rounded-xl bg-white border border-[#E6E2DA] shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#FA500F] font-mono flex items-center gap-2">
              <Bot className="w-4 h-4" /> 1. Agent Identity &amp; Target Hardware
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-neutral-800 block">Agent Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vaccine Storage Sentinel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-2.5 text-xs text-[#0C0C0D] focus:outline-none focus:border-[#FA500F] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-800 block">Target Microcontroller / Device ID</label>
                <input
                  type="text"
                  value={hardwareDeviceId}
                  onChange={(e) => setHardwareDeviceId(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-2.5 text-xs font-mono text-[#0C0C0D] focus:outline-none focus:border-[#FA500F] focus:bg-white"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-neutral-800 block">Short Mission Description</label>
                <input
                  type="text"
                  placeholder="e.g. Autonomous temperature container monitor with continuous reflection"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-2.5 text-xs text-[#0C0C0D] focus:outline-none focus:border-[#FA500F] focus:bg-white"
                />
              </div>
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

          {/* Section 3: Instructions (System Prompt) */}
          <div className="p-6 rounded-xl bg-white border border-[#E6E2DA] shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900 font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#FA500F]" /> 3. System Instructions &amp; Safety Directives
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800 block">
                Agent System Prompt (Markdown)
              </label>
              <textarea
                rows={6}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-[#E0DCD4] rounded-lg p-3 text-xs font-mono text-neutral-900 focus:outline-none focus:border-[#FA500F] focus:bg-white leading-relaxed resize-none"
              />
            </div>
          </div>

          {/* Section 4: Capabilities & Tools */}
          <div className="p-6 rounded-xl bg-white border border-[#E6E2DA] shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-700 font-mono flex items-center gap-2">
              <Wrench className="w-4 h-4" /> 4. Capabilities &amp; Risk Classifications
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                {
                  id: "get_sensor_data",
                  name: "get_sensor_data()",
                  desc: "ESP32 real-time I2C telemetry",
                  risk: "LOW",
                  color: "bg-emerald-50 text-emerald-700 border-emerald-300",
                },
                {
                  id: "query_memory",
                  name: "query_memory()",
                  desc: "Episodic memory & learned policies query",
                  risk: "LOW",
                  color: "bg-emerald-50 text-emerald-700 border-emerald-300",
                },
                {
                  id: "send_notification",
                  name: "send_notification()",
                  desc: "Multi-channel broadcast (WhatsApp, Discord)",
                  risk: "MEDIUM",
                  color: "bg-amber-50 text-amber-800 border-amber-300",
                },
                {
                  id: "emergency_compressor_cutoff",
                  name: "emergency_compressor_cutoff()",
                  desc: "Hardware relay cutoff (Strict Approval Gated)",
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

        {/* Bottom CTA */}
        <div className="pt-4 pb-12 flex items-center justify-end gap-3">
          <Link
            href="/"
            className="px-4 py-2.5 rounded-lg border border-[#E0DCD4] text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"
          >
            Cancel
          </Link>
          <button
            onClick={handleCreate}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg bg-[#FA500F] hover:bg-[#ff6422] text-white font-bold text-xs shadow-md transition flex items-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {isSubmitting ? "Deploying Agent..." : "Save & Launch Agent in Studio"}
          </button>
        </div>
      </main>
    </div>
  );
}
