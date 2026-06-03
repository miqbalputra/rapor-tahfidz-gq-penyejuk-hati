import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
      </div>
      {action ? <div className="w-full sm:w-auto">{action}</div> : null}
    </div>
  );
}
