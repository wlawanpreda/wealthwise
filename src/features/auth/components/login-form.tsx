"use client";

import { getClientAuth, googleProvider } from "@/lib/firebase/client";
import { signInWithPopup } from "firebase/auth";
import { ArrowRight, RefreshCw, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import * as React from "react";

export default function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSignIn = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const cred = await signInWithPopup(getClientAuth(), googleProvider);
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        throw new Error("เซิร์ฟเวอร์ปฏิเสธการเข้าสู่ระบบ");
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
      if (
        !message.includes("popup-closed-by-user") &&
        !message.includes("cancelled-popup-request")
      ) {
        setError(message);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 selection:bg-blue-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-3xl border border-brand-border shadow-2xl overflow-hidden">
          <div className="p-8 pb-0">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest text-blue-700 uppercase">
                สถาปนิกการเงิน AI
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-brand-text mb-2">
              Wealth Architect <span className="text-blue-600">Terminal</span>
            </h1>
            <p className="text-brand-muted text-sm leading-relaxed mb-8">
              สัมผัสประสบการณ์การวางแผนการเงินที่ออกแบบมาเพื่อเป้าหมาย 2.88 ล้านบาทของคุณโดยเฉพาะ
            </p>
          </div>

          <div className="grid grid-cols-3 border-y border-brand-border bg-brand-surface/50">
            <FeatureIcon icon={TrendingUp} label="เติบโต" />
            <FeatureIcon icon={Wallet} label="ประหยัด" />
            <FeatureIcon icon={ShieldCheck} label="มั่นคง" />
          </div>

          <div className="p-8">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={pending}
              className="w-full bg-brand-text text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all group active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait"
            >
              {pending ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <>
                  <span aria-hidden="true" className="font-black text-lg">
                    G
                  </span>
                  เข้าสู่ระบบด้วย Google
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            {error && <p className="text-xs text-red-500 mt-3 font-bold text-center">{error}</p>}
            <p className="text-[10px] text-center text-brand-muted mt-6 uppercase tracking-widest font-bold">
              Secure Data Node: epj-project-instance
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FeatureIcon({ icon: Icon, label }: { icon: typeof TrendingUp; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 border-r last:border-r-0 border-brand-border">
      <Icon className="w-5 h-5 text-brand-secondary mb-2" />
      <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}
