# Problems — clustered, ranked

## C1. Touch targets + low-contrast microcopy across chrome and composer (P1)
Root cause: global small text (11–12px slate-500 helpers, 20px-high nav links, 24–26px chips) never checked against I4/A1.
Findings: H-3, S-5, S-6, A-5. Surfaces: nav (all pages), studio composer+helper, agents back-link.
Evidence: measured (nav 42×20/46×20/47×16; helper 2.99:1; node labels 3.32:1; run-id 2.7:1).
Acceptance: all interactive targets ≥24px high (≥44px on touch rows); helper/body text ≥4.5:1; node/label text ≥4.5:1.

## C2. Agent detail/list expose raw engine internals (P1)
Root cause: no formatted presentation layer for AgentSpec/runs — JSON is the view.
Findings: A-1, A-2, A-3, A-6. Surfaces: `/agents`, `/agents/[id]`.
Evidence: vision + measured 454px detail scroll.
Acceptance: detail shows a human step summary + trigger line with raw JSON collapsed; timestamps localized ("Nov 3, 5:47 AM"); ids hidden or shortened; no page scroll at 1440×900 for a 1-run agent.

## C3. Auth/registration error and login hierarchy (P1/P2)
Root cause: API Zod errors passed straight to UI; equal-weight auth buttons.
Findings: L-1, L-2. Surface: `/login`, register API.
Acceptance: empty-name register shows "Please enter your name"; primary/secondary split on auth buttons.

## C4. Studio next-action guidance (P1)
Root cause: all composer chips share one emphasis; no state-driven primary.
Findings: S-1. Surface: `/studio` composer.
Acceptance: exactly one primary chip per thread state (no spec → generate; spec → trace; traced → deploy); others secondary.

## C5. Plan/trace duplication + status legibility (P2)
Root cause: workflow animation, graph, and trace each restate the same steps; run status lives in prose, not in the diagram.
Findings: S-3, S-4, S-2 (toolbar overlap part). Surface: `/studio` thread.
Acceptance: threshold/condition stated once per bubble; diagram nodes reflect triggered state; "Worked for" appears once; zoom toolbar doesn't overlap nodes.

## C6. Mobile header + composer density (P1)
Root cause: fixed header/composer designed at desktop widths; no 390px rules.
Findings: H-4, S-6. Surfaces: all pages (header), `/studio` (composer).
Acceptance: 390px header single-line brand + menu-safe nav; composer chips ≥44px rows stacked without crowding; no brand/heading collision.

## C7. Home polish: morph flicker, demo button frame, glyph-matrix copy, CTA naming (P2/P3)
Root cause: third-party component defaults (morphing-text mid-transition, ink-orbit button frame, matrix glyph swap) + copy written per-section.
Findings: H-1, H-2, H-5, H-6, H-7, H-8. Surface: `/`.
Acceptance: accent headline legible in stills; demo button single border; HUD text ≥3:1 large/4.5:1 small or decorative-marked; end-CTA says SOL; CTAs share names per destination.

## Deferred (out of --max-fixes budget or third-party-owned)
- H-5/H-6 HUD micro-labels + SVG spills (ink-orbit internals; documented, not patched).
- A-4 agents-list empty half (needs product decision on dashboard content — flagged, not designed).
- Spacing off-scale values from React Flow / ink-orbit (third-party; app tokens stay 4-based).

Carried forward: C1, C2, C3, C4, C5, C6 (6 clusters; C7 documented as deferred polish).
