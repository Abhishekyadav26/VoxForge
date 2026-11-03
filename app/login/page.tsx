"use client";

import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, GoogleIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import Turnstile from "@/components/Turnstile";
import toast from "react-hot-toast";
import { PASSWORD_RESET_ENABLED } from "@/lib/features";

/** Site key fetched from the server (private env, no NEXT_PUBLIC_ prefix). */

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "register" | "forgot" | "forgot-sent" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const onTurnstileToken = useCallback((t: string | null) => setTurnstileToken(t), []);
  /* ux-visual C3: per-field inline errors instead of raw API blobs */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [turnstileSiteKey, setTurnstileSiteKey] = useState("");

  // Site key is private on the server — fetch it at runtime.
  useEffect(() => {
    fetch("/api/turnstile/sitekey")
      .then((r) => r.json())
      .then((d) => setTurnstileSiteKey(d.siteKey ?? ""))
      .catch(() => setTurnstileSiteKey(""));
  }, []);

  // ?reset=<token> links from the forgot-password email land here.
  const [resetToken, setResetToken] = useState("");
  useEffect(() => {
    if (!PASSWORD_RESET_ENABLED) return;
    const t = new URLSearchParams(window.location.search).get("reset");
    if (t) {
      setResetToken(t);
      setMode("reset");
    }
  }, []);

  // Already signed in → go straight to the studio (but stay for ?reset= links
  // so a signed-in user opening their own reset link still sees the form).
  useEffect(() => {
    if (status === "authenticated" && !resetToken) router.replace("/studio");
  }, [status, router, resetToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFieldErrors({});
    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, turnstileToken }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          if (data.fields) {
            setFieldErrors(data.fields);
            if (data.fields.turnstile) toast.error(data.fields.turnstile);
            setBusy(false);
            return;
          }
          throw new Error(data.error ?? "Request failed");
        }
        setMode("forgot-sent");
        setBusy(false);
        return;
      }

      if (mode === "reset") {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resetToken, password, turnstileToken }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          if (data.fields) {
            setFieldErrors(data.fields);
            if (data.fields.turnstile) toast.error(data.fields.turnstile);
            setBusy(false);
            return;
          }
          throw new Error(data.error ?? "Reset failed");
        }
        toast.success("Password updated — sign in with your new password.");
        setPassword("");
        setResetToken("");
        window.history.replaceState(null, "", "/login");
        setMode("signin");
        setBusy(false);
        return;
      }

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
          body: JSON.stringify({ email, name, password, turnstileToken }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          if (data.fields) {
            setFieldErrors(data.fields);
            if (data.fields.turnstile) toast.error(data.fields.turnstile);
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
        turnstileToken: mode === "register" ? (turnstileToken ?? "") : undefined,
        redirect: false,
        callbackUrl: "/studio",
      });
      if (result?.error) {
        // Turnstile failures come back as authorize errors — surface clearly.
        throw new Error(
          /verification|human|challenge/i.test(result.error)
            ? result.error
            : "Invalid email or password"
        );
      }
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
        {mode === "forgot-sent" ? (
          <div className="rounded-md border border-slate-700 bg-slate-900 px-4 py-5 text-center">
            <p className="text-sm font-medium text-slate-100">Check your email</p>
            <p className="mt-1 text-sm text-slate-400">
              If an email/password account exists for{" "}
              <span className="text-slate-200">{email}</span>, a reset link is on its way (valid 1 hour).
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Signed up with Google? Use “Continue with Google” below instead.
            </p>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="mt-3 text-sm text-slate-400 underline hover:text-white"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            {mode === "reset" && (
              <>
                <p className="text-sm text-slate-400">Choose a new password for your account.</p>
                {fieldErrors.form && (
                  <p role="alert" className="text-xs text-rose-300">
                    {fieldErrors.form}
                  </p>
                )}
              </>
            )}
            {mode === "forgot" && (
              <p className="text-sm text-slate-400">Enter your account email and we&apos;ll send you a reset link.</p>
            )}
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
            {mode !== "reset" && (
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
            )}
            {mode !== "forgot" && (
              <div>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder={mode === "reset" ? "New password (min 8 characters)" : "Password (min 8 characters)"}
                  value={password}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-slate-400"
                />
                {fieldErrors.password && <p id="password-error" role="alert" className="mt-1 text-xs text-rose-300">{fieldErrors.password}</p>}
              </div>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : mode === "register"
                    ? "Create account"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Set new password"}
            </Button>
            {mode !== "signin" && (
              <Turnstile siteKey={turnstileSiteKey} onToken={onTurnstileToken} />
            )}
            {mode === "reset" && (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setResetToken("");
                  setPassword("");
                  setFieldErrors({});
                  window.history.replaceState(null, "", "/login");
                }}
                className="w-full text-sm text-slate-400 underline hover:text-white"
              >
                Link expired or invalid? Request a new one
              </button>
            )}
          </>
        )}
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

      {PASSWORD_RESET_ENABLED && mode === "signin" && (
        <button
          type="button"
          onClick={() => { setMode("forgot"); setFieldErrors({}); }}
          className="text-sm text-slate-400 underline hover:text-white"
        >
          Forgot your password?
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          setFieldErrors({});
          if (mode === "signin") setMode("register");
          else if (mode === "register") setMode("signin");
          else setMode("signin");
        }}
        className="text-sm text-slate-400 underline hover:text-white"
      >
        {mode === "signin"
          ? "Don't have an account? Create one"
          : "Already have an account? Sign in"}
      </button>
    </main>
  );
}