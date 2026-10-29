"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Mic } from "@/components/icons";
import { Button } from "@/components/ui/button";

interface Props {
  onTranscript: (text: string) => void; // final text (appended on stop)
  onPartial?: (text: string) => void;    // live interim text
  onError?: (err: string) => void;
}

type SR = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

/** Wrap the Web Speech API. Falls back to text input if unsupported. */
export default function VoiceRecorder({ onTranscript, onPartial, onError }: Props) {
  const supported = typeof window !== "undefined" && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);
  const [listening, setListening] = useState(false);
  const [liveText, setLiveText] = useState("");
  const recRef = useRef<SR | null>(null);
  const finalRef = useRef("");

  useEffect(() => {
    if (!supported) return;
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec: SR = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setLiveText(interim);
      onPartial?.(finalRef.current + interim);
    };
    rec.onerror = (e: any) => { const msg = e?.error ?? "Speech recognition error"; onError?.(msg); toast.error(msg); };
    rec.onend = () => setListening(false);
    recRef.current = rec;
  }, [supported, onPartial, onError]);

  const toggle = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      const finalText = finalRef.current.trim();
      if (finalText) { onTranscript(finalText); toast.success("Transcript added"); }
      finalRef.current = ""; setLiveText("");
    } else {
      rec.start(); setListening(true);
    }
  }, [listening, onTranscript]);

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
    {liveText && <p className="text-sm italic text-slate-400">{liveText}</p>}
  </div>);
}
