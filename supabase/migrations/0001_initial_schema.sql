create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'koordinator', 'guru', 'wali_kelas', 'viewer')),
  teacher_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  title text,
  phone text,
  email text,
  signature_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_teacher_id_fkey foreign key (teacher_id) references public.teachers(id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  nis text unique,
  full_name text not null,
  nickname text,
  gender text not null check (gender in ('male', 'female')),
  birth_place text,
  birth_date date,
  guardian_name text,
  guardian_phone text,
  address text,
  status text not null default 'active' check (status in ('active', 'inactive', 'graduated', 'transferred')),
  created_at timestamptz not null default now()
);

create unique index students_full_name_gender_unique
on public.students (full_name, gender);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  is_active boolean not null default false,
  unique (academic_year_id, name)
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_name text not null,
  level text,
  unique (name)
);

create table public.halaqohs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_id uuid references public.classes(id),
  gender text not null check (gender in ('male', 'female', 'mixed')),
  academic_year_id uuid not null references public.academic_years(id),
  semester_id uuid not null references public.semesters(id),
  teacher_id uuid references public.teachers(id),
  start_time time,
  end_time time,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index halaqohs_unique_period
on public.halaqohs (name, class_id, teacher_id, academic_year_id, semester_id, start_time, end_time);

create table public.student_halaqohs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  halaqoh_id uuid not null references public.halaqohs(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id),
  semester_id uuid not null references public.semesters(id),
  joined_at date,
  left_at date,
  is_active boolean not null default true,
  unique (student_id, halaqoh_id, academic_year_id, semester_id)
);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  halaqoh_id uuid not null references public.halaqohs(id) on delete cascade,
  session_date date not null,
  topic text,
  locked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (halaqoh_id, session_date)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null check (status in ('present', 'absent', 'permission', 'sick')),
  note text,
  unique (session_id, student_id)
);

create table public.surahs (
  id uuid primary key default gen_random_uuid(),
  juz int not null check (juz in (29, 30)),
  sort_order int not null,
  name_latin text not null,
  name_arabic text,
  show_in_report boolean not null default true,
  unique (juz, sort_order)
);

create table public.assessment_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  max_score numeric(6,2) not null,
  total_formula text not null default 'sum' check (total_formula in ('sum', 'average', 'manual')),
  passing_min_score numeric(6,2),
  max_fluency_mistakes int,
  applies_to_report boolean not null default false,
  version int not null default 1,
  is_active boolean not null default true
);

create table public.assessment_components (
  id uuid primary key default gen_random_uuid(),
  assessment_type_id uuid not null references public.assessment_types(id) on delete cascade,
  parent_component_id uuid references public.assessment_components(id) on delete cascade,
  code text not null,
  name text not null,
  max_score numeric(6,2) not null,
  input_mode text not null default 'direct_score' check (input_mode in ('direct_score', 'mistake_deduction', 'per_item')),
  deduction_per_mistake numeric(6,2),
  is_required boolean not null default true,
  sort_order int not null default 0,
  unique (assessment_type_id, code)
);

create table public.assessment_rules (
  id uuid primary key default gen_random_uuid(),
  assessment_type_id uuid not null references public.assessment_types(id) on delete cascade,
  rule_key text not null,
  rule_value jsonb not null default '{}'::jsonb,
  version int not null default 1,
  is_active boolean not null default true,
  unique (assessment_type_id, rule_key, version)
);

create table public.predicate_rules (
  id uuid primary key default gen_random_uuid(),
  assessment_type_id uuid references public.assessment_types(id) on delete cascade,
  min_score numeric(6,2),
  max_score numeric(6,2),
  label text not null,
  description text,
  sort_order int not null default 0
);

create table public.tahfidz_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  surah_id uuid not null references public.surahs(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id),
  semester_id uuid not null references public.semesters(id),
  fluency_mistakes int,
  fluency_score numeric(6,2) not null default 0,
  fashohah_score numeric(6,2) not null default 0,
  tajwid_score numeric(6,2) not null default 0,
  total_score numeric(6,2) not null default 0,
  passed boolean not null default false,
  note text,
  assessed_by uuid references public.teachers(id),
  assessment_type_id uuid references public.assessment_types(id),
  assessment_version int not null default 1,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, surah_id, academic_year_id, semester_id)
);

create table public.juziyah_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  juz int not null check (juz in (29, 30)),
  academic_year_id uuid not null references public.academic_years(id),
  semester_id uuid not null references public.semesters(id),
  fluency_score numeric(6,2) not null default 0,
  fashohah_score numeric(6,2) not null default 0,
  tajwid_score numeric(6,2) not null default 0,
  average_score numeric(6,2) not null default 0,
  predicate text,
  note text,
  assessed_by uuid references public.teachers(id),
  assessment_type_id uuid references public.assessment_types(id),
  assessment_version int not null default 1,
  locked_at timestamptz,
  unique (student_id, juz, academic_year_id, semester_id)
);

create table public.other_exam_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  assessment_type_id uuid not null references public.assessment_types(id),
  academic_year_id uuid not null references public.academic_years(id),
  semester_id uuid not null references public.semesters(id),
  payload jsonb not null default '{}'::jsonb,
  total_score numeric(6,2) not null default 0,
  predicate text,
  note text,
  assessed_by uuid references public.teachers(id),
  assessment_version int not null default 1,
  locked_at timestamptz
);

