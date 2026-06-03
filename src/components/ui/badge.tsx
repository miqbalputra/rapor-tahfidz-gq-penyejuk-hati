import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeProps = {
  children: ReactNode;
  tone?: "green" | "amber" | "red" | "neutral";
  className?: string;
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-1 text-xs font-medium ring-1",
        tone === "green" && "bg-[#edf3ec] text-[#448361] ring-[#d7e4d4] dark:bg-[#253127] dark:text-[#9bc6a7] dark:ring-[#3b4a3e]",
        tone === "amber" && "bg-[#fbf3db] text-[#8f6b1f] ring-[#efe0b5] dark:bg-[#332b1c] dark:text-[#e0c06f] dark:ring-[#55492c]",
        tone === "red" && "bg-[#fdebec] text-[#b3261e] ring-[#f4c7ca] dark:bg-[#3a2021] dark:text-[#ffaaa5] dark:ring-[#5d3335]",
        tone === "neutral" && "bg-[var(--surface-soft)] text-[var(--muted)] ring-[var(--line)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
