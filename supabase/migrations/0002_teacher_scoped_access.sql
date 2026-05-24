create or replace function public.current_user_teacher_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select teacher_id
  from public.profiles
  where id = auth.uid()
    and is_active = true;
$$;

create or replace function public.current_user_can_access_student(
  target_student_id uuid,
  target_academic_year_id uuid default null,
  target_semester_id uuid default null
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    public.current_user_role() in ('admin', 'koordinator', 'wali_kelas')
    or exists (
      select 1
      from public.student_halaqohs sh
      join public.halaqohs h on h.id = sh.halaqoh_id
      where sh.student_id = target_student_id
        and sh.is_active = true
        and h.teacher_id = public.current_user_teacher_id()
        and (target_academic_year_id is null or sh.academic_year_id = target_academic_year_id)
        and (target_semester_id is null or sh.semester_id = target_semester_id)
    );
$$;

drop policy if exists "authenticated read operational data" on public.students;
drop policy if exists "authenticated read all halaqohs" on public.halaqohs;
drop policy if exists "authenticated read all assignments" on public.student_halaqohs;
drop policy if exists "authenticated read scores and reports" on public.tahfidz_scores;
drop policy if exists "authenticated read juziyah" on public.juziyah_scores;
drop policy if exists "authenticated read other exams" on public.other_exam_scores;
drop policy if exists "authenticated read reports" on public.report_cards;
drop policy if exists "staff manage tahfidz scores" on public.tahfidz_scores;
drop policy if exists "staff manage juziyah scores" on public.juziyah_scores;
drop policy if exists "staff manage other exam scores" on public.other_exam_scores;
drop policy if exists "coordinator manage reports" on public.report_cards;

create policy "scoped read students"
on public.students for select
to authenticated
using (
  public.current_user_role() in ('admin', 'koordinator', 'wali_kelas')
  or public.current_user_can_access_student(id)
);

create policy "scoped read halaqohs"
on public.halaqohs for select
to authenticated
using (
  public.current_user_role() in ('admin', 'koordinator', 'wali_kelas')
  or teacher_id = public.current_user_teacher_id()
);

create policy "scoped read assignments"
on public.student_halaqohs for select
to authenticated
using (
  public.current_user_role() in ('admin', 'koordinator', 'wali_kelas')
  or exists (
    select 1
    from public.halaqohs h
    where h.id = halaqoh_id
      and h.teacher_id = public.current_user_teacher_id()
  )
);

create policy "scoped read tahfidz scores"
on public.tahfidz_scores for select
to authenticated
using (public.current_user_can_access_student(student_id, academic_year_id, semester_id));

create policy "scoped manage tahfidz scores"
on public.tahfidz_scores for all
to authenticated
using (public.current_user_can_access_student(student_id, academic_year_id, semester_id))
with check (public.current_user_can_access_student(student_id, academic_year_id, semester_id));

create policy "scoped read juziyah scores"
on public.juziyah_scores for select
to authenticated
using (public.current_user_can_access_student(student_id, academic_year_id, semester_id));

create policy "scoped manage juziyah scores"
on public.juziyah_scores for all
to authenticated
using (public.current_user_can_access_student(student_id, academic_year_id, semester_id))
with check (public.current_user_can_access_student(student_id, academic_year_id, semester_id));

create policy "scoped read other exam scores"
on public.other_exam_scores for select
to authenticated
using (public.current_user_can_access_student(student_id, academic_year_id, semester_id));

create policy "scoped manage other exam scores"
on public.other_exam_scores for all
to authenticated
using (public.current_user_can_access_student(student_id, academic_year_id, semester_id))
with check (public.current_user_can_access_student(student_id, academic_year_id, semester_id));

create policy "scoped read reports"
on public.report_cards for select
to authenticated
using (public.current_user_can_access_student(student_id, academic_year_id, semester_id));

create policy "scoped manage reports"
on public.report_cards for all
to authenticated
using (public.current_user_can_access_student(student_id, academic_year_id, semester_id))
with check (public.current_user_can_access_student(student_id, academic_year_id, semester_id));
