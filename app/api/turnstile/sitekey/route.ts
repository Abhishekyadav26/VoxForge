import { NextResponse } from "next/server";

/**
 * Serves the Turnstile site key to the login form without using a
 * NEXT_PUBLIC_ variable. The key is still visible in the rendered widget
 * (Cloudflare requires it client-side) but it is no longer baked into the
 * JS bundle at build time and can stay a private env var in Vercel.
 */
export async function GET() {
  return NextResponse.json({ siteKey: process.env.TURNSTILE_SITE_KEY ?? "" });
}
