import "./globals.css";
import type { Viewport } from "next";
import { ViewTransitions } from "next-view-transitions";
import { Link } from "next-view-transitions";
import { Mic } from "@/components/icons";
import Toaster from "@/components/ui/toaster";
import AppProviders from "@/components/AppProviders";
import AuthButton from "@/components/AuthButton";

export const metadata = {
  title: "Voice-to-Agent Studio",
  description: "Describe an agent by voice, deploy a Solana monitor.",
};

/* Mobile: lock the layout to the device width (no 980px zoom-out), let the
   page paint under the notch/home indicator (viewport-fit=cover), and match
   the dark theme in the browser chrome. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransitions>
      <html lang="en">
        <body className="min-h-screen bg-slate-950 text-slate-100">
          <AppProviders>
          {/* Floating nav: overlays the full-screen hero on the home page,
              and stays pinned while scrolling content pages. Each page owns
              its own width container; pages that start under the header use
              pt-20 to clear it. */}
          <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
            {/* Mobile: tighter gutters/gaps and a slightly smaller brand so the
                full nav (brand + Studio + Agents + auth) never clips at 320px. */}
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-4 sm:px-4 sm:py-6">
              <Link href="/" className="pointer-events-auto flex min-h-9 items-center gap-1.5 whitespace-nowrap text-base font-bold sm:text-lg">
                <Mic size={16} className="shrink-0 text-slate-400" />
                {/* ux-visual C6: short brand on small screens so it never wraps/collides */}
                <span className="hidden sm:inline">Voice-to-Agent Studio</span>
                <span className="sm:hidden">VoxForge</span>
              </Link>
              <nav className="pointer-events-auto flex items-center gap-1.5 whitespace-nowrap text-[13px] text-slate-300 sm:gap-4 sm:text-sm">
                <Link href="/studio" className="px-1 py-1 hover:text-white">
                  Studio
                </Link>
                <Link href="/agents" className="px-1 py-1 hover:text-white">
                  Agents
                </Link>
                <AuthButton />
              </nav>
            </div>
          </header>
          {children}
          <Toaster />
          </AppProviders>
        </body>
      </html>
    </ViewTransitions>
  );
}
