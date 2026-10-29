"use client";

import { SessionProvider } from "next-auth/react";

/** Mounts the NextAuth session context for the whole app. */
export default function SessionProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
