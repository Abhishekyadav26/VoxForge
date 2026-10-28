"use client"

import InkOrbitFeatures from "@/components/ui/ink-orbit-features"

/**
 * Features bento for the home page, styled to match the full-bleed hero
 * (same bleed overrides that strip the framed-card look) and preloaded with
 * Voice-to-Agent Studio copy.
 */
export default function HomeFeatures() {
  return (
    <>
      <style>{`
        .ib-bleed{padding:0 !important}
        .ib-bleed .ib-shell{max-width:none}
        .ib-bleed .ib-sec{border:0}
      `}</style>
      <InkOrbitFeatures
        className="ib-bleed"
        style={{ padding: 0 }}
        theme="dark"
        brand="Forge"
        tag="Features"
        title="From words to *working*\nalerts in minutes."
        collaboration={{
          title: "Real-time planning",
          description: "Describe an alert in plain words — Groq or the offline rules turn your sentence into a validated agent plan you can review and edit node by node.",
        }}
        reports={{
          title: "Auto-generated reports",
          description: "Clean, structured run reports from your agent data — no formatting, no manual writing, no digging through logs.",
        }}
        integrations={{
          title: "Integrations hub",
          description: "One hub for the tools you already use — Telegram, CoinMarketCap, Groq and Sheets — feeding one AI system.",
          tools: ["Telegram", "CMC", "Groq", "Sheets"],
        }}
        insights={{
          title: "Predictive insights",
          description: "AI watches the market and forecasts where prices are heading, so you can act before the alert even fires.",
        }}
      />
    </>
  )
}