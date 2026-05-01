import type { Liability } from "@/lib/schemas";

export interface CashflowEvent {
  /** Day of the month (1..31). */
  day: number;
  /** Negative for outflows, positive for inflows. */
  amount: number;
  type: "income" | "debt" | "allocation";
  label: string;
  /** Optional liability/allocation id to link back to the source. */
  sourceId?: string;
}

export interface DaySummary {
  day: number;
  events: CashflowEvent[];
  /** Sum of all event amounts on that day (signed). */
  netDelta: number;
}

export interface CashflowMonth {
  /** YYYY-MM */
  month: string;
  /** Total days in the month. */
  daysInMonth: number;
  /** Events grouped by day; days with no events are omitted from `events` but still present in `dailyBalances`. */
  daysWithEvents: DaySummary[];
  /** Running balance after each day's net delta, starting from `startingBalance`. */
  dailyBalances: number[];
  /** Lowest projected balance during the month + the day it occurs. */
  lowestPoint: { day: number; balance: number } | null;
  /** Net total inflow / outflow for the month. */
  totalInflow: number;
  totalOutflow: number;
}

/**
 * Default income event when the user hasn't told us a payday — we assume
 * the 25th, which matches the common Thai salary calendar.
 */
const DEFAULT_PAYDAY = 25;

interface BuildOptions {
  /** Starting cash on hand at the beginning of the month. */
  startingBalance: number;
  /** Net monthly income to schedule as a single inflow event. */
  monthlyIncome: number;
  /** Day of the month income lands; defaults to 25. */
  payday?: number;
  /** All liabilities — only `monthlyPayment > 0` and a parseable `dueDate` are scheduled. */
  liabilities: Liability[];
  /** Year + month being projected (used for clamping payday/dueDate to days-in-month). */
  year: number;
  /** 1..12 */
  month: number;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampDay(raw: number, max: number): number {
  if (!Number.isFinite(raw)) return max; // unparseable → end of month so user sees it
  return Math.max(1, Math.min(max, Math.round(raw)));
}

/**
 * Build a month-long cashflow projection from the user's plan. Pure: same
 * inputs always produce the same output, so it's safe to call inside a
 * `useMemo` and easy to unit test.
 */
export function buildCashflowMonth(opts: BuildOptions): CashflowMonth {
  const {
    startingBalance,
    monthlyIncome,
    payday = DEFAULT_PAYDAY,
    liabilities,
    year,
    month,
  } = opts;

  const total = daysInMonth(year, month);
  const events: CashflowEvent[] = [];

  if (monthlyIncome > 0) {
    events.push({
      day: clampDay(payday, total),
      amount: monthlyIncome,
      type: "income",
      label: "เงินเดือนเข้า",
    });
  }

  for (const l of liabilities) {
    if (!l.monthlyPayment || l.monthlyPayment <= 0) continue;
    const day = Number.parseInt((l.dueDate ?? "").trim(), 10);
    events.push({
      day: clampDay(day, total),
      amount: -Math.abs(l.monthlyPayment),
      type: "debt",
      label: l.name || "หนี้ไม่ระบุชื่อ",
      sourceId: l.id,
    });
  }

  // Group by day
  const byDay = new Map<number, CashflowEvent[]>();
  for (const e of events) {
    const list = byDay.get(e.day) ?? [];
    list.push(e);
    byDay.set(e.day, list);
  }

  const daysWithEvents: DaySummary[] = [];
  const dailyBalances: number[] = [];
  let running = startingBalance;
  let totalInflow = 0;
  let totalOutflow = 0;
  let lowest: CashflowMonth["lowestPoint"] = { day: 0, balance: startingBalance };

  for (let d = 1; d <= total; d++) {
    const dayEvents = byDay.get(d) ?? [];
    const netDelta = dayEvents.reduce((s, e) => s + e.amount, 0);
    if (dayEvents.length > 0) {
      daysWithEvents.push({ day: d, events: dayEvents, netDelta });
    }
    running += netDelta;
    dailyBalances.push(running);

    for (const e of dayEvents) {
      if (e.amount > 0) totalInflow += e.amount;
      else totalOutflow += -e.amount;
    }

    // Track lowest balance after this day's events. Tie-break by earliest day.
    if (lowest === null || running < lowest.balance) {
      lowest = { day: d, balance: running };
    }
  }

  // The "lowest point" is more useful framed against starting balance — if the
  // month never dips below the start, surface null instead of an artificial
  // "lowest = start" pseudo-event.
  if (lowest && lowest.balance >= startingBalance) {
    lowest = null;
  }

  return {
    month: `${year}-${String(month).padStart(2, "0")}`,
    daysInMonth: total,
    daysWithEvents,
    dailyBalances,
    lowestPoint: lowest,
    totalInflow,
    totalOutflow,
  };
}
