import fs from "fs";
import path from "path";
import { db } from "@/db/client";
import { agents } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export interface AgentRecord {
  id: string;
  name: string;
  description?: string;
  goal?: string;
  instructions?: string;
  model: string;
  status: "active" | "paused" | "archived";
  tools: string[];
  metadata?: Record<string, any>;
  createdAt?: string;
}

export const INITIAL_AGENTS: AgentRecord[] = [
  {
    id: "sapiens-cold-chain",
    name: "Cold-Chain Guardian",
    description: "Autonomous medical storage monitor with continuous self-learning defrost adaptation and hardware guardrails.",
    goal: "Safeguard vaccine container COLD-01 at -18°C and suppress false alarms.",
    instructions: "Safeguard vaccine containers. Check past experiences for defrost cycles. Strictly require human approval for hardware cutoffs.",
    model: "sapiens-frontier-nemo",
    status: "active",
    tools: ["get_sensor_data", "query_memory", "send_notification", "emergency_compressor_cutoff"],
  },
  {
    id: "sapiens-autonomous-sentinel",
    name: "Sapiens Autonomous Sentinel",
    description: "Frontier autonomous agent with continuous episodic learning, multi-channel dispatch, and safety guardrails.",
    goal: "Safeguard operations with autonomous adaptation and deterministic human-in-the-loop boundaries.",
    instructions: "You are SAPIENS Autonomous Sentinel. Monitor operations, cross-reference past episodic experiences, and enforce strict execution boundaries.",
    model: "sapiens-frontier-nemo",
    status: "active",
    tools: ["get_sensor_data", "query_memory", "send_notification", "emergency_compressor_cutoff"],
  },
  {
    id: "pharmacy-vault-s3",
    name: "Pharmacy Vault S3",
    description: "Multi-sensor environmental monitor for temperature, humidity, and door aperture.",
    goal: "Maintain pharma storage humidity under 60% and temperature between 2°C and 8°C.",
    instructions: "Monitor refrigerated medications. Alert on door breaches lasting > 45 seconds.",
    model: "sapiens-code-latest",
    status: "active",
    tools: ["get_sensor_data", "send_notification"],
  },
];

const AGENTS_FILE_PATH = path.join(process.cwd(), "data", "agents.json");

/**
 * Reads all agents stored in data/agents.json on disk.
 */
export function getDiskAgents(): AgentRecord[] {
  try {
    if (fs.existsSync(AGENTS_FILE_PATH)) {
      const raw = fs.readFileSync(AGENTS_FILE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[Agents Storage] Error reading data/agents.json:", err);
  }
  return [];
}

/**
 * Persists an agent to data/agents.json on disk.
 */
export function saveDiskAgent(agent: AgentRecord): void {
  try {
    const dir = path.dirname(AGENTS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const current = getDiskAgents();
    const filtered = current.filter((a) => a.id !== agent.id);
    const updated = [agent, ...filtered];

    fs.writeFileSync(AGENTS_FILE_PATH, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Agents Storage] Error saving to data/agents.json:", err);
  }
}

/**
 * Retrieves all agents by querying database first, falling back to disk and initial defaults.
 */
export async function getAllAgents(): Promise<AgentRecord[]> {
  const disk = getDiskAgents();
  const mergedMap = new Map<string, AgentRecord>();

  // 1. Seed with initial built-ins
  for (const ag of INITIAL_AGENTS) {
    mergedMap.set(ag.id, ag);
  }

  // 2. Overlay disk agents (custom created agents)
  for (const ag of disk) {
    mergedMap.set(ag.id, ag);
  }

  // 3. Overlay DB agents if postgres is running and responsive
  if (process.env.DATABASE_URL) {
    try {
      const dbPromise = db.select().from(agents).orderBy(desc(agents.createdAt));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB query timeout")), 600)
      );
      const dbAgents = (await Promise.race([dbPromise, timeoutPromise])) as any[];
      if (Array.isArray(dbAgents)) {
        for (const dba of dbAgents) {
          mergedMap.set(dba.id, {
            id: dba.id,
            name: dba.name,
            description: dba.description || "",
            goal: dba.goal || "",
            instructions: dba.instructions || "",
            model: dba.model,
            status: (dba.status as "active" | "paused" | "archived") || "active",
            tools: Array.isArray(dba.tools) ? (dba.tools as string[]) : [],
            metadata: (dba as any).metadata || {},
          });
        }
      }
    } catch {
      // Instant disk fallback
    }
  }

  // Return disk/custom agents first, then built-in defaults
  const all = Array.from(mergedMap.values());
  all.sort((a, b) => {
    // Put custom agents at the top
    const aIsDefault = INITIAL_AGENTS.some((d) => d.id === a.id);
    const bIsDefault = INITIAL_AGENTS.some((d) => d.id === b.id);
    if (!aIsDefault && bIsDefault) return -1;
    if (aIsDefault && !bIsDefault) return 1;
    return 0;
  });

  return all;
}

/**
 * Retrieves a single agent by ID from DB, disk, or defaults.
 */
export async function getAgentById(id: string): Promise<AgentRecord | null> {
  // Check DB
  try {
    const [dba] = await db.select().from(agents).where(eq(agents.id, id));
    if (dba) {
      return {
        id: dba.id,
        name: dba.name,
        description: dba.description || "",
        goal: dba.goal || "",
        instructions: dba.instructions || "",
        model: dba.model,
        status: (dba.status as "active" | "paused" | "archived") || "active",
        tools: Array.isArray(dba.tools) ? (dba.tools as string[]) : [],
        metadata: (dba as any).metadata || {},
      };
    }
  } catch {}

  // Check disk
  const disk = getDiskAgents();
  const foundDisk = disk.find((a) => a.id === id);
  if (foundDisk) return foundDisk;

  // Check defaults
  const foundDefault = INITIAL_AGENTS.find((a) => a.id === id);
  if (foundDefault) return foundDefault;

  return null;
}
