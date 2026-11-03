# Findings — login (`/login`)

Verdict: not visually captured (authenticated sessions redirect to `/studio`, by design). Code-read instead. The form itself is sound; one functional defect found in the registration path.
No shots (gap recorded in inventory).

| id | level | element | problem | norm | evidence | severity |
|----|-------|---------|---------|------|----------|----------|
| L-1 | comp | register name field | submitting register without a name surfaces a raw Zod JSON blob (`[{"code":"too_small",…}]`) as the status text instead of a human message | I3, C1 | live interaction (observed — reproduced during test-account signup) | observed · P1 |
| L-2 | comp | Google button vs email form | two full-width `size="lg"` buttons of equal weight (Sign in + Continue with Google) — no primary/secondary split at the decision that matters | H1 | code read (`app/login/page.tsx`) | suspected · P2 |

Excellent as is: redirect-authenticated-to-studio is correct; per-account privacy note is stated; min-8 password hint is inline.
