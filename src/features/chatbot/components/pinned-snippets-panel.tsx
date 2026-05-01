"use client";

import { cn } from "@/lib/utils";
import { type PinnedSnippet, usePinnedSnippetsStore } from "@/stores/pinned-snippets-store";
import { Bookmark, BookmarkX, Check, Copy, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import ReactMarkdown from "react-markdown";

function formatRelative(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.ที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} วันที่แล้ว`;
  return new Date(timestamp).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PinnedSnippetsPanel() {
  const snippets = usePinnedSnippetsStore((s) => s.snippets);
  const unpin = usePinnedSnippetsStore((s) => s.unpin);
  const clearAll = usePinnedSnippetsStore((s) => s.clearAll);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-brand-surface/40 border-l border-brand-border">
      <header className="px-4 py-3 border-b border-brand-border bg-white shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark size={14} className="text-blue-600 fill-blue-600" />
          <h3 className="text-[11px] font-black uppercase tracking-widest text-brand-text">
            บันทึกของฉัน
          </h3>
          <span className="text-[10px] font-bold text-brand-muted bg-brand-bg px-1.5 py-0.5 rounded-full">
            {snippets.length}
          </span>
        </div>
        {snippets.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`ลบบันทึกทั้งหมด ${snippets.length} รายการ?`)) clearAll();
            }}
            className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-muted hover:text-red-500 transition-colors px-1.5 py-1 rounded hover:bg-red-50"
            aria-label="ลบทั้งหมด"
          >
            <Trash2 size={10} />
            ลบทั้งหมด
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {snippets.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {snippets.map((s) => (
              <SnippetCard key={s.id} snippet={s} onUnpin={() => unpin(s.id)} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-3">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-400 mb-3">
        <Bookmark size={20} />
      </div>
      <p className="text-xs font-bold text-brand-text mb-1">ยังไม่มีบันทึก</p>
      <p className="text-[10px] text-brand-muted leading-relaxed">
        กดไอคอน <Bookmark size={9} className="inline-block align-middle" /> ที่คำตอบของ AI
        เพื่อบันทึกคำแนะนำที่มีประโยชน์
      </p>
    </div>
  );
}

function SnippetCard({ snippet, onUnpin }: { snippet: PinnedSnippet; onUnpin: () => void }) {
  const [copied, setCopied] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.warn("[snippet] clipboard error:", err);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-2xl border border-brand-border p-3 shadow-sm hover:shadow-md transition-shadow group"
    >
      {snippet.question && (
        <div className="text-[10px] font-bold text-blue-700 bg-blue-50/60 rounded-md px-2 py-1 mb-2 line-clamp-2">
          ❓ {snippet.question}
        </div>
      )}

      <div
        className={cn(
          "text-[11px] text-brand-text leading-relaxed prose-sm",
          !expanded && "line-clamp-4",
        )}
      >
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
            ol: ({ children }) => (
              <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>
            ),
            li: ({ children }) => <li>{children}</li>,
            strong: ({ children }) => (
              <strong className="font-bold text-blue-700">{children}</strong>
            ),
            code: ({ children }) => (
              <code className="bg-brand-bg px-1 rounded font-mono text-[10px]">{children}</code>
            ),
            h1: ({ children }) => <p className="font-black mb-1">{children}</p>,
            h2: ({ children }) => <p className="font-black mb-1">{children}</p>,
            h3: ({ children }) => <p className="font-bold mb-1">{children}</p>,
          }}
        >
          {snippet.text}
        </ReactMarkdown>
      </div>

      {snippet.text.length > 200 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[9px] font-bold text-blue-600 hover:underline mt-1"
        >
          {expanded ? "ย่อ" : "แสดงทั้งหมด"}
        </button>
      )}

      <footer className="flex items-center justify-between mt-2 pt-2 border-t border-brand-border/50">
        <time
          className="text-[9px] font-bold text-brand-muted"
          dateTime={new Date(snippet.createdAt).toISOString()}
        >
          {formatRelative(snippet.createdAt)}
        </time>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-1 rounded transition-all",
              copied
                ? "bg-emerald-50 text-emerald-600"
                : "text-brand-muted hover:text-blue-600 hover:bg-blue-50",
            )}
            aria-label="คัดลอก"
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? "คัดลอกแล้ว" : "คัดลอก"}
          </button>
          <button
            type="button"
            onClick={onUnpin}
            className="inline-flex items-center gap-1 text-[9px] font-bold text-brand-muted hover:text-red-500 hover:bg-red-50 px-1.5 py-1 rounded transition-all"
            aria-label="เลิกปักหมุด"
          >
            <BookmarkX size={10} />
            เลิกปัก
          </button>
        </div>
      </footer>
    </motion.article>
  );
}
