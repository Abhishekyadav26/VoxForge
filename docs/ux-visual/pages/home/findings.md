# Findings — home (`/`)

Verdict 1440×900: strong hero with a split-panel composition; the orbit illustration dominates as intended and the primary CTA reads clearly. Issues are confined to brand/header redundancy, HUD micro-label noise, and nav touch targets.
Shots: `shots/1440x900-main.png`, `shots/1440x900-full.png`, `shots/1440x900-features.png`, `shots/1440x900-endpage.png`.

Verdict 768×1024: layout holds, no horizontal scroll; type steps down cleanly (40px headline).
Shot: `shots/768x1024-main.png`.

Verdict 390×844: headline and CTAs fit without overflow, but the header collapses badly — brand wraps to two lines, Sign out wraps to two lines, nav squeezes.
Shot: `shots/390x844-main.png`.

| id | level | element | problem | norm | evidence | severity |
|----|-------|---------|---------|------|----------|----------|
| H-1 | comp | morphing headline "Ship a monitor." | mid-morph frame renders the accent line blurred/ghosted — looks like a duplicated or broken headline in a still | H5, I2 | `1440x900-main.png` (vision) | observed · P3 |
| H-2 | comp | Watch Demo button | doubled/misrendered border (corner marks + outline) | H5 | `1440x900-main.png` (vision) | observed · P3 |
| H-3 | group | header nav (Studio/Agents/Sign out) | links measure 42×20, 46×20, sign-out 47×16 — all below the 24px min target | I4 | audit.json (measured, all viewports) | measured · P1 |
| H-4 | page | header brand "Voice-to-Agent Studio" | 390px: brand wraps to two lines and crowds the hero headline; "Sign out" also wraps | L6, D2 | `390x844-main.png` (vision) | observed · P1 |
| H-5 | comp | HUD micro-labels (N 063°, FORGE·3D, seed, pred +16%) | 7–10px labels; "working" caption contrast 2.85:1; geo audit shows 6px spills on bento SVG text | A1 | audit.json (measured) | measured · P2 |
| H-6 | page | features bento | svg `<text>` labels spill 49–64px beyond parents (geo audit) — clipped glyphs at edges | L6 | audit geo (measured) | measured · P2 |
| H-7 | comp | end-CTA headline | renders "The matrix is watching SQL …" (glyph-matrix flicker misread or glyph swap — either way the product word "SOL" is corrupted in the still) | C1 | `1440x900-endpage.png` (vision) | observed · P2 |
| H-8 | group | end-CTA buttons "Start building →" / "View agents" | duplicate the hero's "Open Studio" CTA with different names for the same destinations | C2, C1 | `1440x900-endpage.png` + hero | observed · P2 |

Excellent as is: split-panel hero composition with a single dominant visual; primary CTA clearly filled vs outline secondary; features bento consistent borders/alignment; end-CTA readable over the glyph matrix with clear primary/secondary split; zero horizontal overflow at all viewports.