create table public.report_cards (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  juz int not null check (juz in (29, 30)),
  academic_year_id uuid not null references public.academic_years(id),
  semester_id uuid not null references public.semesters(id),
  report_date date not null,
  note text not null default '',
  coordinator_name text not null default '',
  homeroom_teacher_name text not null default '',
  status text not null default 'draft' check (status in ('draft', 'waiting_validation', 'needs_revision', 'validated', 'printed')),
  pdf_url text,
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, juz, academic_year_id, semester_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.academic_years enable row level security;
alter table public.semesters enable row level security;
alter table public.classes enable row level security;
alter table public.halaqohs enable row level security;
alter table public.student_halaqohs enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.surahs enable row level security;
alter table public.assessment_types enable row level security;
alter table public.assessment_components enable row level security;
alter table public.assessment_rules enable row level security;
alter table public.predicate_rules enable row level security;
alter table public.tahfidz_scores enable row level security;
alter table public.juziyah_scores enable row level security;
alter table public.other_exam_scores enable row level security;
alter table public.report_cards enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

create policy "read authenticated profiles"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.current_user_role() in ('admin', 'koordinator'));

create policy "admin manage profiles"
on public.profiles for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "authenticated read reference data"
on public.teachers for select
to authenticated
using (true);

create policy "admin coordinator manage teachers"
on public.teachers for all
to authenticated
using (public.current_user_role() in ('admin', 'koordinator'))
with check (public.current_user_role() in ('admin', 'koordinator'));

create policy "authenticated read operational data"
on public.students for select
to authenticated
using (true);

create policy "admin coordinator manage students"
on public.students for all
to authenticated
using (public.current_user_role() in ('admin', 'koordinator'))
with check (public.current_user_role() in ('admin', 'koordinator'));

create policy "authenticated read all academic settings"
on public.academic_years for select to authenticated using (true);
create policy "authenticated read all semesters"
on public.semesters for select to authenticated using (true);
create policy "authenticated read all classes"
on public.classes for select to authenticated using (true);
create policy "authenticated read all halaqohs"
on public.halaqohs for select to authenticated using (true);
create policy "authenticated read all assignments"
on public.student_halaqohs for select to authenticated using (true);
create policy "authenticated read all surahs"
on public.surahs for select to authenticated using (true);
create policy "authenticated read rubrics"
on public.assessment_types for select to authenticated using (true);
create policy "authenticated read components"
on public.assessment_components for select to authenticated using (true);
create policy "authenticated read rules"
on public.assessment_rules for select to authenticated using (true);
create policy "authenticated read predicates"
on public.predicate_rules for select to authenticated using (true);

create policy "admin coordinator manage academic settings"
on public.academic_years for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator'))
with check (public.current_user_role() in ('admin', 'koordinator'));

create policy "admin coordinator manage semesters"
on public.semesters for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator'))
with check (public.current_user_role() in ('admin', 'koordinator'));

create policy "admin coordinator manage classes"
on public.classes for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator'))
with check (public.current_user_role() in ('admin', 'koordinator'));

create policy "admin coordinator manage halaqohs"
on public.halaqohs for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator'))
with check (public.current_user_role() in ('admin', 'koordinator'));

create policy "admin coordinator manage student assignments"
on public.student_halaqohs for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator'))
with check (public.current_user_role() in ('admin', 'koordinator'));

create policy "admin coordinator manage rubrics"
on public.assessment_types for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator'))
with check (public.current_user_role() in ('admin', 'koordinator'));

create policy "admin coordinator manage rubric components"
on public.assessment_components for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator'))
with check (public.current_user_role() in ('admin', 'koordinator'));

create policy "admin coordinator manage assessment rules"
on public.assessment_rules for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator'))
with check (public.current_user_role() in ('admin', 'koordinator'));

create policy "admin coordinator manage predicate rules"
on public.predicate_rules for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator'))
with check (public.current_user_role() in ('admin', 'koordinator'));

create policy "authenticated read scores and reports"
on public.tahfidz_scores for select to authenticated using (true);
create policy "authenticated read juziyah"
on public.juziyah_scores for select to authenticated using (true);
create policy "authenticated read other exams"
on public.other_exam_scores for select to authenticated using (true);
create policy "authenticated read reports"
on public.report_cards for select to authenticated using (true);
create policy "authenticated read attendance sessions"
on public.attendance_sessions for select to authenticated using (true);
create policy "authenticated read attendance records"
on public.attendance_records for select to authenticated using (true);

create policy "staff manage attendance"
on public.attendance_sessions for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator', 'guru'))
with check (public.current_user_role() in ('admin', 'koordinator', 'guru'));

create policy "staff manage attendance records"
on public.attendance_records for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator', 'guru'))
with check (public.current_user_role() in ('admin', 'koordinator', 'guru'));

create policy "staff manage tahfidz scores"
on public.tahfidz_scores for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator', 'guru'))
with check (public.current_user_role() in ('admin', 'koordinator', 'guru'));

create policy "staff manage juziyah scores"
on public.juziyah_scores for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator', 'guru'))
with check (public.current_user_role() in ('admin', 'koordinator', 'guru'));

create policy "staff manage other exam scores"
on public.other_exam_scores for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator', 'guru'))
with check (public.current_user_role() in ('admin', 'koordinator', 'guru'));

create policy "coordinator manage reports"
on public.report_cards for all to authenticated
using (public.current_user_role() in ('admin', 'koordinator', 'wali_kelas'))
with check (public.current_user_role() in ('admin', 'koordinator', 'wali_kelas'));

create policy "admin coordinator read audit logs"
on public.audit_logs for select to authenticated
using (public.current_user_role() in ('admin', 'koordinator'));
