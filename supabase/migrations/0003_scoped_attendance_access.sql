drop policy if exists "authenticated read attendance sessions" on public.attendance_sessions;
drop policy if exists "authenticated read attendance records" on public.attendance_records;
drop policy if exists "staff manage attendance" on public.attendance_sessions;
drop policy if exists "staff manage attendance records" on public.attendance_records;

create policy "scoped read attendance sessions"
on public.attendance_sessions for select
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

create policy "scoped manage attendance sessions"
on public.attendance_sessions for all
to authenticated
using (
  public.current_user_role() in ('admin', 'koordinator', 'wali_kelas')
  or exists (
    select 1
    from public.halaqohs h
    where h.id = halaqoh_id
      and h.teacher_id = public.current_user_teacher_id()
  )
)
with check (
  public.current_user_role() in ('admin', 'koordinator', 'wali_kelas')
  or exists (
    select 1
    from public.halaqohs h
    where h.id = halaqoh_id
      and h.teacher_id = public.current_user_teacher_id()
  )
);

create policy "scoped read attendance records"
on public.attendance_records for select
to authenticated
using (
  public.current_user_role() in ('admin', 'koordinator', 'wali_kelas')
  or exists (
    select 1
    from public.attendance_sessions s
    join public.halaqohs h on h.id = s.halaqoh_id
    where s.id = session_id
      and h.teacher_id = public.current_user_teacher_id()
  )
);

create policy "scoped manage attendance records"
on public.attendance_records for all
to authenticated
using (
  public.current_user_role() in ('admin', 'koordinator', 'wali_kelas')
  or exists (
    select 1
    from public.attendance_sessions s
    join public.halaqohs h on h.id = s.halaqoh_id
    where s.id = session_id
      and h.teacher_id = public.current_user_teacher_id()
  )
)
with check (
  public.current_user_role() in ('admin', 'koordinator', 'wali_kelas')
  or exists (
    select 1
    from public.attendance_sessions s
    join public.halaqohs h on h.id = s.halaqoh_id
    where s.id = session_id
      and h.teacher_id = public.current_user_teacher_id()
  )
);
