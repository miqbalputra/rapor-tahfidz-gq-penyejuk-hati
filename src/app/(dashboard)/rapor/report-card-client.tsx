"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BookmarkPlus, CheckCircle2, FileDown, FileSignature, FolderArchive, ListChecks, Lock, Printer, RefreshCw, Save, Send, Trash2, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ContextBar } from "@/components/ui/context-bar";
import { ActionMenu } from "@/components/ui/action-menu";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Toast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSchoolSettings } from "@/lib/settings/use-school-settings";
import type { ReportDocxPayload } from "@/lib/reports/docx-template";
import { DocxPreviewClient } from "./docx-preview-client";
import { FALLBACK_PREDICATE_DESCRIPTIONS, useReportPreferences, type PredicateDescription } from "@/lib/reports/use-report-preferences";

type AcademicYearRow = { id: string; name: string; is_active: boolean };
type SemesterRow = { id: string; name: string; academic_year_id: string; is_active: boolean };
type StudentRow = { id: string; full_name: string; gender: "male" | "female" };
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
type AssignmentQueryRow = Omit<AssignmentRow, "students"> & { students: StudentRow[] | StudentRow | null };
type SurahRow = { id: string; juz: 29 | 30; sort_order: number; name_latin: string; show_in_report: boolean };
type ScoreRow = {
  surah_id: string;
  fluency_score: number;
  fashohah_score: number;
  tajwid_score: number;
  total_score: number;
};
type JuziyahRow = {
  fluency_score: number;
  fashohah_score: number;
  tajwid_score: number;
  average_score: number;
  predicate: string | null;
};
type ReportRow = {
  id: string;
  report_date: string;
  note: string;
  coordinator_name: string;
  homeroom_teacher_name: string;
  status: string;
};
type PredicateRow = { min_score: number | null; max_score: number | null; label: string };
type UserProfileRow = { role: string; teacher_id: string | null; is_active: boolean };
type ReportStatus = "draft" | "waiting_validation" | "needs_revision" | "validated" | "printed";
type BulkScoreRow = ScoreRow & { student_id: string };
type BulkJuziyahRow = JuziyahRow & { student_id: string };
type BulkReportRow = ReportRow & { student_id: string };
type ReportFormState = {
  report_date: string;
  jilid: string;
  coordinator_name: string;
  homeroom_teacher_name: string;
  note: string;
  target_class: string;
  target_semester: string;
  target_surah_range: string;
  predicate_descriptions: PredicateDescription[];
};
type BulkReportItem = {
  student: StudentRow;
  scoreBySurah: Map<string, ScoreRow>;
  juziyah: JuziyahRow | null;
  report: BulkReportRow | null;
  form: ReportFormState;
};
type ProgressRow = {
  student: StudentRow;
  setoranCount: number;
  setoranTotal: number;
  hasJuziyah: boolean;
  hasReport: boolean;
  isReady: boolean;
};

const defaultNote =
  "Alhamdulillah, sampai akhir semester ini ananda telah melampaui target hafalan dan telah mengikuti program ujian juziyyah. Besar harapan ustadz agar ananda mampu mempertahankan prestasi yang sudah baik dan istiqomah dalam muroja'ah hafalan. Semoga ananda sukses selalu.";

const statusLabels: Record<ReportStatus, string> = {
  draft: "Draft",
  waiting_validation: "Menunggu Validasi",
  needs_revision: "Perlu Revisi",
  validated: "Tervalidasi",
  printed: "Tercetak",
};

const statusTones: Record<ReportStatus, "neutral" | "amber" | "red" | "green"> = {
  draft: "neutral",
  waiting_validation: "amber",
  needs_revision: "red",
  validated: "green",
  printed: "green",
};

