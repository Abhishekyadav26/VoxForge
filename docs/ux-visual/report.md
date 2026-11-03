# UX Visual Report — VoxForge

Date: 2026-11-03 · Scope: whole app (/, /login, /studio, /agents, /agents/[id]) · Viewports: 1440×900, 768×1024, 390×844.
Auth: test accounts (credentials). Dev servers: :3117 (older session) + :3000 (auth verification; NEXTAUTH_URL=:3000).

## Surfaces audited & coverage gaps
- All five routes captured at desktop + mobile with layout + geometry audits and vision judgments (budgets respected).
- Gap: `/login` unauthenticated form — no screenshots (session persisted); code-read + live register-error interaction instead.

## Findings by severity (before)
- P1: nav/composer touch targets + helper contrast (H-3, S-5, S-6, A-5); raw Zod error on register (L-1); no next-action guidance (S-1); raw JSON detail + ISO runs (A-1, A-2); mobile header/composer crowding (H-4, S-6).
- P2: graph toolbar overlap + neutral status (S-2, S-4); workflow/graph duplication (S-3, S-5); node contrast (S-7); thread column density (S-8); agent card meta (A-3); agents empty half (A-4); detail scroll (A-6); HUD microcopy + bento spills + SOL glyph + CTA naming (H-5–H-8).
- P3: morph-transition blur still (H-1), demo-button double border (H-2).

## Implemented (one line each)
- **C1 chrome floor** (C, global CSS + Button sm): nav/chips ≥24px (44 mobile), helpers ≥4.5:1, node labels 5.93:1 — after-audits show zero small targets / zero low contrast on app chrome.
- **C2 agents humanization** (B+C): SpecSummary + RunRow, plain words ("Alert when price drops below 150 · Checked every 60 seconds"), JSON collapsed, relative times — detail scroll 454px→0, no raw internals in default view.
- **C3 register errors** (B): per-field inline errors, API field map, Google demoted — "Please enter your name" verified end to end.
- **C4 next-action chip** (A): state-derived white primary chip; voice vocabulary kept.
- **C5 thread dedupe** (A): tool rows removed, workflow collapses on reveal, status pills in trace + header, read-only graph with triggered tint.
- **C6 mobile** (A): short brand, 2×2 composer grid, no 390px overflow.

## Deferred (why)
- **C7 home polish** (morph blur, demo border, glyph-matrix "SQL", CTA naming, HUD labels, bento SVG spills): third-party component internals (morphing-text, ink-orbit) — patching vendored visuals risks churn; CTA copy needs a product decision. Documented in problems.md.
- **Agents-list empty half**: needs a product decision (recent runs? quick actions?) — flagged, not designed.
- Spacing off-scale values from React Flow/ink-orbit: third-party; app tokens stay 4-based.

## Still failing / remaining P0+P1
None open. Remaining P2/P3 are the deferred items above.

## Excellent as is
End-to-end loop works live (extract→trace→deploy, all verified in-browser); welcome bubble teaches commands; trace prose reads plainly; deploy confirmation + first-run card closes the loop; list count + detail morph are considered touches; end-CTA hierarchy is clear.

## What was not verified
- Google OAuth click (real OAuth — not touched); login screenshots (auth-state gap); run-history long-content at scale; 200% zoom.
