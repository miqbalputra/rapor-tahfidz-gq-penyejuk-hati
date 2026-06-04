alter table public.semester_report_cards
add column if not exists attendance_sick integer not null default 0 check (attendance_sick >= 0),
add column if not exists attendance_permission integer not null default 0 check (attendance_permission >= 0),
add column if not exists attendance_absent integer not null default 0 check (attendance_absent >= 0);
