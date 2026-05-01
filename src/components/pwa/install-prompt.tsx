"use client";

import { Download, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";

/**
 * Listens for the browser's `beforeinstallprompt` event (Chrome/Edge on
 * Android + desktop) and surfaces a small toast offering to install. iOS
 * Safari doesn't fire that event — for iOS users we show a different toast
 * with manual instructions ("Share → Add to Home Screen") on first visit.
 *
 * Once dismissed or installed, the prompt won't show again on the same
 * device (tracked in localStorage).
 */

const DISMISSED_KEY = "wealthwise.pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = React.useState(false);
  const [hidden, setHidden] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    // If already installed (running in standalone mode), nothing to do.
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((window.navigator as { standalone?: boolean }).standalone === true) return;

    const isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);

    if (isIOS && isSafari) {
      // iOS Safari has no install API; show a manual hint instead.
      setIosHint(true);
      setHidden(false);
      return;
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };

    const onInstalled = () => {
      setHidden(true);
      setDeferred(null);
      localStorage.setItem(DISMISSED_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setHidden(true);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setHidden(true);
      setDeferred(null);
      if (outcome === "dismissed") localStorage.setItem(DISMISSED_KEY, "1");
    }
  };

  return (
    <AnimatePresence>
      {!hidden && (deferred || iosHint) && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-[90]"
        >
          <div className="bg-white rounded-2xl border border-brand-border shadow-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Download size={18} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-brand-text mb-0.5">ติดตั้ง Wealthwise</p>
              {iosHint ? (
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  เพิ่มลงหน้าโฮม: กด <strong className="font-black">Share</strong> แล้วเลือก{" "}
                  <strong className="font-black">Add to Home Screen</strong>
                </p>
              ) : (
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  ใช้แบบแอป — เปิดได้จากหน้าโฮมโดยไม่ต้องเปิดเบราว์เซอร์
                </p>
              )}
              {!iosHint && (
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={install}
                    className="text-[11px] font-black uppercase tracking-widest bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 transition-colors"
                  >
                    ติดตั้ง
                  </button>
                  <button
                    type="button"
                    onClick={dismiss}
                    className="text-[11px] font-bold text-brand-muted hover:text-brand-text px-2 py-1.5"
                  >
                    ทีหลัง
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="text-brand-muted hover:text-brand-text p-1 -mt-1 -mr-1"
              aria-label="ปิด"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
