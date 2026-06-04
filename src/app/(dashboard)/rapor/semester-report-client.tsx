"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpenCheck, CheckCircle2, Download, FileArchive, RefreshCw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { ContextBar } from "@/components/ui/context-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { HelpText } from "@/components/ui/help-text";
import { DataTable } from "@/components/ui/table";
import { Toast } from "@/components/ui/toast";
import { useSchoolSettings } from "@/lib/settings/use-school-settings";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SemesterReportPayload } from "@/lib/reports/semester-report-payload-schema";

type AcademicYearRow = { id: string; name: string; is_active: boolean };
type SemesterRow = { id: string; name: string; academic_year_id: string; is_active: boolean };
type StudentRow = { id: string; full_name: string; gender: "male" | "female" };
type UserProfileRow = { role: string; teacher_id: string | null; is_active: boolean };
type HalaqohRow = {
  id: string;
  name: string;
  academic_year_id: string;
  semester_id: string;
  is_active: boolean;
  classes: { name: string } | null;
  teachers: { id: string; full_name: string; title: string | null } | null;
};
type HalaqohQueryRow = Omit<HalaqohRow, "classes" | "teachers"> & {
  classes: { name: string }[] | { name: string } | null;
  teachers: { id: string; full_name: string; title: string | null }[] | { id: string; full_name: string; title: string | null } | null;
};
type AssignmentRow = { id: string; student_id: string; halaqoh_id: string; is_active: boolean; students: StudentRow | null };
type AssignmentQueryRow = Omit<AssignmentRow, "students"> & { students: { id: string; full_name: string; gender: "male" | "female" }[] | StudentRow | null };
type AssessmentTypeRow = { id: string; code: string; name: string; max_score: number; is_active: boolean };
type OtherExamScoreRow = {
  student_id: string;
  assessment_type_id: string;
  total_score: number;
  predicate: string | null;
  note: string | null;
};
type SemesterReportRow = {
  id: string;
  student_id: string;
  academic_year_id: string;
  semester_id: string;
  report_date: string;
  jilid: string;
  reading_type: string;
  target_juz: string;
  target_surah: string;
  target_description: string;
  tested_surahs: unknown;
  show_tajwid: boolean;
  attendance_sick: number;
  attendance_permission: number;
  attendance_absent: number;
  personality_teacher: string;
  personality_friend: string;
  neatness: string;
  discipline: string;
  description_result: "Tidak Tercapai" | "Tercapai" | "Melampaui";
  custom_description: string | null;
  homeroom_teacher_name: string;
  coordinator_name: string;
};
type TestedSurahDraft = { name: string; score: string };
type NoteMode = "template" | "custom";
type NoteTemplateRow = { indicator: SemesterReportFormState["description_result"]; description: string };
type SemesterReportFormState = {
  report_date: string;
  jilid: string;
  reading_type: string;
  target_juz: string;
  target_surah: string;
  target_description: string;
  tested_surahs: TestedSurahDraft[];
  show_tajwid: boolean;
  attendance_sick: string;
  attendance_permission: string;
  attendance_absent: string;
  personality_teacher: string;
  personality_friend: string;
  neatness: string;
  discipline: string;
  description_result: "Tidak Tercapai" | "Tercapai" | "Melampaui";
  custom_description: string;
  homeroom_teacher_name: string;
  coordinator_name: string;
};
type ReportCompleteness = {
  ready: boolean;
  blockingIssues: string[];
  warnings: string[];
};

const trackedAssessmentCodes = ["tartili", "wudhu", "sholat", "tayamum", "shalat_jenazah", "doa", "hadits", "tajwid"] as const;
const defaultNoteTemplates: NoteTemplateRow[] = [
  {
    indicator: "Tidak Tercapai",
    description:
      "Alhamdulillah, ananda telah mengikuti pembelajaran di semester ini. Ustadz berharap ananda bisa lebih semangat lagi dalam mengaji, memperbanyak latihan membaca dan menghafal, serta mulai mempraktikkan ilmu yang telah didapat. Sukses selalu untuk ananda. Barakallahufiikum.",
  },
  {
    indicator: "Tercapai",
    description:
      "Alhamdulillah, ananda telah mengikuti pembelajaran dengan baik di semester ini. Semoga istiqamah dalam mengaji, mengulang bacaan dan hafalan, serta semangat dalam mengamalkan ilmu yang telah dipelajari. Sukses selalu untuk ananda. Baarakallahu fiikum.",
  },
  {
    indicator: "Melampaui",
    description:
      "Alhamdulillah, ananda telah menunjukkan semangat yang sangat baik dalam mengikuti pembelajaran semester ini. Semoga terus meningkat dalam membaca, menghafal, dan mengamalkan ilmu yang telah dipelajari. Sukses selalu untuk ananda. Baarakallahu fiikum.",
  },
];

