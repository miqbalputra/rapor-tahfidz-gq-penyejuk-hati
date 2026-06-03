import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ContextBarProps = {
  // Daftar chip kontekstual seperti tahun ajaran, semester, halaqoh aktif.
  // Tampil sticky di atas konten supaya pengguna selalu tahu sedang mengisi data untuk periode mana.
  chips: Array<{ label: string; value: string; tone?: "primary" | "neutral" }>;
  className?: string;
  trailing?: ReactNode;
};

export function ContextBar({ chips, className, trailing }: ContextBarProps) {
  if (chips.length === 0 && !trailing) return null;

  return (
    <div className={cn("sticky top-[3.75rem] z-10 -mx-3 mb-3 border-y border-[var(--line)] bg-[var(--background)]/90 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:top-[4.25rem]", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((chip) => (
          <span
            className={cn(
              "inline-flex max-w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-[var(--line)]",
              chip.tone === "neutral"
                ? "bg-[var(--surface)] text-[var(--foreground)]"
                : "bg-[var(--foreground)] text-[var(--surface)]",
            )}
            key={`${chip.label}-${chip.value}`}
            title={`${chip.label}: ${chip.value}`}
          >
            <span className="opacity-80">{chip.label}</span>
            <span className="truncate">{chip.value}</span>
          </span>
        ))}
        {trailing ? <div className="ml-auto">{trailing}</div> : null}
      </div>
    </div>
  );
}
