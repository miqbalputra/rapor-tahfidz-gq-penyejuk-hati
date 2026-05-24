"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type PredicateDescription = {
  range: string;
  label: string;
  description: string;
  italic_label: boolean;
};

export type ReportPreferences = {
  default_note: string | null;
  default_target_class: string | null;
  default_target_semester: string | null;
  default_target_surah_range: string | null;
  predicate_descriptions: PredicateDescription[];
};

export const FALLBACK_PREDICATE_DESCRIPTIONS: PredicateDescription[] = [
  { range: "≥ 95", label: "Mumtaz", description: "Sempurna", italic_label: true },
  { range: "90-94,9", label: "Jayyid Jiddan", description: "Baik Sekali", italic_label: true },
  { range: "86-89,9", label: "Jayyid", description: "Baik", italic_label: false },
  { range: "≤ 85", label: "Maqbul", description: "Cukup", italic_label: true },
];

const emptyPreferences: ReportPreferences = {
  default_note: null,
  default_target_class: null,
  default_target_semester: null,
  default_target_surah_range: null,
  predicate_descriptions: [],
};

/**
 * Hook untuk akses preferensi rapor milik user yang sedang login.
 * Tiap guru/admin punya preferensi sendiri:
 *   - Default catatan rapor
 *   - Default keterangan target Tahfizul Quran (kelas, semester, range surat)
 *   - Default 4 baris keterangan predikat
 *
 * Preferensi dimuat sekali saat komponen mount, lalu bisa di-save ulang
 * lewat `savePreferences()`.
 */
export function useReportPreferences() {
  const [preferences, setPreferences] = useState<ReportPreferences>(emptyPreferences);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoaded(true);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoaded(true);
      return;
    }

    const { data, error } = await supabase
      .from("teacher_report_preferences")
      .select("*")
      .eq("profile_id", userData.user.id)
      .maybeSingle();

    if (error || !data) {
      setLoaded(true);
      return;
    }

    setPreferences({
      default_note: data.default_note ?? null,
      default_target_class: data.default_target_class ?? null,
      default_target_semester: data.default_target_semester ?? null,
      default_target_surah_range: data.default_target_surah_range ?? null,
      predicate_descriptions: Array.isArray(data.predicate_descriptions)
        ? (data.predicate_descriptions as PredicateDescription[])
        : [],
    });
    setLoaded(true);
  }, []);

  const savePreferences = useCallback(async (next: ReportPreferences) => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return { success: false, message: "Supabase belum siap." };

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { success: false, message: "Anda harus login untuk menyimpan preferensi." };

    setSaving(true);
    const { error } = await supabase.from("teacher_report_preferences").upsert(
      {
        profile_id: userData.user.id,
        default_note: next.default_note,
        default_target_class: next.default_target_class,
        default_target_semester: next.default_target_semester,
        default_target_surah_range: next.default_target_surah_range,
        predicate_descriptions: next.predicate_descriptions,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    );
    setSaving(false);

    if (error) return { success: false, message: error.message };

    setPreferences(next);
    return { success: true };
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { preferences, loaded, saving, reload, savePreferences };
}
