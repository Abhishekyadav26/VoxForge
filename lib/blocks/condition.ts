export type CompareOp = "<" | ">" | "<=" | ">=" | "==";

export function compare(
  left: number,
  op: CompareOp,
  right: number
): { result: boolean } {
  switch (op) {
    case "<":
      return { result: left < right };
    case ">":
      return { result: left > right };
    case "<=":
      return { result: left <= right };
    case ">=":
      return { result: left >= right };
    case "==":
      return { result: left === right };
  }
}

/**
 * For dry-run: caller passes the current value; we simulate history
 * from the threshold (actualChange = percentChange) unless a mock
 * history provider is supplied.
 */
export function percentChangeCheck(
  currentValue: number,
  percentChange: number,
  _timeWindow: string,
  mockActualChange?: number
): { result: boolean; actualChange: number } {
  const actualChange = mockActualChange ?? percentChange; // dry-run: assume threshold hit
  void currentValue;
  // Negative threshold = drop. Trigger when actual <= threshold (more negative).
  // Positive threshold = rise. Trigger when actual >= threshold.
  const result =
    percentChange < 0 ? actualChange <= percentChange : actualChange >= percentChange;
  return { result, actualChange };
}
