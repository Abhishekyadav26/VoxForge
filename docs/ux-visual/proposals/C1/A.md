# C1-A Minimal — token/global CSS bump

Change: in `app/globals.css`, raise the chrome text floor: nav links + `text-xs` buttons to `min-height:24px` with inline-flex centering; bump `slate-500` helper text on dark to a lighter step for ≥4.5:1; composer chip padding `py-1`→`py-2`. One file, no component API changes.
Before: 20px nav links, 2.99:1 helper. After: 24px+ targets, ≥4.5:1 helpers, 32px+ chips.
Files: `app/globals.css`, maybe `components/ui/button.tsx` sizes. Effort: S. Risk: slight header height growth (~4px) — acceptable.
Meets C1: targets ≥24px ✓, contrast ✓ (measured), node labels via `.react-flow__node` color override ✓.