export function SemesterReportClient() {
  const { settings: schoolSettings, period: activePeriod } = useSchoolSettings();
  const [years, setYears] = useState<AcademicYearRow[]>([]);
  const [semesters, setSemesters] = useState<SemesterRow[]>([]);
  const [halaqohs, setHalaqohs] = useState<HalaqohRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentTypeRow[]>([]);
  const [reports, setReports] = useState<SemesterReportRow[]>([]);
  const [examScores, setExamScores] = useState<OtherExamScoreRow[]>([]);
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplateRow[]>(defaultNoteTemplates);
  const [noteMode, setNoteMode] = useState<NoteMode>("template");
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedHalaqohId, setSelectedHalaqohId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [form, setForm] = useState<SemesterReportFormState>(() => emptyForm());
  const [message, setMessage] = useState("Lengkapi data semester dan rekap presensi, lalu download rapor sesuai template sekolah.");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  const activeHalaqohs = useMemo(
    () => halaqohs.filter((halaqoh) => halaqoh.is_active && (!selectedYearId || halaqoh.academic_year_id === selectedYearId) && (!selectedSemesterId || halaqoh.semester_id === selectedSemesterId)),
    [halaqohs, selectedSemesterId, selectedYearId],
  );
  const assignedStudents = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.halaqoh_id === selectedHalaqohId && assignment.is_active && assignment.students)
        .map((assignment) => assignment.students as StudentRow)
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [assignments, selectedHalaqohId],
  );
  const selectedYear = useMemo(() => years.find((year) => year.id === selectedYearId) ?? null, [selectedYearId, years]);
  const selectedSemester = useMemo(() => semesters.find((semester) => semester.id === selectedSemesterId) ?? null, [selectedSemesterId, semesters]);
  const selectedHalaqoh = useMemo(() => halaqohs.find((halaqoh) => halaqoh.id === selectedHalaqohId) ?? null, [halaqohs, selectedHalaqohId]);
  const selectedStudent = useMemo(() => assignedStudents.find((student) => student.id === selectedStudentId) ?? null, [assignedStudents, selectedStudentId]);
  const reportByStudent = useMemo(() => new Map(reports.map((report) => [report.student_id, report])), [reports]);
  const assessmentTypeByCode = useMemo(() => new Map(assessmentTypes.map((type) => [type.code, type])), [assessmentTypes]);
  const examScoreByKey = useMemo(
    () => new Map(examScores.map((score) => [`${score.student_id}:${score.assessment_type_id}`, score])),
    [examScores],
  );
  const getExamValue = useCallback(
    (studentId: string, code: (typeof trackedAssessmentCodes)[number]) => {
      const assessmentType = assessmentTypeByCode.get(code);
      if (!assessmentType) return "-";
      return examScoreByKey.get(`${studentId}:${assessmentType.id}`)?.total_score ?? "-";
    },
    [assessmentTypeByCode, examScoreByKey],
  );
  const studentCompletenessMap = useMemo(
    () =>
      new Map(
        assignedStudents.map((student) => [
          student.id,
          getStudentCompleteness({
            student,
            effectiveForm:
              student.id === selectedStudentId
                ? form
                : buildFormState({
                    report: reportByStudent.get(student.id) ?? null,
                    schoolSettings,
                  }),
            getExamValue,
          }),
        ]),
      ),
    [assignedStudents, form, getExamValue, reportByStudent, schoolSettings, selectedStudentId],
  );
  const selectedCompleteness = useMemo(
    () => (selectedStudent ? studentCompletenessMap.get(selectedStudent.id) ?? emptyCompleteness() : emptyCompleteness()),
    [selectedStudent, studentCompletenessMap],
  );
  const selectedNoteTemplate = useMemo(
    () => noteTemplates.find((template) => template.indicator === form.description_result) ?? defaultNoteTemplates.find((template) => template.indicator === form.description_result) ?? null,
    [form.description_result, noteTemplates],
  );
  const readinessSummary = useMemo(
    () => ({
      ready: assignedStudents.filter((student) => studentCompletenessMap.get(student.id)?.ready).length,
      blocked: assignedStudents.filter((student) => !(studentCompletenessMap.get(student.id)?.ready)).length,
    }),
    [assignedStudents, studentCompletenessMap],
  );

  const loadBaseData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      setMessage("Belum login. Masuk dulu agar RLS Supabase memberi akses data.");
      setLoading(false);
      return;
    }

    const [profileRes, yearRes, semesterRes, halaqohRes, assignmentRes, typeRes] = await Promise.all([
      supabase.from("profiles").select("role,teacher_id,is_active").eq("id", user.data.user.id).maybeSingle(),
      supabase.from("academic_years").select("id,name,is_active").order("name"),
      supabase.from("semesters").select("id,name,academic_year_id,is_active").order("name"),
      supabase.from("halaqohs").select("id,name,academic_year_id,semester_id,is_active,classes(name),teachers(id,full_name,title)").order("name"),
      supabase.from("student_halaqohs").select("id,student_id,halaqoh_id,is_active,students(id,full_name,gender)").eq("is_active", true),
      supabase.from("assessment_types").select("id,code,name,max_score,is_active").eq("is_active", true).in("code", [...trackedAssessmentCodes]).order("name"),
    ]);

    if (profileRes.error || yearRes.error || semesterRes.error || halaqohRes.error || assignmentRes.error || typeRes.error) {
      notify(profileRes.error?.message ?? yearRes.error?.message ?? semesterRes.error?.message ?? halaqohRes.error?.message ?? assignmentRes.error?.message ?? typeRes.error?.message ?? "Gagal memuat data rapor semester.", "error");
      setLoading(false);
      return;
    }

    const loadedYears = (yearRes.data ?? []) as AcademicYearRow[];
    const loadedSemesters = (semesterRes.data ?? []) as SemesterRow[];
    const profile = (profileRes.data as UserProfileRow | null) ?? null;
    const loadedHalaqohs = filterHalaqohsForProfile(((halaqohRes.data as HalaqohQueryRow[] | null) ?? []).map(normalizeHalaqohRow), profile);
    const visibleHalaqohIds = new Set(loadedHalaqohs.map((halaqoh) => halaqoh.id));
    const loadedAssignments = ((assignmentRes.data as AssignmentQueryRow[] | null) ?? [])
      .map(normalizeAssignmentRow)
      .filter((assignment) => visibleHalaqohIds.has(assignment.halaqoh_id));
    const defaultYear = activePeriod.academic_year_id || loadedYears.find((year) => year.is_active)?.id || loadedYears[0]?.id || "";
    const defaultSemester =
      activePeriod.semester_id ||
      loadedSemesters.find((semester) => semester.is_active && semester.academic_year_id === defaultYear)?.id ||
      loadedSemesters.find((semester) => semester.academic_year_id === defaultYear)?.id ||
      "";
    const defaultHalaqoh = loadedHalaqohs.find((halaqoh) => halaqoh.academic_year_id === defaultYear && halaqoh.semester_id === defaultSemester)?.id || loadedHalaqohs[0]?.id || "";
    const defaultStudent = loadedAssignments.find((assignment) => assignment.halaqoh_id === defaultHalaqoh)?.student_id || "";

    setYears(loadedYears);
    setSemesters(loadedSemesters);
    setHalaqohs(loadedHalaqohs);
    setAssignments(loadedAssignments);
    setAssessmentTypes((typeRes.data ?? []) as AssessmentTypeRow[]);
    setSelectedYearId(defaultYear);
    setSelectedSemesterId(defaultSemester);
    setSelectedHalaqohId(defaultHalaqoh);
    setSelectedStudentId(defaultStudent);
    setMessage(profile?.role === "guru" ? "Data semester dimuat sesuai halaqoh yang diampu." : "Data semester berhasil dimuat.");
    setLoading(false);
  }, [activePeriod.academic_year_id, activePeriod.semester_id]);

  const loadContextData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !selectedYearId || !selectedSemesterId || !selectedHalaqohId) return;

    const studentIds = assignedStudents.map((student) => student.id);
    if (studentIds.length === 0) {
      setReports([]);
      setExamScores([]);
      return;
    }

    setLoading(true);
    const assessmentTypeIds = assessmentTypes.map((type) => type.id);
    const reportQuery = () =>
      supabase
        .from("semester_report_cards")
        .select("id,student_id,academic_year_id,semester_id,report_date,jilid,reading_type,target_juz,target_surah,target_description,tested_surahs,show_tajwid,attendance_sick,attendance_permission,attendance_absent,personality_teacher,personality_friend,neatness,discipline,description_result,custom_description,homeroom_teacher_name,coordinator_name")
        .eq("academic_year_id", selectedYearId)
        .eq("semester_id", selectedSemesterId)
        .in("student_id", studentIds);
    const fallbackReportQuery = () =>
      supabase
        .from("semester_report_cards")
        .select("id,student_id,academic_year_id,semester_id,report_date,jilid,reading_type,target_juz,target_surah,target_description,tested_surahs,personality_teacher,personality_friend,neatness,discipline,description_result,custom_description,homeroom_teacher_name,coordinator_name")
        .eq("academic_year_id", selectedYearId)
        .eq("semester_id", selectedSemesterId)
        .in("student_id", studentIds);
    const [reportRes, examRes] = await Promise.all([
      reportQuery(),
      assessmentTypeIds.length > 0
        ? supabase
            .from("other_exam_scores")
            .select("student_id,assessment_type_id,total_score,predicate,note")
            .eq("academic_year_id", selectedYearId)
            .eq("semester_id", selectedSemesterId)
            .in("student_id", studentIds)
            .in("assessment_type_id", assessmentTypeIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    let reportRows = (reportRes.data ?? []) as SemesterReportRow[];
    let reportErrorMessage = reportRes.error?.message ?? null;
    if (reportRes.error && isMissingAnyColumnError(reportRes.error.message, ["show_tajwid", "attendance_sick", "attendance_permission", "attendance_absent"])) {
      const fallbackReportRes = await fallbackReportQuery();
      reportRows = ((fallbackReportRes.data ?? []) as Array<Omit<SemesterReportRow, "show_tajwid" | "attendance_sick" | "attendance_permission" | "attendance_absent">>).map((row) => ({
        ...row,
        show_tajwid: false,
        attendance_sick: 0,
        attendance_permission: 0,
        attendance_absent: 0,
      }));
      reportErrorMessage = fallbackReportRes.error?.message ?? null;
    }

    if (reportErrorMessage || examRes.error) {
      notify(reportErrorMessage ?? examRes.error?.message ?? "Gagal memuat konteks rapor semester.", "error");
      setLoading(false);
      return;
    }

    setReports(reportRows.map(normalizeSemesterReportRow));
    setExamScores((examRes.data ?? []) as OtherExamScoreRow[]);
    setLoading(false);
  }, [assignedStudents, assessmentTypes, selectedHalaqohId, selectedSemesterId, selectedYearId]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    let isMounted = true;
    async function loadNoteTemplates() {
      try {
        const response = await fetch("/api/reports/semester-note-templates");
        if (!response.ok) throw new Error("Gagal membaca aturan catatan.");
        const payload = (await response.json()) as { templates?: Array<{ indicator?: string; description?: string }> };
        const templates = (payload.templates ?? [])
          .filter((template): template is NoteTemplateRow => isKnownDescriptionResult(template.indicator) && Boolean(template.description?.trim()))
          .map((template) => ({ indicator: template.indicator, description: template.description.trim() }));
        if (isMounted && templates.length > 0) setNoteTemplates(templates);
      } catch {
        if (isMounted) setNoteTemplates(defaultNoteTemplates);
      }
    }
    void loadNoteTemplates();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    void loadContextData();
  }, [loadContextData]);

  useEffect(() => {
    if (!selectedStudent && assignedStudents.length > 0) {
      setSelectedStudentId(assignedStudents[0]?.id ?? "");
      return;
    }
    if (!selectedStudent) {
      setForm(emptyForm());
      setNoteMode("template");
      return;
    }

    const report = reportByStudent.get(selectedStudent.id) ?? null;
    const nextForm = buildFormState({
      report,
      schoolSettings,
    });
    setForm(nextForm);
    setNoteMode(nextForm.custom_description.trim() ? "custom" : "template");
  }, [assignedStudents, reportByStudent, schoolSettings, selectedStudent]);

  async function saveReport() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !selectedStudentId || !selectedYearId || !selectedSemesterId) return;

    setLoading(true);
    const payload = {
      student_id: selectedStudentId,
      academic_year_id: selectedYearId,
      semester_id: selectedSemesterId,
      report_date: form.report_date,
      jilid: form.jilid.trim(),
      reading_type: form.reading_type.trim() || "Baca Tartili",
      target_juz: form.target_juz.trim(),
      target_surah: form.target_surah.trim(),
      target_description: form.target_description.trim(),
      tested_surahs: collectTestedSurahs(form),
      show_tajwid: form.show_tajwid,
      attendance_sick: parseAttendanceCount(form.attendance_sick),
      attendance_permission: parseAttendanceCount(form.attendance_permission),
      attendance_absent: parseAttendanceCount(form.attendance_absent),
      personality_teacher: fallbackDash(form.personality_teacher),
      personality_friend: fallbackDash(form.personality_friend),
      neatness: fallbackDash(form.neatness),
      discipline: fallbackDash(form.discipline),
      description_result: form.description_result,
      custom_description: noteMode === "custom" ? form.custom_description.trim() || null : null,
      homeroom_teacher_name: form.homeroom_teacher_name.trim(),
      coordinator_name: form.coordinator_name.trim(),
    };

    const { error } = await supabase.from("semester_report_cards").upsert(payload, {
      onConflict: "student_id,academic_year_id,semester_id",
    });
    let saveErrorMessage = error?.message ?? null;
    let savedAllDraftFields = true;
    if (error && isMissingAnyColumnError(error.message, ["show_tajwid", "attendance_sick", "attendance_permission", "attendance_absent"])) {
      const payloadWithoutTajwid: Partial<typeof payload> = { ...payload };
      delete payloadWithoutTajwid.show_tajwid;
      delete payloadWithoutTajwid.attendance_sick;
      delete payloadWithoutTajwid.attendance_permission;
      delete payloadWithoutTajwid.attendance_absent;
      const fallbackSave = await supabase.from("semester_report_cards").upsert(payloadWithoutTajwid, {
        onConflict: "student_id,academic_year_id,semester_id",
      });
      saveErrorMessage = fallbackSave.error?.message ?? null;
      savedAllDraftFields = false;
    }

    if (saveErrorMessage) {
      notify(saveErrorMessage, "error");
    } else {
      notify(
        savedAllDraftFields
          ? `Draft rapor semester ${selectedStudent?.full_name ?? "santri"} berhasil disimpan.`
          : `Draft rapor semester ${selectedStudent?.full_name ?? "santri"} tersimpan. Terapkan migration terbaru agar opsi Tajwid dan rekap presensi ikut tersimpan.`,
        savedAllDraftFields ? "success" : "info",
      );
      await loadContextData();
    }
    setLoading(false);
  }

  async function downloadSingle(mode: "pdf" | "excel") {
    if (!selectedStudent) return;
    if (mode === "pdf" && selectedCompleteness.blockingIssues.length > 0) {
      notify(`Rapor semester belum bisa diunduh. Lengkapi dulu: ${selectedCompleteness.blockingIssues[0]}.`, "error");
      return;
    }
    const payload = buildPayloadForStudent(selectedStudent);
    if (!payload) return;
    if (mode === "pdf") {
      await downloadSemesterPdf(payload);
    } else {
      await downloadSemesterExcel(payload);
    }
  }

  async function downloadBulk(mode: "pdf" | "excel") {
    if (assignedStudents.length === 0) return;
    const readyStudents = assignedStudents.filter((student) => studentCompletenessMap.get(student.id)?.ready);
    const blockedStudents = assignedStudents.filter((student) => !studentCompletenessMap.get(student.id)?.ready);
    const targetStudents = mode === "pdf" ? readyStudents : assignedStudents;
    if (targetStudents.length === 0) {
      notify("Belum ada santri yang siap diunduh massal. Lengkapi data inti dulu.", "error");
      return;
    }
    const reports = targetStudents.map((student) => buildPayloadForStudent(student)).filter(Boolean) as SemesterReportPayload[];

    setLoading(true);
    try {
      const response = await fetch(mode === "pdf" ? "/api/reports/semester-pdf-bulk" : "/api/reports/semester-xlsx-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "pdf" ? { reports } : { reports, mode: "full" }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.message ?? "Gagal membuat ZIP rapor semester.");
      }

      const blob = await response.blob();
      triggerBrowserDownload(blob, `${mode === "pdf" ? "Rapor Semester PDF" : "Rapor Semester Excel"} ${selectedHalaqoh?.name ?? "Halaqoh"}.zip`);
      notify(
        mode === "pdf" && blockedStudents.length > 0
          ? `ZIP dibuat untuk ${reports.length} santri siap. ${blockedStudents.length} santri masih perlu dilengkapi.`
          : `ZIP ${mode === "pdf" ? "PDF siap cetak" : "Excel data lengkap"} untuk ${reports.length} santri berhasil dibuat.`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal membuat ZIP rapor semester.", "error");
    }
    setLoading(false);
  }

  function buildPayloadForStudent(student: StudentRow) {
    const report = reportByStudent.get(student.id) ?? null;
    const effectiveForm =
      student.id === selectedStudentId
        ? form
        : buildFormState({
            report,
            schoolSettings,
          });
    const className = selectedHalaqoh?.classes?.name ?? "-";
    const customDescription =
      student.id === selectedStudentId && noteMode === "template"
        ? ""
        : effectiveForm.custom_description.trim();
    const tajwidScore = getExamValue(student.id, "tajwid");

    return {
      studentName: student.full_name,
      className,
      academicYear: selectedYear?.name ?? activePeriod.academic_year_name,
      semester: selectedSemester?.name ?? activePeriod.semester_name,
      reportDate: effectiveForm.report_date,
      jilid: effectiveForm.jilid.trim(),
      readingType: effectiveForm.reading_type.trim() || "Baca Tartili",
      readingScore: getExamValue(student.id, "tartili"),
      targetJuz: effectiveForm.target_juz.trim(),
      targetSurah: effectiveForm.target_surah.trim(),
      targetDescription: effectiveForm.target_description.trim(),
      testedSurahs: collectTestedSurahs(effectiveForm),
      materialScores: {
        wudhu: getExamValue(student.id, "wudhu"),
        sholat: getExamValue(student.id, "sholat"),
        tayamum: getExamValue(student.id, "tayamum"),
        shalatJenazah: getExamValue(student.id, "shalat_jenazah"),
        doaHarian: getExamValue(student.id, "doa"),
        hafalanHadits: getExamValue(student.id, "hadits"),
        tajwid: tajwidScore,
      },
      includeTajwid: effectiveForm.show_tajwid && hasFilledScore(tajwidScore),
      attendance: {
        sick: parseAttendanceCount(effectiveForm.attendance_sick),
        permission: parseAttendanceCount(effectiveForm.attendance_permission),
        absent: parseAttendanceCount(effectiveForm.attendance_absent),
      },
      personality: {
        teacher: fallbackDash(effectiveForm.personality_teacher),
        friend: fallbackDash(effectiveForm.personality_friend),
        neatness: fallbackDash(effectiveForm.neatness),
        discipline: fallbackDash(effectiveForm.discipline),
      },
      descriptionResult: effectiveForm.description_result,
      customDescription: customDescription || undefined,
      homeroomTeacherName: effectiveForm.homeroom_teacher_name.trim() || schoolSettings.default_homeroom_name,
      coordinatorName: effectiveForm.coordinator_name.trim() || schoolSettings.default_coordinator_name,
    } satisfies SemesterReportPayload;
  }

  async function downloadSemesterPdf(payload: SemesterReportPayload) {
    setLoading(true);
    try {
      const response = await fetch("/api/reports/semester-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.message ?? "Gagal membuat rapor semester.");
      }

      const blob = await response.blob();
      triggerBrowserDownload(blob, `Rapor Semester - ${payload.studentName}.pdf`);
      notify(`Rapor semester PDF ${payload.studentName} berhasil dibuat.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal membuat rapor semester.", "error");
    }
    setLoading(false);
  }

  async function downloadSemesterExcel(payload: SemesterReportPayload) {
    setLoading(true);
    try {
      const response = await fetch("/api/reports/semester-xlsx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, mode: "full" }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.message ?? "Gagal membuat file Excel semester.");
      }

      const blob = await response.blob();
      triggerBrowserDownload(blob, `Rapor Semester - Template - ${payload.studentName}.xlsx`);
      notify(`Template Excel lengkap ${payload.studentName} berhasil dibuat.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal membuat file Excel semester.", "error");
    }
    setLoading(false);
  }

  const summaryRows = assignedStudents.map((student, index) => {
    const report = reportByStudent.get(student.id);
    const attendanceForm =
      student.id === selectedStudentId
        ? form
        : buildFormState({
            report: report ?? null,
            schoolSettings,
          });
    const completeness = studentCompletenessMap.get(student.id) ?? emptyCompleteness();

    return [
      index + 1,
      student.full_name,
      String(getExamValue(student.id, "tartili")),
      `${parseAttendanceCount(attendanceForm.attendance_sick)}/${parseAttendanceCount(attendanceForm.attendance_permission)}/${parseAttendanceCount(attendanceForm.attendance_absent)}`,
      <Badge key={`${student.id}-draft`} tone={report ? "green" : "neutral"}>
        {report ? "Tersimpan" : "Belum"}
      </Badge>,
      <Badge key={`${student.id}-ready`} tone={completeness.ready ? "green" : "amber"}>
        {completeness.ready ? "Siap" : `${completeness.blockingIssues.length} kurang`}
      </Badge>,
      <Button key={`${student.id}-download`} onClick={() => {
        setSelectedStudentId(student.id);
        if (!completeness.ready) {
          notify(`"${student.full_name}" belum siap diunduh. Lengkapi dulu data intinya.`, "error");
          return;
        }
        const payload = buildPayloadForStudent(student);
        void downloadSemesterPdf(payload);
      }} size="sm" type="button" variant="secondary">
        <Download size={16} />
        PDF
      </Button>,
    ];
  });

  return (
    <Card>
      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
      <SectionHeader
        title="Rapor Semester"
        description={message}
        action={
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button className="w-full sm:w-auto" disabled={loading} onClick={loadBaseData} type="button" variant="secondary">
              <RefreshCw size={18} />
              Muat Ulang
            </Button>
            <Button className="w-full sm:w-auto" disabled={loading || !selectedStudent} onClick={saveReport} type="button">
              <Save size={18} />
              Simpan Draft
            </Button>
            <Button className="w-full sm:w-auto" disabled={loading || !selectedStudent} onClick={() => downloadSingle("pdf")} type="button" variant="secondary">
              <Download size={18} />
              Download PDF
            </Button>
            <Button className="w-full sm:w-auto" disabled={loading || !selectedStudent} onClick={() => downloadSingle("excel")} type="button" variant="secondary">
              <Download size={18} />
              Download Excel
            </Button>
            <Button className="w-full sm:w-auto" disabled={loading || assignedStudents.length === 0} onClick={() => downloadBulk("pdf")} type="button" variant="secondary">
              <FileArchive size={18} />
              ZIP PDF
            </Button>
            <Button className="w-full sm:w-auto" disabled={loading || assignedStudents.length === 0} onClick={() => downloadBulk("excel")} type="button" variant="secondary">
              <FileArchive size={18} />
              ZIP Excel
            </Button>
          </div>
        }
      />

      <ContextBar
        chips={[
          { label: "Tahun", value: selectedYear?.name ?? activePeriod.academic_year_name },
          { label: "Semester", value: selectedSemester?.name ?? activePeriod.semester_name },
          { label: "Halaqoh", value: selectedHalaqoh?.name ?? "-" },
          { label: "Siap", value: `${readinessSummary.ready}/${assignedStudents.length || 0}`, tone: readinessSummary.blocked === 0 ? "primary" : "neutral" },
        ]}
      />

      <HelpText title="Mode download rapor semester">
        <ul className="list-disc pl-5">
          <li><strong>Download PDF</strong> adalah rapor semester siap cetak yang memakai template PDF sekolah secara langsung.</li>
          <li><strong>Download Excel</strong> tetap membawa data/template lengkap untuk kebutuhan rekap per halaqoh atau per kelas.</li>
        </ul>
      </HelpText>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Tahun Ajaran">
          <Select value={selectedYearId} onChange={(event) => setSelectedYearId(event.target.value)}>
            {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
          </Select>
        </Field>
        <Field label="Semester">
          <Select value={selectedSemesterId} onChange={(event) => setSelectedSemesterId(event.target.value)}>
            {semesters.filter((semester) => !selectedYearId || semester.academic_year_id === selectedYearId).map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
          </Select>
        </Field>
        <Field label="Halaqoh">
          <Select value={selectedHalaqohId} onChange={(event) => setSelectedHalaqohId(event.target.value)}>
            {activeHalaqohs.map((halaqoh) => <option key={halaqoh.id} value={halaqoh.id}>{halaqoh.name} ({halaqoh.classes?.name ?? "-"})</option>)}
          </Select>
        </Field>
        <Field label="Santri">
          <Select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
            {assignedStudents.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
          </Select>
        </Field>
      </div>

      {assignedStudents.length === 0 ? (
        <EmptyState
          description={selectedHalaqohId ? "Halaqoh ini belum punya santri aktif untuk semester yang dipilih." : "Pilih halaqoh dulu untuk mulai menyiapkan rapor semester."}
          icon={<BookOpenCheck size={28} />}
          title={selectedHalaqohId ? "Belum ada santri" : "Pilih halaqoh dulu"}
          tone={selectedHalaqohId ? "warning" : "primary"}
        />
      ) : (
        <div className="space-y-5">
          {selectedStudent ? (
            selectedCompleteness.ready ? (
              <HelpText icon={<CheckCircle2 size={18} />} tone="success" title="Mode uji 1 santri siap">
                Data inti untuk <strong>{selectedStudent.full_name}</strong> sudah lengkap. Aman untuk simpan draft lalu download rapor.
              </HelpText>
            ) : (
              <HelpText icon={<AlertTriangle size={18} />} tone="warning" title="Mode uji 1 santri belum lengkap">
                <div className="space-y-2">
                  <p>Masih ada data inti yang perlu dilengkapi sebelum rapor dibuat.</p>
                  <ul className="list-disc pl-5">
                    {selectedCompleteness.blockingIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              </HelpText>
            )
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <section className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard label="Kelas" value={selectedHalaqoh?.classes?.name ?? "-"} />
                <MetricCard label="Tartili" value={String(selectedStudent ? getExamValue(selectedStudent.id, "tartili") : "-")} />
                <MetricCard label="Tajwid" value={String(selectedStudent ? getExamValue(selectedStudent.id, "tajwid") : "-")} />
                <MetricCard
                  label="Presensi S/I/A"
                  value={
                    selectedStudent
                      ? `${parseAttendanceCount(form.attendance_sick)}/${parseAttendanceCount(form.attendance_permission)}/${parseAttendanceCount(form.attendance_absent)}`
                      : "-"
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Field label="Tanggal Rapor">
                  <Input onChange={(event) => updateForm("report_date", event.target.value)} type="date" value={form.report_date} />
                </Field>
                <Field label="Jilid">
                  <Input onChange={(event) => updateForm("jilid", event.target.value)} value={form.jilid} />
                </Field>
                <Field label="Jenis Bacaan">
                  <Input onChange={(event) => updateForm("reading_type", event.target.value)} value={form.reading_type} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Target Hafalan (Juz)">
                  <Input onChange={(event) => updateForm("target_juz", event.target.value)} value={form.target_juz} />
                </Field>
                <Field label="Target Hafalan (Surat)">
                  <Input onChange={(event) => updateForm("target_surah", event.target.value)} value={form.target_surah} />
                </Field>
                <Field label="Keterangan Target">
                  <Input onChange={(event) => updateForm("target_description", event.target.value)} value={form.target_description} />
                </Field>
              </div>

              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Rekap Presensi Semester</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">Isi satu kali dari rekap kertas sebelum cetak rapor. Nilai ini yang dipakai di kolom D. Presensi.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Sakit">
                    <Input min={0} onChange={(event) => updateForm("attendance_sick", event.target.value)} type="number" value={form.attendance_sick} />
                  </Field>
                  <Field label="Izin">
                    <Input min={0} onChange={(event) => updateForm("attendance_permission", event.target.value)} type="number" value={form.attendance_permission} />
                  </Field>
                  <Field label="Tanpa Keterangan">
                    <Input min={0} onChange={(event) => updateForm("attendance_absent", event.target.value)} type="number" value={form.attendance_absent} />
                  </Field>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                <input
                  checked={form.show_tajwid}
                  className="mt-1 h-4 w-4 rounded border-[var(--line)] accent-[var(--primary)]"
                  onChange={(event) => updateForm("show_tajwid", event.target.checked)}
                  type="checkbox"
                />
                <span className="text-sm leading-6">
                  <span className="block font-semibold text-[var(--foreground)]">Tampilkan nilai Tajwid di rapor semester</span>
                  <span className="text-[var(--muted)]">Baris Tajwid dicetak hanya jika opsi ini aktif dan nilai Tajwid santri sudah tersedia.</span>
                </span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                {form.tested_surahs.map((testedSurah, index) => (
                  <div className="rounded-lg border border-[var(--line)] p-4" key={`tested-surah-${index}`}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--foreground)]">Hafalan yang Diujikan {index + 1}</p>
                      <Button onClick={() => removeTestedSurah(index)} size="sm" type="button" variant="ghost">
                        Hapus
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                      <Input onChange={(event) => updateTestedSurah(index, "name", event.target.value)} placeholder="Nama surat" value={testedSurah.name} />
                      <Input onChange={(event) => updateTestedSurah(index, "score", event.target.value)} placeholder="Nilai" type="number" value={testedSurah.score} />
                    </div>
                  </div>
                ))}
                {form.tested_surahs.length < 2 ? (
                  <button
                    className="flex min-h-[128px] items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 text-sm font-semibold text-[var(--primary)] transition hover:border-[var(--primary)]/40"
                    onClick={addTestedSurah}
                    type="button"
                  >
                    Tambah hafalan yang diujikan
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Akhlak kepada Guru">
                  <Input onChange={(event) => updateForm("personality_teacher", event.target.value)} value={form.personality_teacher} />
                </Field>
                <Field label="Akhlak kepada Teman">
                  <Input onChange={(event) => updateForm("personality_friend", event.target.value)} value={form.personality_friend} />
                </Field>
                <Field label="Kerapian">
                  <Input onChange={(event) => updateForm("neatness", event.target.value)} value={form.neatness} />
                </Field>
                <Field label="Kedisiplinan">
                  <Input onChange={(event) => updateForm("discipline", event.target.value)} value={form.discipline} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Mode Catatan">
                  <Select value={noteMode} onChange={(event) => updateNoteMode(event.target.value as NoteMode)}>
                    <option value="template">Pakai Template</option>
                    <option value="custom">Custom</option>
                  </Select>
                </Field>
                <Field label="Indikator Catatan">
                  <Select value={form.description_result} onChange={(event) => updateNoteTemplate(event.target.value)}>
                    {noteTemplates.map((template) => (
                      <option key={template.indicator} value={template.indicator}>
                        {template.indicator}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Wali Kelas">
                  <Input onChange={(event) => updateForm("homeroom_teacher_name", event.target.value)} value={form.homeroom_teacher_name} />
                </Field>
                <Field label="Koordinator">
                  <Input onChange={(event) => updateForm("coordinator_name", event.target.value)} value={form.coordinator_name} />
                </Field>
              </div>

              {noteMode === "template" ? (
                <HelpText title={`Preview catatan: ${form.description_result}`}>
                  {selectedNoteTemplate?.description ?? "Template catatan belum ditemukan di sheet Aturan Catatan."}
                </HelpText>
              ) : (
                <Field label="Catatan Custom">
                  <Textarea
                    onChange={(event) => updateForm("custom_description", event.target.value)}
                    placeholder={selectedNoteTemplate?.description ?? "Tulis catatan khusus yang akan dicetak di kolom F. Catatan."}
                    value={form.custom_description}
                  />
                </Field>
              )}

              {selectedCompleteness.warnings.length > 0 ? (
                <HelpText tone="info" title="Masih ada hal yang sebaiknya dilengkapi">
                  <ul className="list-disc pl-5">
                    {selectedCompleteness.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </HelpText>
              ) : null}
            </section>

            <aside className="space-y-4">
              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                <h3 className="text-sm font-bold text-[var(--foreground)]">Nilai Materi Tambahan</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <SummaryLine label="Wudhu" value={String(selectedStudent ? getExamValue(selectedStudent.id, "wudhu") : "-")} />
                  <SummaryLine label="Sholat" value={String(selectedStudent ? getExamValue(selectedStudent.id, "sholat") : "-")} />
                  <SummaryLine label="Tayamum" value={String(selectedStudent ? getExamValue(selectedStudent.id, "tayamum") : "-")} />
                  <SummaryLine label="Shalat Jenazah" value={String(selectedStudent ? getExamValue(selectedStudent.id, "shalat_jenazah") : "-")} />
                  <SummaryLine label="Doa Harian" value={String(selectedStudent ? getExamValue(selectedStudent.id, "doa") : "-")} />
                  <SummaryLine label="Hafalan Hadits" value={String(selectedStudent ? getExamValue(selectedStudent.id, "hadits") : "-")} />
                  <SummaryLine label="Tajwid" value={String(selectedStudent ? getExamValue(selectedStudent.id, "tajwid") : "-")} />
                </dl>
              </div>

              <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                <h3 className="text-sm font-bold text-[var(--foreground)]">Checklist Integrasi</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <StatusLine label="Template Excel sekolah" ready />
                  <StatusLine label="Draft metadata semester" ready />
                  <StatusLine label="Nilai tartili & materi tambahan" ready={assessmentTypes.length > 0} />
                  <StatusLine label="Rekap presensi" ready />
                  <StatusLine label="Rapor tahfidz lama" ready />
                  <StatusLine label="Santri terpilih siap diuji" ready={selectedCompleteness.ready} />
                </div>
              </div>
            </aside>
          </div>

          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted)]">
            Data semester di sini bersifat tambahan dan tidak mengubah struktur data rapor tahfidz yang sudah live. Nilai ujian tambahan tetap dibaca dari tabel nilai, sedangkan presensi diisi sebagai rekap akhir semester dari catatan manual sekolah.
          </div>

          <DataTable columns={["No", "Santri", "Tartili", "S/I/A", "Draft", "Kesiapan", "Aksi"]} entityLabel="santri" pageSize={10} rows={summaryRows} />
        </div>
      )}
    </Card>
  );

  function updateForm<Key extends keyof SemesterReportFormState>(field: Key, value: SemesterReportFormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateNoteMode(mode: NoteMode) {
    setNoteMode(mode);
    if (mode === "template") {
      updateForm("custom_description", "");
    }
  }

  function updateNoteTemplate(value: string) {
    if (!isKnownDescriptionResult(value)) return;
    setForm((current) => ({
      ...current,
      description_result: value,
      custom_description: noteMode === "template" ? "" : current.custom_description,
    }));
  }

  function updateTestedSurah(index: number, field: keyof TestedSurahDraft, value: string) {
    setForm((current) => ({
      ...current,
      tested_surahs: current.tested_surahs.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addTestedSurah() {
    setForm((current) => {
      if (current.tested_surahs.length >= 2) return current;
      return {
        ...current,
        tested_surahs: [...current.tested_surahs, { name: "", score: "" }],
      };
    });
  }

  function removeTestedSurah(index: number) {
    setForm((current) => {
      const nextItems = current.tested_surahs.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        tested_surahs: nextItems,
      };
    });
  }

  function notify(messageText: string, tone: "success" | "error" | "info" = "success") {
    setMessage(messageText);
    setToast({ message: messageText, tone });
    window.setTimeout(() => setToast(null), 5000);
  }
}

function emptyForm(): SemesterReportFormState {
  return {
    report_date: new Date().toISOString().slice(0, 10),
    jilid: "",
    reading_type: "Baca Tartili",
    target_juz: "",
    target_surah: "",
    target_description: "",
    tested_surahs: [],
    show_tajwid: false,
    attendance_sick: "0",
    attendance_permission: "0",
    attendance_absent: "0",
    personality_teacher: "-",
    personality_friend: "-",
    neatness: "-",
    discipline: "-",
    description_result: "Tercapai",
    custom_description: "",
    homeroom_teacher_name: "",
    coordinator_name: "",
  };
}

function buildFormState({
  report,
  schoolSettings,
}: {
  report: SemesterReportRow | null;
  schoolSettings: {
    default_coordinator_name: string;
    default_homeroom_name: string;
    default_report_date: string | null;
  };
}): SemesterReportFormState {
  const testedSurahs = normalizeTestedSurahs(report?.tested_surahs);
  return {
    report_date: report?.report_date ?? schoolSettings.default_report_date ?? new Date().toISOString().slice(0, 10),
    jilid: report?.jilid ?? "",
    reading_type: report?.reading_type ?? "Baca Tartili",
    target_juz: report?.target_juz ?? "",
    target_surah: report?.target_surah ?? "",
    target_description: report?.target_description ?? "",
    tested_surahs: testedSurahs.slice(0, 2),
    show_tajwid: report?.show_tajwid ?? false,
    attendance_sick: String(report?.attendance_sick ?? 0),
    attendance_permission: String(report?.attendance_permission ?? 0),
    attendance_absent: String(report?.attendance_absent ?? 0),
    personality_teacher: report?.personality_teacher ?? "-",
    personality_friend: report?.personality_friend ?? "-",
    neatness: report?.neatness ?? "-",
    discipline: report?.discipline ?? "-",
    description_result: report?.description_result ?? "Tercapai",
    custom_description: report?.custom_description ?? "",
    homeroom_teacher_name: report?.homeroom_teacher_name ?? schoolSettings.default_homeroom_name,
    coordinator_name: report?.coordinator_name ?? schoolSettings.default_coordinator_name,
  };
}

function collectTestedSurahs(form: SemesterReportFormState): TestedSurahDraft[] {
  return form.tested_surahs.map((item) => ({ name: item.name.trim(), score: item.score.trim() })).filter((item) => item.name || item.score);
}

function normalizeSemesterReportRow(row: SemesterReportRow): SemesterReportRow {
  return {
    ...row,
    tested_surahs: normalizeTestedSurahs(row.tested_surahs),
    attendance_sick: Number(row.attendance_sick ?? 0),
    attendance_permission: Number(row.attendance_permission ?? 0),
    attendance_absent: Number(row.attendance_absent ?? 0),
  };
}

function normalizeTestedSurahs(value: unknown): TestedSurahDraft[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      return {
        name: typeof record.name === "string" ? record.name : "",
        score: record.score == null ? "" : String(record.score),
      };
    })
    .filter(Boolean) as TestedSurahDraft[];
}

function isKnownDescriptionResult(value: unknown): value is SemesterReportFormState["description_result"] {
  return value === "Tidak Tercapai" || value === "Tercapai" || value === "Melampaui";
}

function normalizeHalaqohRow(row: HalaqohQueryRow): HalaqohRow {
  return {
    ...row,
    classes: Array.isArray(row.classes) ? row.classes[0] ?? null : row.classes,
    teachers: Array.isArray(row.teachers) ? row.teachers[0] ?? null : row.teachers,
  };
}

function filterHalaqohsForProfile(halaqohs: HalaqohRow[], profile: UserProfileRow | null) {
  if (profile?.role !== "guru") return halaqohs;
  if (!profile.is_active || !profile.teacher_id) return [];
  return halaqohs.filter((halaqoh) => halaqoh.teachers?.id === profile.teacher_id);
}

function normalizeAssignmentRow(row: AssignmentQueryRow): AssignmentRow {
  return {
    ...row,
    students: Array.isArray(row.students) ? row.students[0] ?? null : row.students,
  };
}

function fallbackDash(value: string) {
  return value.trim() || "-";
}

function hasFilledScore(value: string | number | null | undefined) {
  const text = String(value ?? "").trim();
  return text !== "" && text !== "-";
}

function parseAttendanceCount(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function isMissingAnyColumnError(message: string, columns: string[]) {
  return columns.some((column) => isMissingColumnError(message, column));
}

function isMissingColumnError(message: string, column: string) {
  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes(column.toLowerCase()) && (lowerMessage.includes("column") || lowerMessage.includes("schema cache"));
}

function getStudentCompleteness({
  student,
  effectiveForm,
  getExamValue,
}: {
  student: StudentRow;
  effectiveForm: SemesterReportFormState;
  getExamValue: (studentId: string, code: (typeof trackedAssessmentCodes)[number]) => string | number;
}): ReportCompleteness {
  const blockingIssues: string[] = [];
  const warnings: string[] = [];
  const tartili = getExamValue(student.id, "tartili");
  const tajwid = getExamValue(student.id, "tajwid");
  const testedSurahs = collectTestedSurahs(effectiveForm);
  const completeTestedSurahCount = testedSurahs.filter((item) => item.name.trim() && item.score.trim()).length;

  if (!effectiveForm.report_date) blockingIssues.push("Tanggal rapor belum diisi");
  if (!effectiveForm.jilid.trim()) blockingIssues.push("Jilid belum diisi");
  if (!effectiveForm.homeroom_teacher_name.trim()) blockingIssues.push("Wali kelas belum diisi");
  if (!effectiveForm.coordinator_name.trim()) blockingIssues.push("Koordinator belum diisi");
  if (String(tartili).trim() === "-" || String(tartili).trim() === "") blockingIssues.push("Nilai tartili belum ada");
  if (completeTestedSurahCount === 0) blockingIssues.push("Minimal 1 hafalan yang diujikan harus lengkap nama surat dan nilainya");

  if (!effectiveForm.target_juz.trim()) warnings.push("Target hafalan juz masih kosong");
  if (!effectiveForm.target_surah.trim()) warnings.push("Target hafalan surat masih kosong");
  if (!effectiveForm.target_description.trim()) warnings.push("Keterangan target hafalan masih kosong");
  if (effectiveForm.show_tajwid && !hasFilledScore(tajwid)) warnings.push("Tajwid dicentang, tetapi nilai Tajwid santri belum tersedia");
  if (fallbackDash(effectiveForm.personality_teacher) === "-") warnings.push("Akhlak kepada guru masih default");
  if (fallbackDash(effectiveForm.personality_friend) === "-") warnings.push("Akhlak kepada teman masih default");
  if (fallbackDash(effectiveForm.neatness) === "-") warnings.push("Kerapian masih default");
  if (fallbackDash(effectiveForm.discipline) === "-") warnings.push("Kedisiplinan masih default");

  return {
    ready: blockingIssues.length === 0,
    blockingIssues,
    warnings,
  };
}

function emptyCompleteness(): ReportCompleteness {
  return { ready: false, blockingIssues: [], warnings: [] };
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-semibold text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function StatusLine({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--muted)]">{label}</span>
      <Badge tone={ready ? "green" : "neutral"}>{ready ? "Siap" : "Menunggu"}</Badge>
    </div>
  );
}
