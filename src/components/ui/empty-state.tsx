import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type EmptyStateProps = {
  // Empty state besar untuk pemula. Tampil sebagai pengganti tabel kosong agar tidak intimidating.
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
  tone?: "neutral" | "primary" | "warning";
};

export function EmptyState({ icon, title, description, action, className, tone = "neutral" }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center",
        tone === "primary" && "border-[var(--primary)]/40 bg-[var(--surface-soft)]",
        tone === "warning" && "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30",
        tone === "neutral" && "border-[var(--line)] bg-[var(--surface)]",
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 grid size-14 place-items-center rounded-full",
          tone === "primary" && "bg-[var(--primary)] text-white",
          tone === "warning" && "bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100",
          tone === "neutral" && "bg-[var(--surface-soft)] text-[var(--primary)]",
        )}
      >
        {icon}
      </div>
      <h3
        className={cn(
          "text-lg font-bold",
          tone === "warning" ? "text-amber-900 dark:text-amber-100" : "text-[var(--foreground)]",
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "mt-2 max-w-md text-sm leading-6",
          tone === "warning" ? "text-amber-800 dark:text-amber-200/90" : "text-[var(--muted)]",
        )}
      >
        {description}
      </p>
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
