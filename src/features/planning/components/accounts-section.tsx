"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { FinancialAccount } from "@/lib/schemas";
import { cn, formatCurrency, newId } from "@/lib/utils";
import { useFinancialStore } from "@/stores/financial-store";
import { formatDistanceToNow } from "date-fns";
import { th as thLocale } from "date-fns/locale";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Circle,
  Clock,
  History as HistoryIcon,
  Lock,
  PiggyBank,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import * as React from "react";
import { latestChange } from "../lib/balance-history";
import { AccountBalanceEdit } from "./account-balance-edit";
import { AccountTrendSparkline } from "./account-trend-sparkline";
import { TransactionDialog, type TransactionDialogPayload } from "./transaction-dialog";

interface Props {
  isExternalSyncing: boolean;
  onSyncExternal?: () => void;
}

export function AccountsSection({ isExternalSyncing, onSyncExternal }: Props) {
  const accounts = useFinancialStore((s) => s.emergencyFunds);
  const setAccounts = useFinancialStore((s) => s.setAccounts);

  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<{
    accountId: string | null;
    type: "deposit" | "withdrawal";
    open: boolean;
  }>({ accountId: null, type: "deposit", open: false });

  const openDialog = (accountId: string, type: "deposit" | "withdrawal") =>
    setDialog({ accountId, type, open: true });

  const closeDialog = () => setDialog((d) => ({ ...d, open: false }));

  const submitTransaction = (payload: TransactionDialogPayload) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== payload.accountId) return acc;
        const tx = {
          id: newId(),
          timestamp: Date.now(),
          type: payload.type,
          amount: payload.amount,
          note: payload.note,
        };
        const newAmount =
          payload.type === "deposit" ? acc.amount + payload.amount : acc.amount - payload.amount;
        return { ...acc, amount: newAmount, transactions: [tx, ...(acc.transactions ?? [])] };
      }),
    );
    closeDialog();
  };

  const addAccount = () =>
    setAccounts((prev) => [
      ...prev,
      {
        id: newId(),
        name: "",
        amount: 0,
        purpose: "",
        isEmergencyFund: false,
        type: "Savings",
        transactions: [],
      },
    ]);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <PiggyBank className="text-indigo-600 w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">บัญชีและการลงทุน (Accounts)</h2>
            <p className="text-xs text-brand-muted">จัดการบัญชีเงินฝาก การลงทุน และทรัพย์สิน</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {onSyncExternal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSyncExternal}
              loading={isExternalSyncing}
              className="flex-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              <RefreshCw size={14} className={cn("mr-2", isExternalSyncing && "animate-spin")} />
              Sync Items
            </Button>
          )}
          <Button
            size="sm"
            onClick={addAccount}
            className="flex-1 bg-brand-text hover:bg-slate-800"
          >
            <Plus size={14} className="mr-2" /> เพิ่มบัญชี
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => (
          <AccountCard
            key={acc.id}
            account={acc}
            expanded={expandedId === acc.id}
            onToggleExpanded={() => setExpandedId(expandedId === acc.id ? null : acc.id)}
            onChange={(patch) =>
              setAccounts((prev) => prev.map((a) => (a.id === acc.id ? { ...a, ...patch } : a)))
            }
            onDelete={() => setAccounts((prev) => prev.filter((a) => a.id !== acc.id))}
            onTransaction={(type) => openDialog(acc.id, type)}
            onAdjustBalance={(newAmount) => {
              setAccounts((prev) =>
                prev.map((a) => {
                  if (a.id !== acc.id) return a;
                  const diff = newAmount - a.amount;
                  if (diff === 0) return a;
                  const tx = {
                    id: newId(),
                    timestamp: Date.now(),
                    type: (diff > 0 ? "deposit" : "withdrawal") as "deposit" | "withdrawal",
                    amount: Math.abs(diff),
                    note: "แก้ไขยอดด้วยตัวเอง",
                  };
                  return {
                    ...a,
                    amount: newAmount,
                    transactions: [tx, ...(a.transactions ?? [])],
                  };
                }),
              );
            }}
          />
        ))}
      </div>

      <TransactionDialog
        open={dialog.open}
        accountId={dialog.accountId}
        type={dialog.type}
        onCancel={closeDialog}
        onSubmit={submitTransaction}
      />
    </section>
  );
}

interface AccountCardProps {
  account: FinancialAccount;
  expanded: boolean;
  onToggleExpanded: () => void;
  onChange: (patch: Partial<FinancialAccount>) => void;
  onDelete: () => void;
  onTransaction: (type: "deposit" | "withdrawal") => void;
  onAdjustBalance: (newAmount: number) => void;
}

