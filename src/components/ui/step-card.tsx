import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type StepCardProps = {
  number: number;
  title: string;
  description?: ReactNode;
  details?: string[];
  icon?: ReactNode;
  tone?: "default" | "primary";
  action?: ReactNode;
  className?: string;
};

export function StepCard({ number, title, description, details, icon, tone = "default", action, className }: StepCardProps) {
  return (
    <article
      className={cn(
        "relative flex flex-col gap-3 rounded-md border bg-[var(--surface)] p-4 sm:p-5",
        tone === "primary" ? "border-[var(--foreground)] shadow-[0_1px_2px_rgba(15,15,15,0.04)]" : "border-[var(--line)] shadow-[0_1px_2px_rgba(15,15,15,0.04)]",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-md text-sm font-semibold",
            tone === "primary"
              ? "bg-[var(--foreground)] text-[var(--surface)]"
              : "bg-[var(--surface-soft)] text-[var(--foreground)]",
          )}
        >
          {number}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon ? <span className="text-[var(--foreground)]">{icon}</span> : null}
            <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
          </div>
          {description ? (
            <div className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</div>
          ) : null}
        </div>
      </div>

      {details && details.length > 0 ? (
        <ul className="space-y-1.5 pl-13 text-sm leading-6 text-[var(--muted)]">
          {details.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden="true" className="mt-1 block size-1.5 shrink-0 rounded-full bg-[var(--muted)]" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {action ? <div className="pl-13">{action}</div> : null}
    </article>
  );
}
