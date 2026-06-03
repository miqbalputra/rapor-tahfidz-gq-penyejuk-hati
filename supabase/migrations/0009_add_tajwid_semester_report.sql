alter table public.semester_report_cards
add column if not exists show_tajwid boolean not null default false;

insert into public.assessment_types (code, name, max_score, total_formula, version, is_active)
select 'tajwid', 'Tajwid', 100, 'manual', 1, true
where not exists (
  select 1 from public.assessment_types where code = 'tajwid'
);
