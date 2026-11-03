# C2-A Minimal — collapse JSON, humanize meta

Change: wrap the detail `<pre>` in `<details>` (collapsed by default) with a 3-line human summary above (trigger cadence + condition sentence + action); format dates via `toLocaleString`, drop raw ids from list cards (keep title + "created Nov 3" + status pill).
Before: JSON wall + ISO strings. After: summary-first, JSON one click away.
Files: `app/agents/[id]/page.tsx`, `app/agents/page.tsx`. Effort: S. Risk: minimal.
Meets C2: summary ✓, localized dates ✓, ids hidden ✓, scroll reduced ✓ (JSON collapsed).
