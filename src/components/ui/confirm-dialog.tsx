"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils/cn";

type ConfirmDialogProps = {
  // Modal konfirmasi in-app menggantikan window.confirm browser yang kecil dan rawan miss-tap di HP.
  open: boolean;
  title: string;
  description: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  detail,
  confirmLabel = "Lanjutkan",
  cancelLabel = "Batal",
  tone = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [loading, onCancel, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full",
                tone === "danger"
                  ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
              )}
            >
              <AlertTriangle size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-tight">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
            </div>
          </div>
          <button
            aria-label="Tutup"
            className="grid size-9 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
            onClick={onCancel}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {detail ? (
          <pre className="mx-5 mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--surface-soft)] p-3 text-xs leading-6 text-[var(--muted)]">
            {detail}
          </pre>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--line)] px-5 py-4 sm:flex-row sm:justify-end">
          <Button disabled={loading} onClick={onCancel} type="button" variant="secondary">
            {cancelLabel}
          </Button>
          <Button disabled={loading} onClick={onConfirm} type="button" variant={tone === "danger" ? "danger" : "primary"}>
            {loading ? "Memproses..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
