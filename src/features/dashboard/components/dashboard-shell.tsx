"use client";

import { NavButton } from "@/components/layout/nav-button";
import { signOutAction } from "@/features/auth/actions";
import { ChatbotExpandedDialog } from "@/features/chatbot/components/chatbot-expanded-dialog";
import { ChatbotPanel } from "@/features/chatbot/components/chatbot-panel";
import DistributionTab from "@/features/distribution/components/distribution-tab";
import OverviewTab from "@/features/overview/components/overview-tab";
import PlanningTab from "@/features/planning/components/planning-tab";
import TrendsTab from "@/features/trends/components/trends-tab";
import { cn } from "@/lib/utils";
import { useFinancialStore } from "@/stores/financial-store";
import {
  ArrowRightLeft,
  Cloud,
  History as HistoryIcon,
  LayoutDashboard,
  RefreshCw,
  Target,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import * as React from "react";

type Tab = "overview" | "planning" | "distribution" | "trends";

interface User {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

export function DashboardShell({ user }: { user: User }) {
  const [activeTab, setActiveTab] = React.useState<Tab>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isSyncing = useFinancialStore((s) => s.isSyncing);

  return (
    <div className="bg-brand-bg text-brand-text font-sans h-screen flex flex-col md:flex-row overflow-hidden selection:bg-blue-100">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-brand-border shrink-0 z-[60]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((v) => !v)}
            className="p-2 -ml-2 text-brand-muted hover:text-brand-text"
            aria-label="Toggle sidebar"
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span
                className={cn(
                  "w-full h-0.5 bg-current transition-transform",
                  isSidebarOpen && "rotate-45 translate-y-[7px]",
                )}
              />
              <span
                className={cn(
                  "w-full h-0.5 bg-current transition-opacity",
                  isSidebarOpen && "opacity-0",
                )}
              />
              <span
                className={cn(
                  "w-full h-0.5 bg-current transition-transform",
                  isSidebarOpen && "-rotate-45 -translate-y-[7px]",
                )}
              />
            </div>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
            <h1 className="text-sm font-bold tracking-tight">เทอร์มินัลการเงิน</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSyncing ? (
            <RefreshCw size={14} className="animate-spin text-blue-600" />
          ) : (
            <Cloud size={14} className="text-emerald-500" />
          )}
          {user.picture && (
            <Image
              src={user.picture}
              width={24}
              height={24}
              className="w-6 h-6 rounded-full border border-brand-border"
              alt="Avatar"
              unoptimized
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-[50] md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 w-80 bg-white border-r border-brand-border flex flex-col shrink-0 z-[55] transition-transform duration-300 md:relative md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="p-6 border-b border-brand-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
            <span className="text-[10px] font-bold tracking-widest text-blue-700 uppercase">
              สถาปนิกการเงิน AI
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">เทอร์มินัลวางแผนการเงิน</h1>
        </div>

        <div className="px-6 py-4 border-b border-brand-border bg-brand-surface/30">
          <div className="flex items-center gap-3 mb-3">
            {user.picture && (
              <Image
                src={user.picture}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full border border-brand-border"
                alt="Avatar"
                unoptimized
              />
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate">{user.name ?? "User"}</p>
              <p className="text-[10px] text-brand-muted truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSyncing ? (
                <div className="flex items-center gap-1.5">
                  <RefreshCw size={10} className="animate-spin text-blue-600" />
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">
                    กำลังซิงค์...
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Cloud size={10} className="text-emerald-500" />
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                    บันทึกเรียบร้อย
                  </span>
                </div>
              )}
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-[9px] font-bold text-brand-muted hover:text-red-500 uppercase tracking-widest underline decoration-dotted"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-1">
          <NavButton
            icon={LayoutDashboard}
            active={activeTab === "overview"}
            onClick={() => {
              setActiveTab("overview");
              setIsSidebarOpen(false);
            }}
            label="สรุปสุขภาพการเงิน"
          />
          <NavButton
            icon={Target}
            active={activeTab === "planning"}
            onClick={() => {
              setActiveTab("planning");
              setIsSidebarOpen(false);
            }}
            label="วางแผนงบประมาณ/หนี้"
          />
          <NavButton
            icon={ArrowRightLeft}
            active={activeTab === "distribution"}
            onClick={() => {
              setActiveTab("distribution");
              setIsSidebarOpen(false);
            }}
            label="จัดการการโอนเงินเดือน"
          />
          <NavButton
            icon={HistoryIcon}
            active={activeTab === "trends"}
            onClick={() => {
              setActiveTab("trends");
              setIsSidebarOpen(false);
            }}
            label="แนวโน้มความมั่งคั่ง"
          />
        </div>

        <div className="flex-1 flex flex-col p-4 border-t border-brand-border overflow-hidden">
          <div className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-4">
            การวิเคราะห์แบบสด
          </div>
          <ChatbotPanel />
        </div>

        <div className="p-6 border-t border-brand-border bg-brand-surface">
          <div className="flex items-center justify-between text-[10px] mb-2 font-bold text-brand-muted uppercase tracking-widest">
            <span>สถานะระบบ</span>
            <span className="text-green-600">เชื่อมต่อแล้ว</span>
          </div>
          <div className="text-[10px] font-mono text-brand-secondary">ID: epj-project-instance</div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto blueprint-grid bg-fixed">
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 md:gap-10 flex-1 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-6 md:gap-10"
            >
              {activeTab === "overview" && <OverviewTab />}
              {activeTab === "planning" && <PlanningTab />}
              {activeTab === "distribution" && <DistributionTab />}
              {activeTab === "trends" && <TrendsTab />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="md:hidden flex items-center justify-around p-2 bg-white border-t border-brand-border sticky bottom-0 z-50">
          <NavButton
            mobile
            icon={LayoutDashboard}
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            label="สรุป"
          />
          <NavButton
            mobile
            icon={Target}
            active={activeTab === "planning"}
            onClick={() => setActiveTab("planning")}
            label="วางแผน"
          />
          <NavButton
            mobile
            icon={ArrowRightLeft}
            active={activeTab === "distribution"}
            onClick={() => setActiveTab("distribution")}
            label="รายการโอน"
          />
          <NavButton
            mobile
            icon={HistoryIcon}
            active={activeTab === "trends"}
            onClick={() => setActiveTab("trends")}
            label="แนวโน้ม"
          />
        </div>
      </main>

      <ChatbotExpandedDialog />
    </div>
  );
}
