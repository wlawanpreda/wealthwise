"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { RotateCcw, Sparkles } from "lucide-react";
import { formatThaiMonth } from "../lib/cycle";

interface Props {
  open: boolean;
  fromMonth: string;
  toMonth: string;
  completedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation dialog before clearing all `isTransferred` flags. We preserve
 * `transferHistory` on each allocation — only the "pending vs completed"
 * checkbox state resets — so the audit trail of past cycles stays intact.
 */
export function CycleResetDialog({
  open,
  fromMonth,
  toMonth,
  completedCount,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center ring-4 ring-emerald-500/10">
            <Sparkles className="text-emerald-600" size={24} />
          </div>
          <div>
            <DialogTitle>เริ่มรอบใหม่</DialogTitle>
            <DialogDescription>
              เริ่มรอบจัดการเงินเดือนสำหรับ {formatThaiMonth(toMonth)}
            </DialogDescription>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="p-4 bg-brand-bg/50 rounded-2xl border border-brand-border/50 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
                รอบปัจจุบัน
              </span>
              <span className="text-sm font-black text-brand-text">
                {formatThaiMonth(fromMonth)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
                จะถูกรีเซ็ต
              </span>
              <span className="text-sm font-black text-blue-600">{completedCount} รายการ</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] font-bold text-blue-700 leading-relaxed">
            ✓ ระบบจะเก็บประวัติการโอนของรอบเก่าไว้ — เพียงแค่เปลี่ยนสถานะกลับเป็น "รอดำเนินการ" เพื่อให้คุณ allocate
            รอบใหม่ได้
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest"
            onClick={onCancel}
          >
            ยกเลิก
          </Button>
          <Button
            className="flex-1 rounded-xl h-12 font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700"
            onClick={onConfirm}
          >
            <RotateCcw size={14} className="mr-2" />
            เริ่มรอบใหม่
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
