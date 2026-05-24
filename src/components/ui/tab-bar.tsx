"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type TabBarItem<T extends string> = {
  id: T;
  label: string;
  description?: string;
  icon?: ReactNode;
  badge?: number | string;
};

type TabBarProps<T extends string> = {
  // Tab navigation reusable. Di mobile tampil sebagai pill horizontal scrollable;
  // di desktop sebagai grid kartu deskriptif yang mudah dipindai.
  items: TabBarItem<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
};

export function TabBar<T extends string>({ items, active, onChange, className }: TabBarProps<T>) {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Pill horizontal khusus mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 sm:hidden">
        {items.map((item) => (
          <button
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
              active === item.id
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--primary)]/40",
            )}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
            {item.label}
            {item.badge !== undefined ? (
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                  active === item.id ? "bg-[var(--surface)] text-[var(--primary)]" : "bg-[var(--surface-soft)] text-[var(--foreground)]",
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Kartu deskriptif untuk tablet/desktop */}
      <nav className="hidden gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 text-left transition",
                isActive
                  ? "border-[var(--primary)] bg-[var(--surface-soft)] shadow-sm"
                  : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--primary)]/40 hover:bg-[var(--surface-soft)]/60",
              )}
              key={item.id}
              onClick={() => onChange(item.id)}
              type="button"
            >
              {item.icon ? (
                <span
                  className={cn(
                    "mt-0.5 grid size-9 shrink-0 place-items-center rounded-md",
                    isActive ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-soft)] text-[var(--primary)]",
                  )}
                >
                  {item.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className={cn("flex items-center gap-2 font-bold", isActive ? "text-[var(--primary-strong)]" : "text-[var(--foreground)]")}>
                  {item.label}
                  {item.badge !== undefined ? (
                    <span
                      className={cn(
                        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                        isActive ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-soft)] text-[var(--foreground)]",
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </span>
                {item.description ? <span className="mt-0.5 block text-xs leading-5 text-[var(--muted)]">{item.description}</span> : null}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
