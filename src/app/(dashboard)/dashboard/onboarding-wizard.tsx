"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, ClipboardList, GraduationCap, Sparkles, UserCog, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const STORAGE_KEY = "rapor-gq-onboarding-dismissed";

type Step = {
  id: string;
  label: string;
  description: string;
  href: string;
  hrefLabel: string;
  icon: React.ReactNode;
  // Fungsi untuk cek apakah langkah ini sudah selesai berdasarkan data Supabase.
  done: (data: WizardData) => boolean;
};

type WizardData = {
  hasInstitutionName: boolean;
  hasTeachers: boolean;
  hasHalaqohs: boolean;
  hasStudents: boolean;
  hasAssignments: boolean;
  hasTeacherAccounts: boolean;
};

const steps: Step[] = [
  {
    id: "profile",
    label: "Lengkapi profil lembaga",
    description: "Nama, alamat, koordinator default. Ini akan tampil di header rapor.",
    href: "/pengaturan",
    hrefLabel: "Buka Pengaturan",
    icon: <Building2 size={20} />,
    done: (data) => data.hasInstitutionName,
  },
  {
    id: "guru",
    label: "Tambah data guru",
    description: "Daftar guru/pengampu. Tanpa guru, halaqoh tidak bisa dibuat.",
    href: "/master",
    hrefLabel: "Tambah Guru",
    icon: <UserCog size={20} />,
    done: (data) => data.hasTeachers,
  },
  {
    id: "halaqoh",
    label: "Buat halaqoh",
    description: "Halaqoh adalah kelompok belajar yang diampu seorang guru.",
    href: "/master",
    hrefLabel: "Buat Halaqoh",
    icon: <GraduationCap size={20} />,
    done: (data) => data.hasHalaqohs,
  },
  {
    id: "santri",
    label: "Tambah data santri",
    description: "Daftarkan santri satu per satu atau import dari Excel (segera hadir).",
    href: "/master",
    hrefLabel: "Tambah Santri",
    icon: <Users size={20} />,
    done: (data) => data.hasStudents,
  },
  {
    id: "anggota",
    label: "Tempatkan santri ke halaqoh",
    description: "Hubungkan tiap santri dengan halaqohnya supaya nilai bisa diisi.",
    href: "/master",
    hrefLabel: "Atur Anggota",
    icon: <ClipboardList size={20} />,
    done: (data) => data.hasAssignments,
  },
  {
    id: "akun-guru",
    label: "Buat akun login guru",
    description: "Beri guru email & password agar mereka bisa input nilai sendiri.",
    href: "/akun-guru",
    hrefLabel: "Buat Akun Guru",
    icon: <UserCog size={20} />,
    done: (data) => data.hasTeacherAccounts,
  },
];

export function OnboardingWizard({ role }: { role: "admin" | "koordinator" | "guru" | "viewer" }) {
  const [data, setData] = useState<WizardData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== "undefined") {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "true");
    }
  }, []);

  useEffect(() => {
    if (!hasMounted || role !== "admin") return;
    void loadData();

    async function loadData() {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;

      const [settingsRes, teacherRes, halaqohRes, studentRes, assignmentRes, accountRes] = await Promise.all([
        supabase.from("school_settings").select("institution_name").eq("id", "default").maybeSingle(),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("halaqohs").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("student_halaqohs").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "guru"),
      ]);

      const institutionName = settingsRes.data?.institution_name?.trim() ?? "";
      const isDefaultName = institutionName === "" || institutionName === "GRIYA QUR'AN PENYEJUK HATI PURBALINGGA";

      setData({
        // Anggap profil sudah dilengkapi jika nama lembaga sudah diubah dari default.
        hasInstitutionName: institutionName.length > 0 && !isDefaultName,
        hasTeachers: (teacherRes.count ?? 0) > 0,
        hasHalaqohs: (halaqohRes.count ?? 0) > 0,
        hasStudents: (studentRes.count ?? 0) > 0,
        hasAssignments: (assignmentRes.count ?? 0) > 0,
        hasTeacherAccounts: (accountRes.count ?? 0) > 0,
      });
    }
  }, [hasMounted, role]);

  // Jangan render apa pun sebelum mounted (mencegah hydration mismatch),
  // dan jangan render kalau bukan admin atau sudah pernah ditutup permanen oleh user.
  if (!hasMounted || role !== "admin" || dismissed || !data) return null;

  const completedCount = steps.filter((step) => step.done(data)).length;
  // Jika semua langkah sudah selesai, sembunyikan otomatis (asumsi setup awal sudah beres).
  if (completedCount === steps.length) return null;

  const nextStep = steps.find((step) => !step.done(data));

  function handleDismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "true");
    }
    setDismissed(true);
  }

  return (
    <Card className="border-2 border-[var(--primary)]/30 bg-gradient-to-br from-[var(--surface-soft)] via-[var(--surface)] to-[var(--surface)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-md bg-[var(--primary)] text-white">
            <Sparkles size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Setup Awal</p>
            <h2 className="mt-0.5 text-lg font-bold leading-tight">Yuk siapkan aplikasi dulu</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              {completedCount} dari {steps.length} langkah selesai. Selesaikan urutan ini agar guru bisa langsung input nilai.
            </p>
          </div>
        </div>
        <button
          aria-label="Sembunyikan panduan setup"
          className="grid size-9 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-soft)]"
          onClick={handleDismiss}
          type="button"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mb-5 h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-all"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      <ol className="space-y-2">
        {steps.map((step, index) => {
          const isDone = step.done(data);
          const isNext = step.id === nextStep?.id;
          return (
            <li
              className={cn(
                "flex items-start gap-3 rounded-md border p-3 transition",
                isDone
                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
                  : isNext
                    ? "border-[var(--primary)] bg-[var(--surface)] shadow-sm"
                    : "border-[var(--line)] bg-[var(--surface)]",
              )}
              key={step.id}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full",
                  isDone ? "bg-emerald-600 text-white dark:bg-emerald-500" : isNext ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-soft)] text-[var(--muted)]",
                )}
              >
                {isDone ? <CheckCircle2 size={18} /> : <span className="text-sm font-bold">{index + 1}</span>}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("font-semibold", isDone ? "text-emerald-900 dark:text-emerald-100" : "text-[var(--foreground)]")}>
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">{step.description}</p>
              </div>
              {!isDone ? (
                <Link
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold transition",
                    isNext ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)]" : "border border-[var(--line)] text-[var(--foreground)] hover:bg-[var(--surface-soft)]",
                  )}
                  href={step.href}
                >
                  {step.hrefLabel}
                  <ArrowRight size={14} />
                </Link>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100">
                  Selesai
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-4">
        <p className="text-xs text-[var(--muted)]">Panduan ini akan otomatis hilang saat semua langkah selesai.</p>
        <Button onClick={handleDismiss} type="button" variant="ghost">
          Tutup Panduan
        </Button>
      </div>
    </Card>
  );
}
