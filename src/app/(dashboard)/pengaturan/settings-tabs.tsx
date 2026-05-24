"use client";

import { useState } from "react";
import { Building2, CalendarRange, History, Sliders } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AcademicSettings } from "./academic-settings";
import { AuditLogView } from "./audit-log-view";
import { RubricSettings } from "./rubric-settings";
import { SchoolSettingsForm } from "./school-settings";

type TabId = "profile" | "academic" | "rubric" | "audit";

const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<{ size?: number }>; description: string }> = [
  {
    id: "profile",
    label: "Profil Lembaga",
    icon: Building2,
    description: "Nama, alamat, logo, koordinator default, dan catatan default rapor.",
  },
  {
    id: "academic",
    label: "Tahun Ajaran",
    icon: CalendarRange,
    description: "Kelola tahun ajaran dan semester. Tandai mana yang sedang aktif.",
  },
  {
    id: "rubric",
    label: "Rubrik dan Predikat",
    icon: Sliders,
    description: "Atur jenis ujian, porsi nilai, syarat lulus, dan rentang predikat.",
  },
  {
    id: "audit",
    label: "Audit Log",
    icon: History,
    description: "Lihat riwayat perubahan data: nilai, presensi, rapor, akun.",
  },
];

export function SettingsTabs() {
  const [active, setActive] = useState<TabId>("profile");
  const activeTab = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <div className="space-y-5">
      <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <button
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 text-left transition",
                isActive
                  ? "border-[var(--primary)] bg-[var(--surface-soft)] shadow-sm"
                  : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--primary)]/40 hover:bg-[var(--surface-soft)]/60",
              )}
              key={tab.id}
              onClick={() => setActive(tab.id)}
              type="button"
            >
              <span
                className={cn(
                  "mt-0.5 grid size-9 shrink-0 place-items-center rounded-md",
                  isActive ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-soft)] text-[var(--primary)]",
                )}
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <p className={cn("font-bold", isActive ? "text-[var(--primary-strong)]" : "text-[var(--foreground)]")}>{tab.label}</p>
                <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">{tab.description}</p>
              </span>
            </button>
          );
        })}
      </nav>

      <p className="rounded-md bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
        Sedang membuka: <span className="font-semibold text-[var(--foreground)]">{activeTab.label}</span>
      </p>

      {active === "profile" ? <SchoolSettingsForm /> : null}
      {active === "academic" ? <AcademicSettings /> : null}
      {active === "rubric" ? <RubricSettings /> : null}
      {active === "audit" ? <AuditLogView /> : null}
    </div>
  );
}
