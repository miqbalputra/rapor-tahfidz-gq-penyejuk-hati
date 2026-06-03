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
        "flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center",
        tone === "primary" && "border-[var(--line)] bg-[var(--surface-soft)]",
        tone === "warning" && "border-[#efe0b5] bg-[#fbf3db] dark:border-[#55492c] dark:bg-[#332b1c]",
        tone === "neutral" && "border-[var(--line)] bg-[var(--surface)]",
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 grid size-14 place-items-center rounded-full",
          tone === "primary" && "bg-[var(--foreground)] text-[var(--surface)]",
          tone === "warning" && "bg-[#efe0b5] text-[#6f5318] dark:bg-[#55492c] dark:text-[#e0c06f]",
          tone === "neutral" && "bg-[var(--surface-soft)] text-[var(--foreground)]",
        )}
      >
        {icon}
      </div>
      <h3
        className={cn(
          "text-lg font-semibold",
          tone === "warning" ? "text-[#6f5318] dark:text-[#e0c06f]" : "text-[var(--foreground)]",
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "mt-2 max-w-md text-sm leading-6",
          tone === "warning" ? "text-[#8f6b1f] dark:text-[#e0c06f]" : "text-[var(--muted)]",
        )}
      >
        {description}
      </p>
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}
