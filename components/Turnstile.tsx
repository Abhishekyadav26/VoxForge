"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, config: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Load the Turnstile script once per page. */
function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if ((loadScript as any)._p) return (loadScript as any)._p;
  (loadScript as any)._p = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile script failed"));
    document.head.appendChild(s);
  });
  return (loadScript as any)._p;
}

/**
 * Cloudflare Turnstile checkbox (managed mode). Calls back with the token on
 * success; parent includes it in the form POST for server verification.
 * Renders nothing when no site key is configured (dev without keys).
 */
export default function Turnstile({
  siteKey,
  onToken,
  theme = "dark",
}: {
  siteKey?: string;
  onToken: (token: string | null) => void;
  theme?: "light" | "dark" | "auto";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let dead = false;
    loadScript()
      .then(() => {
        if (dead || !ref.current || !window.turnstile) return;
        try {
          widgetId.current = window.turnstile.render(ref.current, {
            sitekey: siteKey,
            theme,
            size: "flexible",
            callback: (token: string) => onToken(token),
            "expired-callback": () => onToken(null),
            "error-callback": () => onToken(null),
            "timeout-callback": () => onToken(null),
          });
        } catch {
          /* widget already rendered */
        }
      })
      .catch(() => onToken(null));
    return () => {
      dead = true;
      try {
        if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      } catch {
        /* already removed */
      }
      widgetId.current = null;
    };
  }, [siteKey, theme, onToken]);

  if (!siteKey) return null;
  return <div ref={ref} className="flex justify-center" />;
}
