import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type HelpTextProps = {
  children: ReactNode;
  tone?: "info" | "warning" | "success";
  icon?: ReactNode;
  className?: string;
  title?: string;
};

export function HelpText({ children, tone = "info", icon, className, title }: HelpTextProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border p-4 text-sm leading-6",
        tone === "info" && "border-emerald-100 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100",
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{icon ?? <Info size={18} />}</span>
      <div className="space-y-1">
        {title ? <p className="font-bold">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}
