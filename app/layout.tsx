import "./globals.css";
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
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
              <Link href="/" className="pointer-events-auto flex items-center gap-1.5 text-lg font-bold">
                <Mic size={16} className="text-slate-400" />
                Voice-to-Agent Studio
              </Link>
              <nav className="pointer-events-auto flex items-center gap-4 text-sm text-slate-300">
                <Link href="/studio" className="hover:text-white">
                  Studio
                </Link>
                <Link href="/agents" className="hover:text-white">
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
