"use client"

import InkOrbitHero from "@/components/ui/ink-orbit-hero"
import { useTransitionRouter } from "next-view-transitions"

/**
 * Full-screen hero for the home page. Wired as a client component so the
 * CTAs can navigate with view transitions; InkOrbitHero itself only takes
 * callback props.
 */
export default function HomeHero() {
  const router = useTransitionRouter()
  return (
    <InkOrbitHero
      theme="dark"
      minHeight="100svh"
      titleTop="Speak an alert."
      titleAccent={["Ship a monitor.", "Watch SOL move.", "Never miss a dip.", "Get pinged instantly."]}
      description="Describe a blockchain monitoring agent in plain words — “warn me when SOL drops below $100” — review the visual plan, dry-run it against live prices, and deploy a Telegram alert."
      primaryCta="🎙️ Open Studio"
      onPrimary={() => router.push("/studio")}
      secondaryCta="Watch Demo"
      proof={{ before: "Trusted by", value: "12,400+", after: "agents daily" }}
    />
  )
}
