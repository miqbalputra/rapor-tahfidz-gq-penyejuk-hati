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
        "rounded-lg border bg-[var(--surface)] p-4 shadow-sm",
        tone === "default" && "border-[var(--line)]",
        tone === "success" && "border-emerald-200 dark:border-emerald-800",
        tone === "warning" && "border-amber-200 dark:border-amber-800",
        tone === "danger" && "border-red-200 dark:border-red-800",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--muted)]">{label}</p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold leading-tight",
              tone === "success" && "text-emerald-700 dark:text-emerald-300",
              tone === "warning" && "text-amber-800 dark:text-amber-300",
              tone === "danger" && "text-red-700 dark:text-red-300",
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
              tone === "default" && "bg-[var(--surface-soft)] text-[var(--primary)]",
              tone === "success" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
              tone === "warning" && "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
              tone === "danger" && "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
