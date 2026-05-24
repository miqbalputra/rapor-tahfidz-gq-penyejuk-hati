"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "rapor-gq-theme";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle() {
  // Toggle antara light dan dark. Pilihan disimpan di localStorage agar persisten antar reload.
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage bisa gagal di mode privat. Aman diabaikan.
    }
  }

  return (
    <button
      aria-label={mounted ? (theme === "dark" ? "Beralih ke mode terang" : "Beralih ke mode gelap") : "Toggle tema"}
      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]"
      onClick={toggle}
      title={mounted ? (theme === "dark" ? "Mode Terang" : "Mode Gelap") : "Toggle tema"}
      type="button"
    >
      {/* Render kedua icon, hanya satu yang visible berdasarkan tema. Pakai class dark: agar tidak hydration mismatch. */}
      <Sun className="block dark:hidden" size={18} />
      <Moon className="hidden dark:block" size={18} />
    </button>
  );
}
