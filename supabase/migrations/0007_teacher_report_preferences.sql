-- =============================================================
-- Migration 0007: Preferensi rapor per guru
-- =============================================================
-- Setiap guru/koordinator punya preferensi sendiri untuk:
--   - Default catatan rapor (note template)
--   - Default keterangan target Tahfizul Quran (kelas, semester, range surat)
--   - Default 4 baris keterangan predikat (range + label + deskripsi)
--
-- Disimpan per profile_id (auth user) sehingga guru A dan guru B punya
-- default berbeda saat membuka halaman Rapor.

create table if not exists public.teacher_report_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  -- Catatan default rapor (boleh berbeda per guru).
  default_note text,
  -- Target Tahfizul Quran.
  default_target_class text,
  default_target_semester text,
  default_target_surah_range text,
  -- 4 baris keterangan predikat. Disimpan sebagai JSON array of
  -- { range: string, label: string, description: string, italic_label: boolean }.
  -- Contoh:
  --   [{"range":"≥ 95","label":"Mumtaz","description":"Sempurna","italic_label":true},
  --    {"range":"90-94,9","label":"Jayyid Jiddan","description":"Baik Sekali","italic_label":true},
  --    ...]
  predicate_descriptions jsonb default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.teacher_report_preferences enable row level security;

-- Tiap user hanya boleh baca + tulis preferensi miliknya sendiri.
-- Admin/koordinator boleh baca punya orang lain (untuk debugging/support), tapi tidak menulis.
drop policy if exists "user own preferences" on public.teacher_report_preferences;
create policy "user own preferences"
on public.teacher_report_preferences for all
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "supervisor read preferences" on public.teacher_report_preferences;
create policy "supervisor read preferences"
on public.teacher_report_preferences for select
to authenticated
using (public.current_user_is_supervisor());

-- Audit log otomatis (memanfaatkan trigger generic dari migration 0006).
drop trigger if exists trg_audit_teacher_report_preferences on public.teacher_report_preferences;
create trigger trg_audit_teacher_report_preferences
after insert or update or delete on public.teacher_report_preferences
for each row execute function public.write_audit_log();
