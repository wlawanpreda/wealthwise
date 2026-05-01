import type { BudgetAllocation } from "@/lib/schemas";

/**
 * Returns the current YYYY-MM in the local timezone — what we treat as the
 * active "salary cycle". Uses the user's local clock so the rollover happens
 * at midnight in their TZ, not UTC.
 */
export function getCurrentCycleMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Find the most recent transfer timestamp across all allocations and return
 * the YYYY-MM it falls in. Null when no transfers have ever been recorded.
 */
export function getLatestTransferMonth(allocations: BudgetAllocation[]): string | null {
  let latest = 0;
  for (const a of allocations) {
    const ts = a.transferHistory?.[0]?.timestamp ?? 0;
    if (ts > latest) latest = ts;
  }
  if (latest === 0) return null;
  const d = new Date(latest);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * True when the user has completed at least one transfer in a previous month
 * but the current month is different — i.e. they're "due" for a new cycle.
 */
export function isNewCycleAvailable(allocations: BudgetAllocation[]): boolean {
  const latest = getLatestTransferMonth(allocations);
  if (latest === null) return false;
  return latest !== getCurrentCycleMonth();
}

/**
 * Total transferred across all allocations in the most recent cycle (current
 * month or whichever month the latest transfer happened in).
 */
export function getCurrentCycleTotal(allocations: BudgetAllocation[]): number {
  return allocations.filter((a) => a.isTransferred).reduce((sum, a) => sum + a.amount, 0);
}

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/** "2026-05" → "พฤษภาคม 2026" */
export function formatThaiMonth(month: string): string {
  const [yStr, mStr] = month.split("-");
  if (!yStr || !mStr) return month;
  const m = Number.parseInt(mStr, 10);
  const y = Number.parseInt(yStr, 10);
  if (Number.isNaN(m) || Number.isNaN(y)) return month;
  const name = THAI_MONTHS[m - 1] ?? mStr;
  return `${name} ${y}`;
}

/**
 * Returns next-month string for transition messaging.
 *
 *   "2026-05" → "2026-06"
 *   "2026-12" → "2027-01"
 */
export function nextMonth(month: string): string {
  const [yStr, mStr] = month.split("-");
  if (!yStr || !mStr) return month;
  let y = Number.parseInt(yStr, 10);
  let m = Number.parseInt(mStr, 10);
  if (Number.isNaN(m) || Number.isNaN(y)) return month;
  m += 1;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}
