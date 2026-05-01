import { usePinnedSnippetsStore } from "@/stores/pinned-snippets-store";
import { beforeEach, describe, expect, it } from "vitest";

beforeEach(() => {
  // Reset persisted state between tests
  localStorage.clear();
  usePinnedSnippetsStore.setState({ snippets: [] });
});

describe("usePinnedSnippetsStore", () => {
  it("pins a new snippet", () => {
    const { pin } = usePinnedSnippetsStore.getState();
    pin("คำตอบที่มีประโยชน์", "คำถาม?");
    const { snippets } = usePinnedSnippetsStore.getState();
    expect(snippets).toHaveLength(1);
    expect(snippets[0]?.text).toBe("คำตอบที่มีประโยชน์");
    expect(snippets[0]?.question).toBe("คำถาม?");
  });

  it("dedupes — pinning the same text twice keeps only one entry", () => {
    const { pin } = usePinnedSnippetsStore.getState();
    pin("ข้อความเดียวกัน");
    pin("ข้อความเดียวกัน");
    expect(usePinnedSnippetsStore.getState().snippets).toHaveLength(1);
  });

  it("trims whitespace on pin and dedup match", () => {
    const { pin, isPinned } = usePinnedSnippetsStore.getState();
    pin("  ข้อความ  ");
    expect(isPinned("ข้อความ")).toBe(true);
    expect(usePinnedSnippetsStore.getState().snippets).toHaveLength(1);
  });

  it("returns the same id when re-pinning identical text", () => {
    const { pin } = usePinnedSnippetsStore.getState();
    const id1 = pin("hello");
    const id2 = pin("hello");
    expect(id1).toBe(id2);
  });

  it("rejects empty / whitespace-only pin attempts", () => {
    const { pin } = usePinnedSnippetsStore.getState();
    pin("");
    pin("   \n  ");
    expect(usePinnedSnippetsStore.getState().snippets).toHaveLength(0);
  });

  it("unpins by id", () => {
    const { pin, unpin } = usePinnedSnippetsStore.getState();
    const id = pin("a");
    pin("b");
    unpin(id);
    const remaining = usePinnedSnippetsStore.getState().snippets.map((s) => s.text);
    expect(remaining).toEqual(["b"]);
  });

  it("unpins by text content", () => {
    const { pin, unpinByText } = usePinnedSnippetsStore.getState();
    pin("alpha");
    pin("beta");
    unpinByText("alpha");
    expect(usePinnedSnippetsStore.getState().snippets.map((s) => s.text)).toEqual(["beta"]);
  });

  it("isPinned reflects current state", () => {
    const { pin, unpinByText, isPinned } = usePinnedSnippetsStore.getState();
    expect(isPinned("x")).toBe(false);
    pin("x");
    expect(isPinned("x")).toBe(true);
    unpinByText("x");
    expect(isPinned("x")).toBe(false);
  });

  it("clearAll removes everything", () => {
    const { pin, clearAll } = usePinnedSnippetsStore.getState();
    pin("1");
    pin("2");
    pin("3");
    clearAll();
    expect(usePinnedSnippetsStore.getState().snippets).toHaveLength(0);
  });

  it("rename updates the title", () => {
    const { pin, rename } = usePinnedSnippetsStore.getState();
    const id = pin("body text");
    rename(id, "หัวข้อใหม่");
    expect(usePinnedSnippetsStore.getState().snippets[0]?.title).toBe("หัวข้อใหม่");
  });

  it("preserves newest-first order", () => {
    const { pin } = usePinnedSnippetsStore.getState();
    pin("oldest");
    pin("middle");
    pin("newest");
    expect(usePinnedSnippetsStore.getState().snippets.map((s) => s.text)).toEqual([
      "newest",
      "middle",
      "oldest",
    ]);
  });
});
