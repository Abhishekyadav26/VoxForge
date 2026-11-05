"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import VoiceRecorder, { COMMAND_HINTS, detectCommandFromText, type VoiceCommand } from "@/components/VoiceRecorder";
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

  /* ux-visual C4: exactly one primary action per thread state — the chip
     for the next step is filled white, the rest stay ghost. Voice
     vocabulary stays visible so the commands remain discoverable. */
  const hasTrace = items.some((i) => i.role === "agent" && i.kind === "trace" && !i.loading);
  const hasDeploy = items.some((i) => i.role === "agent" && i.kind === "deploy" && !!i.agentId);
  const nextAction: VoiceCommand = !spec ? "generate" : !hasTrace ? "test" : !hasDeploy ? "deploy" : "generate";
  const chipClass = (cmd: VoiceCommand) =>
    cmd === nextAction
      ? "inline-flex min-h-11 items-center justify-center rounded-full bg-white px-3 text-xs font-semibold text-black transition-[color,background-color,border-color,transform] duration-150 ease-out enabled:active:scale-[0.96] hover:bg-slate-200 disabled:opacity-40 sm:min-h-0 sm:py-2"
      : "inline-flex min-h-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-3 text-xs text-slate-300 transition-[color,background-color,border-color,transform] duration-150 ease-out enabled:active:scale-[0.96] hover:border-slate-500 hover:text-slate-100 disabled:opacity-40 sm:min-h-0 sm:py-2";

  const push = useCallback((item: ThreadItem) => {
    setItems((prev) => [...prev, item]);
  }, []);
  const patch = useCallback((id: number, patchItem: Partial<ThreadItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? ({ ...it, ...patchItem } as ThreadItem) : it))
    );
  }, []);

  /* Auto-scroll to the newest message. Smooth scrolling is motion: honor
     reduced-motion (Tier 1) by jumping instead of animating. */
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
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
      patch(id, { agentId: json.data.id, run: json.data.run });
      toast.success(json.data.run?.triggered ? "Agent deployed — first run triggered" : "Agent deployed");
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

  /** Voice commands drive the whole flow. `spokenSoFar` = anything just heard. */
  const handleCommand = useCallback((cmd: VoiceCommand, spokenSoFar = "") => {
    if (busyRef.current) return;
    const prompt = (spokenSoFar || transcript).trim();
    switch (cmd) {
      case "generate": {
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

  /** Composer Send: post the bubble AND drive the agent — a typed line that
   *  matches a command runs that command; anything else is a prompt to plan.
   *  Strips the command words ("generate plan") so the alert text itself is
   *  used as the prompt, falling back to the last heard transcript. */
  const handleSend = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text) { toast("Speak or type your alert first"); return; }
    const cmd = detectCommandFromText(text);
    if (cmd === "clear") {
      setItems([]); setSpec(null); setSelectedStep(null); setTranscript("");
      toast("Cleared — fresh thread");
      return;
    }
    if (cmd === "test") {
      commitUserMessage(text); setTranscript("");
      void runTrace();
      return;
    }
    if (cmd === "deploy") {
      commitUserMessage(text); setTranscript("");
      void deploy();
      return;
    }
    if (cmd === "generate") {
      const strip = (s: string) =>
        s
          .replace(/\b(?:please\s+|can you\s+)?(?:generate|make|build|create)\s+(?:a\s+|an\s+|the\s+)?(?:plan|spec)\b/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
      const base = strip(text);
      // Fallback: the just-heard alert still sitting in the composer,
      // with any command words removed (never feed bare "generate plan").
      const prompt = base || strip(transcript);
      if (!prompt) { toast("Nothing to plan yet — tell me what to monitor first"); return; }
      commitUserMessage(text); setTranscript("");
      void extract(prompt);
      return;
    }
    // Plain prompt → generate the plan directly.
    commitUserMessage(text); setTranscript("");
    void extract(text);
  }, [transcript, busyRef, commitUserMessage, extract, runTrace, deploy]);

  /* Dev-start: seed a welcome prompt so the composer is never empty in demo. */
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // no auto-bubble: welcome hint is static in ChatThread
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-3 pb-[calc(17rem+env(safe-area-inset-bottom))] pt-16 sm:px-4 sm:pb-40">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 sm:mb-4">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">VoxForge Studio</h1>
          <p className="text-xs text-slate-400">Voice → monitor → Telegram alert</p>
        </div>
        {/* ux-visual C5: status pill reflects the latest run outcome, not just mic state */}
        <span
          role="status"
          className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-400"
        >
          {busy
            ? "agent working…"
            : items.some((i) => i.role === "agent" && i.kind === "deploy" && i.agentId)
              ? "live — watching"
              : items.some((i) => i.role === "agent" && i.kind === "trace" && !i.loading && i.triggered)
                ? "last run triggered"
                : "idle · ready"}
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

      {/* Composer: mic + command chips + editable transcript. Fixed to the
          bottom with safe-area padding so the iPhone home bar never covers it. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-[#0b0b0b]/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="mx-auto w-full max-w-3xl px-3 pb-1 pt-2 sm:px-4 sm:py-3">
          {/* ux-visual C4/C6: one primary chip per thread state; 2x2 grid on
              phones (44px rows), a single wrapping row from sm up. */}
          <div className="mb-2 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            {COMMAND_HINTS.map(({ cmd, hint }) => (
              <button
                key={cmd}
                onClick={() => handleCommand(cmd)}
                disabled={busy}
                aria-current={cmd === nextAction ? "step" : undefined}
                className={chipClass(cmd)}
              >
                🎙️ “{hint}”
              </button>
            ))}
          </div>

          {/* editable draft fed by voice */}
          <div className="mb-2">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={2}
              placeholder="Your alert prompt appears here as you speak…"
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 p-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none sm:text-sm"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <VoiceRecorder
              onTranscript={handleTranscript}
              onCommand={handleCommand}
            />
            <p className="hidden min-w-0 text-xs text-slate-300 sm:block">
              Mic on → speak the alert, then “generate plan” → “run the trace” → “deploy”
            </p>
            <button
              onClick={() => handleSend(transcript)}
              disabled={busy}
              className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-lg bg-white px-4 text-sm font-semibold text-black transition-transform hover:bg-slate-200 active:scale-[0.96] disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}