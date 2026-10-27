import { promises as fs } from "fs";
import path from "path";
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

const DATA_DIR = path.join(process.cwd(), "data");
const AGENTS_FILE = path.join(DATA_DIR, "agents.json");
const RUNS_FILE = path.join(DATA_DIR, "runs.json");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}
async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

export async function listAgents(): Promise<AgentRecord[]> {
  return readJson<AgentRecord[]>(AGENTS_FILE, []);
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
  await writeJson(AGENTS_FILE, agents);
  return rec;
}
export async function deleteAgent(id: string): Promise<void> {
  await writeJson(AGENTS_FILE, (await listAgents()).filter((a) => a.id !== id));
}
export async function markAgentRun(id: string, triggered: boolean): Promise<void> {
  const agents = await listAgents();
  const a = agents.find((x) => x.id === id);
  if (a) {
    a.lastRun = new Date().toISOString();
    a.lastTriggered = triggered;
    await writeJson(AGENTS_FILE, agents);
  }
}
export async function listRuns(agentId?: string): Promise<RunRecord[]> {
  const runs = await readJson<RunRecord[]>(RUNS_FILE, []);
  return agentId ? runs.filter((r) => r.agentId === agentId) : runs;
}
export async function saveRun(run: Omit<RunRecord, "id" | "executedAt">): Promise<RunRecord> {
  const runs = await readJson<RunRecord[]>(RUNS_FILE, []);
  const rec: RunRecord = {
    ...run, id: `run_${Date.now().toString(36)}`, executedAt: new Date().toISOString(),
  };
  runs.unshift(rec);
  await writeJson(RUNS_FILE, runs.slice(0, 200));
  return rec;
}
