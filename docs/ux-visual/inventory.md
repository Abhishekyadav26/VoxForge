# Inventory — VoxForge visual audit

Date: 2026-11-03 · Route scope: whole app · Viewports: 1440×900, 768×1024, 390×844
Auth: test account `uxtest<ts>@example.com` (credentials), Supabase backend.
Dev server: `pnpm dev --port 3117` (PID in /tmp/ux-visual-dev.pid).

## Pages / routes

| # | Route | How reached | States audited |
|---|-------|-------------|----------------|
| 1 | `/` home | direct, signed in | hero main (1440/768/390), features section, end-page CTA |
| 2 | `/login` | sign-out → direct (note: authed users redirect to /studio; unauth login form itself not re-captured — gap, see below) | redirect behavior observed only |
| 3 | `/studio` | nav / direct, signed in | empty thread (1440, 390), plan generated (1440), trace run (1440), deploy confirmation (1440) |
| 4 | `/agents` | nav / direct, signed in | populated 1-item (1440, 390) |
| 5 | `/agents/[id]` | "View agent →" link after deploy | populated + 1 run (1440) |

Coverage gaps: `/login` unauthenticated form (no screenshots — auth state persisted; form code read instead); studio loading/typing states (transient, observed via snapshot only); run-history long-content; deploy error state; Google OAuth button flow (not clicked — real OAuth).

## Layouts

- `app/layout.tsx`: fixed floating nav (`fixed inset-x-0 top-0`, `max-w-5xl`, brand left / Studio·Agents·Auth right), `min-h-screen bg-slate-950`. Pages clear it with `pt-16/pt-20`. Footer: none except home end-CTA. Toaster bottom-right.
- Studio: `max-w-3xl` column + fixed bottom composer (`fixed inset-x-0 bottom-0`, chips + textarea + mic).

## Component groups

- Nav: brand link (Mic icon + "Voice-to-Agent Studio"), Studio/Agents links, AuthButton (Sign in / avatar+Sign out).
- Home: `InkOrbitHero` (100svh, split panels, rotating morph headline, Open Studio / Watch Demo CTAs, demo-steps modal), `InkOrbitFeatures` bento (Real-time planning, Auto-generated reports, Integrations hub, Predictive insights), `GlyphMatrix` end-CTA.
- Studio composer: 4 command chips (generate plan / run the trace / deploy / clear), Send button, textarea draft, VoiceRecorder (Speak/mic), helper line.
- Thread: UserBubble, PlanBubble (AgentWorkflow reasoning+tools → PlanGraph 240px + EditSpecPanel), TraceBubble (AgentRunView animation + trace lines), DeployBubble (confirmation + View agent link + first-run card), WelcomeBubble, TypingBubble.
- Agents: agent cards (name + meta line), detail (back link, title, RunButton, raw JSON `<pre>`, Runs list via AnimatedRuns).

## Design system

- Tailwind `ink-orbit` theme: slate scale remapped to ink palette (page #0b0b0b / card #181818 / borders #2a2a2a–#3a3a3a), Manrope/Newsreader/JetBrains Mono, shadcn new-york + Magic UI (`NumberTicker`, `PulsatingButton`, `BorderBeam`, `AnimatedList`, morphing-text, glyph-matrix).
- Spacing: predominantly 4-based; audit shows off-scale values (3,5,6,10,14,15,22,23,26,30,31,46) mostly from third-party components (React Flow, ink-orbit) — noted per finding, not all actionable.
- Type: ~12 distinct sizes on home (58/48/44/40/34/30/28/18/16/14/13/12/11/10/9/8/7px) — hero display + HUD micro-labels + body.
