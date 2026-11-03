# Findings — agents list (`/agents`) and detail (`/agents/[id]`)

Verdict list: clear hierarchy and count, but raw technical metadata (agent id, ISO ms timestamps) and a vast empty lower half.
Shot: `pages/agents/shots/1440x900-main.png`, `pages/agents/shots/390x844-main.png`.
Verdict detail: the primary action ("Run now — send real alert") is unmissable, but the centerpiece is a raw JSON dump — implementation language (`price.get`, `condition.compare`) exposed as the main content — and the run history uses raw ISO timestamps + machine ids.
Shot: `pages/agent-detail/shots/1440x900-main.png`.

| id | level | element | problem | norm | evidence | severity |
|----|-------|---------|---------|------|----------|----------|
| A-1 | page | detail spec `<pre>` JSON | raw AgentSpec JSON (block names, `${s1.price}` refs) is the main content — a non-technical user must parse implementation details; no formatted step summary, JSON is the only view | C1, P1 | `1440x900-main.png` (vision) | observed · P1 |
| A-2 | comp | run history row | raw ISO timestamp with ms+offset (`2026-11-03T05:47:25.91+00:00`) and machine id (`run_mw09n8t2`); id contrast 2.7:1 | C1, A1 | `1440x900-main.png` (vision) + audit (measured) | measured · P1 |
| A-3 | comp | agent card meta | card shows raw `agent_<id>` and full ISO created/last-run timestamps — overly technical for a list scan | C1 | agents `1440x900-main.png` (vision) | observed · P2 |
| A-4 | page | agents list lower half | single card then ~80% empty viewport — no density decision (recent runs, quick actions, or a compact empty-state pattern) | D2 | agents `1440x900-main.png` (vision) | observed · P2 |
| A-5 | comp | back link "← Agents" (64×19) | below 24px target; same for header nav links (shared with H-3) | I4 | audit.json (measured) | measured · P2 |
| A-6 | page | detail page scroll | 454px page scroll at 1440×900 driven by the JSON `<pre>` + raw run-trace dumps — the page's purpose (status + run/don't-run) doesn't require it | L1 | audit.json (measured) | measured · P2 |

Excellent as is: list count in the heading ("Agents (1)") makes the one-item state unambiguous; detail primary action is high-contrast, well-placed, and states its consequence ("send real alert"); view-transition morph between card and detail title is a considered touch.
