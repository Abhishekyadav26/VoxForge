import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
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

// ---------------------------------------------------------------------------
// Storage backends: Supabase (cloud, durable) when configured, otherwise local
// JSON files with a writable-dir fallback (./data, else os.tmpdir()).
// The exported functions below dispatch to whichever backend is active.
// ---------------------------------------------------------------------------

interface Storage {
  listAgents(): Promise<AgentRecord[]>;
  getAgent(id: string): Promise<AgentRecord | undefined>;
  saveAgent(spec: AgentSpec): Promise<AgentRecord>;
  deleteAgent(id: string): Promise<void>;
  markAgentRun(id: string, triggered: boolean): Promise<void>;
  listRuns(agentId?: string): Promise<RunRecord[]>;
  saveRun(run: Omit<RunRecord, "id" | "executedAt">): Promise<RunRecord>;
}

// ---------- Supabase backend ----------

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function supabaseAgentRow(row: any): AgentRecord | undefined {
  if (!row?.id || !row?.name) return undefined;
  return {
    id: row.id,
    name: row.name,
    spec: row.spec as AgentSpec,
    createdAt: row.created_at ?? new Date().toISOString(),
    lastRun: row.last_run ?? undefined,
    lastTriggered: row.last_triggered ?? undefined,
  };
}

const supabaseStorage: Storage = {
  async listAgents() {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    const { data, error } = await sb
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Supabase listAgents failed: ${error.message}`);
    return (data ?? [])
      .map(supabaseAgentRow)
      .filter((r): r is AgentRecord => r !== undefined);
  },
  async getAgent(id) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    const { data, error } = await sb.from("agents").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Supabase getAgent failed: ${error.message}`);
    return data ? supabaseAgentRow(data) : undefined;
  },
  async saveAgent(spec) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    const rec: AgentRecord = {
      id: `agent_${Date.now().toString(36)}`,
      name: spec.name,
      spec,
      createdAt: new Date().toISOString(),
    };
    const { error } = await sb.from("agents").insert({
      id: rec.id,
      name: rec.name,
      spec: rec.spec,
      created_at: rec.createdAt,
    });
    if (error) throw new Error(`Supabase saveAgent failed: ${error.message}`);
    return rec;
  },
  async deleteAgent(id) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    const { error } = await sb.from("agents").delete().eq("id", id);
    if (error) throw new Error(`Supabase deleteAgent failed: ${error.message}`);
  },
  async markAgentRun(id, triggered) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    const { error } = await sb
      .from("agents")
      .update({ last_run: new Date().toISOString(), last_triggered: triggered })
      .eq("id", id);
    if (error) throw new Error(`Supabase markAgentRun failed: ${error.message}`);
  },
  async listRuns(agentId) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    let q = sb.from("runs").select("*").order("executed_at", { ascending: false });
    if (agentId) q = q.eq("agent_id", agentId);
    const { data, error } = await q;
    if (error) throw new Error(`Supabase listRuns failed: ${error.message}`);
    return (data ?? []).map((row: any): RunRecord => ({
      id: row.id,
      agentId: row.agent_id,
      executedAt: row.executed_at,
      triggered: row.triggered ?? false,
      trace: row.trace ?? [],
      messages: row.messages ?? [],
    }));
  },
  async saveRun(run) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    const rec: RunRecord = {
      ...run,
      id: `run_${Date.now().toString(36)}`,
      executedAt: new Date().toISOString(),
    };
    const { error } = await sb.from("runs").insert({
      id: rec.id,
      agent_id: rec.agentId,
      executed_at: rec.executedAt,
      triggered: rec.triggered,
      trace: rec.trace,
      messages: rec.messages,
    });
    if (error) throw new Error(`Supabase saveRun failed: ${error.message}`);
    // Keep runs capped at 200.
    try {
      const { data } = await sb
        .from("runs")
        .select("id")
        .eq("agent_id", rec.agentId)
        .order("executed_at", { ascending: false })
        .range(200, 1000);
      const toDelete = (data ?? []).map((r: any) => r.id);
      if (toDelete.length) await sb.from("runs").delete().in("id", toDelete);
    } catch (e) {
      console.warn("[db] run cap cleanup failed:", e);
    }
    return rec;
  },
};

