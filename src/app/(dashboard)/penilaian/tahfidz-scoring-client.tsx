"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, RefreshCw, Save, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { ContextBar } from "@/components/ui/context-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { DataTable } from "@/components/ui/table";
import { Toast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TahfidzMobileCards } from "./tahfidz-mobile-cards";

type AcademicYearRow = {
  id: string;
  name: string;
  is_active: boolean;
};

type SemesterRow = {
  id: string;
  name: string;
  academic_year_id: string;
  is_active: boolean;
};

type HalaqohRow = {
  id: string;
  name: string;
  academic_year_id: string;
  semester_id: string;
  is_active: boolean;
  classes: { name: string } | null;
  teachers: { full_name: string; title: string | null; id: string } | null;
};

type HalaqohQueryRow = Omit<HalaqohRow, "classes" | "teachers"> & {
  classes: { name: string }[] | { name: string } | null;
  teachers: { id: string; full_name: string; title: string | null }[] | { id: string; full_name: string; title: string | null } | null;
};

type StudentRow = {
  id: string;
  full_name: string;
  gender: "male" | "female";
};

type AssignmentRow = {
  id: string;
  student_id: string;
  halaqoh_id: string;
  is_active: boolean;
  students: StudentRow | null;
};

type AssignmentQueryRow = Omit<AssignmentRow, "students"> & {
  students: StudentRow[] | StudentRow | null;
};

type SurahRow = {
  id: string;
  juz: 29 | 30;
  sort_order: number;
  name_latin: string;
  show_in_report: boolean;
};

type AssessmentTypeRow = {
  id: string;
  code: string;
  name: string;
  max_score: number;
  passing_min_score: number | null;
  max_fluency_mistakes: number | null;
  version: number;
};

type ComponentRow = {
  id: string;
  assessment_type_id: string;
  code: string;
  name: string;
  max_score: number;
  input_mode: "direct_score" | "mistake_deduction" | "per_item";
  deduction_per_mistake: number | null;
  sort_order: number;
};

type PredicateRow = {
  min_score: number | null;
  max_score: number | null;
  label: string;
};

type ScoreRow = {
  id: string;
  student_id: string;
  surah_id: string;
  academic_year_id: string;
  semester_id: string;
  fluency_mistakes: number | null;
  fluency_score: number;
  fashohah_score: number;
  tajwid_score: number;
  total_score: number;
  passed: boolean;
  note: string | null;
  assessment_type_id: string | null;
  assessment_version: number;
  locked_at: string | null;
};

type ScoreDraft = {
  fluency_mistakes: string;
  fluency_score: string;
  fashohah_score: string;
  tajwid_score: string;
  note: string;
};

type UserProfileRow = {
  role: string;
  teacher_id: string | null;
  is_active: boolean;
};

const emptyDraft: ScoreDraft = {
  fluency_mistakes: "",
  fluency_score: "",
  fashohah_score: "",
  tajwid_score: "",
  note: "",
};

