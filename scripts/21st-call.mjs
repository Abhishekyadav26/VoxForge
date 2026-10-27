#!/usr/bin/env node
/**
 * Call the 21st.dev MCP over streamable HTTP directly.
 * Usage: node 21st-call.mjs <tools-list|call> [name] [json-args]
 * Reads server + key from ~/.free-pi/agent/mcp.json ("21st" entry).
 */
import fs from "node:fs";
import os from "node:os";

const cfgPath = os.homedir() + "/.free-pi/agent/mcp.json";
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const srv = cfg.mcpServers?.["21st"];
if (!srv) { console.error("no 21st server in mcp.json"); process.exit(1); }
const headers = {
  "Content-Type": "application/json",
  "Accept": "application/json, text/event-stream",
  ...(srv.headers ?? {}),
};

let sessionId = null;
async function rpc(method, params = {}, id = 1) {
  const res = await fetch(srv.url, {
    method: "POST",
    headers: { ...headers, ...(sessionId ? { "mcp-session-id": sessionId } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const sid = res.headers.get("mcp-session-id");
  if (sid) sessionId = sid;
  const text = await res.text();
  // Accept either raw JSON or SSE-wrapped JSON
  const line = text.split("\n").map((l) => l.trim()).find((l) => l.startsWith("data:"));
  const payload = line ? line.slice(5).trim() : text;
  const json = JSON.parse(payload);
  if (json.error) throw new Error(method + " → " + JSON.stringify(json.error).slice(0, 400));
  return json.result;
}

const [cmd, name, argStr] = process.argv.slice(2);
if (cmd === "tools-list") {
  await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "pi-cli", version: "1" } });
  const r = await rpc("tools/list");
  for (const t of r.tools ?? []) {
    console.log(`\n=== ${t.name} ===`);
    console.log((t.description ?? "").slice(0, 400));
    console.log("schema:", JSON.stringify(t.inputSchema).slice(0, 600));
  }
} else if (cmd === "call") {
  await rpc("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "pi-cli", version: "1" } });
  const args = argStr ? JSON.parse(argStr) : {};
  const r = await rpc("tools/call", { name, arguments: args });
  const texts = (r.content ?? []).map((c) => c.text ?? JSON.stringify(c)).join("\n");
  console.log(texts.slice(0, 20000));
} else {
  console.error("usage: node 21st-call.mjs <tools-list|call> [name] [json-args]");
  process.exit(1);
}
