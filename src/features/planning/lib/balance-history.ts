import type { Transaction } from "@/lib/schemas";

export interface BalancePoint {
  timestamp: number;
  balance: number;
}

/**
 * Reconstruct a balance-over-time series from the current balance and the
 * transaction log. Walks transactions newest -> oldest, undoing each one to
 * compute the balance at the moment **before** that transaction. The result
 * is then reversed so callers receive the points in chronological order
 * (oldest first), which is what charting libraries expect.
 *
 * Assumptions:
 *   - `transactions` is ordered newest-first (matches how the app prepends)
 *   - "deposit" added to the balance, "withdrawal" subtracted
 *   - The current `amount` already reflects every transaction in the list
 */
export function reconstructBalanceHistory(
  currentAmount: number,
  transactions: Transaction[],
): BalancePoint[] {
  if (transactions.length === 0) return [];

  const sortedNewestFirst = [...transactions].sort((a, b) => b.timestamp - a.timestamp);

  const points: BalancePoint[] = [];
  let runningBalance = currentAmount;

  // Append the current state first (so the latest point pairs with "now").
  // We use the latest transaction's timestamp as a stand-in for "now" so the
  // chart x-axis lines up cleanly with the most recent activity.
  const latestTs = sortedNewestFirst[0]?.timestamp ?? Date.now();
  points.push({ timestamp: latestTs, balance: runningBalance });

  // Walk newest -> oldest, undoing each transaction to derive prior balances.
  for (const tx of sortedNewestFirst) {
    runningBalance =
      tx.type === "deposit" ? runningBalance - tx.amount : runningBalance + tx.amount;
    points.push({ timestamp: tx.timestamp, balance: Math.max(0, runningBalance) });
  }

  return points.reverse();
}

/**
 * Compute the diff between the current balance and the balance immediately
 * before the most recent transaction. Returns `null` when there are no
 * transactions (no comparison point yet).
 */
export function latestChange(
  currentAmount: number,
  transactions: Transaction[],
): { delta: number; type: "up" | "down" } | null {
  const history = reconstructBalanceHistory(currentAmount, transactions);
  if (history.length < 2) return null;
  const previous = history[history.length - 2];
  if (!previous) return null;
  const delta = currentAmount - previous.balance;
  if (delta === 0) return null;
  return { delta, type: delta > 0 ? "up" : "down" };
}
