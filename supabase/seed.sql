insert into public.academic_years (name, is_active)
values ('2025/2026', true)
on conflict (name) do nothing;

insert into public.semesters (academic_year_id, name, is_active)
select id, 'I (Gasal)', false from public.academic_years where name = '2025/2026'
on conflict (academic_year_id, name) do nothing;

insert into public.semesters (academic_year_id, name, is_active)
select id, 'II (Genap)', true from public.academic_years where name = '2025/2026'
on conflict (academic_year_id, name) do nothing;

insert into public.teachers (full_name, title, is_active)
values
  ('Yusuf Pujianto', 'Ustadz', true),
  ('Indah Muniarti', 'Ustadzah', true),
  ('Ghibtia Dhofa Valwa', 'Ustadzah', true),
  ('Hermawan', 'Ustadz', true),
  ('Maulidin Nafsir', 'Ustadz', true)
on conflict do nothing;

insert into public.classes (name, display_name, level)
values
  ('1.A', '1.A', '1'),
  ('1.B', '1.B', '1'),
  ('2.A', '2.A', '2'),
  ('2.B', '2.B', '2'),
  ('3.A', '3.A', '3'),
  ('3.B', '3.B', '3'),
  ('4.A', '4.A', '4'),
  ('4.B', '4.B', '4'),
  ('R.Pi', 'R.Pi', 'R.Pi')
on conflict (name) do nothing;

do $$
declare
  active_year_id uuid;
  active_semester_id uuid;
  item jsonb;
  student_name text;
  v_teacher public.teachers%rowtype;
  v_class public.classes%rowtype;
  v_halaqoh_id uuid;
  v_student_id uuid;
  seed_data jsonb := '[
    {"name":"Al Huda","class":"1.A","gender":"male","start":"15:30","end":"16:20","teacher":"Yusuf Pujianto","students":["Azril Nur Hidayat","Keander RayyanHerlandi","Kelvin Adnan Permana","Muhammad Denish Syauqi El Mahdi","Muhammad Syafiq Yudistira","Nohan Andreas Pradika"]},
    {"name":"Al-Huda","class":"1.A","gender":"male","start":"13:30","end":"14:30","teacher":"Indah Muniarti","students":["Denara Nada .P","Haidar Tiyan Nizam","Hanan Anandito","Huda Al Fatih","Usamah Raqila .Y"]},
    {"name":"At-Tanzil","class":"1.B","gender":"female","start":"15:30","end":"16:20","teacher":"Indah Muniarti","students":["Adiba Shaqilah","Anin Taqrim","Ansellma Sheika","Aretha Kanza","Azizah Putri N.","Fadiyah Syafiqoh","Farra Shhia N.","Lutfia Giza","Nawang Senja"]},
    {"name":"Al Furqon","class":"2.A","gender":"female","start":"14:00","end":"15:00","teacher":"Hermawan","students":["Adzkiya Althafunnisa","Alesha Nayla Putri","Alifia Yumna","Andhara kirana Mahestri","Najwa Kirania Oktavia","Nufah Nur Afifah","Sri Rahma Anggiyana. N","Tsabita Sofwa Nur Zahidah"]},
    {"name":"An-Nur","class":"2.B","gender":"female","start":"15:30","end":"16:20","teacher":"Ghibtia Dhofa Valwa","students":["Asyifah putri Ramadhani","Insyira Fauziah Ahmad","Kinaria Maurdha Alena","Marwa Ashafa","Naqiya Rofi''atul Aulia","Nur Riska Bela","Sabiya Nadhifah","Vioneta Rachmatya Rizki"]},
    {"name":"Al-Bayan","class":"3.A","gender":"male","start":"16:20","end":"17:10","teacher":"Yusuf Pujianto","students":["Abrisam Veldy Javas Wistara","Arya yoga Dwi Saputra","Azzam Abid Hanan","Gusti Putra Bramasta","Hafidz isya Ananta","Muhammad Arfi","Ziyan Dhiyaul Haq"]},
    {"name":"Al-Bayan","class":"3.A","gender":"male","start":"15:30","end":"16:20","teacher":"Maulidin Nafsir","students":["Abqari Annar Hadyan Pranaja","Al Khalifi Dzikra Faith","Anis Rahmat Nurrodja","Anung Hanindito Nareswara","Genji Yafiq Hamizan","Muhammad Ulul Azmi","Naafis Tian Ahir R"]},
    {"name":"Al-Bayan","class":"3.A","gender":"male","start":"15:30","end":"16:20","teacher":"Hermawan","students":["Aditiya Desta Maulana","Ata Fardhan Al Ghifari","Daryl Gibran Alvaro","Faqih Masaid Nurrodja","Muhammad Fikri","Muhammad Ukasyah uwais","Zivkan Akbar"]},
    {"name":"Ar-Rahmah","class":"3.B","gender":"female","start":"16:20","end":"17:10","teacher":"Maulidin Nafsir","students":["Aisya Syifa Alinarohman","Almira Aulia Salasa","Arfela Aliqa Dzahin","Asri Nurivah","Isna Aulia Rahmatika","Qiana Aysila Syafani","Siti Maisaroh"]},
    {"name":"Al-Mubin","class":"4.A","gender":"male","start":"16:20","end":"17:10","teacher":"Hermawan","students":["Ades Widianto","Bisma Dwi Haryanto","Haikal Ar-rahim","Hamba Ramadhana","Mafi Maulana","Muhammad Nur Faeyza","Tomi Puji Nurrohman","Toni Puji Nurrohim"]},
    {"name":"Asy-Syifa","class":"4.B","gender":"female","start":"16:20","end":"17:10","teacher":"Indah Muniarti","students":["Afifah Khoirunnisa Salsabila","Anna Nur Farizki","Asyla Aulia","Faiha Ardelia","Faizah Nur .R","Messi Kanza .A","Vesa Talita .R","Xasya Ufayroh"]},
    {"name":"Al-Hikmah","class":"R.Pi","gender":"female","start":"16:20","end":"17:10","teacher":"Ghibtia Dhofa Valwa","students":["Akilah Fabiana Clarissa","Aulia Nur Salsabila","Flora Oktavia","Hayfa Khanza Purnomo","Khansa Anindita Carissa","Salsabila izzatullatifah","Vanya Celena Naradita P","Wulan Purbodjati"]}
  ]'::jsonb;
