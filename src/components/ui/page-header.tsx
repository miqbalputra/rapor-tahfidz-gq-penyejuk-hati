import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, action, icon, className }: PageHeaderProps) {
  return (
    <header className={cn("rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm sm:p-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {icon ? (
            <div className="grid size-12 shrink-0 place-items-center rounded-md bg-[var(--surface-soft)] text-[var(--primary-strong)]">
              {icon}
            </div>
          ) : null}
          <div>
            {eyebrow ? <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">{eyebrow}</p> : null}
            <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">{description}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
