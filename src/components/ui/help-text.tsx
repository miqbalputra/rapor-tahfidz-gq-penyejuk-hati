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
        tone === "info" && "border-[var(--line)] bg-[var(--surface-muted)] text-[var(--foreground)]",
        tone === "warning" && "border-[#efe0b5] bg-[#fbf3db] text-[#6f5318] dark:border-[#55492c] dark:bg-[#332b1c] dark:text-[#e0c06f]",
        tone === "success" && "border-[#d7e4d4] bg-[#edf3ec] text-[#35684c] dark:border-[#3b4a3e] dark:bg-[#253127] dark:text-[#9bc6a7]",
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
