import { latestChange, reconstructBalanceHistory } from "@/features/planning/lib/balance-history";
import type { Transaction } from "@/lib/schemas";
import { describe, expect, it } from "vitest";

const tx = (
  id: string,
  ts: number,
  type: "deposit" | "withdrawal",
  amount: number,
): Transaction => ({
  id,
  timestamp: ts,
  type,
  amount,
  note: id,
});

describe("reconstructBalanceHistory", () => {
  it("returns empty for no transactions", () => {
    expect(reconstructBalanceHistory(1000, [])).toEqual([]);
  });

  it("walks deposits/withdrawals back to derive prior balances", () => {
    // Current = 1500. Last action +200 (so before: 1300). Before that -300 (so before: 1600).
    const txs = [
      tx("a", 3, "deposit", 200), // newest
      tx("b", 2, "withdrawal", 300),
    ];
    const history = reconstructBalanceHistory(1500, txs);
    expect(history).toHaveLength(3);
    // chronological order: oldest -> newest
    expect(history[0]?.balance).toBe(1600); // before 'b'
    expect(history[1]?.balance).toBe(1300); // after 'b', before 'a'
    expect(history[2]?.balance).toBe(1500); // current
  });

  it("clamps negative reconstructed balances to zero", () => {
    // If transactions imply a previous negative balance (e.g. an erroneous
    // edit), prefer 0 over a misleading negative trend.
    const txs = [tx("a", 2, "deposit", 5000)];
    const history = reconstructBalanceHistory(1000, txs);
    expect(history[0]?.balance).toBe(0);
    expect(history[1]?.balance).toBe(1000);
  });

  it("sorts unordered transactions newest-first internally", () => {
    const txs = [
      tx("middle", 2, "deposit", 100),
      tx("newest", 3, "withdrawal", 50),
      tx("oldest", 1, "deposit", 500),
    ];
    const history = reconstructBalanceHistory(1000, txs);
    // current 1000 -> undo newest (-50 withdrawal) = 1050
    //                -> undo middle deposit (+100) = 950
    //                -> undo oldest deposit (+500) = 450
    // chronological order: oldest first
    expect(history.map((p) => p.balance)).toEqual([450, 950, 1050, 1000]);
  });
});

describe("latestChange", () => {
  it("returns null with no transactions", () => {
    expect(latestChange(1000, [])).toBeNull();
  });

  it("returns up when latest transaction increased the balance", () => {
    const txs = [tx("a", 2, "deposit", 200)];
    expect(latestChange(1200, txs)).toEqual({ delta: 200, type: "up" });
  });

  it("returns down when latest transaction decreased the balance", () => {
    const txs = [tx("a", 2, "withdrawal", 50)];
    expect(latestChange(950, txs)).toEqual({ delta: -50, type: "down" });
  });

  it("returns null when current matches reconstructed previous", () => {
    // Edge case: if transaction list disagrees with current amount, the diff
    // could reach zero — we should not surface a "no change" badge.
    const txs = [tx("a", 2, "deposit", 0)];
    expect(latestChange(1000, txs)).toBeNull();
  });
});