export function ReportCardClient() {
  const { settings: schoolSettings, period: activePeriod } = useSchoolSettings();
  const { preferences: teacherPreferences, loaded: preferencesLoaded, saving: savingPreferences, savePreferences } = useReportPreferences();
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const [years, setYears] = useState<AcademicYearRow[]>([]);
  const [semesters, setSemesters] = useState<SemesterRow[]>([]);
  const [halaqohs, setHalaqohs] = useState<HalaqohRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [surahs, setSurahs] = useState<SurahRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [juziyah, setJuziyah] = useState<JuziyahRow | null>(null);
  const [predicates, setPredicates] = useState<PredicateRow[]>([]);
  const [report, setReport] = useState<ReportRow | null>(null);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedHalaqohId, setSelectedHalaqohId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedJuz, setSelectedJuz] = useState<29 | 30>(29);
  const [form, setForm] = useState<ReportFormState>({
    report_date: new Date().toISOString().slice(0, 10),
    jilid: "",
    coordinator_name: "Maulidin Nafsir",
    homeroom_teacher_name: "Maulidin Nafsir",
    note: defaultNote,
    target_class: "",
    target_semester: "",
    target_surah_range: "",
    predicate_descriptions: [],
  });
  const [bulkReports, setBulkReports] = useState<BulkReportItem[]>([]);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [pendingBulk, setPendingBulk] = useState<{ action: "zip" | "print"; rows: ProgressRow[] } | null>(null);
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);
  const [message, setMessage] = useState("Pilih santri untuk membuat rapor.");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  const selectedHalaqoh = useMemo(() => halaqohs.find((halaqoh) => halaqoh.id === selectedHalaqohId), [halaqohs, selectedHalaqohId]);
  const selectedYear = useMemo(() => years.find((year) => year.id === selectedYearId), [selectedYearId, years]);
  const selectedSemester = useMemo(() => semesters.find((semester) => semester.id === selectedSemesterId), [selectedSemesterId, semesters]);
  const assignedStudents = useMemo(
    () =>
      assignments
        .filter((assignment) => assignment.halaqoh_id === selectedHalaqohId && assignment.is_active && assignment.students)
        .map((assignment) => assignment.students as StudentRow)
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [assignments, selectedHalaqohId],
  );
  const selectedStudent = useMemo(() => assignedStudents.find((student) => student.id === selectedStudentId), [assignedStudents, selectedStudentId]);
  const selectedSurahs = useMemo(() => surahs.filter((surah) => surah.juz === selectedJuz && surah.show_in_report).sort((a, b) => a.sort_order - b.sort_order), [selectedJuz, surahs]);
  const scoreBySurah = useMemo(() => new Map(scores.map((score) => [score.surah_id, score])), [scores]);
  const activeHalaqohs = useMemo(
    () => halaqohs.filter((halaqoh) => halaqoh.is_active && (!selectedYearId || halaqoh.academic_year_id === selectedYearId) && (!selectedSemesterId || halaqoh.semester_id === selectedSemesterId)),
    [halaqohs, selectedSemesterId, selectedYearId],
  );
  const progressSummary = useMemo(
    () => ({
      ready: progressRows.filter((row) => row.isReady).length,
      incompleteSetoran: progressRows.filter((row) => row.setoranCount < row.setoranTotal).length,
      missingJuziyah: progressRows.filter((row) => !row.hasJuziyah).length,
      missingReport: progressRows.filter((row) => !row.hasReport).length,
    }),
    [progressRows],
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

    const [profileRes, yearRes, semesterRes, halaqohRes, assignmentRes, surahRes, predicateRes] = await Promise.all([
      supabase.from("profiles").select("role,teacher_id,is_active").eq("id", user.data.user.id).maybeSingle(),
      supabase.from("academic_years").select("id,name,is_active").order("name"),
      supabase.from("semesters").select("id,name,academic_year_id,is_active").order("name"),
      supabase.from("halaqohs").select("id,name,academic_year_id,semester_id,is_active,classes(name),teachers(id,full_name,title)").order("name"),
      supabase.from("student_halaqohs").select("id,student_id,halaqoh_id,is_active,students(id,full_name,gender)").eq("is_active", true),
      supabase.from("surahs").select("id,juz,sort_order,name_latin,show_in_report").order("juz").order("sort_order"),
      supabase.from("predicate_rules").select("min_score,max_score,label").is("assessment_type_id", null).order("sort_order"),
    ]);

    if (profileRes.error || yearRes.error || semesterRes.error || halaqohRes.error || assignmentRes.error || surahRes.error || predicateRes.error) {
      notify(profileRes.error?.message ?? yearRes.error?.message ?? semesterRes.error?.message ?? halaqohRes.error?.message ?? assignmentRes.error?.message ?? surahRes.error?.message ?? predicateRes.error?.message ?? "Gagal memuat data rapor.", "error");
    } else {
      const loadedYears = (yearRes.data ?? []) as AcademicYearRow[];
      const loadedSemesters = (semesterRes.data ?? []) as SemesterRow[];
      const profile = (profileRes.data as UserProfileRow | null) ?? null;
      const loadedHalaqohs = filterHalaqohsForProfile(((halaqohRes.data as HalaqohQueryRow[] | null) ?? []).map(normalizeHalaqohRow), profile);
      const visibleHalaqohIds = new Set(loadedHalaqohs.map((halaqoh) => halaqoh.id));
      const loadedAssignments = ((assignmentRes.data as AssignmentQueryRow[] | null) ?? [])
        .map(normalizeAssignmentRow)
        .filter((assignment) => visibleHalaqohIds.has(assignment.halaqoh_id));
      const defaultYear = loadedYears.find((year) => year.is_active)?.id || loadedYears[0]?.id || "";
      const defaultSemester =
        loadedSemesters.find((semester) => semester.is_active && semester.academic_year_id === defaultYear)?.id ||
        loadedSemesters.find((semester) => semester.academic_year_id === defaultYear)?.id ||
        "";
      const defaultHalaqoh = loadedHalaqohs.find((halaqoh) => halaqoh.academic_year_id === defaultYear && halaqoh.semester_id === defaultSemester)?.id || loadedHalaqohs[0]?.id || "";
      const defaultStudent = loadedAssignments.find((assignment) => assignment.halaqoh_id === defaultHalaqoh)?.student_id || "";

      setYears(loadedYears);
      setSemesters(loadedSemesters);
      setHalaqohs(loadedHalaqohs);
      setAssignments(loadedAssignments);
      setSurahs((surahRes.data ?? []) as SurahRow[]);
      setPredicates((predicateRes.data ?? []) as PredicateRow[]);
      setProfile(profile);
      setSelectedYearId(defaultYear);
      setSelectedSemesterId(defaultSemester);
      setSelectedHalaqohId(defaultHalaqoh);
      setSelectedStudentId(defaultStudent);
      setMessage(profile?.role === "guru" ? "Data rapor guru berhasil dimuat sesuai halaqoh yang diampu." : "Data rapor berhasil dimuat.");
    }
    setLoading(false);
  }, []);

  const loadReportData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !selectedStudentId || !selectedYearId || !selectedSemesterId) return;
    const surahIds = selectedSurahs.map((surah) => surah.id);

    const [scoreRes, juziyahRes, reportRes] = await Promise.all([
      surahIds.length
        ? supabase.from("tahfidz_scores").select("surah_id,fluency_score,fashohah_score,tajwid_score,total_score").eq("student_id", selectedStudentId).eq("academic_year_id", selectedYearId).eq("semester_id", selectedSemesterId).in("surah_id", surahIds)
        : Promise.resolve({ data: [], error: null }),
      supabase.from("juziyah_scores").select("fluency_score,fashohah_score,tajwid_score,average_score,predicate").eq("student_id", selectedStudentId).eq("academic_year_id", selectedYearId).eq("semester_id", selectedSemesterId).eq("juz", selectedJuz).maybeSingle(),
      supabase.from("report_cards").select("id,report_date,note,coordinator_name,homeroom_teacher_name,status").eq("student_id", selectedStudentId).eq("academic_year_id", selectedYearId).eq("semester_id", selectedSemesterId).eq("juz", selectedJuz).maybeSingle(),
    ]);

    if (scoreRes.error || juziyahRes.error || reportRes.error) {
      notify(scoreRes.error?.message ?? juziyahRes.error?.message ?? reportRes.error?.message ?? "Gagal memuat nilai rapor.", "error");
      return;
    }

    const loadedReport = (reportRes.data as ReportRow | null) ?? null;
    setScores((scoreRes.data ?? []) as ScoreRow[]);
    setJuziyah((juziyahRes.data as JuziyahRow | null) ?? null);
    setReport(loadedReport);
    if (loadedReport) {
      setForm((current) => ({
        ...current,
        report_date: loadedReport.report_date,
        coordinator_name: loadedReport.coordinator_name,
        homeroom_teacher_name: loadedReport.homeroom_teacher_name,
        note: loadedReport.note,
      }));
    }
  }, [selectedJuz, selectedSemesterId, selectedStudentId, selectedSurahs, selectedYearId]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    void loadReportData();
  }, [loadReportData]);

  // Sinkronkan default form dengan school_settings (hanya jika user belum mengisi/mengubah).
  useEffect(() => {
    setForm((current) => ({
      ...current,
      coordinator_name: current.coordinator_name && current.coordinator_name !== "Maulidin Nafsir" ? current.coordinator_name : schoolSettings.default_coordinator_name,
      homeroom_teacher_name: current.homeroom_teacher_name && current.homeroom_teacher_name !== "Maulidin Nafsir" ? current.homeroom_teacher_name : schoolSettings.default_homeroom_name,
      note: current.note === defaultNote || !current.note ? schoolSettings.default_report_note : current.note,
      report_date: current.report_date || schoolSettings.default_report_date || new Date().toISOString().slice(0, 10),
    }));
  }, [schoolSettings.default_coordinator_name, schoolSettings.default_homeroom_name, schoolSettings.default_report_note, schoolSettings.default_report_date]);

  // Sinkronkan default form dengan preferensi guru saat preferensi berhasil dimuat.
  // Tiap guru punya preferensi sendiri (catatan, target, predikat) yang otomatis terisi.
  useEffect(() => {
    if (!preferencesLoaded) return;
    setForm((current) => ({
      ...current,
      // Catatan: pakai teacher pref kalau ada, kalau tidak biarkan apa adanya (school setting/default).
      note: teacherPreferences.default_note ?? current.note,
      target_class: current.target_class || teacherPreferences.default_target_class || "",
      target_semester: current.target_semester || teacherPreferences.default_target_semester || "",
      target_surah_range: current.target_surah_range || teacherPreferences.default_target_surah_range || "",
      predicate_descriptions:
        current.predicate_descriptions.length > 0
          ? current.predicate_descriptions
          : teacherPreferences.predicate_descriptions.length > 0
            ? teacherPreferences.predicate_descriptions
            : [],
    }));
  }, [preferencesLoaded, teacherPreferences]);

  useEffect(() => {
    setBulkReports([]);
  }, [selectedHalaqohId, selectedJuz, selectedSemesterId, selectedYearId]);

  async function saveReport() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !selectedStudentId || !selectedYearId || !selectedSemesterId) return;

    setLoading(true);
    const { error } = await supabase.from("report_cards").upsert(
      {
        student_id: selectedStudentId,
        juz: selectedJuz,
        academic_year_id: selectedYearId,
        semester_id: selectedSemesterId,
        report_date: form.report_date,
        note: form.note,
        coordinator_name: form.coordinator_name,
        homeroom_teacher_name: form.homeroom_teacher_name,
        // Pertahankan status existing jika sudah ada (jangan reset ke draft saat hanya simpan).
        status: report?.status ?? "draft",
      },
      { onConflict: "student_id,juz,academic_year_id,semester_id" },
    );

    if (error) {
      notify(error.message, "error");
    } else {
      notify("Draft rapor berhasil disimpan.");
      await loadReportData();
      setProgressRefreshKey((current) => current + 1);
    }
    setLoading(false);
  }

  // Simpan field "Catatan default", "Target", dan "Predikat" sebagai preferensi
  // user yang sedang login. Tiap guru punya preferensi sendiri.
  async function handleSaveAsPreference() {
    const result = await savePreferences({
      default_note: form.note?.trim() ? form.note : null,
      default_target_class: form.target_class?.trim() ? form.target_class : null,
      default_target_semester: form.target_semester?.trim() ? form.target_semester : null,
      default_target_surah_range: form.target_surah_range?.trim() ? form.target_surah_range : null,
      predicate_descriptions: form.predicate_descriptions,
    });
    if (result.success) {
      notify("Preferensi rapor berhasil disimpan untuk akun Anda.");
    } else {
      notify(result.message ?? "Gagal menyimpan preferensi.", "error");
    }
  }

  // Update satu field di satu baris predikat (range/label/description/italic_label).
  function updatePredicateRow<K extends keyof PredicateDescription>(index: number, key: K, value: PredicateDescription[K]) {
    setForm((current) => {
      const next = [...current.predicate_descriptions];
      const target = next[index];
      if (!target) return current;
      next[index] = { ...target, [key]: value };
      return { ...current, predicate_descriptions: next };
    });
  }

  async function transitionStatus(nextStatus: ReportStatus, friendlyLabel: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !report) {
      notify("Simpan draft rapor terlebih dahulu.", "info");
      return;
    }

    setLoading(true);
    const updates: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "validated") {
      updates.validated_at = new Date().toISOString();
      const user = await supabase.auth.getUser();
      updates.validated_by = user.data.user?.id ?? null;
    }
    if (nextStatus === "draft" || nextStatus === "needs_revision") {
      updates.validated_at = null;
      updates.validated_by = null;
    }

    const { error } = await supabase.from("report_cards").update(updates).eq("id", report.id);

    if (error) {
      notify(error.message, "error");
    } else {
      notify(`Rapor berhasil ${friendlyLabel}.`);
      await loadReportData();
      setProgressRefreshKey((current) => current + 1);
    }
    setLoading(false);
  }

  async function markAsPrinted() {
    if (report?.status === "validated") {
      await transitionStatus("printed", "ditandai tercetak");
    }
  }

  async function downloadDocx() {
    if (!selectedStudent) return;

    const response = await fetch("/api/reports/docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        juz: selectedJuz,
        studentName: selectedStudent.full_name,
        jilid: form.jilid,
        className: selectedHalaqoh?.classes?.name ?? "-",
        semester: selectedSemester?.name ?? "-",
        academicYear: selectedYear?.name ?? activePeriod.academic_year_name,
        reportDate: form.report_date,
        coordinatorName: form.coordinator_name,
        homeroomName: form.homeroom_teacher_name,
        note: form.note,
        institutionName: schoolSettings.institution_name,
        institutionAddress: schoolSettings.address,
        setoran: selectedSurahs.map((surah) => {
          const score = scoreBySurah.get(surah.id);
          return {
            no: surah.sort_order,
            surat: surah.name_latin,
            kelancaran: score?.fluency_score ?? "-",
            fashohah: score?.fashohah_score ?? "-",
            tajwid: score?.tajwid_score ?? "-",
            nilai: score?.total_score ?? "-",
          };
        }),
        juziyah: {
          juzLabel: `JUZ ${selectedJuz}`,
          kelancaran: juziyah?.fluency_score ?? "-",
          fashohah: juziyah?.fashohah_score ?? "-",
          tajwid: juziyah?.tajwid_score ?? "-",
          rata2: juziyah?.average_score ?? "-",
          predikat: juziyah?.predicate ?? getPredicate(juziyah?.average_score ?? 0, predicates),
        },
      }),
    });

    if (!response.ok) {
      notify("Gagal membuat file Word rapor.", "error");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rapor Juz ${selectedJuz} - ${selectedStudent.full_name}.docx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify("File Word rapor berhasil dibuat. Buka di Microsoft Word atau Google Docs.");
  }

  const buildBulkReportItems = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !selectedYearId || !selectedSemesterId || !selectedHalaqohId) return [];
    if (assignedStudents.length === 0) {
      if (!silent) notify("Belum ada santri aktif di halaqoh ini.", "info");
      return [];
    }

    const studentIds = assignedStudents.map((student) => student.id);
    const surahIds = selectedSurahs.map((surah) => surah.id);
    const [scoreRes, juziyahRes, reportRes] = await Promise.all([
      surahIds.length
        ? supabase
            .from("tahfidz_scores")
            .select("student_id,surah_id,fluency_score,fashohah_score,tajwid_score,total_score")
            .eq("academic_year_id", selectedYearId)
            .eq("semester_id", selectedSemesterId)
            .in("student_id", studentIds)
            .in("surah_id", surahIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("juziyah_scores")
        .select("student_id,fluency_score,fashohah_score,tajwid_score,average_score,predicate")
        .eq("academic_year_id", selectedYearId)
        .eq("semester_id", selectedSemesterId)
        .eq("juz", selectedJuz)
        .in("student_id", studentIds),
      supabase
        .from("report_cards")
        .select("student_id,id,report_date,note,coordinator_name,homeroom_teacher_name,status")
        .eq("academic_year_id", selectedYearId)
        .eq("semester_id", selectedSemesterId)
        .eq("juz", selectedJuz)
        .in("student_id", studentIds),
    ]);

    if (scoreRes.error || juziyahRes.error || reportRes.error) {
      notify(scoreRes.error?.message ?? juziyahRes.error?.message ?? reportRes.error?.message ?? "Gagal memuat data rapor massal.", "error");
      return [];
    }

    const scoresByStudent = new Map<string, BulkScoreRow[]>();
    for (const score of ((scoreRes.data as BulkScoreRow[] | null) ?? [])) {
      scoresByStudent.set(score.student_id, [...(scoresByStudent.get(score.student_id) ?? []), score]);
    }

    const juziyahByStudent = new Map(((juziyahRes.data as BulkJuziyahRow[] | null) ?? []).map((row) => [row.student_id, row]));
    const reportByStudent = new Map(((reportRes.data as BulkReportRow[] | null) ?? []).map((row) => [row.student_id, row]));

    return assignedStudents.map((student) => {
      const reportItem = reportByStudent.get(student.id);
      return {
        student,
        scoreBySurah: new Map((scoresByStudent.get(student.id) ?? []).map((score) => [score.surah_id, score])),
        juziyah: juziyahByStudent.get(student.id) ?? null,
        report: reportItem ?? null,
        form: {
          ...form,
          report_date: reportItem?.report_date ?? form.report_date,
          coordinator_name: reportItem?.coordinator_name ?? form.coordinator_name,
          homeroom_teacher_name: reportItem?.homeroom_teacher_name ?? form.homeroom_teacher_name,
          note: reportItem?.note ?? form.note,
        },
      } satisfies BulkReportItem;
    });
  }, [assignedStudents, form, selectedHalaqohId, selectedJuz, selectedSemesterId, selectedSurahs, selectedYearId]);

  useEffect(() => {
    let isActive = true;

    async function loadProgress() {
      if (!selectedYearId || !selectedSemesterId || !selectedHalaqohId) {
        setProgressRows([]);
        return;
      }

      setProgressLoading(true);
      const items = await buildBulkReportItems({ silent: true });
      if (!isActive) return;

      setProgressRows(buildProgressRows(items, selectedSurahs));
      setProgressLoading(false);
    }

    void loadProgress();

    return () => {
      isActive = false;
    };
  }, [buildBulkReportItems, progressRefreshKey, selectedHalaqohId, selectedSemesterId, selectedSurahs, selectedYearId]);

  function buildReportPayload(item: BulkReportItem): ReportDocxPayload {
    return {
      juz: selectedJuz,
      studentName: item.student.full_name,
      jilid: item.form.jilid,
      className: selectedHalaqoh?.classes?.name ?? "-",
      semester: selectedSemester?.name ?? "-",
      academicYear: selectedYear?.name ?? activePeriod.academic_year_name,
      reportDate: item.form.report_date,
      coordinatorName: item.form.coordinator_name,
      homeroomName: item.form.homeroom_teacher_name,
      note: item.form.note,
      institutionName: schoolSettings.institution_name,
      institutionAddress: schoolSettings.address,
      targetClass: item.form.target_class || undefined,
      targetSemester: item.form.target_semester || undefined,
      targetSurahRange: item.form.target_surah_range || undefined,
      predicateDescriptions: item.form.predicate_descriptions.length > 0 ? item.form.predicate_descriptions : undefined,
      setoran: selectedSurahs.map((surah) => {
        const score = item.scoreBySurah.get(surah.id);
        return {
          no: surah.sort_order,
          surat: surah.name_latin,
          kelancaran: score?.fluency_score ?? "-",
          fashohah: score?.fashohah_score ?? "-",
          tajwid: score?.tajwid_score ?? "-",
          nilai: score?.total_score ?? "-",
        };
      }),
      juziyah: {
        juzLabel: `JUZ ${selectedJuz}`,
        kelancaran: item.juziyah?.fluency_score ?? "-",
        fashohah: item.juziyah?.fashohah_score ?? "-",
        tajwid: item.juziyah?.tajwid_score ?? "-",
        rata2: item.juziyah?.average_score ?? "-",
        predikat: item.juziyah?.predicate ?? getPredicate(item.juziyah?.average_score ?? 0, predicates),
      },
    };
  }

  async function downloadBulkDocxZip() {
    if (!selectedYearId || !selectedSemesterId || !selectedHalaqohId) return;
    setLoading(true);
    try {
      const items = await buildBulkReportItems();
      if (items.length === 0) return;
      const latestProgressRows = buildProgressRows(items, selectedSurahs);
      setProgressRows(latestProgressRows);

      const incompleteCount = latestProgressRows.filter((row) => !row.isReady).length;
      if (incompleteCount > 0) {
        // Buka modal konfirmasi in-app, tunggu user keputuskan dulu.
        setPendingBulk({ action: "zip", rows: latestProgressRows });
        return;
      }

      await executeBulkZip(items);
    } finally {
      setLoading(false);
    }
  }

  async function executeBulkZip(items?: BulkReportItem[]) {
    setLoading(true);
    try {
      const finalItems = items ?? (await buildBulkReportItems());
      if (finalItems.length === 0) return;

      const response = await fetch("/api/reports/docx-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reports: finalItems.map(buildReportPayload) }),
      });

      if (!response.ok) {
        notify("Gagal membuat ZIP rapor Word.", "error");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Rapor Juz ${selectedJuz} - ${selectedHalaqoh?.name ?? "Halaqoh"}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify(`File ZIP berisi ${finalItems.length} rapor Word berhasil dibuat.`);
    } finally {
      setLoading(false);
    }
  }

  async function printBulkReports() {
    if (!selectedYearId || !selectedSemesterId || !selectedHalaqohId) return;
    setLoading(true);
    try {
      const items = await buildBulkReportItems();
      if (items.length === 0) return;
      const latestProgressRows = buildProgressRows(items, selectedSurahs);
      setProgressRows(latestProgressRows);

      const incompleteCount = latestProgressRows.filter((row) => !row.isReady).length;
      if (incompleteCount > 0) {
        setPendingBulk({ action: "print", rows: latestProgressRows });
        return;
      }

      executeBulkPrint(items);
    } finally {
      setLoading(false);
    }
  }

  function executeBulkPrint(items?: BulkReportItem[]) {
    void (async () => {
      setLoading(true);
      try {
        const finalItems = items ?? (await buildBulkReportItems());
        if (finalItems.length === 0) return;
        setBulkReports(finalItems);
        notify(`Mode cetak massal siap untuk ${finalItems.length} santri.`);
        window.setTimeout(() => window.print(), 350);
      } finally {
        setLoading(false);
      }
    })();
  }

  async function confirmPendingBulk() {
    if (!pendingBulk) return;
    const action = pendingBulk.action;
    setPendingBulk(null);
    if (action === "zip") await executeBulkZip();
    else executeBulkPrint();
  }

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}

      <ConfirmDialog
        cancelLabel="Lengkapi Dulu"
        confirmLabel={pendingBulk?.action === "zip" ? "Tetap Cetak Word Halaqoh" : "Tetap Cetak Browser Massal"}
        description={
          pendingBulk
            ? `Ada ${(summarizeIncompleteRows(pendingBulk.rows)?.incompleteCount ?? 0)} santri yang rapornya belum lengkap. Anda yakin tetap lanjut?`
            : ""
        }
        detail={pendingBulk ? summarizeIncompleteRows(pendingBulk.rows)?.summary : undefined}
        loading={loading}
        onCancel={() => {
          setPendingBulk(null);
          notify(pendingBulk?.action === "zip" ? "Cetak Word Halaqoh dibatalkan." : "Cetak browser massal dibatalkan.", "info");
        }}
        onConfirm={confirmPendingBulk}
        open={Boolean(pendingBulk)}
        title={pendingBulk?.action === "zip" ? "Cetak Word Halaqoh dengan data tidak lengkap" : "Cetak Browser Massal dengan data tidak lengkap"}
        tone="default"
      />

      <ContextBar
        chips={[
          ...(selectedYear ? [{ label: "TA", value: selectedYear.name, tone: "primary" as const }] : []),
          ...(selectedSemester ? [{ label: "Sem", value: selectedSemester.name, tone: "primary" as const }] : []),
          ...(selectedHalaqoh ? [{ label: "Halaqoh", value: `${selectedHalaqoh.name} (${selectedHalaqoh.classes?.name ?? "-"})`, tone: "neutral" as const }] : []),
          ...(selectedStudent ? [{ label: "Santri", value: selectedStudent.full_name, tone: "neutral" as const }] : []),
          { label: "Rapor", value: `Juz ${selectedJuz}`, tone: "primary" as const },
        ]}
      />

      <Card className="no-print">
        <SectionHeader
          title="Filter Rapor"
          description={message}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button className="w-full sm:w-auto" disabled={loading || !selectedStudentId} onClick={saveReport} type="button" variant="secondary">
                <Save size={18} />
                Simpan Draft
              </Button>
              <Button className="w-full sm:w-auto" disabled={!selectedStudentId} onClick={downloadDocx} type="button">
                <FileDown size={18} />
                Cetak Word (Santri Ini)
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={loading || assignedStudents.length === 0}
                onClick={downloadBulkDocxZip}
                type="button"
                variant="secondary"
              >
                <FolderArchive size={18} />
                Cetak Word Halaqoh (ZIP)
              </Button>
              <ActionMenu
                items={[
                  {
                    label: "Cetak Browser (Santri Ini)",
                    icon: <Printer size={16} />,
                    onSelect: () => window.print(),
                    disabled: !selectedStudentId,
                  },
                  {
                    label: "Cetak Browser Halaqoh (Massal)",
                    icon: <Printer size={16} />,
                    onSelect: () => void printBulkReports(),
                    disabled: loading || assignedStudents.length === 0,
                  },
                  ...(bulkReports.length > 0
                    ? [{
                        label: "Tutup Mode Cetak Massal",
                        onSelect: () => setBulkReports([]),
                      }]
                    : []),
                  {
                    label: "Muat Ulang Data",
                    icon: <RefreshCw size={16} />,
                    onSelect: () => void loadBaseData(),
                    disabled: loading,
                  },
                ]}
              />
            </div>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
            <Select value={selectedHalaqohId} onChange={(event) => {
              setSelectedHalaqohId(event.target.value);
              setSelectedStudentId(assignments.find((assignment) => assignment.halaqoh_id === event.target.value)?.student_id ?? "");
            }}>
              {activeHalaqohs.map((halaqoh) => <option key={halaqoh.id} value={halaqoh.id}>{halaqoh.name} ({halaqoh.classes?.name ?? "-"})</option>)}
            </Select>
          </Field>
          <Field label="Santri">
            <Select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
              {assignedStudents.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
            </Select>
          </Field>
          <Field label="Jenis Rapor">
            <Select value={selectedJuz} onChange={(event) => setSelectedJuz(Number(event.target.value) as 29 | 30)}>
              <option value={29}>Rapor Juz 29</option>
              <option value={30}>Rapor Juz 30</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="no-print">
        <SectionHeader
          title="Kelengkapan Rapor Halaqoh"
          description={
            progressLoading
              ? "Mengecek kelengkapan nilai santri..."
              : `${progressSummary.ready} dari ${progressRows.length} santri siap cetak untuk Rapor Juz ${selectedJuz}.`
          }
          action={
            <Button disabled={progressLoading || loading} onClick={() => setProgressRefreshKey((current) => current + 1)} type="button" variant="secondary">
              <RefreshCw size={18} />
              Cek Ulang
            </Button>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ProgressStat label="Siap Cetak" value={progressSummary.ready} tone="success" />
          <ProgressStat label="Setoran Belum Lengkap" value={progressSummary.incompleteSetoran} tone="warning" />
          <ProgressStat label="Belum Juziyah" value={progressSummary.missingJuziyah} tone="warning" />
          <ProgressStat label="Belum Draft Rapor" value={progressSummary.missingReport} tone="warning" />
        </div>
        <div className="mt-4 overflow-x-auto rounded-md border border-[var(--line)]">
          <div className="border-b border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-[var(--muted)] sm:hidden">
            Geser tabel ke samping untuk melihat semua status.
          </div>
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-[var(--surface-soft)] text-left text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="px-3 py-3">Santri</th>
                <th className="px-3 py-3">Setoran</th>
                <th className="px-3 py-3">Juziyah</th>
                <th className="px-3 py-3">Draft Rapor</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {progressRows.map((row) => (
                <tr key={row.student.id} className="border-t border-[var(--line)]">
                  <td className="px-3 py-3 font-semibold">{row.student.full_name}</td>
                  <td className="px-3 py-3">
                    <span className={row.setoranCount === row.setoranTotal ? "text-[var(--primary)]" : "text-[var(--warning)]"}>
                      {row.setoranCount}/{row.setoranTotal} surat
                    </span>
                  </td>
                  <td className="px-3 py-3">{row.hasJuziyah ? <StatusBadge label="Ada" tone="success" /> : <StatusBadge label="Belum" tone="warning" />}</td>
                  <td className="px-3 py-3">{row.hasReport ? <StatusBadge label="Ada" tone="success" /> : <StatusBadge label="Belum" tone="warning" />}</td>
                  <td className="px-3 py-3">
                    {row.isReady ? <StatusBadge icon="check" label="Siap" tone="success" /> : <StatusBadge icon="alert" label="Lengkapi" tone="warning" />}
                  </td>
                </tr>
              ))}
              {progressRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-[var(--muted)]" colSpan={5}>
                    Belum ada santri aktif pada filter ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="no-print">
        <SectionHeader
          title="Metadata Rapor"
          description="Tahapan: Draft â†’ Ajukan validasi â†’ Validasi â†’ Tandai tercetak. Status menentukan siapa yang boleh mengubah rapor."
        />
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Badge tone={statusTones[(report?.status as ReportStatus) ?? "draft"]}>
            <FileSignature size={14} className="mr-1.5" />
            {statusLabels[(report?.status as ReportStatus) ?? "draft"]}
          </Badge>
          {report?.status === "validated" || report?.status === "printed" ? (
            <span className="text-xs text-[var(--muted)]">Rapor terkunci. Hanya admin/koordinator yang dapat mengubah.</span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Tanggal Rapor">
            <Input type="date" value={form.report_date} onChange={(event) => setForm((current) => ({ ...current, report_date: event.target.value }))} />
          </Field>
          <Field label="Jilid">
            <Input value={form.jilid} onChange={(event) => setForm((current) => ({ ...current, jilid: event.target.value }))} placeholder="Opsional" />
          </Field>
          <Field label="Koordinator">
            <Input value={form.coordinator_name} onChange={(event) => setForm((current) => ({ ...current, coordinator_name: event.target.value }))} />
          </Field>
          <Field label="Wali Kelas">
            <Input value={form.homeroom_teacher_name} onChange={(event) => setForm((current) => ({ ...current, homeroom_teacher_name: event.target.value }))} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Catatan">
            <Textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
          </Field>
        </div>

        {/* Keterangan target Tahfizul Quran (tampil di bawah tabel rapor sebelum tanda tangan).
            Kosongkan untuk pakai default template. */}
        <div className="mt-5 rounded-md border border-[var(--line)] bg-[var(--surface-soft)]/50 p-4">
          <p className="mb-1 text-sm font-bold text-[var(--foreground)]">Keterangan Target Tahfizul Quran</p>
          <p className="mb-3 text-xs leading-5 text-[var(--muted)]">
            Akan tampil sebagai &quot;Target Tahfizul Quran Kelas <em>X</em> Semester <em>Y</em> adalah <em>Z</em>&quot; di bawah tabel rapor. Kosongkan untuk pakai default template.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Kelas Target">
              <Input
                onChange={(event) => setForm((current) => ({ ...current, target_class: event.target.value }))}
                placeholder="Contoh: 4"
                value={form.target_class}
              />
            </Field>
            <Field label="Semester Target">
              <Input
                onChange={(event) => setForm((current) => ({ ...current, target_semester: event.target.value }))}
                placeholder="Contoh: I"
                value={form.target_semester}
              />
            </Field>
            <Field label="Range Surat Target">
              <Input
                onChange={(event) => setForm((current) => ({ ...current, target_surah_range: event.target.value }))}
                placeholder="Contoh: Surat An-Nas s.d 'Abasa"
                value={form.target_surah_range}
              />
            </Field>
          </div>
        </div>

        {/* Keterangan Predikat Nilai (4 baris). Tampil di bawah keterangan target. */}
        <div className="mt-4 rounded-md border border-[var(--line)] bg-[var(--surface-soft)]/50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">Keterangan Predikat Nilai</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Akan tampil sebagai 4 baris di bawah keterangan target. Boleh dikosongkan untuk pakai default template.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={form.predicate_descriptions.length > 0}
                onClick={() => setForm((current) => ({ ...current, predicate_descriptions: [...FALLBACK_PREDICATE_DESCRIPTIONS] }))}
                size="sm"
                type="button"
                variant="secondary"
              >
                <ListChecks size={14} />
                Pakai Template Default
              </Button>
              {form.predicate_descriptions.length > 0 ? (
                <Button
                  onClick={() => setForm((current) => ({ ...current, predicate_descriptions: [] }))}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 size={14} />
                  Hapus Override
                </Button>
              ) : null}
            </div>
          </div>

          {form.predicate_descriptions.length === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-center text-xs text-[var(--muted)]">
              Belum ada override. Template asli akan dipakai. Klik &quot;Pakai Template Default&quot; untuk mulai mengedit.
            </p>
          ) : (
            <div className="space-y-2">
              {form.predicate_descriptions.map((row, index) => (
                <div className="grid gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 sm:grid-cols-[110px_140px_1fr_auto] sm:items-center" key={index}>
                  <Input
                    onChange={(event) => updatePredicateRow(index, "range", event.target.value)}
                    placeholder="≥ 95"
                    value={row.range}
                  />
                  <Input
                    onChange={(event) => updatePredicateRow(index, "label", event.target.value)}
                    placeholder="Mumtaz"
                    value={row.label}
                  />
                  <Input
                    onChange={(event) => updatePredicateRow(index, "description", event.target.value)}
                    placeholder="Sempurna"
                    value={row.description}
                  />
                  <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
                    <input
                      checked={row.italic_label}
                      className="size-4"
                      onChange={(event) => updatePredicateRow(index, "italic_label", event.target.checked)}
                      type="checkbox"
                    />
                    Italic label
                  </label>
                </div>
              ))}
              <p className="text-xs text-[var(--muted)]">
                Format hasil: <code className="rounded bg-[var(--surface)] px-1 py-0.5">[range]</code> = <code className="rounded bg-[var(--surface)] px-1 py-0.5">[label]</code> (<code className="rounded bg-[var(--surface)] px-1 py-0.5">[deskripsi]</code>)
              </p>
            </div>
          )}
        </div>

        {/* Tombol simpan sebagai preferensi user. Hanya muncul kalau ada perubahan dari preferensi yang tersimpan. */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-[var(--surface-soft)]/40 p-3">
          <p className="text-xs leading-5 text-[var(--muted)]">
            <strong className="text-[var(--foreground)]">Simpan sebagai default Anda?</strong>
            {" "}Catatan, target Tahfizul Quran, dan keterangan predikat di atas bisa Anda simpan sebagai preferensi pribadi sehingga otomatis terisi setiap kali buat rapor baru.
          </p>
          <Button
            disabled={savingPreferences}
            onClick={handleSaveAsPreference}
            size="sm"
            type="button"
            variant="secondary"
          >
            <BookmarkPlus size={14} />
            {savingPreferences ? "Menyimpan..." : "Simpan Preferensi Saya"}
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
          {report && report.status === "draft" ? (
            <Button disabled={loading} onClick={() => transitionStatus("waiting_validation", "diajukan untuk validasi")} type="button" variant="secondary">
              <Send size={18} />
              Ajukan Validasi
            </Button>
          ) : null}
          {report && report.status === "waiting_validation" && (profile?.role === "admin" || profile?.role === "koordinator") ? (
            <>
              <Button disabled={loading} onClick={() => transitionStatus("validated", "divalidasi")} type="button" variant="success">
                <CheckCircle2 size={18} />
                Validasi Rapor
              </Button>
              <Button disabled={loading} onClick={() => transitionStatus("needs_revision", "dikembalikan untuk revisi")} type="button" variant="danger">
                <AlertCircle size={18} />
                Minta Revisi
              </Button>
            </>
          ) : null}
          {report && report.status === "needs_revision" ? (
            <Button disabled={loading} onClick={() => transitionStatus("draft", "diubah jadi draft")} type="button" variant="secondary">
              Kembali ke Draft
            </Button>
          ) : null}
          {report && report.status === "validated" ? (
            <>
              <Button disabled={loading} onClick={markAsPrinted} type="button" variant="success">
                <Printer size={18} />
                Tandai Tercetak
              </Button>
              {(profile?.role === "admin" || profile?.role === "koordinator") ? (
                <Button disabled={loading} onClick={() => transitionStatus("draft", "dibuka kembali")} type="button" variant="secondary">
                  <Unlock size={18} />
                  Buka Kembali
                </Button>
              ) : null}
            </>
          ) : null}
          {report && report.status === "printed" && (profile?.role === "admin" || profile?.role === "koordinator") ? (
            <Button disabled={loading} onClick={() => transitionStatus("validated", "dibuka dari status tercetak")} type="button" variant="secondary">
              <Lock size={18} />
              Kembali ke Tervalidasi
            </Button>
          ) : null}
        </div>
      </Card>

      {bulkReports.length > 0 ? (
        <div className="space-y-8">
          {bulkReports.map((item) => (
            <DocxPreviewClient
              cacheKey={`${item.student.id}-${selectedJuz}-${item.form.report_date}`}
              key={item.student.id}
              payload={buildReportPayload(item)}
            />
          ))}
        </div>
      ) : selectedStudent ? (
        <DocxPreviewClient
          cacheKey={`${selectedStudent.id}-${selectedJuz}-${selectedYearId}-${selectedSemesterId}-${form.report_date}-${form.jilid}-${form.coordinator_name}-${form.homeroom_teacher_name}-${form.note}-${form.target_class}-${form.target_semester}-${form.target_surah_range}-${JSON.stringify(form.predicate_descriptions)}-${scores.length}-${juziyah?.average_score ?? ""}-${schoolSettings.institution_name}`}
          payload={{
            juz: selectedJuz,
            studentName: selectedStudent.full_name,
            jilid: form.jilid,
            className: selectedHalaqoh?.classes?.name ?? "-",
            semester: selectedSemester?.name ?? "-",
            academicYear: selectedYear?.name ?? activePeriod.academic_year_name,
            reportDate: form.report_date,
            coordinatorName: form.coordinator_name,
            homeroomName: form.homeroom_teacher_name,
            note: form.note,
            institutionName: schoolSettings.institution_name,
            institutionAddress: schoolSettings.address,
            targetClass: form.target_class || undefined,
            targetSemester: form.target_semester || undefined,
            targetSurahRange: form.target_surah_range || undefined,
            predicateDescriptions: form.predicate_descriptions.length > 0 ? form.predicate_descriptions : undefined,
            setoran: selectedSurahs.map((surah) => {
              const score = scoreBySurah.get(surah.id);
              return {
                no: surah.sort_order,
                surat: surah.name_latin,
                kelancaran: score?.fluency_score ?? "-",
                fashohah: score?.fashohah_score ?? "-",
                tajwid: score?.tajwid_score ?? "-",
                nilai: score?.total_score ?? "-",
              };
            }),
            juziyah: {
              juzLabel: `JUZ ${selectedJuz}`,
              kelancaran: juziyah?.fluency_score ?? "-",
              fashohah: juziyah?.fashohah_score ?? "-",
              tajwid: juziyah?.tajwid_score ?? "-",
              rata2: juziyah?.average_score ?? "-",
              predikat: juziyah?.predicate ?? getPredicate(juziyah?.average_score ?? 0, predicates),
            },
          }}
        />
      ) : (
        <DocxPreviewClient payload={null} />
      )}
    </div>
  );

  function notify(messageText: string, tone: "success" | "error" | "info" = "success") {
    setMessage(messageText);
    setToast({ message: messageText, tone });
    window.setTimeout(() => setToast(null), 5000);
  }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
}

function buildProgressRows(items: BulkReportItem[], surahs: SurahRow[]): ProgressRow[] {
  return items.map((item) => {
    const setoranCount = surahs.filter((surah) => item.scoreBySurah.has(surah.id)).length;
    const hasJuziyah = Boolean(item.juziyah);
    const hasReport = Boolean(item.report);
    return {
      student: item.student,
      setoranCount,
      setoranTotal: surahs.length,
      hasJuziyah,
      hasReport,
      isReady: setoranCount === surahs.length && hasJuziyah && hasReport,
    };
  });
}

function summarizeIncompleteRows(rows: ProgressRow[]) {
  const incompleteRows = rows.filter((row) => !row.isReady);
  if (incompleteRows.length === 0) return null;

  const missingSetoran = incompleteRows.filter((row) => row.setoranCount < row.setoranTotal).length;
  const missingJuziyah = incompleteRows.filter((row) => !row.hasJuziyah).length;
  const missingReport = incompleteRows.filter((row) => !row.hasReport).length;
  const sampleNames = incompleteRows.slice(0, 6).map((row) => `- ${row.student.full_name}`).join("\n");
  const moreText = incompleteRows.length > 6 ? `\n- dan ${incompleteRows.length - 6} santri lainnya` : "";

  return {
    incompleteCount: incompleteRows.length,
    summary: [
      `Setoran belum lengkap: ${missingSetoran} santri`,
      `Belum juziyah: ${missingJuziyah} santri`,
      `Belum draft rapor: ${missingReport} santri`,
      "",
      "Contoh santri yang belum lengkap:",
      sampleNames + moreText,
    ].join("\n"),
  };
}

function ProgressStat({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--muted)]">{label}</p>
      <p className={tone === "success" ? "mt-2 text-3xl font-bold text-[var(--primary)]" : "mt-2 text-3xl font-bold text-[var(--warning)]"}>{value}</p>
    </div>
  );
}

function StatusBadge({ icon, label, tone }: { icon?: "check" | "alert"; label: string; tone: "success" | "warning" }) {
  const Icon = icon === "alert" ? AlertCircle : CheckCircle2;
  return (
    <span
      className={
        tone === "success"
          ? "inline-flex min-h-8 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
          : "inline-flex min-h-8 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
      }
    >
      {icon ? <Icon size={16} /> : null}
      {label}
    </span>
  );
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
  return { ...row, students: Array.isArray(row.students) ? row.students[0] ?? null : row.students };
}

function getPredicate(score: number, predicates: PredicateRow[]) {
  return predicates.find((predicate) => score >= (predicate.min_score ?? Number.NEGATIVE_INFINITY) && score <= (predicate.max_score ?? Number.POSITIVE_INFINITY))?.label ?? "-";
}