export function TahfidzScoringClient() {
  const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
  const [semesters, setSemesters] = useState<SemesterRow[]>([]);
  const [halaqohs, setHalaqohs] = useState<HalaqohRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [surahs, setSurahs] = useState<SurahRow[]>([]);
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentTypeRow[]>([]);
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [predicates, setPredicates] = useState<PredicateRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedHalaqohId, setSelectedHalaqohId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedJuz, setSelectedJuz] = useState<29 | 30>(29);
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>({});
  const [message, setMessage] = useState("Login sebagai admin/guru untuk input nilai tahfidz.");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  const activeHalaqohs = useMemo(
    () => halaqohs.filter((halaqoh) => halaqoh.is_active && (!selectedYearId || halaqoh.academic_year_id === selectedYearId) && (!selectedSemesterId || halaqoh.semester_id === selectedSemesterId)),
    [halaqohs, selectedSemesterId, selectedYearId],
  );

  const assignedStudents = useMemo(() => {
    return assignments
      .filter((assignment) => assignment.is_active && assignment.halaqoh_id === selectedHalaqohId && assignment.students)
      .map((assignment) => assignment.students as StudentRow)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [assignments, selectedHalaqohId]);

  const selectedAssessment = useMemo(() => {
    const code = selectedJuz === 29 ? "tahfidz_juz29" : "tahfidz_juz30";
    return assessmentTypes.find((type) => type.code === code);
  }, [assessmentTypes, selectedJuz]);

  const selectedComponents = useMemo(() => {
    return components.filter((component) => component.assessment_type_id === selectedAssessment?.id).sort((a, b) => a.sort_order - b.sort_order);
  }, [components, selectedAssessment?.id]);

  const selectedSurahs = useMemo(() => surahs.filter((surah) => surah.juz === selectedJuz && surah.show_in_report).sort((a, b) => a.sort_order - b.sort_order), [selectedJuz, surahs]);

  const scoreBySurah = useMemo(() => {
    return new Map(scores.map((score) => [score.surah_id, score]));
  }, [scores]);

  const loadBaseData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Environment Supabase belum lengkap.");
      return;
    }

    setLoading(true);
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      setMessage("Belum login. Masuk dulu agar RLS Supabase memberi akses data.");
      setLoading(false);
      return;
    }

    const [profileRes, yearRes, semesterRes, halaqohRes, assignmentRes, surahRes, typeRes, componentRes, predicateRes] = await Promise.all([
      supabase.from("profiles").select("role,teacher_id,is_active").eq("id", user.data.user.id).maybeSingle(),
      supabase.from("academic_years").select("id,name,is_active").order("name"),
      supabase.from("semesters").select("id,name,academic_year_id,is_active").order("name"),
      supabase.from("halaqohs").select("id,name,academic_year_id,semester_id,is_active,classes(name),teachers(id,full_name,title)").order("name"),
      supabase.from("student_halaqohs").select("id,student_id,halaqoh_id,is_active,students(id,full_name,gender)").eq("is_active", true),
      supabase.from("surahs").select("id,juz,sort_order,name_latin,show_in_report").order("juz").order("sort_order"),
      supabase.from("assessment_types").select("id,code,name,max_score,passing_min_score,max_fluency_mistakes,version").in("code", ["tahfidz_juz29", "tahfidz_juz30"]),
      supabase.from("assessment_components").select("id,assessment_type_id,code,name,max_score,input_mode,deduction_per_mistake,sort_order").order("sort_order"),
      supabase.from("predicate_rules").select("min_score,max_score,label").is("assessment_type_id", null).order("sort_order"),
    ]);

    if (profileRes.error || yearRes.error || semesterRes.error || halaqohRes.error || assignmentRes.error || surahRes.error || typeRes.error || componentRes.error || predicateRes.error) {
      notify(
        profileRes.error?.message ??
          yearRes.error?.message ??
          semesterRes.error?.message ??
          halaqohRes.error?.message ??
          assignmentRes.error?.message ??
          surahRes.error?.message ??
          typeRes.error?.message ??
          componentRes.error?.message ??
          predicateRes.error?.message ??
          "Gagal memuat data penilaian.",
        "error",
      );
    } else {
      const loadedYears = (yearRes.data ?? []) as AcademicYearRow[];
      const loadedSemesters = (semesterRes.data ?? []) as SemesterRow[];
      const profile = (profileRes.data as UserProfileRow | null) ?? null;
      const loadedHalaqohs = filterHalaqohsForProfile(((halaqohRes.data as HalaqohQueryRow[] | null) ?? []).map(normalizeHalaqohRow), profile);
      const visibleHalaqohIds = new Set(loadedHalaqohs.map((halaqoh) => halaqoh.id));
      const defaultYearId = selectedYearId || loadedYears.find((year) => year.is_active)?.id || loadedYears[0]?.id || "";
      const defaultSemesterId =
        selectedSemesterId ||
        loadedSemesters.find((semester) => semester.is_active && semester.academic_year_id === defaultYearId)?.id ||
        loadedSemesters.find((semester) => semester.academic_year_id === defaultYearId)?.id ||
        loadedSemesters[0]?.id ||
        "";
      const defaultHalaqohId = selectedHalaqohId || loadedHalaqohs.find((halaqoh) => halaqoh.academic_year_id === defaultYearId && halaqoh.semester_id === defaultSemesterId)?.id || loadedHalaqohs[0]?.id || "";
      const loadedAssignments = ((assignmentRes.data as AssignmentQueryRow[] | null) ?? [])
        .map(normalizeAssignmentRow)
        .filter((assignment) => visibleHalaqohIds.has(assignment.halaqoh_id));
      const defaultStudentId =
        selectedStudentId ||
        loadedAssignments.find((assignment) => assignment.halaqoh_id === defaultHalaqohId)?.student_id ||
        loadedAssignments[0]?.student_id ||
        "";

      setAcademicYears(loadedYears);
      setSemesters(loadedSemesters);
      setHalaqohs(loadedHalaqohs);
      setAssignments(loadedAssignments);
      setSurahs((surahRes.data ?? []) as SurahRow[]);
      setAssessmentTypes((typeRes.data ?? []) as AssessmentTypeRow[]);
      setComponents((componentRes.data ?? []) as ComponentRow[]);
      setPredicates((predicateRes.data ?? []) as PredicateRow[]);
      setProfile(profile);
      setSelectedYearId(defaultYearId);
      setSelectedSemesterId(defaultSemesterId);
      setSelectedHalaqohId(defaultHalaqohId);
      setSelectedStudentId(defaultStudentId);
      setMessage(profile?.role === "guru" ? "Data penilaian guru berhasil dimuat sesuai halaqoh yang diampu." : "Data penilaian berhasil dimuat.");
    }

    setLoading(false);
  }, [selectedHalaqohId, selectedSemesterId, selectedStudentId, selectedYearId]);

  const loadScores = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !selectedStudentId || !selectedYearId || !selectedSemesterId) {
      setScores([]);
      setDrafts({});
      return;
    }

    const surahIds = selectedSurahs.map((surah) => surah.id);
    if (surahIds.length === 0) {
      setScores([]);
      setDrafts({});
      return;
    }

    const { data, error } = await supabase
      .from("tahfidz_scores")
      .select("*")
      .eq("student_id", selectedStudentId)
      .eq("academic_year_id", selectedYearId)
      .eq("semester_id", selectedSemesterId)
      .in("surah_id", surahIds);

    if (error) {
      notify(error.message, "error");
      return;
    }

    const loadedScores = (data ?? []) as ScoreRow[];
    setScores(loadedScores);
    setDrafts(buildDrafts(selectedSurahs, loadedScores, selectedComponents));
  }, [selectedComponents, selectedSemesterId, selectedStudentId, selectedSurahs, selectedYearId]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    void loadScores();
  }, [loadScores]);

  function updateDraft(surahId: string, field: keyof ScoreDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [surahId]: {
        ...(current[surahId] ?? emptyDraft),
        [field]: value,
      },
    }));
  }

  async function saveSurahScore(surah: SurahRow) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !selectedStudentId || !selectedYearId || !selectedSemesterId || !selectedAssessment) return;

    const draft = drafts[surah.id] ?? emptyDraft;
    const totals = calculateTahfidzTotal(draft, selectedComponents, selectedAssessment);
    const selectedHalaqoh = halaqohs.find((halaqoh) => halaqoh.id === selectedHalaqohId);

    setLoading(true);
    const { error } = await supabase.from("tahfidz_scores").upsert(
      {
        student_id: selectedStudentId,
        surah_id: surah.id,
        academic_year_id: selectedYearId,
        semester_id: selectedSemesterId,
        fluency_mistakes: toNullableInteger(draft.fluency_mistakes),
        fluency_score: totals.fluency,
        fashohah_score: totals.fashohah,
        tajwid_score: totals.tajwid,
        total_score: totals.total,
        passed: totals.passed,
        note: draft.note.trim() || null,
        assessed_by: selectedHalaqoh?.teachers?.id ?? null,
        assessment_type_id: selectedAssessment.id,
        assessment_version: selectedAssessment.version,
      },
      { onConflict: "student_id,surah_id,academic_year_id,semester_id" },
    );

    if (error) {
      notify(error.message, "error");
    } else {
      notify(`Nilai ${surah.name_latin} berhasil disimpan.`);
      await loadScores();
    }

    setLoading(false);
  }

  async function setSurahLock(surah: SurahRow, locked: boolean) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const score = scoreBySurah.get(surah.id);
    if (!score) {
      notify("Simpan nilai dulu sebelum mengunci.", "info");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("tahfidz_scores")
      .update({ locked_at: locked ? new Date().toISOString() : null })
      .eq("id", score.id);

    if (error) {
      notify(error.message, "error");
    } else {
      notify(locked ? `Nilai ${surah.name_latin} dikunci.` : `Kunci nilai ${surah.name_latin} dibuka.`);
      await loadScores();
    }
    setLoading(false);
  }

  async function saveAllScores() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !selectedStudentId || !selectedYearId || !selectedSemesterId || !selectedAssessment) return;

    const selectedHalaqoh = halaqohs.find((halaqoh) => halaqoh.id === selectedHalaqohId);
    const payload = selectedSurahs.map((surah) => {
      const draft = drafts[surah.id] ?? emptyDraft;
      const totals = calculateTahfidzTotal(draft, selectedComponents, selectedAssessment);

      return {
        student_id: selectedStudentId,
        surah_id: surah.id,
        academic_year_id: selectedYearId,
        semester_id: selectedSemesterId,
        fluency_mistakes: toNullableInteger(draft.fluency_mistakes),
        fluency_score: totals.fluency,
        fashohah_score: totals.fashohah,
        tajwid_score: totals.tajwid,
        total_score: totals.total,
        passed: totals.passed,
        note: draft.note.trim() || null,
        assessed_by: selectedHalaqoh?.teachers?.id ?? null,
        assessment_type_id: selectedAssessment.id,
        assessment_version: selectedAssessment.version,
      };
    });

    setLoading(true);
    const { error } = await supabase.from("tahfidz_scores").upsert(payload, {
      onConflict: "student_id,surah_id,academic_year_id,semester_id",
    });

    if (error) {
      notify(error.message, "error");
    } else {
      notify("Semua nilai surat berhasil disimpan.");
      await loadScores();
    }

    setLoading(false);
  }

  const filledCount = selectedSurahs.filter((surah) => scoreBySurah.has(surah.id)).length;
  const selectedStudent = assignedStudents.find((student) => student.id === selectedStudentId);
  const isSupervisor = profile?.role === "admin" || profile?.role === "koordinator";
  const fluencyMax = getComponentMax(selectedComponents, "kelancaran", 25);
  const fashohahMax = getComponentMax(selectedComponents, "fashohah", 25);
  const tajwidMax = getComponentMax(selectedComponents, "tajwid", 50);
  const fluencyComponent = getComponent(selectedComponents, "kelancaran");
  const fluencyUsesMistakeDeduction = fluencyComponent?.input_mode === "mistake_deduction";
  const fluencyDeduction = getDeductionPerMistake(fluencyComponent);

  const surahById = useMemo(() => new Map(selectedSurahs.map((surah) => [surah.id, surah])), [selectedSurahs]);

  const mobileItems = selectedSurahs.map((surah) => {
    const draft = drafts[surah.id] ?? emptyDraft;
    const totals = selectedAssessment ? calculateTahfidzTotal(draft, selectedComponents, selectedAssessment) : { total: 0, passed: false, fluency: 0, fashohah: 0, tajwid: 0 };
    const predicate = getPredicate(totals.total, predicates);
    const existing = scoreBySurah.get(surah.id);

    return {
      id: surah.id,
      sortOrder: surah.sort_order,
      nameLatin: surah.name_latin,
      draft,
      total: totals.total,
      fluency: totals.fluency,
      fashohah: totals.fashohah,
      tajwid: totals.tajwid,
      predicate,
      passed: totals.passed,
      isSaved: Boolean(existing),
      isLocked: Boolean(existing?.locked_at),
      lockedAt: existing?.locked_at ?? null,
    };
  });

  const rows = selectedSurahs.map((surah) => {
    const draft = drafts[surah.id] ?? emptyDraft;
    const totals = selectedAssessment ? calculateTahfidzTotal(draft, selectedComponents, selectedAssessment) : { total: 0, passed: false, fluency: 0, fashohah: 0, tajwid: 0 };
    const predicate = getPredicate(totals.total, predicates);
    const existing = scoreBySurah.get(surah.id);
    const isLocked = Boolean(existing?.locked_at);

    return [
      surah.sort_order,
      surah.name_latin,
      <Input
        className="min-w-20"
        disabled={isLocked && !isSupervisor}
        key={`${surah.id}-mistakes`}
        onChange={(event) => updateDraft(surah.id, "fluency_mistakes", event.target.value)}
        placeholder="Salah"
        type="number"
        value={draft.fluency_mistakes}
      />,
      <Input
        className="min-w-20"
        disabled={fluencyUsesMistakeDeduction || (isLocked && !isSupervisor)}
        key={`${surah.id}-fluency`}
        onChange={(event) => updateDraft(surah.id, "fluency_score", event.target.value)}
        title={fluencyUsesMistakeDeduction ? `Otomatis: ${fluencyMax} - (salah x ${fluencyDeduction})` : undefined}
        type="number"
        value={fluencyUsesMistakeDeduction ? String(totals.fluency) : draft.fluency_score}
      />,
      <Input className="min-w-20" disabled={isLocked && !isSupervisor} key={`${surah.id}-fashohah`} onChange={(event) => updateDraft(surah.id, "fashohah_score", event.target.value)} type="number" value={draft.fashohah_score} />,
      <Input className="min-w-20" disabled={isLocked && !isSupervisor} key={`${surah.id}-tajwid`} onChange={(event) => updateDraft(surah.id, "tajwid_score", event.target.value)} type="number" value={draft.tajwid_score} />,
      totals.total,
      predicate,
      <Badge key={`${surah.id}-passed`} tone={totals.passed ? "green" : "red"}>
        {totals.passed ? "Lulus" : "Belum"}
      </Badge>,
      <Badge key={`${surah.id}-saved`} tone={isLocked ? "amber" : existing ? "green" : "neutral"}>
        {isLocked ? "Terkunci" : existing ? "Tersimpan" : "Draft"}
      </Badge>,
      <div className="flex flex-wrap gap-2" key={`${surah.id}-actions`}>
        <Button disabled={loading || (isLocked && !isSupervisor)} onClick={() => saveSurahScore(surah)} type="button" variant="secondary">
          <Save size={16} />
          Simpan
        </Button>
        {existing && isSupervisor ? (
          isLocked ? (
            <Button disabled={loading} onClick={() => setSurahLock(surah, false)} type="button" variant="ghost">
              <Unlock size={16} />
              Buka
            </Button>
          ) : (
            <Button disabled={loading} onClick={() => setSurahLock(surah, true)} type="button" variant="ghost">
              <Lock size={16} />
              Kunci
            </Button>
          )
        ) : null}
      </div>,
    ];
  });

  const selectedYear = academicYears.find((year) => year.id === selectedYearId);
  const selectedSemester = semesters.find((semester) => semester.id === selectedSemesterId);
  const selectedHalaqohForBar = halaqohs.find((halaqoh) => halaqoh.id === selectedHalaqohId);
  const contextChips: Array<{ label: string; value: string; tone?: "primary" | "neutral" }> = [];
  if (selectedYear) contextChips.push({ label: "TA", value: selectedYear.name, tone: "primary" });
  if (selectedSemester) contextChips.push({ label: "Sem", value: selectedSemester.name, tone: "primary" });
  if (selectedHalaqohForBar) contextChips.push({ label: "Halaqoh", value: `${selectedHalaqohForBar.name} (${selectedHalaqohForBar.classes?.name ?? "-"})`, tone: "neutral" });
  if (selectedStudent) contextChips.push({ label: "Santri", value: selectedStudent.full_name, tone: "neutral" });
  contextChips.push({ label: "Juz", value: String(selectedJuz), tone: "primary" });

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}

      <ContextBar chips={contextChips} />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted)]">{message}</p>
          <Button className="w-full sm:w-auto" disabled={loading} onClick={loadBaseData} type="button" variant="secondary">
            <RefreshCw size={18} />
            {loading ? "Memuat..." : "Muat Ulang"}
          </Button>
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Filter Penilaian"
          description="Pilih periode, halaqoh, santri, dan juz sebelum mengisi nilai."
          action={
            <Button className="w-full sm:w-auto" disabled={loading || !selectedStudentId || selectedSurahs.length === 0} onClick={saveAllScores} type="button">
              <Save size={18} />
              Simpan Semua Surat
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Field label="Tahun Ajaran">
            <Select value={selectedYearId} onChange={(event) => setSelectedYearId(event.target.value)}>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Semester">
            <Select value={selectedSemesterId} onChange={(event) => setSelectedSemesterId(event.target.value)}>
              {semesters
                .filter((semester) => !selectedYearId || semester.academic_year_id === selectedYearId)
                .map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Halaqoh">
            <Select
              value={selectedHalaqohId}
              onChange={(event) => {
                setSelectedHalaqohId(event.target.value);
                const nextStudent = assignments.find((assignment) => assignment.halaqoh_id === event.target.value)?.student_id ?? "";
                setSelectedStudentId(nextStudent);
              }}
            >
              {activeHalaqohs.map((halaqoh) => (
                <option key={halaqoh.id} value={halaqoh.id}>
                  {halaqoh.name} ({halaqoh.classes?.name ?? "-"})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Santri">
            <Select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
              {assignedStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Juz">
            <Select value={selectedJuz} onChange={(event) => setSelectedJuz(Number(event.target.value) as 29 | 30)}>
              <option value={29}>Juz 29</option>
              <option value={30}>Juz 30</option>
            </Select>
          </Field>
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <Card>
          <SectionHeader title="Ringkasan" description="Kelengkapan nilai untuk santri terpilih." />
          <div className="space-y-4">
            <div className="rounded-md bg-[var(--surface-soft)] p-4">
              <p className="text-sm font-semibold text-[var(--muted)]">Santri</p>
              <p className="mt-1 text-xl font-bold">{selectedStudent?.full_name ?? "Belum dipilih"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SummaryItem label="Surat" value={selectedSurahs.length} />
              <SummaryItem label="Tersimpan" value={filledCount} />
              <SummaryItem label="Rubrik" value={selectedAssessment?.name ?? "-"} />
              <SummaryItem label="Komponen" value={selectedComponents.length} />
            </div>
            <div className="rounded-md border border-[var(--line)] p-4">
              <p className="font-semibold">Porsi Aktif</p>
              <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                {selectedComponents.map((component) => (
                  <li key={component.id}>
                    {component.name}: maksimal {component.max_score}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader title={`Input Nilai Juz ${selectedJuz}`} description="Nilai total dan predikat dihitung otomatis sebelum disimpan." />

          {assignedStudents.length === 0 ? (
            <EmptyState
              description="Halaqoh yang dipilih belum punya santri. Hubungi admin untuk menempatkan santri pada halaqoh ini lewat Master Data → Anggota Halaqoh."
              icon={<BookOpenCheck size={28} />}
              title="Belum ada santri"
              tone="warning"
            />
          ) : !selectedStudentId ? (
            <EmptyState
              description="Pilih santri di filter di atas untuk mulai mengisi nilai setoran surat."
              icon={<BookOpenCheck size={28} />}
              title="Pilih santri lebih dulu"
              tone="primary"
            />
          ) : (
            <>
              {/* Mobile: kartu per surat agar tidak perlu scroll horizontal */}
              <div className="md:hidden">
                <TahfidzMobileCards
                  canShowLock={(item) => Boolean(isSupervisor && item.isSaved)}
                  fashohahMax={fashohahMax}
                  fluencyMax={fluencyMax}
                  inputsDisabledFor={(item) => item.isLocked && !isSupervisor}
                  items={mobileItems}
                  loading={loading}
                  onChangeDraft={updateDraft}
                  onSave={(surahId) => {
                    const surah = surahById.get(surahId);
                    if (surah) void saveSurahScore(surah);
                  }}
                  onToggleLock={(surahId, locked) => {
                    const surah = surahById.get(surahId);
                    if (surah) void setSurahLock(surah, locked);
                  }}
                  fluencyDeductionPerMistake={fluencyDeduction}
                  tajwidMax={tajwidMax}
                  fluencyUsesMistakeDeduction={fluencyUsesMistakeDeduction}
                />
              </div>

              {/* Desktop/tablet: tabel kompak */}
              <div className="hidden md:block">
                <DataTable
                  columns={["No", "Surat", "Salah", "Kelancaran", "Fashohah", "Tajwid", "Total", "Predikat", "Lulus", "Status", "Aksi"]}
                  entityLabel="surat"
                  pageSize={15}
                  rows={rows}
                />
              </div>
            </>
          )}

          <div className="mt-5 space-y-2">
            <Label>Catatan untuk surat terpilih diisi langsung pada baris data</Label>
            <Textarea disabled placeholder="Catatan global per rapor akan dibuat di modul Rapor." />
          </div>
        </Card>
      </section>
    </div>
  );

  function notify(messageText: string, tone: "success" | "error" | "info" = "success") {
    setMessage(messageText);
    setToast({ message: messageText, tone });
    window.setTimeout(() => setToast(null), 5000);
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[var(--line)] p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function calculateTahfidzTotal(draft: ScoreDraft, components: ComponentRow[], assessment: AssessmentTypeRow) {
  const fluencyComponent = getComponent(components, "kelancaran");
  const fluencyMax = getComponentMax(components, "kelancaran", 25);
  const fashohahMax = getComponentMax(components, "fashohah", 25);
  const tajwidMax = getComponentMax(components, "tajwid", 50);
  const mistakes = toNullableInteger(draft.fluency_mistakes);
  const fluencyInput = toNullableNumber(draft.fluency_score);
  const fluency =
    fluencyComponent?.input_mode === "mistake_deduction"
      ? clamp(mistakes == null ? fluencyMax : fluencyMax - mistakes * getDeductionPerMistake(fluencyComponent), 0, fluencyMax)
      : clamp(fluencyInput ?? 0, 0, fluencyMax);
  const fashohah = clamp(toNullableNumber(draft.fashohah_score) ?? 0, 0, fashohahMax);
  const tajwid = clamp(toNullableNumber(draft.tajwid_score) ?? 0, 0, tajwidMax);
  const total = round(fluency + fashohah + tajwid);
  const passesScore = assessment.passing_min_score == null ? true : total >= assessment.passing_min_score;
  const passesMistakes = assessment.max_fluency_mistakes == null || mistakes == null ? true : mistakes <= assessment.max_fluency_mistakes;

  return {
    fluency,
    fashohah,
    tajwid,
    total,
    passed: passesScore && passesMistakes,
  };
}

function buildDrafts(surahs: SurahRow[], scores: ScoreRow[], components: ComponentRow[]) {
  const bySurah = new Map(scores.map((score) => [score.surah_id, score]));
  const drafts: Record<string, ScoreDraft> = {};

  for (const surah of surahs) {
    const score = bySurah.get(surah.id);
    drafts[surah.id] = score
      ? {
          fluency_mistakes: score.fluency_mistakes == null ? "" : String(score.fluency_mistakes),
          fluency_score: String(score.fluency_score),
          fashohah_score: String(score.fashohah_score),
          tajwid_score: String(score.tajwid_score),
          note: score.note ?? "",
        }
      : {
          ...emptyDraft,
          fluency_score: String(getComponentMax(components, "kelancaran", 25)),
          fashohah_score: String(getComponentMax(components, "fashohah", 25)),
          tajwid_score: String(getComponentMax(components, "tajwid", 50)),
        };
  }

  return drafts;
}

function getComponentMax(components: ComponentRow[], code: string, fallback: number) {
  return Number(getComponent(components, code)?.max_score ?? fallback);
}

function getComponent(components: ComponentRow[], code: string) {
  return components.find((component) => component.code === code);
}

function getDeductionPerMistake(component: ComponentRow | undefined) {
  return Number(component?.deduction_per_mistake ?? 1);
}

function getPredicate(score: number, predicates: PredicateRow[]) {
  return predicates.find((predicate) => {
    const min = predicate.min_score ?? Number.NEGATIVE_INFINITY;
    const max = predicate.max_score ?? Number.POSITIVE_INFINITY;
    return score >= min && score <= max;
  })?.label ?? "-";
}

function toNullableNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableInteger(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number) {
  return Math.round(value * 10) / 10;
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
