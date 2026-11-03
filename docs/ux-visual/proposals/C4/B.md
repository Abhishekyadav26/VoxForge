# C4-B Restructure — stepper composer

Change: replace the four chips with a 3-step progress header (1 Plan → 2 Dry-run → 3 Deploy) + a single contextual primary button ("Generate plan" / "Run the trace" / "Deploy") with Back/Clear as text links. State machine made visible.
Before/after: chips → stepper + one action. Clearer but bigger change.
Files: `app/studio/page.tsx`, maybe new `StudioSteps.tsx`. Effort: M. Risk: voice-command mapping ("generate plan" etc.) must still work — keep handlers.
Meets C4 ✓ with the strongest guidance.
