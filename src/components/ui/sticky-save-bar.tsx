"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type StickySaveBarProps = {
  // Bar mengambang di bawah form panjang (HP) agar tombol Simpan selalu terjangkau tanpa scroll.
  visible?: boolean;
  primary: ReactNode;
  secondary?: ReactNode;
  message?: string;
  // Hanya tampil di mobile (default) untuk tidak mengganggu desktop yang punya space lebih luas.
  mobileOnly?: boolean;
};

export function StickySaveBar({ visible = true, primary, secondary, message, mobileOnly = true }: StickySaveBarProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[4.5rem] z-20 border-t border-[var(--line)] bg-[var(--surface)]/95 px-3 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur",
        // Bottom 4.5rem agar tidak menumpuk dengan bottom navigation mobile.
        mobileOnly ? "lg:hidden" : "",
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        {message ? <p className="hidden flex-1 text-xs text-[var(--muted)] sm:block">{message}</p> : null}
        {secondary ? <div className="shrink-0">{secondary}</div> : null}
        <div className="flex-1 sm:flex-none">{primary}</div>
      </div>
    </div>
  );
}
