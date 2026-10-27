import "./globals.css";
import { ViewTransitions } from "next-view-transitions";
import { Link } from "next-view-transitions";

export const metadata = {
  title: "Voice-to-Agent Studio",
  description: "Describe an agent by voice, deploy a Solana monitor.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransitions>
      <html lang="en">
        <body className="min-h-screen bg-slate-950 text-slate-100">
          <div className="mx-auto max-w-5xl px-4 py-6">
            <header className="mb-6 flex items-center justify-between">
              <Link href="/" className="text-lg font-bold">
                🎙️ Voice-to-Agent Studio
              </Link>
              <nav className="flex gap-4 text-sm text-slate-300">
                <Link href="/studio" className="hover:text-white">
                  Studio
                </Link>
                <Link href="/agents" className="hover:text-white">
                  Agents
                </Link>
              </nav>
            </header>
            {children}
          </div>
        </body>
      </html>
    </ViewTransitions>
  );
}