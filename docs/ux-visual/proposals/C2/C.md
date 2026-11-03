# C2-C Convention — monitoring-tool pattern (Datadog/PagerDuty style)

Change: what monitoring products do: list = name + status dot + "last triggered Xm ago" + pause/run overflow; detail = status header, condition statement in plain words ("Alert when SOL < $150, checked every 60s"), timeline of runs. No block names anywhere in the default view.
Files: same as B but copy-led rather than component-led. Effort: M. Risk: plain-language renderer for conditions must cover all block types.
Meets C2 ✓ with the most user-appropriate language.
