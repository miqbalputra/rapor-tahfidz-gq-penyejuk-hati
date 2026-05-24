import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type AppSettings = {
  institution_name: string;
  institution_address: string;
  logo_url: string | null;
  default_coordinator_name: string;
  default_homeroom_name: string;
  default_report_note: string;
  report_target_text: string;
};

export const fallbackSettings: AppSettings = {
  institution_name: "GRIYA QUR'AN PENYEJUK HATI PURBALINGGA",
  institution_address:
    "Jl. Kopral Sujono RT 01 RW 02, Desa Cipaku, Kecamatan Mrebet, Kabupaten Purbalingga, Jawa Tengah",
  logo_url: null,
  default_coordinator_name: "Maulidin Nafsir",
  default_homeroom_name: "Maulidin Nafsir",
  default_report_note:
    "Alhamdulillah, sampai akhir semester ini ananda telah melampaui target hafalan dan telah mengikuti program ujian juziyyah. Besar harapan ustadz agar ananda mampu mempertahankan prestasi yang sudah baik dan istiqomah dalam muroja'ah hafalan. Semoga ananda sukses selalu.",
  report_target_text:
    "Target Tahfizul Quran Kelas 4 Semester I adalah Surat An-Nas s.d 'Abasa",
};

export async function fetchSettings(): Promise<AppSettings> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return fallbackSettings;

  const { data } = await supabase
    .from("settings")
    .select(
      "institution_name, institution_address, logo_url, default_coordinator_name, default_homeroom_name, default_report_note, report_target_text",
    )
    .eq("id", true)
    .maybeSingle();

  if (!data) return fallbackSettings;
  return {
    institution_name: data.institution_name ?? fallbackSettings.institution_name,
    institution_address: data.institution_address ?? fallbackSettings.institution_address,
    logo_url: data.logo_url ?? null,
    default_coordinator_name: data.default_coordinator_name ?? fallbackSettings.default_coordinator_name,
    default_homeroom_name: data.default_homeroom_name ?? fallbackSettings.default_homeroom_name,
    default_report_note: data.default_report_note ?? fallbackSettings.default_report_note,
    report_target_text: data.report_target_text ?? fallbackSettings.report_target_text,
  };
}
