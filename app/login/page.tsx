"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic } from "@/components/icons";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Already signed in → go straight to the studio.
  useEffect(() => {
    if (status === "authenticated") router.replace("/studio");
  }, [status, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 pt-20 text-center">
      <div className="flex items-center gap-2 text-2xl font-bold">
        <Mic size={22} className="text-slate-400" />
        Voice-to-Agent Studio
      </div>
      <p className="text-sm text-slate-400">
        Sign in to create, save, and run your own monitoring agents. Your agents
        are private to your account.
      </p>
      <Button
        size="lg"
        className="w-full"
        onClick={() => signIn("github", { callbackUrl: "/studio" })}
        disabled={status === "loading"}
      >
        {status === "loading" ? "Loading…" : "Sign in with GitHub"}
      </Button>
      <p className="text-xs text-slate-500">
        No GitHub account? Create one free — we only use it to identify you.
      </p>
    </main>
  );
}
