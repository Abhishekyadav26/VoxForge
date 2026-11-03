# C4-A Minimal — state-driven primary chip

Change: in `app/studio/page.tsx`, compute the next action from thread state (`spec==null` → generate; spec && !traced → trace; traced && !deployed → deploy) and give that chip the white-filled primary style (same as Send), others keep ghost style.
Before: five equal chips. After: one white chip, four ghost.
Files: `app/studio/page.tsx` only. Effort: XS. Risk: none.
Meets C4 ✓ (one primary per state).
