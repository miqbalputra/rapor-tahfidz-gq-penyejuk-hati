"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, RefreshCw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/field";
import { DataTable } from "@/components/ui/table";
import { Toast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
type AssignmentQueryRow = Omit<AssignmentRow, "students"> & { students: StudentRow[] | StudentRow | null };
type AssessmentTypeRow = { id: string; code: string; name: string; max_score: number; version: number; is_active: boolean };
type PredicateRow = { min_score: number | null; max_score: number | null; label: string };
type OtherExamScoreRow = {
  id: string;
  student_id: string;
  assessment_type_id: string;
  total_score: number;
  predicate: string | null;
  note: string | null;
};
type DraftRow = { total_score: string; note: string };

const excludedAssessmentCodes = ["tahfidz_juz29", "tahfidz_juz30", "juziyah"];

export function OtherExamScoringClient() {
  const [years, setYears] = useState<AcademicYearRow[]>([]);
  const [semesters, setSemesters] = useState<SemesterRow[]>([]);
  const [halaqohs, setHalaqohs] = useState<HalaqohRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentTypeRow[]>([]);
  const [predicates, setPredicates] = useState<PredicateRow[]>([]);
  const [scores, setScores] = useState<OtherExamScoreRow[]>([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedHalaqohId, setSelectedHalaqohId] = useState("");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [message, setMessage] = useState("Input ujian lainnya seperti tartili, doa, hadits, wudhu, dan sholat.");
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

  const selectedAssessment = useMemo(() => assessmentTypes.find((type) => type.id === selectedAssessmentId) ?? null, [assessmentTypes, selectedAssessmentId]);
  const scoreByStudent = useMemo(() => new Map(scores.map((score) => [score.student_id, score])), [scores]);

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

    const [profileRes, yearRes, semesterRes, halaqohRes, assignmentRes, typeRes, predicateRes] = await Promise.all([
      supabase.from("profiles").select("role,teacher_id,is_active").eq("id", user.data.user.id).maybeSingle(),
      supabase.from("academic_years").select("id,name,is_active").order("name"),
      supabase.from("semesters").select("id,name,academic_year_id,is_active").order("name"),
      supabase.from("halaqohs").select("id,name,academic_year_id,semester_id,is_active,classes(name),teachers(id,full_name,title)").order("name"),
      supabase.from("student_halaqohs").select("id,student_id,halaqoh_id,is_active,students(id,full_name,gender)").eq("is_active", true),
      supabase.from("assessment_types").select("id,code,name,max_score,version,is_active").eq("is_active", true).order("name"),
      supabase.from("predicate_rules").select("min_score,max_score,label").is("assessment_type_id", null).order("sort_order"),
    ]);

    if (profileRes.error || yearRes.error || semesterRes.error || halaqohRes.error || assignmentRes.error || typeRes.error || predicateRes.error) {
      notify(profileRes.error?.message ?? yearRes.error?.message ?? semesterRes.error?.message ?? halaqohRes.error?.message ?? assignmentRes.error?.message ?? typeRes.error?.message ?? predicateRes.error?.message ?? "Gagal memuat data ujian lainnya.", "error");
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
    const otherTypes = ((typeRes.data ?? []) as AssessmentTypeRow[]).filter((type) => !excludedAssessmentCodes.includes(type.code));
    const defaultYear = selectedYearId || loadedYears.find((year) => year.is_active)?.id || loadedYears[0]?.id || "";
    const defaultSemester =
      selectedSemesterId ||
      loadedSemesters.find((semester) => semester.is_active && semester.academic_year_id === defaultYear)?.id ||
      loadedSemesters.find((semester) => semester.academic_year_id === defaultYear)?.id ||
      "";
    const defaultHalaqoh = selectedHalaqohId || loadedHalaqohs.find((halaqoh) => halaqoh.academic_year_id === defaultYear && halaqoh.semester_id === defaultSemester)?.id || loadedHalaqohs[0]?.id || "";

    setYears(loadedYears);
    setSemesters(loadedSemesters);
    setHalaqohs(loadedHalaqohs);
    setAssignments(loadedAssignments);
    setAssessmentTypes(otherTypes);
    setPredicates((predicateRes.data ?? []) as PredicateRow[]);
    setSelectedYearId(defaultYear);
    setSelectedSemesterId(defaultSemester);
    setSelectedHalaqohId(defaultHalaqoh);
    setSelectedAssessmentId((current) => current || otherTypes[0]?.id || "");
    setMessage(profile?.role === "guru" ? "Data ujian lainnya dimuat sesuai halaqoh yang diampu." : "Data ujian lainnya berhasil dimuat.");
    setLoading(false);
  }, [selectedHalaqohId, selectedSemesterId, selectedYearId]);

  const loadScores = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !selectedAssessmentId || !selectedYearId || !selectedSemesterId || assignedStudents.length === 0) {
      setScores([]);
      setDrafts({});
      return;
    }

    const studentIds = assignedStudents.map((student) => student.id);
    const { data, error } = await supabase
      .from("other_exam_scores")
      .select("id,student_id,assessment_type_id,total_score,predicate,note")
      .eq("assessment_type_id", selectedAssessmentId)
      .eq("academic_year_id", selectedYearId)
      .eq("semester_id", selectedSemesterId)
      .in("student_id", studentIds);

    if (error) {
      notify(error.message, "error");
      return;
    }

    const loadedScores = (data ?? []) as OtherExamScoreRow[];
    setScores(loadedScores);
    setDrafts(buildDrafts(assignedStudents, loadedScores));
  }, [assignedStudents, selectedAssessmentId, selectedSemesterId, selectedYearId]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    void loadScores();
  }, [loadScores]);

  function updateDraft(studentId: string, field: keyof DraftRow, value: string) {
    setDrafts((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] ?? { total_score: "", note: "" }),
        [field]: value,
      },
    }));
  }

  async function saveAllScores() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !selectedAssessment || !selectedYearId || !selectedSemesterId || !selectedHalaqohId) return;

    const halaqoh = halaqohs.find((item) => item.id === selectedHalaqohId);
    const payload = assignedStudents.map((student) => {
      const draft = drafts[student.id] ?? { total_score: "", note: "" };
      const score = clamp(toNumber(draft.total_score), 0, Number(selectedAssessment.max_score));

      return {
        student_id: student.id,
        assessment_type_id: selectedAssessment.id,
        academic_year_id: selectedYearId,
        semester_id: selectedSemesterId,
        payload: { manual_score: score },
        total_score: score,
        predicate: getPredicate(score, predicates),
        note: draft.note.trim() || null,
        assessed_by: halaqoh?.teachers?.id ?? null,
        assessment_version: selectedAssessment.version,
      };
    });

    setLoading(true);
    const { error } = await supabase.from("other_exam_scores").upsert(payload, {
      onConflict: "student_id,assessment_type_id,academic_year_id,semester_id",
    });

    if (error) {
      notify(error.message, "error");
    } else {
      notify(`Nilai ${selectedAssessment.name} berhasil disimpan.`);
      await loadScores();
    }
    setLoading(false);
  }

  const rows = assignedStudents.map((student, index) => {
    const draft = drafts[student.id] ?? { total_score: "", note: "" };
    const score = toNumber(draft.total_score);
    const existing = scoreByStudent.get(student.id);

    return [
      index + 1,
      student.full_name,
      <Input
        className="min-w-24"
        key={`${student.id}-score`}
        max={selectedAssessment?.max_score ?? 100}
        min={0}
        onChange={(event) => updateDraft(student.id, "total_score", event.target.value)}
        type="number"
        value={draft.total_score}
      />,
      getPredicate(score, predicates),
      <Input
        className="min-w-48"
        key={`${student.id}-note`}
        onChange={(event) => updateDraft(student.id, "note", event.target.value)}
        placeholder="Catatan opsional"
        value={draft.note}
      />,
      <Badge key={`${student.id}-status`} tone={existing ? "green" : "neutral"}>
        {existing ? "Tersimpan" : "Draft"}
      </Badge>,
    ];
  });

  return (
    <Card>
      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
      <SectionHeader
        title="Ujian Lainnya"
        description={message}
        action={
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button className="w-full sm:w-auto" disabled={loading} onClick={loadBaseData} type="button" variant="secondary">
              <RefreshCw size={18} />
              Muat Ulang
            </Button>
            <Button className="w-full sm:w-auto" disabled={loading || !selectedAssessmentId || assignedStudents.length === 0} onClick={saveAllScores} type="button">
              <Save size={18} />
              Simpan Semua
            </Button>
          </div>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
        <Field label="Jenis Ujian">
          <Select value={selectedAssessmentId} onChange={(event) => setSelectedAssessmentId(event.target.value)}>
            {assessmentTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </Select>
        </Field>
        <div className="rounded-md bg-[var(--surface-soft)] p-4">
          <p className="text-sm text-[var(--muted)]">Nilai maksimal</p>
          <p className="text-2xl font-bold">{selectedAssessment?.max_score ?? "-"}</p>
        </div>
      </div>
      {assessmentTypes.length === 0 ? (
        <EmptyState
          description="Belum ada jenis ujian lainnya yang aktif. Hubungi admin untuk menambah jenis ujian (Tartili, Doa, Hadits, Wudhu, Sholat) di menu Pengaturan → Rubrik dan Predikat."
          icon={<ClipboardList size={28} />}
          title="Belum ada jenis ujian"
          tone="warning"
        />
      ) : assignedStudents.length === 0 ? (
        <EmptyState
          description={selectedHalaqohId ? "Halaqoh ini belum punya santri. Hubungi admin untuk menempatkan santri pada halaqoh ini." : "Pilih halaqoh di filter di atas untuk melihat daftar santri."}
          icon={<ClipboardList size={28} />}
          title={selectedHalaqohId ? "Belum ada santri di halaqoh ini" : "Pilih halaqoh dulu"}
          tone={selectedHalaqohId ? "warning" : "primary"}
        />
      ) : (
        <DataTable columns={["No", "Santri", "Nilai", "Predikat", "Catatan", "Status"]} rows={rows} />
      )}
      <div className="mt-5 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted)]">
        Input ini menyimpan nilai ujian tambahan secara manual. Jika nanti client ingin komponen rinci per ujian, admin bisa menambah komponen di menu Pengaturan dan modul ini dapat dikembangkan menjadi per-komponen.
      </div>
    </Card>
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

function buildDrafts(students: StudentRow[], scores: OtherExamScoreRow[]) {
  const scoreByStudent = new Map(scores.map((score) => [score.student_id, score]));
  const drafts: Record<string, DraftRow> = {};

  for (const student of students) {
    const score = scoreByStudent.get(student.id);
    drafts[student.id] = {
      total_score: score ? String(score.total_score) : "",
      note: score?.note ?? "",
    };
  }

  return drafts;
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

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPredicate(score: number, predicates: PredicateRow[]) {
  return predicates.find((predicate) => {
    const min = predicate.min_score ?? Number.NEGATIVE_INFINITY;
    const max = predicate.max_score ?? Number.POSITIVE_INFINITY;
    return score >= min && score <= max;
  })?.label ?? "-";
}