// ---------- Local JSON-file backend (fallback) ----------

const LOCAL_DATA_DIR = path.join(process.cwd(), "data");
const TMP_DATA_DIR = path.join(os.tmpdir(), "voxforge-data");

let resolvedDataDir: string | null = null;

async function getDataDir(): Promise<string> {
  if (resolvedDataDir) return resolvedDataDir;
  for (const dir of [LOCAL_DATA_DIR, TMP_DATA_DIR]) {
    try {
      await fs.mkdir(dir, { recursive: true });
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

const fileStorage: Storage = {
  async listAgents() {
    return readJson<AgentRecord[]>(await agentsFile(), []);
  },
  async getAgent(id) {
    return (await this.listAgents()).find((a) => a.id === id);
  },
  async saveAgent(spec) {
    const agents = await this.listAgents();
    const rec: AgentRecord = {
      id: `agent_${Date.now().toString(36)}`,
      name: spec.name,
      spec,
      createdAt: new Date().toISOString(),
    };
    agents.unshift(rec);
    await writeJson(await agentsFile(), agents);
    return rec;
  },
  async deleteAgent(id) {
    await writeJson(
      await agentsFile(),
      (await this.listAgents()).filter((a) => a.id !== id)
    );
  },
  async markAgentRun(id, triggered) {
    const agents = await this.listAgents();
    const a = agents.find((x) => x.id === id);
    if (a) {
      a.lastRun = new Date().toISOString();
      a.lastTriggered = triggered;
      await writeJson(await agentsFile(), agents);
    }
  },
  async listRuns(agentId) {
    const runs = await readJson<RunRecord[]>(await runsFile(), []);
    return agentId ? runs.filter((r) => r.agentId === agentId) : runs;
  },
  async saveRun(run) {
    const runs = await readJson<RunRecord[]>(await runsFile(), []);
    const rec: RunRecord = {
      ...run,
      id: `run_${Date.now().toString(36)}`,
      executedAt: new Date().toISOString(),
    };
    runs.unshift(rec);
    await writeJson(await runsFile(), runs.slice(0, 200));
    return rec;
  },
};

// ---------- Dispatch ----------

let activeStorage: Storage | null = null;

/** Pick the storage backend once: Supabase when configured, else local files. */
export function getStorage(): Storage {
  if (activeStorage) return activeStorage;
  const sb = getSupabase();
  activeStorage = sb ? supabaseStorage : fileStorage;
  console.log(
    `[db] using ${sb ? "Supabase" : "local JSON file"} storage` +
      (sb ? "" : ` (${resolvedDataDir ?? "resolved on first write"})`)
  );
  return activeStorage;
}

/** True when the app is persisting to Supabase rather than local files. */
export function usingSupabase(): boolean {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export async function listAgents(): Promise<AgentRecord[]> {
  return getStorage().listAgents();
}
export async function getAgent(id: string): Promise<AgentRecord | undefined> {
  return getStorage().getAgent(id);
}
export async function saveAgent(spec: AgentSpec): Promise<AgentRecord> {
  return getStorage().saveAgent(spec);
}
export async function deleteAgent(id: string): Promise<void> {
  return getStorage().deleteAgent(id);
}
export async function markAgentRun(id: string, triggered: boolean): Promise<void> {
  return getStorage().markAgentRun(id, triggered);
}
export async function listRuns(agentId?: string): Promise<RunRecord[]> {
  return getStorage().listRuns(agentId);
}
export async function saveRun(
  run: Omit<RunRecord, "id" | "executedAt">
): Promise<RunRecord> {
  return getStorage().saveRun(run);
}
