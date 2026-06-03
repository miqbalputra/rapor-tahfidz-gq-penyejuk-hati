create table if not exists public.semester_report_cards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  report_date date not null default current_date,
  jilid text not null default '',
  reading_type text not null default 'Baca Tartili',
  target_juz text not null default '',
  target_surah text not null default '',
  target_description text not null default '',
  tested_surahs jsonb not null default '[]'::jsonb,
  personality_teacher text not null default '-',
  personality_friend text not null default '-',
  neatness text not null default '-',
  discipline text not null default '-',
  description_result text not null default 'Tercapai' check (description_result in ('Tidak Tercapai', 'Tercapai', 'Melampaui')),
  custom_description text,
  homeroom_teacher_name text not null default '',
  coordinator_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, academic_year_id, semester_id)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

alter table public.semester_report_cards enable row level security;

drop policy if exists "scoped read semester reports" on public.semester_report_cards;
create policy "scoped read semester reports"
on public.semester_report_cards for select
to authenticated
using (public.current_user_can_access_student(student_id, academic_year_id, semester_id));

drop policy if exists "scoped manage semester reports" on public.semester_report_cards;
create policy "scoped manage semester reports"
on public.semester_report_cards for all
to authenticated
using (public.current_user_can_access_student(student_id, academic_year_id, semester_id))
with check (public.current_user_can_access_student(student_id, academic_year_id, semester_id));

drop trigger if exists trg_touch_semester_report_cards_updated_at on public.semester_report_cards;
create trigger trg_touch_semester_report_cards_updated_at
before update on public.semester_report_cards
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_audit_semester_report_cards on public.semester_report_cards;
create trigger trg_audit_semester_report_cards
after insert or update or delete on public.semester_report_cards
for each row execute function public.write_audit_log();

insert into public.assessment_types (code, name, max_score, total_formula, version, is_active)
select 'tayamum', 'Tayamum', 100, 'manual', 1, true
where not exists (
  select 1 from public.assessment_types where code = 'tayamum'
);

insert into public.assessment_types (code, name, max_score, total_formula, version, is_active)
select 'shalat_jenazah', 'Shalat Jenazah', 100, 'manual', 1, true
where not exists (
  select 1 from public.assessment_types where code = 'shalat_jenazah'
);
