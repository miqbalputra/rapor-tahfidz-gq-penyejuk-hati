import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type StatProps = {
  label: string;
  value: ReactNode;
  help?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
  className?: string;
};

export function Stat({ label, value, help, icon, tone = "default", className }: StatProps) {
  return (
    <div
      className={cn(
        "rounded-md border bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)]",
        tone === "default" && "border-[var(--line)]",
        tone === "success" && "border-[#d7e4d4] dark:border-[#3b4a3e]",
        tone === "warning" && "border-[#efe0b5] dark:border-[#55492c]",
        tone === "danger" && "border-[#f4c7ca] dark:border-[#5d3335]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
          <p
            className={cn(
              "mt-1 text-3xl font-semibold leading-tight",
              tone === "success" && "text-[#448361] dark:text-[#9bc6a7]",
              tone === "warning" && "text-[#8f6b1f] dark:text-[#e0c06f]",
              tone === "danger" && "text-[#b3261e] dark:text-[#ffaaa5]",
            )}
          >
            {value}
          </p>
          {help ? <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{help}</p> : null}
        </div>
        {icon ? (
          <div
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-md",
              tone === "default" && "bg-[var(--surface-soft)] text-[var(--foreground)]",
              tone === "success" && "bg-[#edf3ec] text-[#448361] dark:bg-[#253127] dark:text-[#9bc6a7]",
              tone === "warning" && "bg-[#fbf3db] text-[#8f6b1f] dark:bg-[#332b1c] dark:text-[#e0c06f]",
              tone === "danger" && "bg-[#fdebec] text-[#b3261e] dark:bg-[#3a2021] dark:text-[#ffaaa5]",
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
