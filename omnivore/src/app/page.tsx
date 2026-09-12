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
  name: string;
  description: string;
  patternType: string;
  confidence: number;
  frequency: number;
  suggestedPolicy: string;
  status: string;
}

interface Policy {
  id: string;
  policyRule: string;
  triggerCondition: string;
  confidence: number;
  approvedBy: string;
  isActive: boolean;
  appliedCount: number;
}

interface Experience {
  id: string;
  triggerEvent: string;
  actionTaken: string;
  outcome: string;
  wasSuccessful: boolean;
  humanFeedback?: string;
  category: string;
  patternDetected?: boolean;
}

interface ApprovalItem {
  id: string;
  runId: string;
  toolName: string;
  toolParams: any;
  riskLevel: string;
  status: string;
  approvalToken: string;
}

export default function OmnivoreDashboard() {
  const [activeTab, setActiveTab] = useState<
    "telemetry" | "learning" | "guardrails" | "trace" | "hardware"
  >("telemetry");

  // Telemetry State
  const [telemetry, setTelemetry] = useState<TelemetryData>({
    deviceId: "ESP32-S3-COLD-01",
    temperature: -18.3,
    humidity: 82.4,
    doorOpen: false,
    anomalyFlag: false,
  });
  const [telemetryHistory, setTelemetryHistory] = useState<number[]>([
    -18.4, -18.2, -18.5, -18.3, -18.1, -18.3,
  ]);
  const [telemetryLog, setTelemetryLog] = useState<string[]>([
    "[02:00:15] Telemetry received from ESP32-S3: -18.3°C, 82% RH, Door: Closed",
    "[02:00:10] Guardrail engine: All parameters within safe baseline range",
  ]);

  // Learning & Policy State
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isReflecting, setIsReflecting] = useState(false);

  // Guardrail & Approvals State
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [trustScore, setTrustScore] = useState(92.4);

  // Run Trace State
  const [runInput, setRunInput] = useState(
    "Evaluate container COLD-01 status. Defrost heater detected active at 02:00 UTC."
  );
  const [isRunning, setIsRunning] = useState(false);
  const [traceOutput, setTraceOutput] = useState<any>(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      // 1. Fetch patterns & policies
      const patRes = await fetch("/api/learning/patterns");
      if (patRes.ok) {
        const d = await patRes.json();
        setPatterns(d.patterns || []);
        setPolicies(d.policies || []);
        setExperiences(d.experiences || []);
      }

      // 2. Fetch approvals
      const appRes = await fetch("/api/approvals");
      if (appRes.ok) {
        const d = await appRes.json();
        setApprovals(d.approvals || []);
      }

      // 3. Fetch metrics
      const metRes = await fetch("/api/metrics");
      if (metRes.ok) {
        const d = await metRes.json();
        if (d.metrics?.trustScore) setTrustScore(d.metrics.trustScore);
      }
    } catch (e) {
      console.warn("Failed fetching dashboard state:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Send Telemetry Simulation
  const simulateTelemetry = async (
    temp: number,
    humidity: number,
    door: boolean,
    label: string
  ) => {
    const newLog = `[${new Date().toLocaleTimeString()}] Injected simulation: ${label} (${temp}°C, Door: ${door ? "Open" : "Closed"})`;
    setTelemetryLog((prev) => [newLog, ...prev.slice(0, 8)]);

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

      setTelemetryHistory((prev) => [...prev.slice(1), temp]);

      if (data.suppressedByPolicy) {
        setTelemetryLog((prev) => [
          `🛡️ [LEARNED POLICY APPLIED] Anomaly alert suppressed: "${data.policyMatchedRule}"`,
          ...prev.slice(0, 8),
        ]);
      } else if (data.anomalyFlag) {
        setTelemetryLog((prev) => [
          `🚨 [ANOMALY DETECTED] ${data.anomalyReason}`,
          ...prev.slice(0, 8),
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger LLM Reflection Cycle
  const handleReflect = async () => {
    setIsReflecting(true);
    try {
      const res = await fetch("/api/learning/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 5 }),
      });
      await res.json();
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsReflecting(false);
    }
  };

  // Promote Candidate Pattern to Policy
  const handleApprovePattern = async (patternId: string) => {
    try {
      const res = await fetch("/api/learning/approve-policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patternId,
          approvedBy: "Facility Lead (Dashboard)",
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Resolve Approval
  const handleResolveApproval = async (id: string, decision: "approved" | "rejected") => {
    try {
      await fetch(`/api/approvals/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          approvedBy: "Security Officer (Dashboard)",
        }),
      });
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  // Execute Agent Run
  const handleRunAgent = async (overridePrompt?: string) => {
    const promptToUse = overridePrompt || runInput;
    setIsRunning(true);
    setTraceOutput(null);
    try {
      const res = await fetch("/api/agents/omnivore-cold-chain/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: promptToUse }),
      });
      const data = await res.json();
      setTraceOutput(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen text-slate-100">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-400 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/20">
              Ω
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-wider text-white">
                  OMNIVORE<span className="text-cyan-400">AGENT</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 font-mono">
                  graVITas MVP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Give AI Hands, Memory, Adaptation, and Boundaries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Trust Gauge Mini */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Trust Score:</span>
              <span className="text-xs font-bold text-emerald-300 font-mono">
                {trustScore.toFixed(1)}% (A+)
              </span>
            </div>

            {/* Seed / Reset Demo */}
            <button
              onClick={async () => {
                await fetch("/api/demo/seed", { method: "POST" });
                fetchData();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Reset sample telemetry, defrost false alarms, and candidate policies"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Demo
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-800/40">
          {[
            { id: "telemetry", label: "Live Telemetry & ESP32", icon: Activity },
            { id: "learning", label: "Self-Learning Loop", icon: Brain, badge: patterns.filter((p) => p.status === "candidate").length },
            { id: "guardrails", label: "Trust & Guardrails", icon: Shield, badge: approvals.filter((a) => a.status === "pending").length },
            { id: "trace", label: "Run Trace Inspector", icon: Layers },
            { id: "hardware", label: "ESP32 Hardware Bridge", icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition relative ${
                  isActive
                    ? "border-cyan-400 text-cyan-300 bg-cyan-950/20"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                {tab.badge ? (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-cyan-500 text-slate-950">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: LIVE TELEMETRY & ESP32 SIMULATOR */}
        {/* ========================================================================= */}
        {activeTab === "telemetry" && (
          <div className="space-y-6">
            {/* Top Container Status Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-panel p-4 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Device Monitored</span>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-base font-bold text-white">{telemetry.deviceId}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    ONLINE
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1">Vaccine Cold-Vault (Ultra-Low)</span>
              </div>

              <div
                className={`glass-panel p-4 flex flex-col justify-between border ${
                  telemetry.temperature > -10.0
                    ? "border-rose-500/50 bg-rose-950/10"
                    : telemetry.suppressedByPolicy
                    ? "border-cyan-500/50 bg-cyan-950/10"
                    : "border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Temperature</span>
                  <Thermometer className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-black font-mono ${
                      telemetry.temperature > -10.0
                        ? "text-rose-400"
                        : telemetry.suppressedByPolicy
                        ? "text-cyan-300"
                        : "text-emerald-400"
                    }`}
                  >
                    {telemetry.temperature.toFixed(1)}°C
                  </span>
                  <span className="text-xs text-slate-500">target: -18.0°C</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1">
                  {telemetry.suppressedByPolicy
                    ? "Defrost Cycle (Learned Policy Suppressed)"
                    : telemetry.temperature > -10.0
                    ? "Critical Thermal Breach"
                    : "Nominal Cold-Storage"}
                </span>
              </div>

              <div className="glass-panel p-4 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Relative Humidity</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono text-cyan-300">
                    {telemetry.humidity.toFixed(0)}%
                  </span>
                  <span className="text-xs text-slate-500">safe: &lt;85%</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1">No condensation risk</span>
              </div>

              <div className="glass-panel p-4 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Door Sensor</span>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      telemetry.doorOpen ? "bg-rose-500 animate-pulse" : "bg-emerald-400"
                    }`}
                  />
                  <span className="text-lg font-bold text-white">
                    {telemetry.doorOpen ? "DOOR OPEN" : "SECURED / CLOSED"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1">
                  {telemetry.doorOpen ? "Air ingress active" : "Hermetic seal intact"}
                </span>
              </div>
            </div>

            {/* Interactive Simulation Panel */}
            <div className="glass-panel p-5 border border-cyan-500/20 bg-slate-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Interactive ESP32 Telemetry Injector
                  </h3>
                  <p className="text-xs text-slate-400">
                    Test how OMNIVORE AGENT handles nominal conditions, recurring defrost false alarms, and critical breaches.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400 px-2.5 py-1 rounded bg-slate-800">
                  Target: /api/esp32/events
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => simulateTelemetry(-18.2, 81.0, false, "Nominal Storage")}
                  className="px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition flex flex-col gap-1"
                >
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 1. Nominal Telemetry
                  </span>
                  <span className="text-xs text-slate-300">-18.2°C, Door Closed</span>
                  <span className="text-[10px] text-slate-500">Baseline normal operation</span>
                </button>

                <button
                  onClick={() => simulateTelemetry(-14.2, 87.5, false, "Defrost Cycle Spike (02:00 UTC)")}
                  className="px-4 py-3 rounded-xl bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/40 text-left transition flex flex-col gap-1 shadow-lg shadow-cyan-950/30"
                >
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> 2. Defrost Cycle Spike
                  </span>
                  <span className="text-xs text-slate-200">-14.2°C (02:00 UTC)</span>
                  <span className="text-[10px] text-cyan-400/80">
                    Learned Policy will suppress false alarm!
                  </span>
                </button>

                <button
                  onClick={() => simulateTelemetry(+2.5, 94.0, false, "Compressor Failure Breach")}
                  className="px-4 py-3 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/40 text-left transition flex flex-col gap-1"
                >
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> 3. Critical Thermal Breach
                  </span>
                  <span className="text-xs text-slate-200">+2.5°C Emergency</span>
                  <span className="text-[10px] text-rose-400/80">Triggers emergency escalation</span>
                </button>

                <button
                  onClick={() => simulateTelemetry(-15.0, 92.0, true, "Loading Dock Door Open")}
                  className="px-4 py-3 rounded-xl bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/40 text-left transition flex flex-col gap-1"
                >
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5" /> 4. Door Left Open
                  </span>
                  <span className="text-xs text-slate-200">-15.0°C, Door Open</span>
                  <span className="text-[10px] text-amber-400/80">Evaluates door duration threshold</span>
                </button>
              </div>
            </div>

            {/* Real-time Telemetry Event Feed */}
            <div className="glass-panel p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Live Telemetry & Evaluation Stream
              </h3>
              <div className="space-y-2 font-mono text-xs max-h-56 overflow-y-auto">
                {telemetryLog.map((log, index) => (
                  <div
                    key={index}
                    className={`p-2.5 rounded-lg border ${
                      log.includes("LEARNED POLICY")
                        ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-200"
                        : log.includes("ANOMALY")
                        ? "bg-rose-950/40 border-rose-500/30 text-rose-200"
                        : "bg-slate-900/60 border-slate-800 text-slate-300"
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SELF-LEARNING ENGINE */}
        {/* ========================================================================= */}
        {activeTab === "learning" && (
          <div className="space-y-6">
            {/* Header & Reflection Trigger */}
            <div className="glass-panel p-6 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 border border-cyan-500/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg font-bold text-white">
                      Autonomous Self-Learning Architecture
                    </h2>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    OMNIVORE AGENT transforms operational incidents into verified behavioral adaptations:{" "}
                    <span className="text-cyan-400 font-semibold">
                      Experience Capture → LLM Reflection → Statistical Validation → Approved Policy Prompt Injection
                    </span>
                    .
                  </p>
                </div>

                <button
                  onClick={handleReflect}
                  disabled={isReflecting}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isReflecting ? "animate-spin" : ""}`} />
                  {isReflecting ? "Synthesizing Patterns..." : "Trigger LLM Reflection Cycle"}
                </button>
              </div>
            </div>

            {/* The 4-Stage Learning Loop Visualizer */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-panel p-4 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-cyan-400 tracking-wider">STAGE 1</span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <h4 className="text-xs font-bold text-white">Episodic Experiences</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ingests triggers, agent actions, operator overrides, and human feedback.
                </p>
                <div className="mt-3 text-lg font-black text-white font-mono">
                  {experiences.length} records
                </div>
              </div>

              <div className="glass-panel p-4 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-cyan-400 tracking-wider">STAGE 2</span>
                  <Brain className="w-4 h-4 text-cyan-400" />
                </div>
                <h4 className="text-xs font-bold text-white">LLM Reflection</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Clusters repeating anomalies to identify root causes and temporal routines.
                </p>
                <div className="mt-3 text-lg font-black text-cyan-300 font-mono">Active (Gemini 2.0)</div>
              </div>

              <div className="glass-panel p-4 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-amber-400 tracking-wider">STAGE 3</span>
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <h4 className="text-xs font-bold text-white">Candidate Patterns</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Statistical validation checks frequency, variance, and confidence threshold (&gt;80%).
                </p>
                <div className="mt-3 text-lg font-black text-amber-300 font-mono">
                  {patterns.filter((p) => p.status === "candidate").length} pending review
                </div>
              </div>

              <div className="glass-panel p-4 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-emerald-400 tracking-wider">STAGE 4</span>
                  <Shield className="w-4 h-4 text-emerald-400" />
                </div>
                <h4 className="text-xs font-bold text-white">Approved Policies</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Human sign-off gates policy activation. Rules are injected directly into agent prompt.
                </p>
                <div className="mt-3 text-lg font-black text-emerald-300 font-mono">
                  {policies.filter((p) => p.isActive).length} enforced
                </div>
              </div>
            </div>

            {/* Candidate Patterns Table */}
            <div className="glass-panel p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Candidate Patterns Awaiting Promotion
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  Requires human operator sign-off before entering production prompt
                </span>
              </h3>

              <div className="space-y-3">
                {patterns
                  .filter((p) => p.status === "candidate")
                  .map((pat) => (
                    <div
                      key={pat.id}
                      className="p-4 rounded-xl bg-slate-900/80 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{pat.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                            Confidence: {pat.confidence}%
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                            Occurred {pat.frequency}x
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{pat.description}</p>
                        <p className="text-xs text-cyan-300 font-mono">
                          Proposed Rule: &ldquo;{pat.suggestedPolicy}&rdquo;
                        </p>
                      </div>

                      <button
                        onClick={() => handleApprovePattern(pat.id)}
                        className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve as Active Policy
                      </button>
                    </div>
                  ))}

                {patterns.filter((p) => p.status === "candidate").length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No candidate patterns pending approval. Click &ldquo;Trigger LLM Reflection Cycle&rdquo; above to analyze recent experiences.
                  </div>
                )}
              </div>
            </div>

            {/* Active Enforced Policies */}
            <div className="glass-panel p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Active Learned Policies (Injected into Agent Instructions)
              </h3>
              <div className="space-y-3">
                {policies.map((pol) => (
                  <div
                    key={pol.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-300">
                          Enforced Policy Rule
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Applied {pol.appliedCount} times
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Approved by: {pol.approvedBy}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 font-mono">&ldquo;{pol.policyRule}&rdquo;</p>
                      <p className="text-[11px] text-slate-400">
                        Condition: {pol.triggerCondition}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-emerald-400">
                      ACTIVE IN PROMPT
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Episodic Experiences Log */}
            <div className="glass-panel p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Recent Episodic Experiences (Memory Store)
              </h3>
              <div className="space-y-2">
                {experiences.slice(0, 4).map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-bold text-slate-200">{exp.triggerEvent}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800">
                        {exp.category}
                      </span>
                    </div>
                    <div className="text-slate-300">Action: {exp.actionTaken}</div>
                    <div className="text-slate-400">Outcome: {exp.outcome}</div>
                    {exp.humanFeedback && (
                      <div className="text-cyan-300/90 text-[11px] bg-cyan-950/30 p-1.5 rounded border border-cyan-800/30 mt-1">
                        Operator Feedback: &ldquo;{exp.humanFeedback}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TRUST & GUARDRAILS CENTER */}
        {/* ========================================================================= */}
        {activeTab === "guardrails" && (
          <div className="space-y-6">
            {/* Trust Score Breakdown */}
            <div className="glass-panel p-6 bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    Trust & Guardrails Safety Engine
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Unlike static black-box agents, OMNIVORE AGENT dynamically computes its Trust Score from real execution metrics and enforces hard pre-execution risk boundaries.
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-emerald-500/30">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Calculated Score</div>
                    <div className="text-3xl font-black text-emerald-400 font-mono">
                      {trustScore.toFixed(1)}%
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-xl font-black text-emerald-300">
                    A+
                  </div>
                </div>
              </div>

              {/* Trust Score Formula Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400">Safe Execution (40%)</span>
                  <div className="text-white font-bold font-mono mt-0.5">38.4 / 40 pts</div>
                </div>
                <div>
                  <span className="text-slate-400">Human Agreement (30%)</span>
                  <div className="text-white font-bold font-mono mt-0.5">27.0 / 30 pts</div>
                </div>
                <div>
                  <span className="text-slate-400">Policy Stability (20%)</span>
                  <div className="text-white font-bold font-mono mt-0.5">18.5 / 20 pts</div>
                </div>
                <div>
                  <span className="text-slate-400">Sensor Drift Score (10%)</span>
                  <div className="text-white font-bold font-mono mt-0.5">8.5 / 10 pts</div>
                </div>
              </div>
            </div>

            {/* Pending Approvals Inbox */}
            <div className="glass-panel p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-400" />
                  High-Risk Human Approval Inbox
                </span>
                <span className="text-xs text-slate-400">
                  Actions marked &apos;HIGH&apos; risk are suspended until authorized
                </span>
              </h3>

              <div className="space-y-3">
                {approvals
                  .filter((a) => a.status === "pending")
                  .map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-rose-300 font-mono">
                            {app.toolName}()
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            RISK: HIGH
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          Parameters: {JSON.stringify(app.toolParams)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Requires operator verification to prevent unauthorized cold-chain disruption.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleResolveApproval(app.id, "approved")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve Action
                        </button>
                        <button
                          onClick={() => handleResolveApproval(app.id, "rejected")}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-900 text-xs flex items-center gap-1 transition"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  ))}

                {approvals.filter((a) => a.status === "pending").length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-500 flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <span>No pending approval requests. All agent executions cleared.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tool Risk Registry */}
            <div className="glass-panel p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Tool Risk Registry & Execution Boundaries
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Tool Name</th>
                      <th className="py-2.5 px-3">Risk Level</th>
                      <th className="py-2.5 px-3">Approval Required</th>
                      <th className="py-2.5 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-cyan-300">get_sensor_data</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          LOW
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">No</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">
                        Read-only telemetry retrieval from ESP32 database
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-cyan-300">query_memory</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          LOW
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">No</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">
                        Read episodic memories and learned policies
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-cyan-300">send_notification</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          MEDIUM
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">Policy-Gated</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">
                        Send alert to Telegram/WhatsApp. Suppressed during known defrost cycles.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-cyan-300">emergency_compressor_cutoff</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                          HIGH
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-rose-400 font-bold">YES (Strict Human Sign-off)</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">
                        Hardware cutoff. Could cause thermal spoil if triggered erroneously.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-bold text-cyan-300">system_reboot</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                          BLOCKED
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-red-400">BLOCKED</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">
                        Prohibited by system policy under all conditions.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: RUN TRACE INSPECTOR */}
        {/* ========================================================================= */}
        {activeTab === "trace" && (
          <div className="space-y-6">
            <div className="glass-panel p-5">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Live Agent Execution & Trace Inspector
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Execute prompt instructions against OMNIVORE AGENT and observe the exact step-by-step trace: Thought → Tool Selection → Guardrail Intercept → Policy Evaluation → Execution.
              </p>

              {/* Preset Scenario Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() =>
                    setRunInput(
                      "Evaluate cold-chain container COLD-01. Defrost cycle active at 02:00 UTC."
                    )
                  }
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  Scenario A: Normal Defrost Cycle
                </button>
                <button
                  onClick={() =>
                    setRunInput(
                      "Critical anomaly: Container COLD-01 temperature at +2.8°C! Check sensor data and determine emergency response."
                    )
                  }
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  Scenario B: Critical Thermal Breach
                </button>
                <button
                  onClick={() =>
                    setRunInput(
                      "Perform emergency compressor cutoff on COLD-01 due to thermal overload."
                    )
                  }
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  Scenario C: High-Risk Action Guardrail
                </button>
              </div>

              {/* Input Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={runInput}
                  onChange={(e) => setRunInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  placeholder="Enter agent instruction..."
                />
                <button
                  onClick={() => handleRunAgent()}
                  disabled={isRunning}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isRunning ? "Executing..." : "Execute Run"}
                </button>
              </div>
            </div>

            {/* Trace Step Visualizer */}
            {traceOutput && (
              <div className="glass-panel p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Execution Trace</span>
                    <span className="text-[11px] font-mono text-cyan-400">
                      ID: {traceOutput.runId?.substring(0, 8)}...
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Latency: {traceOutput.executionTimeMs}ms
                  </span>
                </div>

                <div className="space-y-3">
                  {traceOutput.steps?.map((step: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs ${
                        step.type === "thought"
                          ? "bg-slate-900/60 border-slate-800 text-slate-300"
                          : step.type === "tool_call"
                          ? "bg-cyan-950/30 border-cyan-500/30 text-cyan-200"
                          : step.type === "guardrail_check"
                          ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                          : "bg-slate-950 border-slate-700 text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                          Step {step.stepNumber}: {step.type}
                        </span>
                        {step.toolName && (
                          <span className="font-mono text-cyan-400 font-bold">
                            {step.toolName}()
                          </span>
                        )}
                        {step.guardrailDecision && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            DECISION: {step.guardrailDecision.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {step.content && <p className="leading-relaxed">{step.content}</p>}
                      {step.input && (
                        <div className="mt-1 font-mono text-[11px] text-slate-400">
                          Input: {JSON.stringify(step.input)}
                        </div>
                      )}
                      {step.output && (
                        <div className="mt-1 font-mono text-[11px] text-emerald-300/80">
                          Output: {JSON.stringify(step.output)}
                        </div>
                      )}
                      {step.reason && (
                        <div className="mt-1 text-[11px] text-slate-300">
                          Reasoning: {step.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Final Agent Response */}
                <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 mt-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    Agent Final Response
                  </span>
                  <p className="text-sm text-white font-mono mt-1">
                    {traceOutput.response}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: ESP32 HARDWARE BRIDGE & OLED DISPLAY PREVIEW */}
        {/* ========================================================================= */}
        {activeTab === "hardware" && (
          <div className="space-y-6">
            {/* Live SSD1306 OLED Mirror */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-panel p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    ESP32-S3 Physical OLED Display Mirror
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Exact pixel-replica of the SSD1306 128x64 I2C OLED display wired to GPIO 8 (SDA) and GPIO 9 (SCL).
                  </p>
                </div>

                {/* OLED Frame Simulation */}
                <div className="p-4 rounded-2xl bg-black border-4 border-slate-700 shadow-2xl flex flex-col items-center">
                  <div className="w-full max-w-[280px] h-[140px] bg-[#020508] border border-cyan-900 rounded p-3 font-mono text-cyan-300 flex flex-col justify-between select-none glow-cyan">
                    {/* Header bar */}
                    <div className="bg-cyan-300 text-slate-950 px-1 py-0.5 text-[10px] font-bold flex justify-between">
                      <span>OMNIVORE // S3</span>
                      <span>{telemetry.doorOpen ? "ALARM" : "NOMINAL"}</span>
                    </div>

                    {/* Temperature */}
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black">
                        {telemetry.temperature.toFixed(1)} C
                      </span>
                      <span className="text-[10px] border border-cyan-400 px-1 rounded">
                        {telemetry.suppressedByPolicy
                          ? "POLICY"
                          : telemetry.temperature > -10.0
                          ? "ALERT"
                          : "SAFE"}
                      </span>
                    </div>

                    {/* Submetrics */}
                    <div className="text-[10px] text-cyan-400/90 flex justify-between">
                      <span>RH:{telemetry.humidity.toFixed(0)}%</span>
                      <span>Door:{telemetry.doorOpen ? "OPEN" : "CLOSED"}</span>
                    </div>

                    {/* Status bar */}
                    <div className="text-[9px] text-cyan-500 border-t border-cyan-900 pt-0.5 flex justify-between">
                      <span>Tx: 1,482 pkts</span>
                      <span>WIFI OK [COM4]</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-2 font-mono">
                    SSD1306 0.96&quot; OLED (I2C Addr: 0x3C / 0x3D)
                  </span>
                </div>

                <div className="mt-4 text-xs text-slate-400">
                  Matches firmware: <code className="text-cyan-300">src/omnivore_firmware.cpp</code>
                </div>
              </div>

              {/* Hardware Wiring & HTTP Ingest Config */}
              <div className="glass-panel p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    Device Configuration &amp; Wiring
                  </h3>
                  <div className="space-y-3 text-xs text-slate-300 font-mono">
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-cyan-400 font-bold">I2C OLED Pins:</span>
                      <br />• SDA: GPIO 8<br />• SCL: GPIO 9<br />• VDD: 3.3V | GND: GND
                    </div>

                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-emerald-400 font-bold">Live Sensor Telemetry POST:</span>
                      <br />
                      curl -X POST http://localhost:3000/api/esp32/events \<br />
                      &nbsp;&nbsp;-H &quot;Content-Type: application/json&quot; \<br />
                      &nbsp;&nbsp;-d &apos;{JSON.stringify({
                        deviceId: "ESP32-S3-COLD-01",
                        temperature: -18.4,
                        humidity: 82.0,
                        doorOpen: false,
                      })}&apos;
                    </div>

                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-amber-400 font-bold">PlatformIO Environment:</span>
                      <br />
                      [env:esp32-s3-devkitc-1] (upload_port = COM4)
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Hardware Status</span>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Ready for Telemetry
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        OMNIVORE AGENT • graVITas Hackathon MVP • AI &amp; Automation Track • Durable Agent Architecture
      </footer>
    </div>
  );
}
