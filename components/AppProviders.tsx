"use client";

import { SessionProvider } from "next-auth/react";
import { MotionConfig } from "motion/react";

/** Mounts the NextAuth session context and the global reduced-motion gate
 *  (better-ui: all motion respects prefers-reduced-motion via reducedMotion="user"). */
export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <SessionProvider>{children}</SessionProvider>
    </MotionConfig>
  );
}