begin
  select id into active_year_id from public.academic_years where name = '2025/2026';
  select id into active_semester_id from public.semesters where academic_year_id = active_year_id and name = 'II (Genap)';

  for item in select * from jsonb_array_elements(seed_data)
  loop
    select * into v_teacher from public.teachers where full_name = item->>'teacher' limit 1;
    select * into v_class from public.classes where name = item->>'class' limit 1;

    insert into public.halaqohs (name, class_id, gender, academic_year_id, semester_id, teacher_id, start_time, end_time, is_active)
    values (
      item->>'name',
      v_class.id,
      item->>'gender',
      active_year_id,
      active_semester_id,
      v_teacher.id,
      (item->>'start')::time,
      (item->>'end')::time,
      true
    )
    on conflict do nothing;

    select id into v_halaqoh_id
    from public.halaqohs
    where name = item->>'name'
      and class_id = v_class.id
      and teacher_id = v_teacher.id
      and academic_year_id = active_year_id
      and semester_id = active_semester_id
      and start_time = (item->>'start')::time
      and end_time = (item->>'end')::time
    limit 1;

    for student_name in select jsonb_array_elements_text(item->'students')
    loop
      insert into public.students (full_name, gender, status)
      values (student_name, item->>'gender', 'active')
      on conflict (full_name, gender) do nothing;

      select id into v_student_id
      from public.students
      where full_name = student_name and gender = item->>'gender'
      limit 1;

      insert into public.student_halaqohs (student_id, halaqoh_id, academic_year_id, semester_id, is_active)
      values (v_student_id, v_halaqoh_id, active_year_id, active_semester_id, true)
      on conflict (student_id, halaqoh_id, academic_year_id, semester_id) do nothing;
    end loop;
  end loop;
