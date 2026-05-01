"use client";

import { newId } from "@/lib/utils";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface PinnedSnippet {
  id: string;
  text: string;
  /** The user message that prompted this response, if available. */
  question?: string;
  /** User-given short title; empty by default. */
  title?: string;
  createdAt: number;
}

const MAX_SNIPPETS = 50;

interface PinnedSnippetsState {
  snippets: PinnedSnippet[];
  pin: (text: string, question?: string) => string;
  unpin: (id: string) => void;
  unpinByText: (text: string) => void;
  rename: (id: string, title: string) => void;
  isPinned: (text: string) => boolean;
  clearAll: () => void;
}

/**
 * Persisted store for AI-response bookmarks. Backed by localStorage so
 * snippets survive page reloads on the same device. Cross-device sync would
 * require a Firestore schema change — left as a follow-up.
 */
export const usePinnedSnippetsStore = create<PinnedSnippetsState>()(
  persist(
    (set, get) => ({
      snippets: [],

      pin: (text, question) => {
        const trimmed = text.trim();
        if (!trimmed) return "";
        const existing = get().snippets.find((s) => s.text === trimmed);
        if (existing) return existing.id;
        const id = newId();
        set((s) => ({
          // newest first; cap to MAX_SNIPPETS to keep localStorage payload bounded
          snippets: [{ id, text: trimmed, question, createdAt: Date.now() }, ...s.snippets].slice(
            0,
            MAX_SNIPPETS,
          ),
        }));
        return id;
      },

      unpin: (id) => set((s) => ({ snippets: s.snippets.filter((x) => x.id !== id) })),

      unpinByText: (text) => {
        const trimmed = text.trim();
        set((s) => ({ snippets: s.snippets.filter((x) => x.text !== trimmed) }));
      },

      rename: (id, title) =>
        set((s) => ({
          snippets: s.snippets.map((x) => (x.id === id ? { ...x, title } : x)),
        })),

      isPinned: (text) => {
        const trimmed = text.trim();
        return get().snippets.some((s) => s.text === trimmed);
      },

      clearAll: () => set({ snippets: [] }),
    }),
    {
      name: "wealthwise.pinned-snippets",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
