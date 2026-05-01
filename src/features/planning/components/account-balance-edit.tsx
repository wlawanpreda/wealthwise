"use client";

import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import * as React from "react";

interface Props {
  amount: number;
  onCommit: (newAmount: number) => void;
  className?: string;
}

/**
 * Click-to-edit balance display. Shows formatted number; clicking turns it
 * into an input. Enter or blur commits, Escape cancels.
 *
 * Commit only fires when the value changed AND is a non-negative finite
 * number — caller is then responsible for recording a transaction diff.
 */
export function AccountBalanceEdit({ amount, onCommit, className }: Props) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const enter = () => {
    setDraft(String(amount));
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft("");
  };

  const commit = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed !== amount) {
      onCommit(parsed);
    }
    setEditing(false);
    setDraft("");
  };

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.select();
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        inputMode="decimal"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        className={cn(
          "text-2xl font-black text-brand-text bg-blue-50/40 border border-blue-300 rounded-lg px-2 py-0.5 w-40 outline-none focus:ring-2 focus:ring-blue-500/30",
          className,
        )}
        aria-label="แก้ไขยอดเงินคงเหลือ"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={enter}
      className={cn(
        "text-2xl font-black text-brand-text inline-flex items-baseline gap-1.5 group/edit hover:text-blue-600 transition-colors rounded -mx-1 px-1 -my-0.5 py-0.5 hover:bg-blue-50/50",
        className,
      )}
      aria-label="คลิกเพื่อแก้ไขยอดเงินคงเหลือ"
    >
      <span>{amount.toLocaleString()}</span>
      <Pencil
        size={11}
        className="text-brand-muted opacity-0 group-hover/edit:opacity-100 transition-opacity self-center"
        aria-hidden="true"
      />
    </button>
  );
}
