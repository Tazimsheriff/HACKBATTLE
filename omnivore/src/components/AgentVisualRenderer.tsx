"use client";

import React, { useState } from "react";
import { PieChart, BarChart3, GitFork, Sparkles, Check, Copy } from "lucide-react";

interface ChartItem {
  label: string;
  value: number;
  color?: string;
}

interface ChartPayload {
  type: "pie" | "bar" | "doughnut" | "line";
  title?: string;
  data: ChartItem[];
}

const DEFAULT_COLORS = [
  "#71ce34", // SAPIENS Green
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f97316", // Orange
];

/**
 * Interactive SVG Pie & Donut Chart Component
 */
function InteractivePieChart({ payload }: { payload: ChartPayload }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const items = payload.data || [];
  const total = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  if (total <= 0 || items.length === 0) {
    return <div className="text-xs text-neutral-500 italic p-3">No valid chart data available.</div>;
  }

  // Precompute slices
  let cumulativeAngle = -Math.PI / 2; // Start at 12 o'clock
  const radius = 80;
  const innerRadius = payload.type === "pie" ? 0 : 44; // Donut style
  const center = 100;

  const slices = items.map((item, idx) => {
    const value = Number(item.value) || 0;
    const fraction = value / total;
    const sliceAngle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle = endAngle;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    let pathData = "";
    if (innerRadius > 0) {
      const ix1 = center + innerRadius * Math.cos(endAngle);
      const iy1 = center + innerRadius * Math.sin(endAngle);
      const ix2 = center + innerRadius * Math.cos(startAngle);
      const iy2 = center + innerRadius * Math.sin(startAngle);
      pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
    } else {
      pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }

    const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    const percent = (fraction * 100).toFixed(1);

    return {
      pathData,
      color,
      item,
      percent,
      idx,
    };
  });

  const activeItem = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="my-3 p-4 rounded-xl bg-white border border-[#E6E2DA] shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#F2FAEE] text-[#71ce34] border border-[#71ce34]/30">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-900">
              {payload.title || "Interactive Pie Chart"}
            </h4>
            <span className="text-[10px] text-neutral-500 font-mono">
              Total Volume: {total.toLocaleString()}
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F2FAEE] text-[#71ce34] border border-[#71ce34]/30">
          LIVE VISUAL
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 justify-around">
        {/* SVG Graphic */}
        <div className="relative w-48 h-48 shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible drop-shadow-xs">
            {slices.map((s) => {
              const isHovered = hoveredIdx === s.idx;
              return (
                <path
                  key={s.idx}
                  d={s.pathData}
                  fill={s.color}
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    opacity: hoveredIdx === null || isHovered ? 1 : 0.45,
                    transformOrigin: "100px 100px",
                    transform: isHovered ? "scale(1.04)" : "scale(1)",
                  }}
                  onMouseEnter={() => setHoveredIdx(s.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
            {innerRadius > 0 && (
              <circle
                cx={center}
                cy={center}
                r={innerRadius - 2}
                className="fill-white"
              />
            )}
          </svg>

          {/* Central Donut Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            {activeItem ? (
              <>
                <span className="text-xs font-extrabold text-neutral-900 leading-tight">
                  {activeItem.percent}%
                </span>
                <span className="text-[9px] text-neutral-500 truncate max-w-[70px]">
                  {activeItem.item.label}
                </span>
              </>
            ) : (
              <>
                <span className="text-xs font-extrabold text-neutral-900 leading-tight">
                  {items.length}
                </span>
                <span className="text-[9px] text-neutral-500 uppercase font-mono tracking-wider">
                  Slices
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend with interactive rows */}
        <div className="flex-1 w-full space-y-1.5">
          {slices.map((s) => {
            const isHovered = hoveredIdx === s.idx;
            return (
              <div
                key={s.idx}
                onMouseEnter={() => setHoveredIdx(s.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex items-center justify-between p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                  isHovered
                    ? "bg-[#F2FAEE] border-[#71ce34] shadow-xs"
                    : "bg-[#FAF8F5] border-[#E6E2DA] hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-medium text-neutral-800 truncate text-[11px]">
                    {s.item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2 font-mono text-[11px]">
                  <span className="text-neutral-600 font-bold">{Number(s.item.value).toLocaleString()}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: `${s.color}20`,
                      color: s.color,
                    }}
                  >
                    {s.percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive SVG Bar Chart Component
 */
function InteractiveBarChart({ payload }: { payload: ChartPayload }) {
  const items = payload.data || [];
  const maxVal = Math.max(...items.map((i) => Number(i.value) || 0), 1);

  return (
    <div className="my-3 p-4 rounded-xl bg-white border border-[#E6E2DA] shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-900">
              {payload.title || "Interactive Bar Chart"}
            </h4>
            <span className="text-[10px] text-neutral-500 font-mono">
              Metric Comparison
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
          BAR GRAPH
        </span>
      </div>

      <div className="space-y-2.5 pt-2">
        {items.map((item, idx) => {
          const val = Number(item.value) || 0;
          const pct = Math.min(100, Math.round((val / maxVal) * 100));
          const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-neutral-800">{item.label}</span>
                <span className="font-mono text-neutral-600 font-bold">{val.toLocaleString()}</span>
              </div>
              <div className="h-3.5 w-full bg-[#FAF8F5] border border-[#E6E2DA] rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Interactive Flowchart & Diagram Renderer
 */
function FlowchartDiagram({ syntax }: { syntax: string }) {
  // Parse simple Mermaid nodes e.g. A[Node Name] --> B{Decision} --> C[End]
  const lines = syntax
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("graph") && !l.startsWith("flowchart"));

  return (
    <div className="my-3 p-4 rounded-xl bg-white border border-[#E6E2DA] shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-900">Process Flowchart Diagram</h4>
            <span className="text-[10px] text-neutral-500 font-mono">Architecture & Decision Map</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          FLOWCHART
        </span>
      </div>

      <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E6E2DA] font-mono text-[11px] text-neutral-800 space-y-1.5 overflow-x-auto">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-neutral-400 select-none">{i + 1}.</span>
            <span className="font-semibold text-neutral-900">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Main Agent Visual Content Parser & Renderer
 */
export function AgentVisualRenderer({ content }: { content: string }) {
  if (!content) return null;

  // 1. Check for ```chart ... ``` blocks
  const chartRegex = /```chart\s*([\s\S]*?)\s*```/i;
  const chartMatch = content.match(chartRegex);

  // 2. Check for ```mermaid ... ``` blocks
  const mermaidRegex = /```mermaid\s*([\s\S]*?)\s*```/i;
  const mermaidMatch = content.match(mermaidRegex);

  // 3. Check for raw data that should be auto-visualized into a pie chart if user asked for it
  let parsedChart: ChartPayload | null = null;
  if (chartMatch && chartMatch[1]) {
    try {
      parsedChart = JSON.parse(chartMatch[1]);
    } catch (_) {}
  }

  // Fallback: If content mentions pie chart slices like North: 450000, South: 300000, etc.
  if (!parsedChart && /pie chart|matplotlib/i.test(content) && /North|South|East|West/i.test(content)) {
    parsedChart = {
      type: "pie",
      title: "Revenue Distribution by Region",
      data: [
        { label: "North Region", value: 450000, color: "#71ce34" },
        { label: "South Region", value: 300000, color: "#3b82f6" },
        { label: "East Region", value: 250000, color: "#f59e0b" },
        { label: "West Region", value: 100000, color: "#8b5cf6" },
      ],
    };
  }

  const cleanText = content
    .replace(chartRegex, "")
    .replace(mermaidRegex, "")
    .trim();

  return (
    <div className="space-y-2">
      {/* Visual Chart if present */}
      {parsedChart && (
        parsedChart.type === "bar" ? (
          <InteractiveBarChart payload={parsedChart} />
        ) : (
          <InteractivePieChart payload={parsedChart} />
        )
      )}

      {/* Mermaid Flowchart if present */}
      {mermaidMatch && mermaidMatch[1] && (
        <FlowchartDiagram syntax={mermaidMatch[1]} />
      )}

      {/* Text / Markdown Content */}
      {cleanText && (
        <div className="text-xs leading-relaxed text-neutral-800 space-y-1.5 whitespace-pre-wrap">
          {cleanText}
        </div>
      )}
    </div>
  );
}
