"use client";
import { useRef, useState } from "react";
import VoiceRecorder, { COMMAND_HINTS, type VoiceCommand } from "@/components/VoiceRecorder";
import TranscriptPanel from "@/components/TranscriptPanel";
import PlanGraph from "@/components/PlanGraph";
import EditSpecPanel from "@/components/EditSpecPanel";
import TestResults, { type TestResultsHandle } from "@/components/TestResults";
import AgentDeployPanel, { type AgentDeployHandle } from "@/components/AgentDeployPanel";
import { Bolt } from "@/components/icons";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import type { AgentSpec } from "@/lib/spec-schema";

export default function StudioPage() {
  const [transcript, setTranscript] = useState("Alert me on Telegram when SOL price drops below $150");
  const [spec, setSpec] = useState<AgentSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const testRef = useRef<TestResultsHandle>(null);
  const deployRef = useRef<AgentDeployHandle>(null);

  async function extract() {
    setLoading(true); setError(null); setSpec(null);
    try {
      const res = await fetch("/api/extract-spec", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSpec(json.data);
      toast.success("Plan generated");
    } catch (e: any) { setError(e.message); toast.error(e.message); } finally { setLoading(false); }
  }

  /** Voice commands: keep the whole flow hands-free. */
  function handleCommand(cmd: VoiceCommand) {
    switch (cmd) {
      case "generate":
        if (!transcript.trim()) { toast("Nothing to plan yet — speak an alert first"); return; }
        void extract();
        break;
      case "test":
        if (!spec) { toast("Generate a plan first — say “generate plan”"); return; }
        testRef.current?.run();
        break;
      case "deploy":
        if (!spec) { toast("Generate a plan first — say “generate plan”"); return; }
        deployRef.current?.deploy();
        break;
      case "clear":
        setTranscript(""); setSpec(null); setError(null); setSelectedStep(null);
        toast("Cleared");
        break;
    }
  }

  return (<main className="mx-auto max-w-5xl space-y-5 px-4 pt-20">
    <h1 className="text-2xl font-bold">Studio — voice-first</h1>
    <div className="flex flex-wrap gap-2">
      {COMMAND_HINTS.map(({ cmd, hint }) => (
        <button key={cmd} onClick={() => handleCommand(cmd)} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100">
          🎙️ “{hint}”
        </button>
      ))}
    </div>
    <VoiceRecorder
      onTranscript={(t) => setTranscript((prev) => prev ? prev + " " + t : t)}
      onCommand={handleCommand}
    />
    <TranscriptPanel transcript={transcript} onChange={setTranscript} />
    <Button onClick={extract} disabled={loading || !transcript.trim()}><Bolt />{loading ? "Extracting…" : "Generate Plan"}</Button>
    {error && <p className="text-sm text-slate-300">Error: {error}</p>}
    {spec && (<>
      <PlanGraph spec={spec} onSelectStep={(id) => { setSelectedStep(id); }} />
      <EditSpecPanel spec={spec} stepId={selectedStep} onSave={setSpec} />
      <TestResults ref={testRef} spec={spec} />
      <AgentDeployPanel ref={deployRef} spec={spec} onSpecChange={setSpec} />
    </>)}
  </main>);
}