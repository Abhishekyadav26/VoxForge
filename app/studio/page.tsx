"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import VoiceRecorder, { COMMAND_HINTS, type VoiceCommand } from "@/components/VoiceRecorder";
import ChatThread, { type ThreadItem, type TraceLine } from "@/components/ChatThread";
import toast from "react-hot-toast";
import type { AgentSpec } from "@/lib/spec-schema";

let nextId = 1;
const newId = () => nextId++;

export default function StudioPage() {
  const [items, setItems] = useState<ThreadItem[]>([]);
  const [transcript, setTranscript] = useState("");
  const [spec, setSpec] = useState<AgentSpec | null>(null);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const push = useCallback((item: ThreadItem) => {
    setItems((prev) => [...prev, item]);
  }, []);
  const patch = useCallback((id: number, patchItem: Partial<ThreadItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? ({ ...it, ...patchItem } as ThreadItem) : it))
    );
  }, []);

  /* Auto-scroll to the newest message. */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items]);

  /** Push the user bubble for the transcript (also keeps a copy for later re-do). */
  const commitUserMessage = useCallback((text: string) => {
    if (!text.trim()) return null;
    const id = newId();
    push({ id, role: "user", text: text.trim() });
    return id;
  }, [push]);

  async function extract(prompt: string) {
    setBusy(true);
    const id = newId();
    push({ id, role: "agent", kind: "plan", transcript: prompt, spec: null, loading: true });
    try {
      const res = await fetch("/api/extract-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: prompt }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const s: AgentSpec = json.data;
      setSpec(s);
      patch(id, { spec: s, loading: false });
      toast.success("Plan generated");
    } catch (e: any) {
      patch(id, { spec: null, loading: false, error: e.message });
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function runTrace() {
    if (!spec) { toast("Generate a plan first — say “generate plan”"); return; }
    setBusy(true);
    const id = newId();
    push({ id, role: "agent", kind: "trace", spec, trace: [], triggered: false, messages: [], loading: true });
    try {
      const res = await fetch("/api/test-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const d = json.data;
      patch(id, {
        trace: (d.trace ?? []) as TraceLine[],
        triggered: !!d.triggered,
        messages: (d.messages ?? []) as string[],
        loading: false,
      });
      toast.success(d.triggered ? "Conditions met — alert would fire" : "No trigger — conditions not met");
    } catch (e: any) {
      patch(id, { loading: false, error: e.message });
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deploy() {
    if (!spec) { toast("Generate a plan first — say “generate plan”"); return; }
    // guard: no missing wallet address
    if (spec.missingFields?.includes("wallet_address")) {
      toast.error("Add your Solana wallet address first");
      return;
    }
    setBusy(true);
    const id = newId();
    push({ id, role: "agent", kind: "deploy" });
    try {
      const res = await fetch("/api/deploy-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      patch(id, { agentId: json.data.id });
      toast.success("Agent deployed");
    } catch (e: any) {
      patch(id, { error: e.message });
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  /** Merge voice transcript into the draft (composer). */
  const handleTranscript = useCallback((t: string) => {
    setTranscript((prev) => (prev ? prev + " " + t : t));
  }, []);

  /** Voice commands drive the whole flow. */
  const handleCommand = useCallback((cmd: VoiceCommand) => {
    if (busyRef.current) return;
    switch (cmd) {
      case "generate": {
        const prompt = transcript.trim();
        if (!prompt) { toast("Nothing to plan yet — speak an alert first"); return; }
        commitUserMessage(prompt);
        setTranscript("");
        void extract(prompt);
        break;
      }
      case "test":
        void runTrace();
        break;
      case "deploy":
        void deploy();
        break;
      case "clear":
        setItems([]); setSpec(null); setSelectedStep(null); setTranscript("");
        toast("Cleared — fresh thread");
        break;
    }
  }, [transcript, spec, busyRef, commitUserMessage]);

  /* Dev-start: seed a welcome prompt so the composer is never empty in demo. */
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // no auto-bubble: welcome hint is static in ChatThread
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-40 pt-16">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">VoxForge Studio</h1>
          <p className="text-xs text-slate-400">Voice → monitoring agent → Telegram alert</p>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-400">
          {busy ? "agent working…" : "idle · listening ready"}
        </span>
      </header>

      {/* Chat thread */}
      <ChatThread
        items={items}
        selectedStep={selectedStep}
        onSelectStep={setSelectedStep}
        onSaveSpec={(s) => { setSpec(s); }}
        endRef={endRef}
      />

      {/* Composer: mic + command chips + editable transcript */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-[#0b0b0b]/95 backdrop-blur-md">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {COMMAND_HINTS.map(({ cmd, hint }) => (
              <button
                key={cmd}
                onClick={() => handleCommand(cmd)}
                disabled={busy}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100 disabled:opacity-40"
              >
                🎙️ “{hint}”
              </button>
            ))}
            <button
              onClick={() => { if (!transcript.trim()) { toast("Speak or type your alert first"); return; } commitUserMessage(transcript); setTranscript(""); }}
              className="ml-auto rounded-lg bg-white px-3 py-1 text-xs font-semibold text-black transition-transform hover:bg-slate-200 active:scale-[0.96]"
            >
              Send
            </button>
          </div>

          {/* editable draft fed by voice */}
          <div className="mb-2">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={2}
              placeholder="Your alert prompt appears here as you speak — say “generate plan” when ready…"
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <VoiceRecorder
              onTranscript={handleTranscript}
              onCommand={handleCommand}
            />
            <p className="text-[11px] text-slate-500">
              Mic on → speak the alert, then “generate plan” → “run the trace” → “deploy”
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}