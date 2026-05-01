"use client";

import { Card } from "@/components/ui/card";
import { type CSRCategory, CSR_CATEGORY } from "@/lib/schemas";
import { cn, formatCurrency, newId } from "@/lib/utils";
import { useFinancialStore } from "@/stores/financial-store";
import {
  AlertCircle,
  ArrowRightLeft,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  Circle,
  Copy,
  History as HistoryIcon,
  MessageSquare,
  PartyPopper,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import {
  formatThaiMonth,
  getCurrentCycleMonth,
  getCurrentCycleTotal,
  getLatestTransferMonth,
  isNewCycleAvailable,
  nextMonth,
} from "../lib/cycle";
import { AccountPicker } from "./account-picker";
import { CycleResetDialog } from "./cycle-reset-dialog";
import { TransferConfirmDialog } from "./transfer-confirm-dialog";

const UNDO_TIMEOUT_MS = 10_000;

export default function DistributionTab() {
  const income = useFinancialStore((s) => s.income);
  const allocations = useFinancialStore((s) => s.allocations);
  const setAllocations = useFinancialStore((s) => s.setAllocations);
  const accounts = useFinancialStore((s) => s.emergencyFunds);

  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);
  const [undoTransfer, setUndoTransfer] = React.useState<{
    id: string;
    originalTransferred: boolean;
  } | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const undoTimerRef = React.useRef<number | null>(null);

  const queueUndoTimeout = React.useCallback(
    (next: { id: string; originalTransferred: boolean } | null) => {
      if (undoTimerRef.current !== null) {
        window.clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
      setUndoTransfer(next);
      if (next) {
        undoTimerRef.current = window.setTimeout(() => {
          setUndoTransfer(null);
          undoTimerRef.current = null;
        }, UNDO_TIMEOUT_MS);
      }
    },
    [],
  );

  React.useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) {
        window.clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const handleUndo = () => {
    if (!undoTransfer) return;
    setAllocations((prev) =>
      prev.map((a) => {
        if (a.id !== undoTransfer.id) return a;
        const history = [...(a.transferHistory ?? [])];
        history.shift();
        return { ...a, isTransferred: undoTransfer.originalTransferred, transferHistory: history };
      }),
    );
    queueUndoTimeout(null);
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const percentageDistributed = (totalAllocated / (income || 1)) * 100;
  const completedCount = allocations.filter((a) => a.isTransferred).length;
  const totalCount = allocations.length;
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  // Cycle metadata — current month, last cycle the user worked on, and
  // whether a fresh cycle is available (i.e. month rolled over since the
  // most recent transfer).
  const currentCycle = getCurrentCycleMonth();
  const lastTransferCycle = getLatestTransferMonth(allocations);
  const cycleNeedsReset = isNewCycleAvailable(allocations);
  const transferredThisCycle = getCurrentCycleTotal(allocations);

  const handleResetCycle = () => {
    setAllocations((prev) =>
      prev.map((a) => ({
        ...a,
        isTransferred: false,
        // intentionally preserve transferHistory — it's the audit trail
      })),
    );
    setResetDialogOpen(false);
  };

  const performToggle = (id: string, note: string) => {
    setAllocations((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const isNowTransferred = !a.isTransferred;
        const newHistory = [...(a.transferHistory ?? [])];
        if (isNowTransferred) {
          newHistory.unshift({
            id: newId(),
            timestamp: Date.now(),
            amount: a.amount,
            status: "Completed",
            note: note || "Manual transfer confirmed",
          });
          queueUndoTimeout({ id: a.id, originalTransferred: a.isTransferred ?? false });
        }
        return { ...a, isTransferred: isNowTransferred, transferHistory: newHistory };
      }),
    );
    setConfirmId(null);
  };

  const handleToggleTransfer = (id: string) => {
    const allocation = allocations.find((a) => a.id === id);
    if (!allocation) return;
    if (!allocation.isTransferred) {
      setConfirmId(id);
    } else {
      performToggle(id, "");
    }
  };

  const accountTransfers = React.useMemo(() => {
    const map = new Map<
      string,
      { accountName: string; total: number; count: number; items: string[]; purpose: string }
    >();
    for (const alloc of allocations) {
      if (!alloc.targetAccountId) continue;
      const acc = accounts.find((a) => a.id === alloc.targetAccountId);
      if (!acc) continue;
      const cur = map.get(alloc.targetAccountId) ?? {
        accountName: acc.name,
        total: 0,
        count: 0,
        items: [],
        purpose: acc.purpose ?? "",
      };
      map.set(alloc.targetAccountId, {
        ...cur,
        total: cur.total + alloc.amount,
        count: cur.count + 1,
        items: [...cur.items, alloc.name],
      });
    }
    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data }));
  }, [allocations, accounts]);

  const handleCopy = React.useCallback(
    (transfer: { id: string; accountName: string; total: number; items: string[] }) => {
      const text = `รายการโอนไปยังบัญชี: ${transfer.accountName}\nยอดรวม: ${transfer.total.toLocaleString()} บาท\nรายการ: ${transfer.items.join(", ")}`;
      void navigator.clipboard.writeText(text);
      setCopiedId(transfer.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    },
    [],
  );

  const confirmAllocation = confirmId
    ? (allocations.find((a) => a.id === confirmId) ?? null)
    : null;

  // Empty-state guard: nothing to distribute until the user has at least set
  // income and one allocation. Without this, the hub renders with progress=0
  // and "0% of income distributed" which reads as a bug.
  if (income <= 0 && allocations.length === 0) {
    return (
      <div className="flex flex-col gap-8 pb-20">
        <Card
          variant="white"
          padding="lg"
          className="flex flex-col items-center justify-center text-center"
        >
          <div className="p-4 bg-brand-surface rounded-2xl mb-4 text-brand-muted">
            <Wallet size={48} />
          </div>
          <h3 className="text-xl font-bold text-brand-text mb-2">ยังไม่มีรายการสำหรับจัดการโอน</h3>
          <p className="text-base text-brand-text/80 leading-relaxed mb-2 max-w-sm">
            ตั้งค่ารายได้และจัดสรรงบประมาณในแท็บ "วางแผน" ก่อน เพื่อเริ่มจัดการการโอนเงินเดือนรายเดือน
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      {income <= 0 && (
        <output className="bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold rounded-xl p-3 flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>ตั้งค่ารายได้ต่อเดือนใน "วางแผน" เพื่อคำนวณสัดส่วนของยอดที่โอน</span>
        </output>
      )}

      {cycleNeedsReset && lastTransferCycle && (
        <motion.output
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black mb-0.5">
              ขึ้น {formatThaiMonth(currentCycle)} แล้ว — พร้อมเริ่มรอบใหม่
            </p>
            <p className="text-xs text-emerald-700/80 font-bold">
              คุณ allocate รอบ {formatThaiMonth(lastTransferCycle)} เสร็จแล้ว กดเพื่อรีเซ็ตสถานะและเริ่ม
              allocate รอบใหม่ได้เลย
            </p>
          </div>
          <button
            type="button"
            onClick={() => setResetDialogOpen(true)}
            className="bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl px-4 py-2.5 hover:bg-emerald-700 transition-colors shadow-sm shrink-0 inline-flex items-center gap-2"
          >
            <RotateCcw size={12} />
            เริ่มรอบใหม่
          </button>
        </motion.output>
      )}

      <section className="relative">
        <Card
          variant="white"
          padding="lg"
          className="overflow-visible border-brand-border relative z-10"
        >
          <div className="absolute inset-0 blueprint-grid opacity-10 pointer-events-none" />
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={16} className="text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted">
                  Salary Distribution Hub
                </span>
              </div>
              <h2 className="text-4xl font-black tracking-tighter text-brand-text flex items-baseline gap-2">
                {formatCurrency(income).replace("฿", "")}
                <span className="text-lg font-bold text-brand-secondary">THB / MONTH</span>
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-muted bg-brand-bg/60 border border-brand-border/50 rounded-full px-2.5 py-1">
                  <Calendar size={11} className="text-blue-600" aria-hidden="true" />
                  รอบ {formatThaiMonth(currentCycle)}
                </span>
                {(isAllDone || cycleNeedsReset) && completedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setResetDialogOpen(true)}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest rounded-full px-3 py-1.5 transition-all",
                      cycleNeedsReset
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm animate-pulse"
                        : "bg-white border border-brand-border text-brand-text hover:bg-brand-surface",
                    )}
                    aria-label="เริ่มรอบใหม่"
                  >
                    <RotateCcw size={11} />
                    {cycleNeedsReset ? "เริ่มรอบใหม่" : "รีเซ็ตรอบ"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-10 md:gap-16">
              <div className="flex flex-col items-center md:items-end">
                <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1">
                  Allocated
                </p>
                <p className="text-2xl font-black font-mono text-blue-600">
                  {formatCurrency(totalAllocated)}
                </p>
              </div>
              <div className="flex flex-col items-center md:items-end">
                <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest mb-1">
                  Status
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm",
                      isAllDone ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700",
                    )}
                  >
                    {completedCount} / {totalCount} Done
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentageDistributed}%` }}
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  percentageDistributed > 100 ? "bg-red-500" : "bg-blue-600",
                )}
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">
                {percentageDistributed.toFixed(1)}% of income distributed
              </p>
              {percentageDistributed > 100 && (
                <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1">
                  <AlertCircle size={10} /> Over Budget Alert
                </p>
              )}
            </div>
          </div>
        </Card>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10">
        <div className="xl:col-span-8 flex flex-col gap-8">
          {(Object.values(CSR_CATEGORY) as CSRCategory[]).map((cat) => {
            const items = allocations.filter((a) => a.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="flex flex-col gap-4">
                <div className="flex items-center gap-3 px-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      cat === "Constant"
                        ? "bg-orange-400"
                        : cat === "Spending"
                          ? "bg-blue-400"
                          : "bg-emerald-400",
                    )}
                  />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-brand-text">
                    {cat} Allocations
                  </h3>
                </div>

                <div className="flex flex-col gap-3">
                  {items.map((alloc) => (
                    <div key={alloc.id} className="flex flex-col">
                      <motion.div
                        layout
                        className={cn(
                          "border rounded-2xl flex flex-col md:flex-row md:items-center justify-between p-4 transition-all duration-500",
                          alloc.isTransferred
                            ? "border-emerald-100 bg-emerald-50/20 opacity-80"
                            : "border-brand-border bg-white hover:border-blue-600/30",
                        )}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleTransfer(alloc.id)}
                            className={cn(
                              "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-300",
                              alloc.isTransferred
                                ? "bg-emerald-500 text-white shadow-[var(--shadow-soft)]"
                                : "bg-brand-bg text-brand-secondary hover:bg-blue-50 hover:text-blue-600",
                            )}
                            aria-label={
                              alloc.isTransferred ? "Mark as pending" : "Mark as transferred"
                            }
                          >
                            {alloc.isTransferred ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                className={cn(
                                  "text-xs font-black uppercase tracking-wider transition-all truncate",
                                  alloc.isTransferred
                                    ? "text-emerald-700 opacity-60 line-through"
                                    : "text-brand-text",
                                )}
                              >
                                {alloc.name}
                              </span>
                              <div
                                className={cn(
                                  "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1",
                                  alloc.isTransferred
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "bg-orange-500/10 text-orange-600",
                                )}
                              >
                                {alloc.isTransferred ? (
                                  <Check size={9} strokeWidth={3} aria-hidden="true" />
                                ) : (
                                  <Circle size={9} strokeWidth={3} aria-hidden="true" />
                                )}
                                {alloc.isTransferred ? "Completed" : "Pending"}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "text-sm font-black font-mono tracking-tight",
                                alloc.isTransferred ? "text-emerald-600/60" : "text-blue-600",
                              )}
                            >
                              {formatCurrency(alloc.amount)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-brand-border/50 w-full md:w-auto">
                          <div className="flex flex-col items-start md:items-end gap-1.5 flex-1 md:flex-none">
                            <label
                              htmlFor={`picker-${alloc.id}`}
                              className="text-[8px] font-black text-brand-muted uppercase tracking-widest leading-none ml-1 md:mr-1"
                            >
                              Destined Account
                            </label>
                            <AccountPicker
                              value={alloc.targetAccountId ?? ""}
                              onChange={(accountId) =>
                                setAllocations((prev) =>
                                  prev.map((a) =>
                                    a.id === alloc.id
                                      ? { ...a, targetAccountId: accountId || undefined }
                                      : a,
                                  ),
                                )
                              }
                              accounts={accounts}
                              disabled={alloc.isTransferred}
                            />
                          </div>

                          <div className="w-px h-8 bg-brand-border hidden md:block" />

                          <button
                            type="button"
                            onClick={() => setExpandedId(expandedId === alloc.id ? null : alloc.id)}
                            className={cn(
                              "hidden md:flex items-center justify-center w-8 h-8 rounded-full transition-all",
                              expandedId === alloc.id
                                ? "bg-blue-600 text-white shadow-[var(--shadow-blue)]"
                                : "bg-brand-bg text-brand-secondary hover:bg-blue-50 hover:text-blue-600",
                            )}
                            aria-label="Toggle history"
                          >
                            <ChevronDown
                              size={14}
                              className={cn(
                                "transition-transform duration-300",
                                expandedId === alloc.id && "rotate-180",
                              )}
                            />
                          </button>
                        </div>
                      </motion.div>

                      <AnimatePresence>
                        {expandedId === alloc.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-14 py-4 flex flex-col gap-4">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <HistoryIcon size={12} className="text-brand-muted" />
                                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-muted">
                                    Transfer History
                                  </span>
                                </div>
                                {alloc.transferHistory && alloc.transferHistory.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAllocations((prev) =>
                                        prev.map((a) =>
                                          a.id === alloc.id ? { ...a, transferHistory: [] } : a,
                                        ),
                                      )
                                    }
                                    className="text-[8px] font-black text-brand-secondary hover:text-red-500 uppercase tracking-widest flex items-center gap-1 transition-colors"
                                  >
                                    <Trash2 size={10} /> Clear History
                                  </button>
                                )}
                              </div>

                              {alloc.transferHistory && alloc.transferHistory.length > 0 ? (
                                <div className="flex flex-col gap-2 relative">
                                  <div className="absolute left-3 top-0 bottom-0 w-px bg-brand-border/30" />
                                  {alloc.transferHistory.map((log) => (
                                    <div key={log.id} className="relative pl-8 mb-4 last:mb-0">
                                      <div className="absolute left-[-1.5px] top-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white" />
                                      <div className="bg-brand-bg rounded-2xl p-4 border border-brand-border/30 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 uppercase tracking-widest">
                                              {log.status}
                                            </span>
                                            <span className="text-[9px] font-bold text-brand-muted">
                                              {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                          </div>
                                          <span className="text-sm font-black font-mono text-brand-text">
                                            {formatCurrency(log.amount)}
                                          </span>
                                        </div>
                                        {log.note && (
                                          <div className="flex items-start gap-2 p-2 bg-white/50 rounded-xl border border-brand-border/10 mt-2 italic">
                                            <MessageSquare
                                              size={10}
                                              className="text-brand-muted mt-0.5 shrink-0"
                                            />
                                            <p className="text-[10px] font-medium text-brand-secondary leading-relaxed">
                                              {log.note}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="py-8 text-center border-2 border-dashed border-brand-border/50 rounded-[2rem] bg-brand-bg/30">
                                  <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em]">
                                    No history records yet
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="sticky top-8 flex flex-col gap-6">
            {/*
              The right panel switches mode based on completion state:
              - All done with mapped accounts → celebration card with stats
              - In progress with mapped accounts → execution roadmap
              - No mapping → soft hint card (not an error)
            */}
            {isAllDone ? (
              <Card
                variant="white"
                padding="none"
                className="overflow-hidden border-2 border-emerald-200 shadow-lg"
              >
                <div className="bg-gradient-to-br from-emerald-500 to-blue-600 p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full" />
                  <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-40 h-40 bg-white/5 rounded-full" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <PartyPopper size={18} aria-hidden="true" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-90">
                        เสร็จสิ้นรอบ
                      </span>
                    </div>
                    <h3 className="text-2xl font-black tracking-tight mb-1">
                      {formatThaiMonth(lastTransferCycle ?? currentCycle)}
                    </h3>
                    <p className="text-[11px] font-bold opacity-90 leading-relaxed">
                      จัดสรรครบทั้ง {totalCount} รายการแล้ว 🎉
                    </p>
                  </div>
                </div>

                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
                      ยอดโอนรวม
                    </span>
                    <span className="text-lg font-black font-mono text-emerald-600">
                      {formatCurrency(transferredThisCycle)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
                      บัญชีปลายทาง
                    </span>
                    <span className="text-sm font-black text-brand-text">
                      {accountTransfers.length} บัญชี
                    </span>
                  </div>

                  {accountTransfers.length === 0 ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[10px] font-bold text-blue-700 leading-relaxed">
                      💡 ตั้งค่าบัญชีปลายทางในแต่ละรายการเพื่อให้ระบบสร้าง roadmap
                      สรุปยอดที่ต้องโอนเข้าบัญชีอัตโนมัติในรอบถัดไป
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const text = accountTransfers
                          .map(
                            (t) =>
                              `${t.accountName}: ${formatCurrency(t.total)}\n  ${t.items.join(", ")}`,
                          )
                          .join("\n\n");
                        void navigator.clipboard.writeText(text);
                        setCopiedId("__all__");
                        window.setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className={cn(
                        "w-full inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest rounded-xl py-3 transition-all",
                        copiedId === "__all__"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-brand-bg text-brand-text border border-brand-border hover:bg-brand-text hover:text-white",
                      )}
                    >
                      {copiedId === "__all__" ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === "__all__" ? "คัดลอกแล้ว" : "คัดลอก roadmap ทั้งหมด"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setResetDialogOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest rounded-xl py-3 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <RotateCcw size={13} />
                    เริ่มรอบ {formatThaiMonth(nextMonth(lastTransferCycle ?? currentCycle))}
                  </button>
                </div>
              </Card>
            ) : (
              <Card variant="dark" padding="none" className="overflow-hidden">
                <div className="p-6 border-b border-white/10 bg-white/5">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRightLeft size={14} className="text-blue-400" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                      Execution Roadmap
                    </h3>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed font-bold">
                    สรุปยอดที่ต้องโอนเข้าแต่ละบัญชีเพื่อให้ถึงเป้าหมาย
                  </p>
                </div>

                <div className="p-6 flex flex-col gap-4">
                  {accountTransfers.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3 text-blue-300">
                        <Sparkles size={20} />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-white/80 mb-1">
                        ยังไม่มีการจับคู่บัญชี
                      </p>
                      <p className="text-[10px] font-medium text-white/50 leading-relaxed max-w-[220px] mx-auto">
                        เลือก "Destined Account" ของแต่ละรายการ เพื่อให้ระบบสรุปยอดที่ต้องโอนเข้าแต่ละบัญชี
                      </p>
                    </div>
                  ) : (
                    accountTransfers.map((transfer) => (
                      <div
                        key={transfer.id}
                        className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 italic">
                              Target Account
                            </p>
                            <h4 className="text-sm font-black text-white uppercase tracking-wider truncate">
                              {transfer.accountName}
                            </h4>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">
                              Total to Transfer
                            </p>
                            <p className="text-lg font-black font-mono text-emerald-400 tracking-tighter">
                              {formatCurrency(transfer.total)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/5">
                          {transfer.items.map((item) => (
                            <span
                              key={item}
                              className="text-[8px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider"
                            >
                              {item}
                            </span>
                          ))}
                        </div>

                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleCopy(transfer)}
                            className={cn(
                              "text-[8px] font-black flex items-center gap-1.5 uppercase tracking-widest transition-all px-3 py-1.5 rounded-lg",
                              copiedId === transfer.id
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "text-blue-400 hover:bg-blue-500/10 hover:text-white",
                            )}
                          >
                            {copiedId === transfer.id ? <Check size={10} /> : <Copy size={10} />}
                            {copiedId === transfer.id ? "COPIED" : "COPY DETAILS"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-6 bg-blue-600">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center text-white">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                        Cycle Progress
                      </span>
                      <span className="text-[10px] font-black font-mono">
                        {Math.round((completedCount / (totalCount || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(completedCount / (totalCount || 1)) * 100}%` }}
                        className="h-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                      />
                    </div>
                    <p className="text-[10px] text-white/60 font-bold text-center">
                      {completedCount} / {totalCount} รายการ • รอบ {formatThaiMonth(currentCycle)}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <TransferConfirmDialog
        open={confirmId !== null}
        allocation={confirmAllocation}
        onCancel={() => setConfirmId(null)}
        onConfirm={(note) => confirmId && performToggle(confirmId, note)}
      />

      <CycleResetDialog
        open={resetDialogOpen}
        fromMonth={lastTransferCycle ?? currentCycle}
        toMonth={cycleNeedsReset ? currentCycle : nextMonth(currentCycle)}
        completedCount={completedCount}
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={handleResetCycle}
      />

      <AnimatePresence>
        {undoTransfer && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"
          >
            <div className="bg-brand-text text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check size={16} />
                </div>
                <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Transfer Confirmed
                  </p>
                  <p className="text-[8px] font-medium text-white/60 uppercase tracking-widest">
                    Action will be finalized in 10s
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
              >
                <Undo2 size={12} /> Undo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
