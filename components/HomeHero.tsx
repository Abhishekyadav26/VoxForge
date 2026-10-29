"use client"

import InkOrbitHero from "@/components/ui/ink-orbit-hero"
import { useTransitionRouter } from "next-view-transitions"

/**
 * Full-screen, full-bleed hero for the home page. The InkOrbitHero ships as a
 * framed card (hatched padding + centered 1180px shell); the overrides below
 * strip that frame so the hero spans the viewport edge-to-edge and fills
 * 100svh. Wired as a client component so the CTAs can navigate with view
 * transitions (InkOrbitHero only takes callback props).
 */
export default function HomeHero() {
  const router = useTransitionRouter()
  const demoSteps = [
    { label: "Listen", detail: "“Warn me when SOL drops below $150” — transcribed from your voice" },
    { label: "Plan", detail: "No code: a price monitor, a condition, a Telegram alert" },
    { label: "Trace", detail: "Dry-run against live CoinMarketCap prices — would it fire?" },
    { label: "Deploy", detail: "Agent saved. Running on your schedule, watching SOL."},
    { label: "Alert", detail: "Ping! SOL crossed $150 — Telegram message delivered." },
  ]
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .ih-bleed{padding:0 !important}
        .ih-bleed .ih-shell{max-width:none}
        .ih-bleed .ih-sec{border:0}
      `,
        }}
      />
      <InkOrbitHero
        className="ih-bleed"
        style={{ padding: 0 }}
        theme="dark"
        minHeight="100svh"
        titleTop="Speak an alert."
        titleAccent={["Ship a monitor.", "Watch SOL move.", "Never miss a dip.", "Get pinged instantly."]}
        description="Describe a blockchain monitoring agent in plain words — “warn me when SOL drops below $100” — review the visual plan, dry-run it against live prices, and deploy a Telegram alert."
        primaryCta="Open Studio"
        onPrimary={() => router.push("/studio")}
        secondaryCta="Watch Demo"
        demoSteps={demoSteps}
        demoFoot={{ running: "Live pipeline — nothing here needs code.", done: "Monitor live — you'd get a Telegram ping the next time SOL crosses $150." }}
        proof={{ before: "Trusted by", value: "12,400+", after: "agents daily" }}
      />
    </>
  )
}
