drop policy if exists "authenticated read reference data" on public.teachers;
drop policy if exists "authenticated read all academic settings" on public.academic_years;
drop policy if exists "authenticated read all semesters" on public.semesters;
drop policy if exists "authenticated read all classes" on public.classes;
drop policy if exists "authenticated read all surahs" on public.surahs;
drop policy if exists "authenticated read rubrics" on public.assessment_types;
drop policy if exists "authenticated read components" on public.assessment_components;
drop policy if exists "authenticated read rules" on public.assessment_rules;
drop policy if exists "authenticated read predicates" on public.predicate_rules;

create policy "active profile read teachers"
on public.teachers for select
to authenticated
using (public.current_user_role() is not null);

create policy "active profile read academic years"
on public.academic_years for select
to authenticated
using (public.current_user_role() is not null);

create policy "active profile read semesters"
on public.semesters for select
to authenticated
using (public.current_user_role() is not null);

create policy "active profile read classes"
on public.classes for select
to authenticated
using (public.current_user_role() is not null);

create policy "active profile read surahs"
on public.surahs for select
to authenticated
using (public.current_user_role() is not null);

create policy "active profile read assessment types"
on public.assessment_types for select
to authenticated
using (public.current_user_role() is not null);

create policy "active profile read assessment components"
on public.assessment_components for select
to authenticated
using (public.current_user_role() is not null);

create policy "active profile read assessment rules"
on public.assessment_rules for select
to authenticated
using (public.current_user_role() is not null);

create policy "active profile read predicates"
on public.predicate_rules for select
to authenticated
using (public.current_user_role() is not null);
