"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, GoogleIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  /* ux-visual C3: per-field inline errors instead of raw API blobs */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Already signed in → go straight to the studio.
  useEffect(() => {
    if (status === "authenticated") router.replace("/studio");
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFieldErrors({});
    try {
      if (mode === "register") {
        // Client-side first so the common empty-name case never hits the API.
        if (!name.trim()) {
          setFieldErrors({ name: "Please enter your name" });
          setBusy(false);
          return;
        }
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          if (data.fields) {
            setFieldErrors(data.fields);
            setBusy(false);
            return;
          }
          throw new Error(data.error ?? "Registration failed");
        }
        toast.success("Account created — signing you in…");
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/studio",
      });
      if (result?.error) throw new Error("Invalid email or password");
      router.push(result?.url ?? "/studio");
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

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

      <form onSubmit={handleSubmit} className="w-full space-y-3 text-left" noValidate>
        {mode === "register" && (
          <div>
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-slate-400"
            />
            {fieldErrors.name && <p id="name-error" role="alert" className="mt-1 text-xs text-rose-300">{fieldErrors.name}</p>}
          </div>
        )}
        <div>
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-slate-400"
          />
          {fieldErrors.email && <p id="email-error" role="alert" className="mt-1 text-xs text-rose-300">{fieldErrors.email}</p>}
        </div>
        <div>
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            value={password}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-slate-400"
          />
          {fieldErrors.password && <p id="password-error" role="alert" className="mt-1 text-xs text-rose-300">{fieldErrors.password}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-slate-700" />
        or
        <span className="h-px flex-1 bg-slate-700" />
      </div>

      {/* ux-visual C3: email submit is the sole lg primary; Google is secondary */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => signIn("google", { callbackUrl: "/studio" })}
        disabled={busy}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "register" : "signin")}
        className="text-sm text-slate-400 underline hover:text-white"
      >
        {mode === "signin"
          ? "Don't have an account? Create one"
          : "Already have an account? Sign in"}
      </button>
    </main>
  );
}