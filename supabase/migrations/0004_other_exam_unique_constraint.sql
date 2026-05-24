alter table public.other_exam_scores
drop constraint if exists other_exam_scores_student_assessment_period_key;

alter table public.other_exam_scores
add constraint other_exam_scores_student_assessment_period_key
unique (student_id, assessment_type_id, academic_year_id, semester_id);
