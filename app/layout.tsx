import "./globals.css";
export const metadata = { title: "Voice-to-Agent Studio", description: "Describe an agent by voice, deploy a Solana monitor." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body className="min-h-screen bg-slate-950 text-slate-100"><div className="mx-auto max-w-5xl px-4 py-6"><header className="mb-6 flex items-center justify-between"><a href="/" className="text-lg font-bold">🎙️ Voice-to-Agent Studio</a><nav className="flex gap-4 text-sm text-slate-300"><a href="/studio" className="hover:text-white">Studio</a><a href="/agents" className="hover:text-white">Agents</a></nav></header>{children}</div></body></html>);
}
