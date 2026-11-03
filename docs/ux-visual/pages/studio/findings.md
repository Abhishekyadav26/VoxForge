# Findings — studio (`/studio`)

Verdict: the strongest surface in the app — the voice→plan→trace→deploy loop works end to end (plan generated, trace "Conditions met — alert sent", deploy confirmed, all live). Findings are about next-action guidance, graph polish, duplication, and mobile composer density.
Shots: `shots/1440x900-empty.png`, `shots/1440x900-plan.png`, `shots/1440x900-trace.png`, `shots/1440x900-deploy.png`, `shots/390x844-empty.png`.

| id | level | element | problem | norm | evidence | severity |
|----|-------|---------|---------|------|----------|----------|
| S-1 | group | command chips after plan | four chips (generate/run/deploy/clear) + Send + Speak all look equally prominent — the likely next step ("run the trace") doesn't stand out | H1, H2 | `1440x900-plan.png` (vision) | observed · P1 |
| S-2 | comp | PlanGraph (240px) | React Flow zoom toolbar overlaps the left edge of node s2; "React Flow" attribution sits against panel edge; graph is small relative to surrounding empty space | H6, D2 | `1440x900-plan.png` (vision) + audit overlaps (measured) | measured · P2 |
| S-3 | group | plan bubble | AgentWorkflow tool rows ("Live price…", "Check condition…") repeat the same info as the PlanGraph nodes below them — threshold appears in prompt + workflow + node; two "Worked for N seconds" labels (7s and 6s) | C2, D5 | `1440x900-plan.png`, `1440x900-trace.png` (vision) | observed · P2 |
| S-4 | comp | trace status | trigger state is clear in the trace text ("Conditions met — alert sent") but the diagram nodes stay neutral gray — no triggered highlight/check; "idle · listening ready" pill sits next to "alert sent" and reads contradictory | C3, H4 | `1440x900-trace.png` (vision) | observed · P2 |
| S-5 | comp | composer helper "Mic on → speak the alert…" | 11px at 2.99:1 contrast — below the 4.5:1 text minimum | A1 | audit.json (measured) | measured · P1 |
| S-6 | group | mobile composer (390px) | chips ~24–26px tall on two cramped rows; Send similarly short — below comfortable touch size; header brand collides with "VoxForge Studio" heading and Sign out wraps | I4, L6 | `390x844-empty.png` (vision) | observed · P1 |
| S-7 | comp | graph node labels "s1 · price.get · SOL → USD" | node text contrast 3.32:1 — below minimum for small text | A1 | audit.json (measured) | measured · P2 |
| S-8 | page | thread column `max-w-3xl` + fixed 179px composer | on 1440px the thread is a narrow center column with large empty gutters; plan graph gets only 240px height inside it | D2, D1 | `1440x900-plan.png`, audit fixedOverlays (measured) | measured · P2 |

Excellent as is: the end-to-end loop actually works (extract→trace→deploy all live, toasts confirm each step); welcome bubble teaches the four voice commands with a concrete example; dry-run trace lines read like plain language ("s1.price (91.7…) < 150? YES"); deploy confirmation + first-run card + View agent link is a complete closed loop.
