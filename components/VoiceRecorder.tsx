"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Mic } from "@/components/icons";
import { Button } from "@/components/ui/button";

export type VoiceCommand = "generate" | "test" | "deploy" | "clear";

interface Props {
  onTranscript: (text: string) => void; // final text (appended on stop)
  onPartial?: (text: string) => void;    // live interim text
  onError?: (err: string) => void;
  /** Fired when a standalone voice command is recognised (kept out of transcript).
   *  `spokenSoFar` is everything final spoken since the last stop, so commands
   *  can act on the just-heard alert even before the parent state flushed. */
  onCommand?: (cmd: VoiceCommand, spokenSoFar: string) => void;
}

type SR = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

export const COMMAND_HINTS: { cmd: VoiceCommand; hint: string }[] = [
  { cmd: "generate", hint: "generate plan" },
  { cmd: "test", hint: "run the trace" },
  { cmd: "deploy", hint: "deploy" },
  { cmd: "clear", hint: "clear" },
];

/**
 * Map a short spoken phrase to a studio command. Commands are standalone
 * utterances (short), so a long prompt like "deploy a monitor when SOL drops"
 * stays transcript; a short "deploy" fires the command.
 */
const COMMANDS: { cmd: VoiceCommand; re: RegExp }[] = [
  { cmd: "generate", re: /\b(generate|make|build|create)\s+(a\s+|an\s+|the\s+)?(plan|spec)\b/i },
  { cmd: "test", re: /\b(run|test)\s+(the\s+)?(trace|test|run|dry run|it)\b/i },
  { cmd: "deploy", re: /\b(deploy|launch|publish|go live|make it live|save the agent)\b/i },
  { cmd: "clear", re: /\b(clear|reset|start over|undo|wipe)\b/i },
];

function detectCommand(text: string): VoiceCommand | null {
  const t = text.trim();
  if (!t || t.length > 40) return null; // only standalone command utterances
  for (const c of COMMANDS) {
    if (c.re.test(t)) return c.cmd;
  }
  return null;
}

export function detectCommandFromText(text: string): VoiceCommand | null {
  return detectCommand(text);
}

/** Wrap the Web Speech API. Falls back to text input if unsupported. */
export default function VoiceRecorder({ onTranscript, onPartial, onError, onCommand }: Props) {
  // Three-state: null = unknown (pre-hydration), false = unsupported,
  // true = supported. Computing this from `window` during render would make
  // server HTML (no window) differ from client HTML (window) and break
  // hydration, so we defer it to an effect.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [liveText, setLiveText] = useState("");
  const recRef = useRef<SR | null>(null);
  const finalRef = useRef("");

  // Callbacks always read through a ref so the SpeechRecognition instance
  // (created once below) never needs to be torn down when the parent re-renders
  // with a new onCommand/onTranscript identity. Without this, every transcript
  // update recreates the recognizer and the "generate plan" command is lost.
  const cbRef = useRef({ onTranscript, onPartial, onError, onCommand });
  useEffect(() => {
    cbRef.current = { onTranscript, onPartial, onError, onCommand };
  });

  useEffect(() => {
    setSupported(
      !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition
    );
  }, []);

  useEffect(() => {
    if (!supported) return;
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec: SR = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      const { onTranscript, onPartial, onCommand } = cbRef.current;
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const transcript = r[0].transcript;
          const cmd = detectCommand(transcript);
          if (cmd) {
            // Command: fire it, do not pollute the agent transcript.
            onCommand?.(cmd, finalRef.current.trim());
          } else {
            finalRef.current += transcript + " ";
            // Emit the hearing immediately so the parent can render/reply
            // without waiting for the user to press Stop.
            onTranscript?.(transcript);
          }
        } else {
          interim += r[0].transcript;
        }
      }
      setLiveText(interim);
      onPartial?.(finalRef.current + interim);
    };
    rec.onerror = (e: any) => {
      const msg = e?.error ?? "Speech recognition error";
      cbRef.current.onError?.(msg);
      toast.error(msg);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => {
      // Teardown the recognizer (not just orphan it) so a fresh session
      // starts clean next time.
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
      if (recRef.current === rec) recRef.current = null;
      finalRef.current = "";
    };
  }, [supported]);

  const toggle = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      const finalText = finalRef.current.trim();
      if (finalText) { /* finals already streamed live via onTranscript */ }
      finalRef.current = ""; setLiveText("");
    } else {
      rec.start(); setListening(true);
    }
  }, [listening]);

  if (supported === null) {
    // Initial render (server + first client pass) — must be identical on both.
    return <div className="h-10" aria-hidden />;
  }
  if (!supported) {
    return <p className="text-sm text-slate-400">Speech not supported in this browser — use the text box below instead.</p>;
  }
  return (<div className="flex items-center gap-3">
    <Button
      onClick={toggle}
      size="lg"
      className={"rounded-full " + (listening ? "" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
    >
      {listening ? "■ Stop" : (<span className="inline-flex items-center gap-1.5"><Mic /> Speak</span>)}
    </Button>
    {listening && <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
      <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
      Listening — say “generate plan”, “run the trace”, “deploy”, “clear”
    </span>}
    {liveText && <p className="text-sm italic text-slate-400">{liveText}</p>}
  </div>);
}