"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ActionMenuItem = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  // tone "danger" untuk aksi destruktif, "primary" untuk aksi utama yang ingin ditonjolkan.
  tone?: "default" | "danger" | "primary";
};

type ActionMenuProps = {
  // Tombol overflow (titik tiga) untuk aksi sekunder agar HP tidak penuh tombol.
  items: ActionMenuItem[];
  label?: string;
  className?: string;
};

export function ActionMenu({ items, label = "Aksi lainnya", className }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <MoreVertical size={18} />
      </button>
      {open ? (
        <div
          className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-lg"
          role="menu"
        >
          <ul className="py-1">
            {items.map((item, index) => (
              <li key={`${item.label}-${index}`}>
                <button
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
                    item.tone === "danger"
                      ? "text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                      : item.tone === "primary"
                        ? "font-semibold text-[var(--primary)] hover:bg-[var(--surface-soft)]"
                        : "text-[var(--foreground)] hover:bg-[var(--surface-soft)]",
                  )}
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    setOpen(false);
                    item.onSelect();
                  }}
                  role="menuitem"
                  type="button"
                >
                  {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                  <span className="flex-1">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
