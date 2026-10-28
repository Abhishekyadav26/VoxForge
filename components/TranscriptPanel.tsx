"use client";
interface Props { transcript: string; onChange: (t: string) => void; }
/** Editable transcript — voice fills it, user can fix mis-transcriptions. */
export default function TranscriptPanel({ transcript, onChange }: Props) {
  return (<div>
    <label className="mb-1 block text-sm font-medium text-slate-400">Transcript</label>
    <textarea value={transcript} onChange={(e) => onChange(e.target.value)} rows={3} placeholder="Describe your agent…" className="w-full rounded border border-slate-700 bg-slate-900 p-3 text-sm outline-none focus:border-slate-300" />
  </div>);
}
