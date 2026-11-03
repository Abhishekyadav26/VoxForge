"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

/** Pause/resume toggle + delete (with confirm) for an agent. */
export default function AgentControls({
  agentId,
  paused,
}: {
  agentId: string;
  paused?: boolean;
}) {
  const router = useRouter();
  const [isPaused, setIsPaused] = useState(!!paused);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function togglePause() {
    setBusy(true);
    try {
      const res = await fetch("/api/agents/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, paused: !isPaused }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setIsPaused(!isPaused);
      toast.success(!isPaused ? "Agent paused — scheduler will skip it" : "Agent resumed");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch("/api/agents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Agent deleted");
      router.push("/agents");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={togglePause} disabled={busy}>
        {isPaused ? "▶ Resume" : "⏸ Pause"}
      </Button>
      {!confirming ? (
        <Button
          size="sm"
          variant="outline"
          className="border-rose-900 text-rose-300 hover:border-rose-700 hover:text-rose-200"
          onClick={() => setConfirming(true)}
          disabled={busy}
        >
          Delete
        </Button>
      ) : (
        <span className="inline-flex items-center gap-2 text-xs text-slate-400">
          Delete this agent and its run history?
          <Button
            size="sm"
            variant="outline"
            className="border-rose-900 text-rose-300 hover:border-rose-700 hover:text-rose-200"
            onClick={remove}
            disabled={busy}
          >
            {busy ? "Deleting…" : "Yes, delete"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
            Keep
          </Button>
        </span>
      )}
    </div>
  );
}
