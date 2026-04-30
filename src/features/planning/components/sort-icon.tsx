"use client";

import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";

export function SortIcon({ active, order }: { active: boolean; order: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown size={10} className="text-brand-muted inline" />;
  return order === "asc" ? (
    <ChevronUp size={10} className="text-blue-600 inline" />
  ) : (
    <ChevronDown size={10} className="text-blue-600 inline" />
  );
}