function AccountCard({
  account,
  expanded,
  onToggleExpanded,
  onChange,
  onDelete,
  onTransaction,
  onAdjustBalance,
}: AccountCardProps) {
  const change = latestChange(account.amount, account.transactions ?? []);
  const trend: "up" | "down" | "flat" = change?.type ?? "flat";
  const lastTxTimestamp = (account.transactions ?? [])[0]?.timestamp;
  const lastUpdatedLabel = lastTxTimestamp
    ? formatDistanceToNow(new Date(lastTxTimestamp), { addSuffix: true, locale: thLocale })
    : null;
  return (
    <Card className="flex flex-col gap-5 group hover:border-indigo-200">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            {account.type === "Savings" && <Wallet size={12} className="text-blue-500" />}
            {account.type === "Fixed" && <Lock size={12} className="text-orange-500" />}
            {account.type === "Investment" && <TrendingUp size={12} className="text-emerald-500" />}
            {account.type === "Other" && <Circle size={12} className="text-slate-500" />}
            <Select
              value={account.type}
              onChange={(e) => onChange({ type: e.target.value as FinancialAccount["type"] })}
              className="text-[9px] font-black h-7 px-2"
            >
              <option value="Savings">Savings</option>
              <option value="Fixed">Fixed</option>
              <option value="Investment">Investment</option>
              <option value="Other">Other</option>
            </Select>
            <button
              type="button"
              onClick={() => onChange({ isEmergencyFund: !account.isEmergencyFund })}
              className={cn(
                "text-[9px] font-bold px-2 py-1 rounded-full transition-all border",
                account.isEmergencyFund
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-brand-surface text-brand-muted border-brand-border",
              )}
            >
              {account.isEmergencyFund ? "Emergency" : "Standard"}
            </button>
          </div>
          <Input
            placeholder="บัญชี / ทรัพย์สิน"
            value={account.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="font-bold text-sm bg-transparent border-none p-0"
          />
          <div className="flex items-baseline gap-1 mt-4">
            <span className="text-sm font-black text-brand-text">฿</span>
            <AccountBalanceEdit amount={account.amount} onCommit={onAdjustBalance} />
            <div className="flex gap-1 ml-3 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => onTransaction("deposit")}
                className="p-1.5 rounded bg-emerald-50 text-emerald-600"
                aria-label="Deposit"
              >
                <ArrowUpRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => onTransaction("withdrawal")}
                className="p-1.5 rounded bg-orange-50 text-orange-600"
                aria-label="Withdraw"
              >
                <ArrowDownLeft size={14} />
              </button>
            </div>
          </div>

          {(change || lastUpdatedLabel) && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {change && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                    change.type === "up"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-orange-50 text-orange-700",
                  )}
                  aria-label={`เปลี่ยนแปลงล่าสุด ${change.type === "up" ? "เพิ่มขึ้น" : "ลดลง"} ${formatCurrency(Math.abs(change.delta))}`}
                >
                  {change.type === "up" ? (
                    <TrendingUp size={10} strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <TrendingDown size={10} strokeWidth={3} aria-hidden="true" />
                  )}
                  {change.type === "up" ? "+" : "-"}
                  {Math.abs(change.delta).toLocaleString()}
                </span>
              )}
              {lastUpdatedLabel && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-muted">
                  <Clock size={10} aria-hidden="true" />
                  {lastUpdatedLabel}
                </span>
              )}
            </div>
          )}

          <AccountTrendSparkline
            amount={account.amount}
            transactions={account.transactions ?? []}
            trend={trend}
          />
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="text-brand-muted hover:text-red-500 p-1 opacity-40 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            aria-label="Delete account"
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            onClick={onToggleExpanded}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              expanded ? "bg-indigo-600 text-white" : "bg-brand-surface text-brand-muted",
            )}
            aria-label="Toggle history"
          >
            <HistoryIcon size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 py-4 border-t border-brand-border mt-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
              History
            </p>
            <button
              type="button"
              onClick={() => onTransaction("deposit")}
              className="text-[9px] font-bold text-indigo-600"
            >
              + Entry
            </button>
          </div>
          <div className="max-h-[160px] overflow-y-auto flex flex-col gap-2 pr-2 custom-scrollbar">
            {(account.transactions ?? []).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2 rounded-xl bg-brand-surface/50 text-[10px]"
              >
                <div className="flex items-center gap-2">
                  <span className={t.type === "deposit" ? "text-emerald-600" : "text-orange-600"}>
                    {t.type === "deposit" ? "IN" : "OUT"}
                  </span>
                  <span className="font-bold truncate w-24">{t.note || "-"}</span>
                </div>
                <span className="font-black">{t.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-[9px] font-bold text-brand-muted uppercase tracking-widest">วัตถุประสงค์</p>
        <Input
          value={account.purpose}
          onChange={(e) => onChange({ purpose: e.target.value })}
          className="text-xs py-2"
          placeholder="เช่น ออมระยะยาว..."
        />
      </div>
    </Card>
  );
}
