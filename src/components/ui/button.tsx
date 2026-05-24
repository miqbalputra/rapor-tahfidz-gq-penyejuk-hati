import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "md" | "sm" | "lg";
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        size === "md" && "min-h-10 px-4 text-sm",
        size === "sm" && "min-h-9 px-3 text-xs",
        size === "lg" && "min-h-12 px-5 text-base",
        variant === "primary" && "bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)]",
        variant === "secondary" && "border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-soft)]",
        variant === "ghost" && "text-[var(--foreground)] hover:bg-[var(--surface-soft)]",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        variant === "success" && "bg-emerald-600 text-white hover:bg-emerald-700",
        className,
      )}
      {...props}
    />
  );
}
