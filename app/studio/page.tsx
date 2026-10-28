"use client";
import { useState } from "react";
import VoiceRecorder from "@/components/VoiceRecorder";
import TranscriptPanel from "@/components/TranscriptPanel";
import PlanGraph from "@/components/PlanGraph";
import EditSpecPanel from "@/components/EditSpecPanel";
import TestResults from "@/components/TestResults";
import AgentDeployPanel from "@/components/AgentDeployPanel";
import { Bolt } from "@/components/icons";
import type { AgentSpec } from "@/lib/spec-schema";

export default function StudioPage() {
  const [transcript, setTranscript] = useState("Alert me on Telegram when SOL price drops below $150");
  const [spec, setSpec] = useState<AgentSpec | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);

  async function extract() {
    setLoading(true); setError(null); setSpec(null);
    try {
      const res = await fetch("/api/extract-spec", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSpec(json.data);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  return (<main className="mx-auto max-w-5xl space-y-5 px-4 pt-20">
    <h1 className="text-2xl font-bold">Studio</h1>
    <VoiceRecorder onTranscript={(t) => setTranscript((prev) => prev ? prev + " " + t : t)} />
    <TranscriptPanel transcript={transcript} onChange={setTranscript} />
    <button onClick={extract} disabled={loading || !transcript.trim()} className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"><Bolt size={14} />{loading ? "Extracting…" : "Generate Plan"}</button>
    {error && <p className="text-sm text-slate-300">Error: {error}</p>}
    {spec && (<>
      <PlanGraph spec={spec} onSelectStep={(id) => { setSelectedStep(id); }} />
      <EditSpecPanel spec={spec} stepId={selectedStep} onSave={setSpec} />
      <TestResults spec={spec} />
      <AgentDeployPanel spec={spec} onSpecChange={setSpec} />
    </>)}
  </main>);
}