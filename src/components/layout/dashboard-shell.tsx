"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  ClipboardList,
  Database,
  FileText,
  Settings,
  UserCog,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSchoolSettings } from "@/lib/settings/use-school-settings";
import { cn } from "@/lib/utils/cn";
import { AuthStatus } from "./auth-status";
import { ThemeToggle } from "./theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  // "all" = semua role; "supervisor" = admin/koordinator/wali_kelas; "admin" = admin saja
  visibleFor: "all" | "supervisor" | "admin";
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, visibleFor: "all" },
  { href: "/master", label: "Master Data", icon: Database, visibleFor: "all" },
  { href: "/presensi", label: "Presensi", icon: CalendarCheck, visibleFor: "all" },
  { href: "/penilaian", label: "Penilaian", icon: ClipboardList, visibleFor: "all" },
  { href: "/rapor", label: "Rapor", icon: FileText, visibleFor: "all" },
  { href: "/panduan", label: "Panduan", icon: BookOpen, visibleFor: "all" },
  { href: "/akun-guru", label: "Akun Guru", icon: UserCog, visibleFor: "admin" },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, visibleFor: "supervisor" },
];

type AuthGateState = "checking" | "authenticated" | "unauthenticated" | "inactive" | "unconfigured";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, period } = useSchoolSettings();
  const [authGateState, setAuthGateState] = useState<AuthGateState>("checking");
  const [authGateMessage, setAuthGateMessage] = useState("Memeriksa session login...");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const authGateStateRef = useRef<AuthGateState>("checking");
  const pathnameRef = useRef(pathname);

  function updateAuthGateState(nextState: AuthGateState) {
    authGateStateRef.current = nextState;
    setAuthGateState(nextState);
  }

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Tandai sudah mounted di client agar nav adaptive baru di-filter setelah hydration selesai.
  // Sebelum mounted: server dan client sama-sama menampilkan semua menu (output identik = no hydration mismatch).
  // Setelah mounted: filter berdasarkan role user.
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      updateAuthGateState("unconfigured");
      setAuthGateMessage("Konfigurasi Supabase belum lengkap. Cek environment variable sebelum deploy.");
      return;
    }

    const activeSupabase = supabase;
    let mounted = true;

    async function checkSession({ showChecking = false }: { showChecking?: boolean } = {}) {
      if (showChecking) {
        updateAuthGateState("checking");
        setAuthGateMessage("Memeriksa session login...");
      }

      const {
        data: { user },
      } = await activeSupabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        updateAuthGateState("unauthenticated");
        setAuthGateMessage("Session login tidak ditemukan. Mengalihkan ke halaman login...");
        router.replace(`/login?next=${encodeURIComponent(pathnameRef.current)}`);
        return;
      }

      const { data: profile, error } = await activeSupabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();

      if (!mounted) return;

      if (error || !profile) {
        updateAuthGateState("inactive");
        setAuthGateMessage("Profil akun belum disiapkan oleh admin. Hubungi admin untuk mengaktifkan akses.");
        return;
      }

      if (!profile.is_active) {
        await activeSupabase.auth.signOut();
        if (!mounted) return;
        updateAuthGateState("inactive");
        setAuthGateMessage("Akun ini sedang nonaktif. Hubungi admin untuk membuka akses kembali.");
        router.replace("/login");
        return;
      }

      setUserRole(profile.role ?? null);
      updateAuthGateState("authenticated");
    }

    void checkSession({ showChecking: authGateStateRef.current !== "authenticated" });

    const { data: listener } = activeSupabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        updateAuthGateState("unauthenticated");
        setAuthGateMessage("Session login tidak ditemukan. Mengalihkan ke halaman login...");
        router.replace(`/login?next=${encodeURIComponent(pathnameRef.current)}`);
        return;
      }

      void checkSession();
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [pathnameRef, router]);

  const periodLabel = [
    period.academic_year_name ? `Tahun Ajaran ${period.academic_year_name}` : "",
    period.semester_name ? `Semester ${period.semester_name}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const visibleNavItems = navItems.filter((item) => {
    // Sebelum mounted di client, tampilkan semua menu agar HTML server dan client first render sama.
    if (!hasMounted) return true;
    if (item.visibleFor === "all") return true;
    if (item.visibleFor === "admin") return userRole === "admin";
    if (item.visibleFor === "supervisor") return userRole === "admin" || userRole === "koordinator" || userRole === "wali_kelas";
    return false;
  });
  const navCount = visibleNavItems.length;
  // Pilih kelas grid berdasarkan jumlah menu agar label cukup besar untuk pemula HP.
  const gridColsClass =
    navCount <= 4
      ? "grid-cols-4"
      : navCount === 5
        ? "grid-cols-5"
        : navCount === 6
          ? "grid-cols-6"
          : "grid-cols-7";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-72 border-r border-[var(--line)] bg-[var(--surface-muted)] lg:block">
        <div className="flex h-20 items-center gap-3 border-b border-[var(--line)] px-5">
          <div className="grid size-10 place-items-center rounded-md bg-[var(--foreground)] text-[var(--surface)] shadow-sm">
            <BookOpenCheck size={24} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{settings.short_name || "GQ Penyejuk Hati"}</p>
            <p className="truncate text-xs text-[var(--muted)]">Aplikasi Rapor Tahfidz</p>
          </div>
        </div>
        <nav className="space-y-1 p-4">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition",
                  active
                    ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[0_1px_2px_rgba(15,15,15,0.04)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]",
                )}
                href={item.href}
                key={item.href}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="no-print sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--background)]/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {periodLabel || "Belum ada periode aktif"}
              </p>
              <h1 className="truncate text-lg font-semibold text-[var(--foreground)] sm:text-xl">Aplikasi Rapor Tahfidz</h1>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <ThemeToggle />
              <AuthStatus />
            </div>
          </div>
        </header>

        <main className="px-3 pb-28 pt-4 sm:px-6 sm:py-6 lg:px-8">{children}</main>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--surface)]/95 px-2 pb-[calc(0.4rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,15,15,0.08)] backdrop-blur lg:hidden">
        <div className={cn("grid gap-1", gridColsClass)}>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                className={cn(
                  "flex min-h-[3.75rem] min-w-0 flex-col items-center justify-start gap-1 rounded-md px-1 py-1.5 text-center font-semibold transition",
                  navCount <= 5 ? "text-[11px]" : "text-[10px]",
                  active ? "bg-[var(--foreground)] text-[var(--surface)]" : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]",
                )}
                href={item.href}
                key={item.href}
              >
                <Icon className="shrink-0" size={navCount <= 5 ? 20 : 18} />
                <span className="flex min-h-[1.4rem] items-center justify-center text-balance leading-[0.7rem]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {authGateState !== "authenticated" ? (
        <div className="no-print fixed inset-0 z-[60] grid place-items-center bg-[var(--background)] px-4">
          <section className="w-full max-w-md rounded-md border border-[var(--line)] bg-[var(--surface)] p-5 text-center shadow-[0_12px_32px_rgba(15,15,15,0.08)]">
            <div className="mx-auto grid size-12 place-items-center rounded-md bg-[var(--foreground)] text-[var(--surface)]">
              <BookOpenCheck size={26} />
            </div>
            <h1 className="mt-4 text-xl font-bold">Aplikasi Rapor Tahfidz</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{authGateMessage}</p>
            {authGateState === "inactive" || authGateState === "unconfigured" ? (
              <Link
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--line)] px-4 text-sm font-semibold"
                href="/login"
              >
                Ke Login
              </Link>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
