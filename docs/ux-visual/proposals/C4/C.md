# C4-C Convention — chat-assistant pattern (ChatGPT/Claude style)

Change: what chat products do: no persistent action chips at all — the assistant's messages carry the next action as an inline button ("Run the trace" button inside the plan bubble; "Deploy" inside the trace bubble). Composer keeps mic + textarea + Send only. Voice commands unchanged.
Files: `ChatThread.tsx` (add CTA buttons to bubbles), `app/studio/page.tsx` (drop chips). Effort: M. Risk: voice discoverability drops — keep the welcome bubble's command list.
Meets C4 ✓ with the most native chat feel.
