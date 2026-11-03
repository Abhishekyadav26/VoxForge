# 🎙️ Voice-to-Agent Studio (VoxForge)

Describe a blockchain monitoring agent by **voice**, see a **visual plan** (React Flow), dry-run it, then **deploy a Telegram alert** — Solana-focused, Next.js + TypeScript.

**Links:** [GitHub repository](https://github.com/Abhishekyadav26/VoxForge) · [Demo video](https://www.youtube.com/watch?v=0SOCge-rZG8)

## Quick start

```bash
pnpm install
cp .env.example .env.local   # optional keys; all degrade to mock/dry-run
pnpm dev                     # http://localhost:3000
```

> **Port note:** `NEXTAUTH_URL` defaults to `http://localhost:3000` — run on port
> 3000 (or update `NEXTAUTH_URL`) or credential sign-in will 401.

### Test the engine (no keys needed)

```bash
pnpm run test:engine
```

## Architecture

```
app/                    pages + API routes
  ├── agents/           page — list of the user's saved agents (status pills,
  │                       relative times); [id]/page — detail: status badge,
  │                       RunButton + pause/delete controls, human SpecSummary,
  │                       collapsible raw JSON, expandable RunRows
  ├── api/
  │   ├── agents/       GET /agents — list; POST /agents/pause { agentId, paused };
  │   │                 POST /agents/delete { agentId }
  │   ├── auth/         credentials + Google OAuth (next-auth)
  │   ├── extract-spec  POST — transcript → AgentSpec (Groq when key set,
  │   │                   rule-based fallback otherwise; rejects specs that
  │   │                   drop the coin/condition)
  │   ├── test-spec     POST — dry-run spec against live/mock data, returns trace
  │   ├── deploy-agent  POST — save spec to DB, send Telegram confirmation,
  │   │                   auto-run once after deploying
  │   ├── run-agent     POST — execute spec, send Telegram alerts
  │   ├── generate-code POST — generate TypeScript from AgentSpec
  │   ├── telegram/     GET /link — per-user Telegram binding code & deep link
  │   │                 POST /webhook — handle @bot start <CODE> updates
  │   └── cron/         GET/POST /cron/run-due — run due agents (Vercel cron,
  │                       every 5 min; sequential, alerts only on false→true)
  ├── login/            login / register page (per-field errors)
  └── studio/           voice → plan → trace → deploy chat thread
components/
  VoiceRecorder (Web Speech + "generate plan/run the trace/deploy/clear"),
  ChatThread (plan/trace/deploy bubbles), AgentRunView (animated trace),
  PlanGraph (React Flow, read-only, triggered tint), EditSpecPanel,
  SpecSummary (plain-language spec), RunRow (expandable run),
  RunButton, AgentControls (pause/delete), AuthButton, HomeHero,
  HomeFeatures, AnimatedRuns, GlyphMatrix, icons, AppProviders, ui/* (shadcn +
  Magic UI: ai-agent-response, border-beam, glyph-matrix, ink-orbit-hero,
  ink-orbit-features, morphing-text, number-ticker, pulsating-button, …)
lib/
  spec-schema (Zod AgentSpec + address/token validation), extractor
    (Groq + rule-based), interpreter (AND semantics, dry-run safe),
  generator (template + Groq), scheduler (isDue/parseEvery, paused-aware,
    transition-only alerts), db (Supabase ↔ local JSON fallback), telegram,
  groq, auth, env, format-date
lib/blocks/            price (CMC SDK, id-resolved, 20s cache, mock fallback),
  wallet (Solana public RPC, mock fallback), condition (compare/percentChange),
  notify (Telegram send + ${sN.field} rendering), market (fear/greed, global
  metrics, coin info, narratives)
spec-extractor-prompt.md, code-generator-prompt.md — LLM system prompts
scripts/
  test-engine.ts — offline smoke test (no API keys)
  scheduler.ts + scheduler-service.sh — local always-on polling alternative
  set-telegram-webhook.ts, get-chat-id.js — Telegram setup helpers
supabase/migrations/  0001_init … 0006_agent_pause (agents/runs/users schema)
```

## Flow

1. **Studio** (`/studio`) — speak or type *"Alert me on Telegram when SOL drops below $150"*.
2. **Extract** — `/api/extract-spec` turns text into a validated `AgentSpec` (Groq when `GROQ_API_KEY` is set, rule-based fallback otherwise).
3. **Visualize** — PlanGraph shows steps → conditions → Telegram action; click a node to edit its params (`EditSpecPanel`).
4. **Dry-run** — `/api/test-spec` executes the graph and prints a trace ("s1.price (91.7…) < 150? YES"); the outcome shows as a status pill.
5. **Deploy** — `/api/deploy-agent` saves the agent, sends a Telegram confirmation, and auto-runs once; results render in `/agents/[id]`.
6. **Run / pause / delete** — `RunButton` triggers a live run any time; `AgentControls` pauses (scheduler skips paused agents) or deletes with confirmation.
7. **Scheduler** — `/api/cron/run-due` (Vercel cron, every 5 min) runs due interval agents sequentially and sends Telegram alerts only when a condition flips false→true (no repeat spam). Local alternative: `pnpm scheduler` / `scripts/scheduler-service.sh start`. `CRON_SECRET` bearer token protects the endpoint.
8. **Agents page** (`/agents`) — list with status pills and relative times; detail morphs from the card via view transitions.

## Environment

| Variable | Purpose | If missing |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Send alerts (global fallback) | logs instead |
| `COINMARKETCAP_API_KEY` | Live prices (official CMC Pro SDK) | mock prices |
| `GROQ_API_KEY` | Groq text→spec (GPT-OSS/Qwen) | rule-based extractor |
| `GROQ_MODEL` | Primary Groq model | `openai/gpt-oss-120b` |
| `GROQ_MODEL_FALLBACKS` | Comma-separated model chain used if primary is retired/rate-limited | `openai/gpt-oss-20b,qwen/qwen3.8-27b,allam-2-7b` |
| `NEXTAUTH_URL` | Base URL for NextAuth (must match the port you run on) | — |
| `NEXTAUTH_SECRET` | OpenSSL rand -base64 32 for session signatures | — |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 credentials | — |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Cloud persistence (Supabase); when omitted, falls back to local JSON files | — |
| `CRON_SECRET` | Bearer token to protect `/api/cron/run-due` | endpoint returns 503 |

Run `supabase/migrations/*.sql` once in the Supabase SQL editor (in order); `0006_agent_pause.sql` is safe to re-run on existing databases.

**Data sources:** prices use the official [`@coinmarketcap/sdk`](https://www.npmjs.com/package/@coinmarketcap/sdk) (`quotes/latest`, id-resolved to dodge dead-ticker collisions); wallet balances use the public Solana RPC (`api.mainnet-beta.solana.com`) — no Helius/Jupiter keys needed.

## UI

- **Route transitions** via the native View Transitions API (`next-view-transitions`): pages cross-fade; the agent card **morphs into the detail title** via a shared `view-transition-name` (`agent-card-<id>`). Reduced-motion preferences are respected; unsupported browsers skip animations entirely.
- **Magic UI components** (`components/ui/`):
  - `BorderBeam` runs along the plan-graph panel
  - Animated plan/trace workflows (`ai-agent-response`), glyph-matrix end CTA, ink-orbit hero/features
- Composer: one primary chip per thread state (generate → trace → deploy); voice vocabulary stays visible.
- The interpreter/generator only execute the fixed block set — never arbitrary user code.
- Private keys never enter specs or the DB; Telegram chat ID comes from the bound user or env, not the spec.
- Wallet addresses are validated before use; placeholders are flagged as `missingFields`.

## Safety

- The interpreter/generator only execute the fixed block set — never arbitrary user code.
- All env vars are optional at runtime — missing ones degrade to mock/dry-run behaviour instead of crashing (except `CRON_SECRET`, which gates the cron endpoint).

## Scope (MVP)

✅ Price alerts, wallet balance checks, dry-run traces, Telegram alerts, pause/delete, human-readable agent pages
❌ Multi-chain (Solana only), code-gen edge cases, UI animations

## License

MIT
