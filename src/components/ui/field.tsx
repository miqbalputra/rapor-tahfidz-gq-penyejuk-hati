import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium text-[var(--foreground)]", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none transition placeholder:text-[var(--muted)]/70",
        "focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--focus)]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-10 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm outline-none transition",
        "focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--focus)]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition placeholder:text-[var(--muted)]/70",
        "focus:border-[var(--foreground)] focus:ring-2 focus:ring-[var(--focus)]",
        className,
      )}
      {...props}
    />
  );
}
