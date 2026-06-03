import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ToolbarSectionProps = {
  title: string;
  description?: ReactNode;
  step?: number;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Section dengan header bernomor langkah yang jelas, dipakai untuk
 * mengurutkan workflow di halaman input nilai/presensi/rapor.
 */
export function ToolbarSection({ title, description, step, icon, action, children, className }: ToolbarSectionProps) {
  return (
    <section className={cn("rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-5", className)}>
      <div className="mb-4 flex flex-col gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {step !== undefined ? (
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--foreground)] text-sm font-semibold text-[var(--surface)]">
              {step}
            </div>
          ) : null}
          <div>
            <div className="flex items-center gap-2">
              {icon ? <span className="text-[var(--foreground)]">{icon}</span> : null}
              <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
            </div>
            {description ? <div className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</div> : null}
          </div>
        </div>
        {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}
