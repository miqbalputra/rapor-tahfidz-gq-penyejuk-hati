"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { haptic } from "@/lib/utils/haptic";

type ToastProps = {
  message: string;
  tone?: "success" | "error" | "info";
};

export function Toast({ message, tone = "info" }: ToastProps) {
  // Trigger haptic feedback otomatis saat toast tampil. Native Vibration API,
  // 0KB tambahan, otomatis silent di device yang tidak mendukung.
  useEffect(() => {
    if (tone === "success") haptic("success");
    else if (tone === "error") haptic("error");
    else haptic("tap");
  }, [tone]);

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-start gap-4 rounded-lg border-2 bg-[var(--surface)] p-5 text-base shadow-2xl",
        "sm:left-auto sm:right-6 sm:w-full sm:translate-x-0",
        tone === "success" && "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100",
        tone === "error" && "border-red-500 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-100",
        tone === "info" && "border-[var(--primary)] bg-[var(--surface-soft)] text-[var(--foreground)]",
      )}
      role="status"
    >
      {tone === "success" ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400" size={30} /> : null}
      {tone === "error" ? <XCircle className="mt-0.5 shrink-0 text-red-700 dark:text-red-400" size={30} /> : null}
      <div>
        <p className="text-sm font-bold uppercase tracking-wide">
          {tone === "success" ? "Berhasil" : tone === "error" ? "Gagal" : "Info"}
        </p>
        <p className="mt-1 text-base font-semibold leading-7">{message}</p>
      </div>
    </div>
  );
}
