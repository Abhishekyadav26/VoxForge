/**
 * Engine smoke test (no API keys needed).
 * Run: npm run test:engine
 */
import assert from "assert";
import { extractSpecLocal } from "../lib/extractor";
import { runSpec } from "../lib/interpreter";
import { AgentSpecSchema } from "../lib/spec-schema";

async function main() {
  // 1. Extractor: SOL price drop (spec Example 1)
  const t1 = extractSpecLocal("Alert me on Telegram when SOL price drops below $150");
  AgentSpecSchema.parse(t1);
  assert.strictEqual(t1.name, "SOL Price Alert");
  assert.strictEqual(t1.trigger.every, "60s");
  assert.strictEqual(t1.steps.length, 2);
  const c1 = t1.steps.find((s) => s.block === "condition.compare")!;
  assert.strictEqual((c1.params as any).op, "<");
  assert.strictEqual((c1.params as any).right, 150);
  console.log("✔ extractor: 'SOL drops below $150' →", t1.name, JSON.stringify(c1.params));

  // 2. Extractor: wallet balance drop 10% (spec Example 2)
  const t2 = extractSpecLocal("Monitor my wallet and tell me if the balance drops by more than 10% in the last hour");
  assert(t2.missingFields?.includes("wallet_address"));
  assert.strictEqual(t2.steps.length, 2, "wallet-only spec: balance + percentChange");
  const p2 = t2.steps.find((s) => s.block === "condition.percentChange")!;
  assert.strictEqual((p2.params as any).percentChange, -10);
  assert.strictEqual((p2.params as any).value, "s1.balance");
  console.log("✔ extractor: 'balance drops by more than 10%' →", t2.name, JSON.stringify(p2.params), "missing:", t2.missingFields);

  // 3. Extractor: combined ETH + balance, every 10 min (spec Example 3)
  const t3 = extractSpecLocal("Check if ETH is below $2000 AND my balance decreased by 5%. Only check every 10 minutes.");
  assert.strictEqual(t3.trigger.every, "10m");
  assert.strictEqual(t3.steps.length, 4, "price + balance + compare + percentChange");
  const c3 = t3.steps.find((s) => s.block === "condition.compare")!;
  const p3 = t3.steps.find((s) => s.block === "condition.percentChange")!;
  assert.strictEqual((c3.params as any).left, "s1.price");
  assert.strictEqual((c3.params as any).right, 2000);
  assert.strictEqual((p3.params as any).percentChange, -5);
  assert.strictEqual((p3.params as any).value, "s2.balance");
  console.log("✔ extractor: 'ETH below $2000 AND balance -5%, every 10 minutes' →", t3.name, "steps:", t3.steps.length);

  // 4. Interpreter: dry-run trace, not triggered (mock SOL = 151.5 > 150)
  const r1 = await runSpec(t1, { dryRun: true });
  assert.strictEqual(r1.success, true);
  assert.strictEqual(r1.triggered, false);
  assert.strictEqual(r1.trace.length, 2);
  console.log("✔ interpreter dry-run:", r1.trace.map((t) => t.detail).join(" | "), "→ triggered:", r1.triggered);

  // 5. Interpreter: percent-change fires + Telegram message rendered (dry).
  // The spec has a MISSING address placeholder, so give it a valid one first.
  // Balance comes from the real Solana RPC (or mock if unreachable).
  const t2real: typeof t2 = {
    ...t2,
    steps: t2.steps.map((s) =>
      s.block === "wallet.getBalance"
        ? { ...s, params: { ...(s.params as any), address: "So11111111111111111111111111111111111111112" } }
        : s
    ),
  };
  const r2 = await runSpec(t2real, { dryRun: true, mockActualChange: -12 });
  assert.strictEqual(r2.success, true);
  assert.strictEqual(r2.triggered, true);
  assert(r2.messages.length > 0 && r2.messages[0].includes("Balance:"));
  console.log("✔ interpreter triggered:", r2.messages[0]);
  assert.strictEqual(r1.messages.length, 0);

  // 6. Extractor: fear & greed monitor (market.fearGreed block)
  const t6 = extractSpecLocal("Alert me on Telegram when fear and greed drops below 20");
  AgentSpecSchema.parse(t6);
  assert.strictEqual(t6.name, "Market Sentiment Alert");
  const fg6 = t6.steps.find((s) => s.block === "market.fearGreed")!;
  const c6 = t6.steps.find((s) => s.block === "condition.compare")!;
  assert.strictEqual((c6.params as any).left, "s1.value");
  assert.strictEqual((c6.params as any).op, "<");
  assert.strictEqual((c6.params as any).right, 20);
  console.log("✔ extractor: 'fear and greed below 20' →", t6.name, "step:", fg6.block, JSON.stringify(c6.params));

  // 7. Extractor: BTC dominance monitor (market.globalMetrics block)
  const t7 = extractSpecLocal("warn me when BTC dominance drops below 45%");
  AgentSpecSchema.parse(t7);
  const gm7 = t7.steps.find((s) => s.block === "market.globalMetrics")!;
  const c7 = t7.steps.find((s) => s.block === "condition.compare")!;
  assert.strictEqual((c7.params as any).left, "s1.btcDominance");
  assert.strictEqual((c7.params as any).right, 45);
  console.log("✔ extractor: 'BTC dominance below 45%' →", t7.name, "step:", gm7.block, JSON.stringify(c7.params));

  // 8. Interpreter: fear & greed + global metrics dry-run (mock fallback data)
  const t8 = extractSpecLocal("Alert me when fear and greed is above 70");
  const r8 = await runSpec(t8, { dryRun: true });
  assert.strictEqual(r8.success, true);
  const fgTrace = r8.trace.find((t) => t.block === "market.fearGreed")!;
  assert.strictEqual(typeof fgTrace.output.value, "number");
  console.log("✔ interpreter market blocks:", r8.trace.map((t) => t.detail).join(" | "), "→ triggered:", r8.triggered);

  // 9. Interpreter: percent-change uses real CMC change when available
  // (simulate a price.get output carrying a real 24h change of +3.2%)
  const t9: any = {
    name: "Real pct test",
    trigger: { type: "interval", every: "60s" },
    steps: [
      { id: "s1", block: "price.get", params: { token: "SOL", currency: "USD" } },
      { id: "s2", block: "condition.percentChange", params: { value: "s1.price", percentChange: -10, timeWindow: "24h" } },
    ],
    actions: [{ block: "notify.telegram", params: { message: "m" } }],
  };
  // getPrice will hit the real CMC API if a key is set; when it falls back to
  // mock there is no percentChange field, so percentChangeCheck uses the mock.
  const r9 = await runSpec(t9, { dryRun: true, mockActualChange: -12 });
  assert.strictEqual(r9.success, true);
  assert.strictEqual(r9.triggered, true);
  console.log("✔ interpreter percent-change fallback:", r9.trace.find((t) => t.block === "condition.percentChange")?.detail);

  // 10. Token normalization: BNB must not silently become SOL (regression)
  const t10 = extractSpecLocal("alert me when BNB drops below $600");
  const p10 = t10.steps.find((s) => s.block === "price.get")!;
  assert.strictEqual((p10.params as any).token, "BNB");
  assert.strictEqual(extractSpecLocal("warn me on binance coin").steps[0].params.token, "BNB");
  console.log("✔ extractor: 'BNB' and 'binance coin' resolve to BNB (not SOL)");

  // 11. Volume rule → condition on s1.volume24h
  const t11 = extractSpecLocal("alert me when SOL's 24h volume exceeds $1B");
  const v11 = t11.steps.find((s) => s.block === "condition.compare")!;
  assert.strictEqual((v11.params as any).left, "s1.volume24h");
  assert.strictEqual((v11.params as any).op, ">");
  assert.strictEqual((v11.params as any).right, 1e9);
  console.log("✔ extractor: volume rule →", JSON.stringify(v11.params));

  // 12. Narrative monitor + threshold
  const t12 = extractSpecLocal("alert me when the AI narrative grows more than 10%");
  assert(t12.steps.some((s) => s.block === "market.narrative"));
  const c12 = t12.steps.find((s) => s.block === "condition.compare")!;
  assert.strictEqual((c12.params as any).left, "s1.topChange");
  console.log("✔ extractor: narrative →", JSON.stringify(c12.params));

  // 13. Historical comparison ("price from 24 hours ago" / "yesterday")
  const t13 = extractSpecLocal("alert me when SOL returns to its price from 24 hours ago");
  const h13 = t13.steps.find((s) => s.block === "price.historical")!;
  assert.strictEqual((h13.params as any).hoursAgo, 24);
  assert(!t13.missingFields?.includes("threshold"), "historical monitor needs no price threshold");
  const t13b = extractSpecLocal("alert me when BTC is at the same price as yesterday");
  assert.strictEqual((t13b.steps.find((s) => s.block === "price.historical")!.params as any).hoursAgo, 24);
  console.log("✔ extractor: historical → hoursAgo 24 (no spurious missing threshold)");

  // 14. New block names are accepted by the schema
  for (const block of ["market.coinInfo", "market.narrative", "price.historical"]) {
    AgentSpecSchema.parse({
      name: "schema", trigger: { type: "interval", every: "60s" },
      steps: [{ id: "s1", block, params: { token: "SOL" } }],
      actions: [{ block: "notify.telegram", params: { message: "m" } }],
    });
  }
  console.log("✔ schema accepts market.coinInfo, market.narrative, price.historical");

  console.log("\n✅ All engine tests passed");
}

main().catch((e) => { console.error("❌ Test failed:", e); process.exit(1); });