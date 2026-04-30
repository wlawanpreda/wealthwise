"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { BudgetAllocation } from "@/lib/schemas";
import { formatCurrency } from "@/lib/utils";
import { ArrowRightLeft } from "lucide-react";
import * as React from "react";

interface Props {
  open: boolean;
  allocation: BudgetAllocation | null;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}

export function TransferConfirmDialog({ open, allocation, onCancel, onConfirm }: Props) {
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!open) setNote("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center ring-4 ring-blue-500/10">
            <ArrowRightLeft className="text-blue-600" size={24} />
          </div>
          <div>
            <DialogTitle>Verify Transfer</DialogTitle>
            <DialogDescription>ยืนยันว่าโอนยอดนี้เข้าบัญชีปลายทางเรียบร้อยแล้ว?</DialogDescription>
          </div>
        </div>

        {allocation && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="p-4 bg-brand-bg/50 rounded-2xl border border-brand-border/50 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest leading-none mb-1">
                  Item
                </span>
                <span className="text-sm font-black text-brand-text">{allocation.name}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest leading-none mb-1 block">
                  Amount
                </span>
                <span className="text-sm font-black font-mono text-blue-600">
                  {formatCurrency(allocation.amount)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="transfer-note"
                className="text-[10px] font-black text-brand-muted uppercase tracking-widest ml-1"
              >
                Transfer Note (Optional)
              </label>
              <input
                id="transfer-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a reason or reference..."
                className="w-full bg-slate-50 border border-brand-border rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest"
            onClick={() => onConfirm(note)}
          >
            Confirm Transfer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
