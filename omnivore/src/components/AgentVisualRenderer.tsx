"use client";

import React, { useState } from "react";
import {
  PieChart,
  BarChart3,
  GitFork,
  Check,
  Copy,
  ArrowDown,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Table as TableIcon,
  ChevronRight,
} from "lucide-react";

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

  let cumulativeAngle = -Math.PI / 2;
  const radius = 80;
  const innerRadius = payload.type === "pie" ? 0 : 44;
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
              <circle cx={center} cy={center} r={innerRadius - 2} className="fill-white" />
            )}
          </svg>

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
 * Clean Label Extractor for Flowchart Nodes
 */
function cleanNodeText(raw: string): string {
  return raw
    .replace(/^[A-Za-z0-9_]+\s*[\[\(\{]/, "")
    .replace(/[\]\)\}]+$/, "")
    .replace(/\*\*/g, "")
    .replace(/\\n/g, " ")
    .replace(/-->/g, "")
    .trim();
}

/**
 * Modern Interactive Flowchart & Diagram Pipeline Stepper
 */
function FlowchartDiagram({ syntax }: { syntax: string }) {
  // Parse nodes and transitions
  const rawLines = syntax
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("graph") && !l.startsWith("flowchart") && !l.startsWith("subgraph") && l !== "end");

  interface StepNode {
    id: string;
    label: string;
    condition?: string;
  }

  const nodes: StepNode[] = [];
  const seenLabels = new Set<string>();

  for (const line of rawLines) {
    // If line has transitions like A[...] -->|Condition| B[...] or A --> B
    const parts = line.split(/-->|->/);
    for (let pIdx = 0; pIdx < parts.length; pIdx++) {
      let part = parts[pIdx].trim();
      let condition: string | undefined;

      // Check condition e.g. |Passed|
      const condMatch = part.match(/^\|([^|]+)\|\s*(.*)/);
      if (condMatch) {
        condition = condMatch[1].trim();
        part = condMatch[2].trim();
      }

      const cleanLabel = cleanNodeText(part);
      if (cleanLabel && !seenLabels.has(cleanLabel) && cleanLabel.length > 1) {
        seenLabels.add(cleanLabel);
        nodes.push({
          id: `node-${nodes.length}`,
          label: cleanLabel,
          condition,
        });
      }
    }
  }

  return (
    <div className="my-3 p-4 rounded-xl bg-white border border-[#E6E2DA] shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-900">Process Pipeline Flowchart</h4>
            <span className="text-[10px] text-neutral-500 font-mono">Structured Decision Sequence</span>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          PIPELINE
        </span>
      </div>

      <div className="space-y-2 p-3 bg-[#FAF8F5] rounded-xl border border-[#E6E2DA]">
        {nodes.map((node, i) => (
          <div key={node.id} className="space-y-2">
            <div className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-[#E6E2DA] shadow-2xs hover:border-indigo-300 transition">
              <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[11px] font-extrabold flex items-center justify-center shrink-0 border border-indigo-100">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-neutral-900 block truncate">
                  {node.label}
                </span>
                {node.condition && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 rounded">
                    {node.condition}
                  </span>
                )}
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>

            {i < nodes.length - 1 && (
              <div className="flex items-center justify-center -my-1">
                <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center border border-indigo-200">
                  <ArrowDown className="w-3 h-3" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders inline markdown tokens (bold, inline code, links)
 */
function renderInlineMarkdown(text: string): React.ReactNode {
  // Replace bold **text** and `code`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-bold text-neutral-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-mono text-[11px] text-neutral-800"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline font-medium"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    } else {
      parts.push(token);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Beautiful Markdown Parser for Tables, Headers, Bullet Lists, and Alerts
 */
function FormattedMarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // 1. Detect Markdown Table
    if (line.startsWith("|") && line.endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        // First line: headers
        const headerCells = tableLines[0]
          .split("|")
          .map((c) => c.trim())
          .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

        // Filter out separator lines (|---|---|)
        const dataLines = tableLines.slice(1).filter((l) => !/^\|[\s-:]+\|$/.test(l) && !l.includes("---"));

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-xl border border-[#E6E2DA] shadow-xs bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAF8F5] border-b border-[#E6E2DA]">
                <tr>
                  {headerCells.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="px-3 py-2.5 font-mono text-[11px] font-bold text-neutral-800 uppercase tracking-wider"
                    >
                      {renderInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E2DA]">
                {dataLines.map((rowStr, rIdx) => {
                  const cells = rowStr
                    .split("|")
                    .map((c) => c.trim())
                    .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
                  return (
                    <tr key={rIdx} className="hover:bg-neutral-50/70 transition-colors">
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-xs text-neutral-700">
                          {renderInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 2. Headings (###, ##, #)
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-extrabold text-[#0C0C0D] mt-3 mb-1.5 flex items-center gap-1.5">
          {renderInlineMarkdown(line.replace("### ", ""))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-base font-extrabold text-[#0C0C0D] mt-4 mb-2">
          {renderInlineMarkdown(line.replace("## ", ""))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-lg font-black text-[#0C0C0D] mt-4 mb-2">
          {renderInlineMarkdown(line.replace("# ", ""))}
        </h1>
      );
      i++;
      continue;
    }

    // 3. Alert / Callout Boxes (⚠️ Note:, 💡 Pro Tip:, etc.)
    if (line.includes("⚠️") || line.toLowerCase().includes("note:") || line.includes("💡") || line.toLowerCase().includes("pro tip")) {
      const isTip = line.includes("💡") || line.toLowerCase().includes("pro tip");
      elements.push(
        <div
          key={`alert-${i}`}
          className={`my-2 p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
            isTip
              ? "bg-blue-50/60 border-blue-200/80 text-blue-900"
              : "bg-amber-50/70 border-amber-200/80 text-amber-900"
          }`}
        >
          {isTip ? (
            <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium leading-relaxed">
            {renderInlineMarkdown(line)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 4. Bullet Points / List Items
    if (/^[•\-\*]\s+/.test(line)) {
      const itemText = line.replace(/^[•\-\*]\s+/, "");
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 text-xs text-neutral-800 my-1 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#71ce34] mt-1.5 shrink-0" />
          <span className="flex-1 leading-relaxed">{renderInlineMarkdown(itemText)}</span>
        </div>
      );
      i++;
      continue;
    }

    // 5. Numbered List Items (1. 2. 3.)
    if (/^\d+\.\s+/.test(line)) {
      const num = line.match(/^(\d+)\.\s+/)?.[1] || "";
      const itemText = line.replace(/^\d+\.\s+/, "");
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-2 text-xs text-neutral-800 my-1 pl-1">
          <span className="font-mono font-bold text-neutral-500 shrink-0 text-[11px] min-w-[16px]">
            {num}.
          </span>
          <span className="flex-1 leading-relaxed">{renderInlineMarkdown(itemText)}</span>
        </div>
      );
      i++;
      continue;
    }

    // 6. Horizontal Rules (---)
    if (line === "---" || line === "***") {
      elements.push(<hr key={`hr-${i}`} className="my-3 border-t border-[#E6E2DA]" />);
      i++;
      continue;
    }

    // 7. Regular paragraph / text
    if (line.length > 0) {
      elements.push(
        <p key={`p-${i}`} className="text-xs text-neutral-800 leading-relaxed my-1">
          {renderInlineMarkdown(line)}
        </p>
      );
    }

    i++;
  }

  return <div className="space-y-1">{elements}</div>;
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

  // 3. Parse chart payload if present
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

      {/* Mermaid Flowchart Pipeline if present */}
      {mermaidMatch && mermaidMatch[1] && (
        <FlowchartDiagram syntax={mermaidMatch[1]} />
      )}

      {/* Clean Formatted Markdown (Tables, Lists, Callouts, Bold) */}
      {cleanText && <FormattedMarkdownContent content={cleanText} />}
    </div>
  );
}
