import { isValidAddress } from "../spec-schema";

/** Mock balance for dry-run. Wire Helius getBalance for real runs. */
export async function getBalance(
  chain: string,
  address: string
): Promise<{ balance: number; formatted: string }> {
  if (!isValidAddress(address)) {
    throw new Error(
      `Invalid wallet address "${address}". Paste a valid Solana address.`
    );
  }
  // TODO: call Helius RPC getBalance when HELIUS_API_KEY is set.
  const balance = 10.5;
  const sym = chain === "solana" ? "SOL" : chain.toUpperCase();
  return { balance, formatted: `${balance} ${sym}` };
}
