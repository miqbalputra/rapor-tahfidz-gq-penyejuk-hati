-- =============================================================
-- Migration 0006: Profil Lembaga, Audit Log otomatis, Locking
-- =============================================================
--
-- 1. Tabel school_settings (singleton row, id = 'default')
--    Menyimpan profil lembaga, koordinator default, dan tanggal default rapor.
-- 2. Trigger audit log untuk tabel sensitif (nilai, presensi, rapor, akun).
-- 3. Enforcement locking pada tabel nilai/presensi/rapor:
--    - Jika locked_at tidak null, hanya admin/koordinator yang boleh update/delete.
--    - report_cards: jika status validated/printed, hanya admin/koordinator
--      yang boleh mengubah.

-- =============================================================
-- 1. school_settings
-- =============================================================
create table if not exists public.school_settings (
  id text primary key default 'default',
  institution_name text not null default 'GRIYA QUR''AN PENYEJUK HATI PURBALINGGA',
  short_name text not null default 'GQ Penyejuk Hati',
  address text not null default 'Jl. Kopral Sujono RT 01 RW 02, Desa Cipaku, Kecamatan Mrebet, Kabupaten Purbalingga, Jawa Tengah',
  logo_url text,
  default_coordinator_name text not null default 'Maulidin Nafsir',
  default_homeroom_name text not null default 'Maulidin Nafsir',
  default_report_date date,
  default_report_note text not null default 'Alhamdulillah, sampai akhir semester ini ananda telah melampaui target hafalan dan telah mengikuti program ujian juziyyah. Besar harapan ustadz agar ananda mampu mempertahankan prestasi yang sudah baik dan istiqomah dalam muroja''ah hafalan. Semoga ananda sukses selalu.',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint school_settings_singleton check (id = 'default')
);

insert into public.school_settings (id) values ('default') on conflict (id) do nothing;

alter table public.school_settings enable row level security;

drop policy if exists "authenticated read school settings" on public.school_settings;
create policy "authenticated read school settings"
on public.school_settings for select
to authenticated
using (public.current_user_role() is not null);

drop policy if exists "admin manage school settings" on public.school_settings;
create policy "admin manage school settings"
on public.school_settings for all
to authenticated
using (public.current_user_role() in ('admin', 'koordinator'))
with check (public.current_user_role() in ('admin', 'koordinator'));

-- =============================================================
-- 2. Audit log otomatis via trigger
-- =============================================================
create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  entity_uuid uuid;
  before_data jsonb;
  after_data jsonb;
begin
  if (tg_op = 'DELETE') then
    entity_uuid := (to_jsonb(old) ->> 'id')::uuid;
    before_data := to_jsonb(old);
    after_data := null;
  elsif (tg_op = 'INSERT') then
    entity_uuid := (to_jsonb(new) ->> 'id')::uuid;
    before_data := null;
    after_data := to_jsonb(new);
  else
    entity_uuid := (to_jsonb(new) ->> 'id')::uuid;
    before_data := to_jsonb(old);
    after_data := to_jsonb(new);
  end if;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, before, after)
  values (
    auth.uid(),
    tg_table_name,
    entity_uuid,
    lower(tg_op),
    before_data,
    after_data
  );

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

-- Lampirkan trigger ke tabel sensitif. drop dulu jika sudah ada agar idempotent.
do $$
declare
  target_table text;
begin
  for target_table in
    select unnest(array[
      'tahfidz_scores',
      'juziyah_scores',
      'other_exam_scores',
      'attendance_sessions',
      'attendance_records',
      'report_cards',
      'profiles',
      'school_settings',
      'assessment_types',
      'assessment_components',
      'assessment_rules',
      'predicate_rules'
    ])
  loop
    execute format('drop trigger if exists trg_audit_%I on public.%I', target_table, target_table);
    execute format(
      'create trigger trg_audit_%I after insert or update or delete on public.%I for each row execute function public.write_audit_log()',
      target_table,
      target_table
    );
  end loop;
end $$;

-- =============================================================
-- 3. Locking enforcement
-- =============================================================
-- Helper: cek apakah user adalah admin/koordinator (boleh menerobos lock)
create or replace function public.current_user_is_supervisor()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'koordinator');
$$;

