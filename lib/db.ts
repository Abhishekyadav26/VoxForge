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
  /** Owner (GitHub user id from the NextAuth JWT). Public/legacy rows may omit it. */
  userId?: string;
}
export interface RunRecord {
  id: string;
  agentId: string;
  executedAt: string;
  triggered: boolean;
  trace: unknown[];
  messages: string[];
  /** Owner (GitHub user id). */
  userId?: string;
}

// ---------------------------------------------------------------------------
// Storage backends: Supabase (cloud, durable) when configured, otherwise local
// JSON files with a writable-dir fallback (./data, else os.tmpdir()).
// The exported functions below dispatch to whichever backend is active.
// ---------------------------------------------------------------------------

interface Storage {
  listAgents(userId?: string): Promise<AgentRecord[]>;
  getAgent(id: string, userId?: string): Promise<AgentRecord | undefined>;
  saveAgent(spec: AgentSpec, userId?: string): Promise<AgentRecord>;
  deleteAgent(id: string, userId?: string): Promise<void>;
  markAgentRun(id: string, triggered: boolean, userId?: string): Promise<void>;
  listRuns(agentId?: string, userId?: string): Promise<RunRecord[]>;
  saveRun(run: Omit<RunRecord, "id" | "executedAt">, userId?: string): Promise<RunRecord>;
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
    userId: row.user_id ?? undefined,
  };
}

const supabaseStorage: Storage = {
  async listAgents(userId) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    let q = sb.from("agents").select("*").order("created_at", { ascending: false });
    if (userId) q = q.eq("user_id", userId);
    const { data, error } = await q;
    if (error) throw new Error(`Supabase listAgents failed: ${error.message}`);
    return (data ?? [])
      .map(supabaseAgentRow)
      .filter((r): r is AgentRecord => r !== undefined);
  },
  async getAgent(id, userId) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    let q = sb.from("agents").select("*").eq("id", id);
    if (userId) q = q.eq("user_id", userId);
    const { data, error } = await q.maybeSingle();
    if (error) throw new Error(`Supabase getAgent failed: ${error.message}`);
    return data ? supabaseAgentRow(data) : undefined;
  },
  async saveAgent(spec, userId) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    const rec: AgentRecord = {
      id: `agent_${Date.now().toString(36)}`,
      name: spec.name,
      spec,
      createdAt: new Date().toISOString(),
      userId,
    };
    const { error } = await sb.from("agents").insert({
      id: rec.id,
      name: rec.name,
      spec: rec.spec,
      created_at: rec.createdAt,
      user_id: userId ?? null,
    });
    if (error) throw new Error(`Supabase saveAgent failed: ${error.message}`);
    return rec;
  },
  async deleteAgent(id, userId) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    let q = sb.from("agents").delete().eq("id", id);
    if (userId) q = q.eq("user_id", userId);
    const { error } = await q;
    if (error) throw new Error(`Supabase deleteAgent failed: ${error.message}`);
  },
  async markAgentRun(id, triggered, userId) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    let q = sb
      .from("agents")
      .update({ last_run: new Date().toISOString(), last_triggered: triggered })
      .eq("id", id);
    if (userId) q = q.eq("user_id", userId);
    const { error } = await q;
    if (error) throw new Error(`Supabase markAgentRun failed: ${error.message}`);
  },
  async listRuns(agentId, userId) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    let q = sb.from("runs").select("*").order("executed_at", { ascending: false });
    if (agentId) q = q.eq("agent_id", agentId);
    if (userId) q = q.eq("user_id", userId);
    const { data, error } = await q;
    if (error) throw new Error(`Supabase listRuns failed: ${error.message}`);
    return (data ?? []).map((row: any): RunRecord => ({
      id: row.id,
      agentId: row.agent_id,
      executedAt: row.executed_at,
      triggered: row.triggered ?? false,
      trace: row.trace ?? [],
      messages: row.messages ?? [],
      userId: row.user_id ?? undefined,
    }));
  },
  async saveRun(run, userId) {
    const sb = getSupabase();
    if (!sb) throw new Error("Supabase not configured");
    const rec: RunRecord = {
      ...run,
      id: `run_${Date.now().toString(36)}`,
      executedAt: new Date().toISOString(),
      userId,
    };
    const { error } = await sb.from("runs").insert({
      id: rec.id,
      agent_id: rec.agentId,
      executed_at: rec.executedAt,
      triggered: rec.triggered,
      trace: rec.trace,
      messages: rec.messages,
      user_id: userId ?? null,
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

function ownedBy(rec: { userId?: string }, userId?: string): boolean {
  return !userId || rec.userId === userId;
}

const fileStorage: Storage = {
  async listAgents(userId) {
    return (await readJson<AgentRecord[]>(await agentsFile(), [])).filter((a) =>
      ownedBy(a, userId)
    );
  },
  async getAgent(id, userId) {
    return (await this.listAgents(userId)).find((a) => a.id === id);
  },
  async saveAgent(spec, userId) {
    const agents = await this.listAgents();
    const rec: AgentRecord = {
      id: `agent_${Date.now().toString(36)}`,
      name: spec.name,
      spec,
      createdAt: new Date().toISOString(),
      userId,
    };
    agents.unshift(rec);
    await writeJson(await agentsFile(), agents);
    return rec;
  },
  async deleteAgent(id, userId) {
    await writeJson(
      await agentsFile(),
      (await this.listAgents(userId)).filter((a) => a.id !== id)
    );
  },
  async markAgentRun(id, triggered, userId) {
    const agents = await this.listAgents();
    const a = agents.find((x) => x.id === id && ownedBy(x, userId));
    if (a) {
      a.lastRun = new Date().toISOString();
      a.lastTriggered = triggered;
      await writeJson(await agentsFile(), agents);
    }
  },
  async listRuns(agentId, userId) {
    const runs = await readJson<RunRecord[]>(await runsFile(), []);
    return runs.filter((r) => (!agentId || r.agentId === agentId) && ownedBy(r, userId));
  },
  async saveRun(run, userId) {
    const runs = await readJson<RunRecord[]>(await runsFile(), []);
    const rec: RunRecord = {
      ...run,
      id: `run_${Date.now().toString(36)}`,
      executedAt: new Date().toISOString(),
      userId,
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

export async function listAgents(userId?: string): Promise<AgentRecord[]> {
  return getStorage().listAgents(userId);
}
export async function getAgent(
  id: string,
  userId?: string
): Promise<AgentRecord | undefined> {
  return getStorage().getAgent(id, userId);
}
export async function saveAgent(
  spec: AgentSpec,
  userId?: string
): Promise<AgentRecord> {
  return getStorage().saveAgent(spec, userId);
}
export async function deleteAgent(id: string, userId?: string): Promise<void> {
  return getStorage().deleteAgent(id, userId);
}
export async function markAgentRun(
  id: string,
  triggered: boolean,
  userId?: string
): Promise<void> {
  return getStorage().markAgentRun(id, triggered, userId);
}
export async function listRuns(
  agentId?: string,
  userId?: string
): Promise<RunRecord[]> {
  return getStorage().listRuns(agentId, userId);
}
export async function saveRun(
  run: Omit<RunRecord, "id" | "executedAt">,
  userId?: string
): Promise<RunRecord> {
  return getStorage().saveRun(run, userId);
}
