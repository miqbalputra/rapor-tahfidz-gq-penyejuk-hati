"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type SchoolSettings = {
  institution_name: string;
  short_name: string;
  address: string;
  logo_url: string | null;
  default_coordinator_name: string;
  default_homeroom_name: string;
  default_report_date: string | null;
  default_report_note: string;
};

export type ActivePeriod = {
  academic_year_id: string | null;
  academic_year_name: string;
  semester_id: string | null;
  semester_name: string;
};

const fallbackSettings: SchoolSettings = {
  institution_name: "GRIYA QUR'AN PENYEJUK HATI PURBALINGGA",
  short_name: "GQ Penyejuk Hati",
  address: "Jl. Kopral Sujono RT 01 RW 02, Desa Cipaku, Kecamatan Mrebet, Kabupaten Purbalingga, Jawa Tengah",
  logo_url: null,
  default_coordinator_name: "Maulidin Nafsir",
  default_homeroom_name: "Maulidin Nafsir",
  default_report_date: null,
  default_report_note:
    "Alhamdulillah, sampai akhir semester ini ananda telah melampaui target hafalan dan telah mengikuti program ujian juziyyah. Besar harapan ustadz agar ananda mampu mempertahankan prestasi yang sudah baik dan istiqomah dalam muroja'ah hafalan. Semoga ananda sukses selalu.",
};

const fallbackPeriod: ActivePeriod = {
  academic_year_id: null,
  academic_year_name: "2025/2026",
  semester_id: null,
  semester_name: "II (Genap)",
};

export function useSchoolSettings() {
  const [settings, setSettings] = useState<SchoolSettings>(fallbackSettings);
  const [period, setPeriod] = useState<ActivePeriod>(fallbackPeriod);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [settingsRes, yearRes, semesterRes] = await Promise.all([
      supabase.from("school_settings").select("*").eq("id", "default").maybeSingle(),
      supabase.from("academic_years").select("id,name,is_active").eq("is_active", true).maybeSingle(),
      supabase.from("semesters").select("id,name,academic_year_id,is_active").eq("is_active", true).maybeSingle(),
    ]);

    if (!settingsRes.error && settingsRes.data) {
      setSettings({
        institution_name: settingsRes.data.institution_name ?? fallbackSettings.institution_name,
        short_name: settingsRes.data.short_name ?? fallbackSettings.short_name,
        address: settingsRes.data.address ?? fallbackSettings.address,
        logo_url: settingsRes.data.logo_url ?? null,
        default_coordinator_name: settingsRes.data.default_coordinator_name ?? fallbackSettings.default_coordinator_name,
        default_homeroom_name: settingsRes.data.default_homeroom_name ?? fallbackSettings.default_homeroom_name,
        default_report_date: settingsRes.data.default_report_date ?? null,
        default_report_note: settingsRes.data.default_report_note ?? fallbackSettings.default_report_note,
      });
    }

    setPeriod({
      academic_year_id: yearRes.data?.id ?? null,
      academic_year_name: yearRes.data?.name ?? fallbackPeriod.academic_year_name,
      semester_id: semesterRes.data?.id ?? null,
      semester_name: semesterRes.data?.name ?? fallbackPeriod.semester_name,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { settings, period, loading, reload };
}