end $$;

insert into public.surahs (juz, sort_order, name_latin, name_arabic, show_in_report)
values
  (29, 1, 'Q.S Al-Mulk', 'Al-Mulk', true),
  (29, 2, 'Q.S Al-Qalam', 'Al-Qalam', true),
  (29, 3, 'Q.S Al-Haqqah', 'Al-Haqqah', true),
  (29, 4, 'Q.S Al-Ma''arij', 'Al-Ma''arij', true),
  (29, 5, 'Q.S Nuh', 'Nuh', true),
  (29, 6, 'Q.S Al-Jin', 'Al-Jin', true),
  (29, 7, 'Q.S Al-Muzzammil', 'Al-Muzzammil', true),
  (29, 8, 'Q.S Al-Muddatsir', 'Al-Muddatsir', true),
  (29, 9, 'Q.S Al-Qiyamah', 'Al-Qiyamah', true),
  (29, 10, 'Q.S Al-Insan', 'Al-Insan', true),
  (29, 11, 'Q.S Al-Mursalat', 'Al-Mursalat', true),
  (30, 1, 'Q.S An-Naba', 'An-Naba', true),
  (30, 2, 'Q.S An-Nazi''at', 'An-Nazi''at', true),
  (30, 3, 'Q.S ''Abasa', 'Abasa', true),
  (30, 4, 'Q.S At-Takwir', 'At-Takwir', true),
  (30, 5, 'Q.S Al-Infithar', 'Al-Infithar', true),
  (30, 6, 'Q.S Al-Muthaffifin', 'Al-Muthaffifin', true),
  (30, 7, 'Q.S Al-Insyiqaq', 'Al-Insyiqaq', true),
  (30, 8, 'Q.S Al-Buruj', 'Al-Buruj', true),
  (30, 9, 'Q.S At-Thariq', 'At-Thariq', true),
  (30, 10, 'Q.S Al-A''la', 'Al-A''la', true),
  (30, 11, 'Q.S Al-Ghasyiyah', 'Al-Ghasyiyah', true),
  (30, 12, 'Q.S Al-Fajr', 'Al-Fajr', true),
  (30, 13, 'Q.S Al-Balad', 'Al-Balad', true),
  (30, 14, 'Q.S Asy-Syams', 'Asy-Syams', true),
  (30, 15, 'Q.S Al-Lail', 'Al-Lail', true),
  (30, 16, 'Q.S Ad-Dhuha', 'Ad-Dhuha', true),
  (30, 17, 'Q.S Al-Insyirah', 'Al-Insyirah', true),
  (30, 18, 'Q.S At-Tin', 'At-Tin', true),
  (30, 19, 'Q.S Al-''Alaq', 'Al-''Alaq', true),
  (30, 20, 'Q.S Al-Qadr', 'Al-Qadr', true),
  (30, 21, 'Q.S Al-Bayyinah', 'Al-Bayyinah', true),
  (30, 22, 'Q.S Az-Zalzalah', 'Az-Zalzalah', true),
  (30, 23, 'Q.S Al-''Adiyat', 'Al-''Adiyat', true),
  (30, 24, 'Q.S Al-Qari''ah', 'Al-Qari''ah', true),
  (30, 25, 'Q.S At-Takatsur', 'At-Takatsur', true),
  (30, 26, 'Q.S Al-''Ashr', 'Al-''Ashr', true),
  (30, 27, 'Q.S Al-Humazah', 'Al-Humazah', true),
  (30, 28, 'Q.S Al-Fil', 'Al-Fil', true),
  (30, 29, 'Q.S Quraisy', 'Quraisy', true),
  (30, 30, 'Q.S Al-Ma''un', 'Al-Ma''un', true),
  (30, 31, 'Q.S Al-Kautsar', 'Al-Kautsar', true),
  (30, 32, 'Q.S Al-Kafirun', 'Al-Kafirun', true),
  (30, 33, 'Q.S An-Nasr', 'An-Nasr', true),
  (30, 34, 'Q.S Al-Lahab', 'Al-Lahab', true),
  (30, 35, 'Q.S Al-Ikhlas', 'Al-Ikhlas', true),
  (30, 36, 'Q.S Al-Falaq', 'Al-Falaq', true),
  (30, 37, 'Q.S An-Nas', 'An-Nas', true)
