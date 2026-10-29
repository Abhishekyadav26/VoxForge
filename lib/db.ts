import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { AgentSpec } from "./spec-schema";

export interface AgentRecord {
  id: string;
  name: string;
  spec: AgentSpec;
  createdAt: string;
  lastRun?: string;
  lastTriggered?: boolean;
}
export interface RunRecord {
  id: string;
  agentId: string;
  executedAt: string;
  triggered: boolean;
  trace: unknown[];
  messages: string[];
}

const LOCAL_DATA_DIR = path.join(process.cwd(), "data");
const TMP_DATA_DIR = path.join(os.tmpdir(), "voxforge-data");

let resolvedDataDir: string | null = null;

/**
 * Resolve a writable data directory once. Local dev uses ./data (gitignored);
 * on serverless hosts (Lambda /var/task, Vercel) the bundle dir is read-only,
 * so we fall back to the OS temp dir, which is writable but ephemeral
 * (agents persist per-instance only, not across cold starts).
 */
async function getDataDir(): Promise<string> {
  if (resolvedDataDir) return resolvedDataDir;
  for (const dir of [LOCAL_DATA_DIR, TMP_DATA_DIR]) {
    try {
      await fs.mkdir(dir, { recursive: true });
      // Probe that the dir is actually writable (read-only mounts throw here).
      const probe = path.join(dir, ".writable");
      await fs.writeFile(probe, "ok");
      await fs.unlink(probe);
      resolvedDataDir = dir;
      return dir;
    } catch (e) {
      console.warn(`[db] data dir not writable (${dir}):`, (e as Error).message);
    }
  }
  throw new Error("No writable data directory available — cannot persist agents");
}

const agentsFile = async () => path.join(await getDataDir(), "agents.json");
const runsFile = async () => path.join(await getDataDir(), "runs.json");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}
async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

export async function listAgents(): Promise<AgentRecord[]> {
  return readJson<AgentRecord[]>(await agentsFile(), []);
}
export async function getAgent(id: string): Promise<AgentRecord | undefined> {
  return (await listAgents()).find((a) => a.id === id);
}
export async function saveAgent(spec: AgentSpec): Promise<AgentRecord> {
  const agents = await listAgents();
  const rec: AgentRecord = {
    id: `agent_${Date.now().toString(36)}`,
    name: spec.name,
    spec,
    createdAt: new Date().toISOString(),
  };
  agents.unshift(rec);
  await writeJson(await agentsFile(), agents);
  return rec;
}
export async function deleteAgent(id: string): Promise<void> {
  await writeJson(await agentsFile(), (await listAgents()).filter((a) => a.id !== id));
}
export async function markAgentRun(id: string, triggered: boolean): Promise<void> {
  const agents = await listAgents();
  const a = agents.find((x) => x.id === id);
  if (a) {
    a.lastRun = new Date().toISOString();
    a.lastTriggered = triggered;
    await writeJson(await agentsFile(), agents);
  }
}
export async function listRuns(agentId?: string): Promise<RunRecord[]> {
  const runs = await readJson<RunRecord[]>(await runsFile(), []);
  return agentId ? runs.filter((r) => r.agentId === agentId) : runs;
}
export async function saveRun(run: Omit<RunRecord, "id" | "executedAt">): Promise<RunRecord> {
  const runs = await readJson<RunRecord[]>(await runsFile(), []);
  const rec: RunRecord = {
    ...run, id: `run_${Date.now().toString(36)}`, executedAt: new Date().toISOString(),
  };
  runs.unshift(rec);
  await writeJson(await runsFile(), runs.slice(0, 200));
  return rec;
}
