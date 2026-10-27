# 🎙️ Voice-to-Agent Studio

Describe a blockchain monitoring agent by **voice**, see a **visual plan** (React Flow), dry-run it, then **deploy a Telegram alert** — Solana-focused, Next.js + TypeScript.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional keys; all degrade to mock/dry-run
npm run dev                  # http://localhost:3000
```

### Test the engine (no keys needed)

```bash
npm run test:engine
```

## Flow

1. **Studio** (`/studio`) — speak or type *"Alert me on Telegram when SOL drops below $150"*.
2. **Extract** — `/api/extract-spec` turns text into a validated AgentSpec (Groq when `GROQ_API_KEY` is set, rule-based fallback otherwise).
3. **Visualize** — PlanGraph shows steps → conditions → Telegram action; click a node to edit its params (`EditSpecPanel`).
4. **Dry-run** — `/api/test-spec` executes the graph with mock data and prints a trace ("s1: SOL = $151.50. s2: 151.5 < 150? NO").
5. **Deploy** — fills missing fields (wallet address), saves to `data/agents.json` (`/api/deploy-agent`), then run any time via `/api/run-agent` (mapped to `RunButton` on `/agents/[id]`).
6. **Notify** — `notify.telegram` block sends via Telegram Bot API when `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` are set.

## Architecture

```
app/            pages + API routes (extract-spec, test-spec, deploy-agent, run-agent, generate-code, agents)
components/     VoiceRecorder, TranscriptPanel, PlanGraph, EditSpecPanel, TestResults, AgentDeployPanel, RunButton
lib/blocks/     price (cached), wallet, condition, notify  — one function per block
lib/            spec-schema (Zod), extractor, generator, interpreter (AND logic), db (JSON), env
spec-extractor-prompt.md, code-generator-prompt.md   — LLM system prompts
scripts/test-engine.ts        — offline smoke test
```

## Environment

| Variable | Purpose | If missing |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Send alerts | logs instead |
| `COINMARKETCAP_API_KEY` | Live prices (official CMC Pro SDK) | mock prices |
| `GROQ_API_KEY` | Groq text→spec (GPT-OSS/Qwen) | rule-based extractor |
| `GROQ_MODEL` | Primary Groq model | `openai/gpt-oss-120b` |
| `GROQ_MODEL_FALLBACKS` | Comma-separated model chain used if primary is retired/rate-limited | `openai/gpt-oss-20b,qwen/qwen3.8-27b,allam-2-7b` |

**Data sources:** prices use the official [`@coinmarketcap/sdk`](https://www.npmjs.com/package/@coinmarketcap/sdk) (`quotes/latest`); wallet balances use the public Solana RPC (`api.mainnet-beta.solana.com`) — no Helius/Jupiter keys needed.

## UI

- **Route transitions** via the native View Transitions API (`next-view-transitions`): pages cross-fade; the agent card **morphs into the detail title** via a shared `view-transition-name` (`agent-card-<id>`). Reduced-motion preferences are respected; unsupported browsers skip animations entirely.
- **Magic UI components** (`components/ui/`, installed via the Magic UI MCP + shadcn registry): `NumberTicker` animates live prices/balances in dry-runs, `PulsatingButton` drives the mic (ripple variant), `BorderBeam` runs along the plan-graph panel, `AnimatedList` staggers agent run logs.

- The interpreter/generator only execute the fixed block set — never arbitrary user code.
- Private keys never enter specs or the DB; Telegram chat ID comes from env, not the spec.
- Wallet addresses are validated before use; placeholders are flagged as `missingFields`.

## Safety

- The interpreter/generator only execute the fixed block set — never arbitrary user code.

## Scope (MVP)

✅ Price alerts, wallet balance checks, dry-run traces, Telegram alerts
❌ Multi-chain (Solana only), code-gen edge cases, DB migrations, UI animations