on conflict (juz, sort_order) do nothing;

insert into public.assessment_types (code, name, max_score, total_formula, passing_min_score, max_fluency_mistakes, applies_to_report, version, is_active)
values
  ('tahfidz_juz29', 'Tahfidz Juz 29', 100, 'sum', 85, 5, true, 1, true),
  ('tahfidz_juz30', 'Tahfidz Juz 30', 100, 'sum', 85, 5, true, 1, true),
  ('juziyah', 'Juziyah', 100, 'average', null, null, true, 1, true),
  ('tartili', 'Tartili', 100, 'sum', null, null, false, 1, true),
  ('doa', 'Doa', 90, 'sum', null, null, false, 1, true),
  ('hadits', 'Hadits', 90, 'sum', null, null, false, 1, true),
  ('wudhu', 'Wudhu', 90, 'sum', null, null, false, 1, true),
  ('sholat', 'Sholat', 90, 'sum', null, null, false, 1, true)
on conflict (code) do nothing;

insert into public.assessment_components (assessment_type_id, code, name, max_score, input_mode, deduction_per_mistake, is_required, sort_order)
select id, 'kelancaran', 'Kelancaran', 25, 'mistake_deduction', 1, true, 1 from public.assessment_types where code in ('tahfidz_juz29', 'tahfidz_juz30')
on conflict (assessment_type_id, code) do nothing;

insert into public.assessment_components (assessment_type_id, code, name, max_score, input_mode, is_required, sort_order)
select id, 'fashohah', 'Fashohah', 25, 'direct_score', true, 2 from public.assessment_types where code in ('tahfidz_juz29', 'tahfidz_juz30')
on conflict (assessment_type_id, code) do nothing;

insert into public.assessment_components (assessment_type_id, code, name, max_score, input_mode, is_required, sort_order)
select id, 'tajwid', 'Tajwid', 50, 'direct_score', true, 3 from public.assessment_types where code in ('tahfidz_juz29', 'tahfidz_juz30')
on conflict (assessment_type_id, code) do nothing;

insert into public.predicate_rules (assessment_type_id, min_score, max_score, label, description, sort_order)
select null, 95, 100, 'Mumtaz (Sempurna)', 'Sempurna', 1
where not exists (select 1 from public.predicate_rules where assessment_type_id is null and label = 'Mumtaz (Sempurna)');

insert into public.predicate_rules (assessment_type_id, min_score, max_score, label, description, sort_order)
select null, 90, 94.9, 'Jayyid Jiddan (Baik Sekali)', 'Baik Sekali', 2
where not exists (select 1 from public.predicate_rules where assessment_type_id is null and label = 'Jayyid Jiddan (Baik Sekali)');

insert into public.predicate_rules (assessment_type_id, min_score, max_score, label, description, sort_order)
select null, 86, 89.9, 'Jayyid (Baik)', 'Baik', 3
where not exists (select 1 from public.predicate_rules where assessment_type_id is null and label = 'Jayyid (Baik)');

insert into public.predicate_rules (assessment_type_id, min_score, max_score, label, description, sort_order)
select null, 0, 85, 'Maqbul (Cukup)', 'Cukup', 4
where not exists (select 1 from public.predicate_rules where assessment_type_id is null and label = 'Maqbul (Cukup)');
