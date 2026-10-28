"use client"

import InkOrbitHero from "@/components/ui/ink-orbit-hero"
import InkOrbitFeatures from "@/components/ui/ink-orbit-features"

export default function Demo() {
  return (
    <div className="w-full">
      <InkOrbitHero theme="dark" />
      <InkOrbitFeatures theme="dark" />
    </div>
  )
}