-- Tahfidz scores: jika locked_at not null, hanya supervisor yang boleh ubah
drop policy if exists "scoped manage tahfidz scores" on public.tahfidz_scores;
create policy "scoped manage tahfidz scores"
on public.tahfidz_scores for all
to authenticated
using (
  public.current_user_can_access_student(student_id, academic_year_id, semester_id)
  and (locked_at is null or public.current_user_is_supervisor())
)
with check (
  public.current_user_can_access_student(student_id, academic_year_id, semester_id)
  and (locked_at is null or public.current_user_is_supervisor())
);

-- Juziyah scores
drop policy if exists "scoped manage juziyah scores" on public.juziyah_scores;
create policy "scoped manage juziyah scores"
on public.juziyah_scores for all
to authenticated
using (
  public.current_user_can_access_student(student_id, academic_year_id, semester_id)
  and (locked_at is null or public.current_user_is_supervisor())
)
with check (
  public.current_user_can_access_student(student_id, academic_year_id, semester_id)
  and (locked_at is null or public.current_user_is_supervisor())
);

-- Other exam scores
drop policy if exists "scoped manage other exam scores" on public.other_exam_scores;
create policy "scoped manage other exam scores"
on public.other_exam_scores for all
to authenticated
using (
  public.current_user_can_access_student(student_id, academic_year_id, semester_id)
  and (locked_at is null or public.current_user_is_supervisor())
)
with check (
  public.current_user_can_access_student(student_id, academic_year_id, semester_id)
  and (locked_at is null or public.current_user_is_supervisor())
);

-- Attendance sessions: lock pakai locked_at
drop policy if exists "scoped manage attendance sessions" on public.attendance_sessions;
create policy "scoped manage attendance sessions"
on public.attendance_sessions for all
to authenticated
using (
  (
    public.current_user_role() in ('admin', 'koordinator', 'wali_kelas')
    or exists (
      select 1
      from public.halaqohs h
      where h.id = halaqoh_id
        and h.teacher_id = public.current_user_teacher_id()
    )
  )
  and (locked_at is null or public.current_user_is_supervisor())
)
with check (
  (
    public.current_user_role() in ('admin', 'koordinator', 'wali_kelas')
    or exists (
      select 1
      from public.halaqohs h
      where h.id = halaqoh_id
        and h.teacher_id = public.current_user_teacher_id()
    )
  )
  and (locked_at is null or public.current_user_is_supervisor())
);

-- Attendance records: ikut lock dari sesi parent
drop policy if exists "scoped manage attendance records" on public.attendance_records;
create policy "scoped manage attendance records"
on public.attendance_records for all
to authenticated
using (
  (
    public.current_user_role() in ('admin', 'koordinator', 'wali_kelas')
    or exists (
      select 1
      from public.attendance_sessions s
      join public.halaqohs h on h.id = s.halaqoh_id
      where s.id = session_id
        and h.teacher_id = public.current_user_teacher_id()
    )
  )
  and (
    not exists (
      select 1 from public.attendance_sessions s
      where s.id = session_id and s.locked_at is not null
    )
    or public.current_user_is_supervisor()
  )
)
with check (
  (
    public.current_user_role() in ('admin', 'koordinator', 'wali_kelas')
    or exists (
      select 1
      from public.attendance_sessions s
      join public.halaqohs h on h.id = s.halaqoh_id
      where s.id = session_id
        and h.teacher_id = public.current_user_teacher_id()
    )
  )
  and (
    not exists (
      select 1 from public.attendance_sessions s
      where s.id = session_id and s.locked_at is not null
    )
    or public.current_user_is_supervisor()
  )
);

-- Report cards: jika status validated atau printed, hanya supervisor yang boleh ubah
drop policy if exists "scoped manage reports" on public.report_cards;
create policy "scoped manage reports"
on public.report_cards for all
to authenticated
using (
  public.current_user_can_access_student(student_id, academic_year_id, semester_id)
  and (status not in ('validated', 'printed') or public.current_user_is_supervisor())
)
with check (
  public.current_user_can_access_student(student_id, academic_year_id, semester_id)
  and (status not in ('validated', 'printed') or public.current_user_is_supervisor())
);
