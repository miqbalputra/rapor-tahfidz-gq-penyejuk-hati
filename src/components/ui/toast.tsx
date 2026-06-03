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
        "fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-start gap-4 rounded-md border bg-[var(--surface)] p-4 text-base shadow-[0_16px_40px_rgba(15,15,15,0.16)]",
        "sm:left-auto sm:right-6 sm:w-full sm:translate-x-0",
        tone === "success" && "border-[#d7e4d4] bg-[#edf3ec] text-[#35684c] dark:bg-[#253127] dark:text-[#9bc6a7]",
        tone === "error" && "border-[#f4c7ca] bg-[#fdebec] text-[#b3261e] dark:bg-[#3a2021] dark:text-[#ffaaa5]",
        tone === "info" && "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)]",
      )}
      role="status"
    >
      {tone === "success" ? <CheckCircle2 className="mt-0.5 shrink-0 text-[#448361]" size={24} /> : null}
      {tone === "error" ? <XCircle className="mt-0.5 shrink-0 text-[#b3261e]" size={24} /> : null}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide">
          {tone === "success" ? "Berhasil" : tone === "error" ? "Gagal" : "Info"}
        </p>
        <p className="mt-1 text-sm font-medium leading-6">{message}</p>
      </div>
    </div>
  );
}
