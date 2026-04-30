"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import * as React from "react";

export interface TransactionDialogPayload {
  accountId: string;
  type: "deposit" | "withdrawal";
  amount: number;
  note: string;
}

interface Props {
  open: boolean;
  accountId: string | null;
  type: "deposit" | "withdrawal";
  onCancel: () => void;
  onSubmit: (payload: TransactionDialogPayload) => void;
}

export function TransactionDialog({ open, accountId, type, onCancel, onSubmit }: Props) {
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setAmount("");
      setNote("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("กรุณาระบุจำนวนเงินที่มากกว่า 0");
      return;
    }
    if (!accountId) return;
    onSubmit({ accountId, type, amount: value, note });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              type === "deposit" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
            }`}
          >
            {type === "deposit" ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
          </div>
          <div>
            <DialogTitle>{type === "deposit" ? "ฝากเงิน" : "ถอนเงิน"}</DialogTitle>
            <DialogDescription>
              บันทึกรายการ{type === "deposit" ? "ฝาก" : "ถอน"}เงินสำหรับบัญชีนี้
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-2">
          <Input
            label="จำนวนเงิน (บาท)"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={error ?? undefined}
            autoFocus
          />
          <Input
            label="หมายเหตุ (ไม่บังคับ)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="เช่น รับโอนเงินเดือน"
          />
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button className="flex-1" onClick={handleSubmit}>
            บันทึก
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
