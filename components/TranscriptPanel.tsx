"use client";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props { transcript: string; onChange: (t: string) => void; }
/** Editable transcript — voice fills it, user can fix mis-transcriptions. */
export default function TranscriptPanel({ transcript, onChange }: Props) {
  return (<div>
    <Label className="mb-1 block text-sm text-slate-400">Transcript</Label>
    <Textarea value={transcript} onChange={(e) => onChange(e.target.value)} rows={3} placeholder="Describe your agent…" className="bg-slate-900" />
  </div>);
}