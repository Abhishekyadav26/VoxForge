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
2. **Extract** — `/api/extract-spec` turns text into a validated AgentSpec (Claude API when `ANTHROPIC_API_KEY` is set, rule-based fallback otherwise).
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
| `ANTHROPIC_API_KEY` | Claude text→spec | rule-based extractor |
| `HELIUS_API_KEY` | Real on-chain data | mock prices/balances |

## Safety

- The interpreter/generator only execute the fixed block set — never arbitrary user code.
- Private keys never enter specs or the DB; Telegram chat ID comes from env, not the spec.
- Wallet addresses are validated before use; placeholders are flagged as `missingFields`.

## Scope (MVP)

✅ Price alerts, wallet balance checks, dry-run traces, Telegram alerts
❌ Multi-chain (Solana only), code-gen edge cases, DB migrations, UI animations