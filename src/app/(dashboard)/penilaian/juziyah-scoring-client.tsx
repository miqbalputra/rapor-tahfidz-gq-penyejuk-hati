"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, RefreshCw, Save, Scroll, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { ContextBar } from "@/components/ui/context-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Toast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
type AssessmentTypeRow = { id: string; code: string; name: string; version: number };
type PredicateRow = { min_score: number | null; max_score: number | null; label: string };
type JuziyahScoreRow = {
  id: string;
  fluency_score: number;
  fashohah_score: number;
  tajwid_score: number;
  average_score: number;
  predicate: string | null;
  note: string | null;
  locked_at: string | null;
};
type UserProfileRow = { role: string; teacher_id: string | null; is_active: boolean };

export function JuziyahScoringClient() {
  const [years, setYears] = useState<AcademicYearRow[]>([]);
  const [semesters, setSemesters] = useState<SemesterRow[]>([]);
  const [halaqohs, setHalaqohs] = useState<HalaqohRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [assessment, setAssessment] = useState<AssessmentTypeRow | null>(null);
  const [predicates, setPredicates] = useState<PredicateRow[]>([]);
  const [score, setScore] = useState<JuziyahScoreRow | null>(null);
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedHalaqohId, setSelectedHalaqohId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedJuz, setSelectedJuz] = useState<29 | 30>(29);
  const [form, setForm] = useState({ fluency_score: "100", fashohah_score: "100", tajwid_score: "100", note: "" });
  const [message, setMessage] = useState("Nilai juziyah dipakai pada tabel Nilai Juziyah di rapor.");
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

  const average = useMemo(() => round((toNumber(form.fluency_score) + toNumber(form.fashohah_score) + toNumber(form.tajwid_score)) / 3), [form.fashohah_score, form.fluency_score, form.tajwid_score]);
  const predicate = useMemo(() => getPredicate(average, predicates), [average, predicates]);

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
      supabase.from("assessment_types").select("id,code,name,version").eq("code", "juziyah").maybeSingle(),
      supabase.from("predicate_rules").select("min_score,max_score,label").is("assessment_type_id", null).order("sort_order"),
    ]);

    if (profileRes.error || yearRes.error || semesterRes.error || halaqohRes.error || assignmentRes.error || typeRes.error || predicateRes.error) {
      notify(profileRes.error?.message ?? yearRes.error?.message ?? semesterRes.error?.message ?? halaqohRes.error?.message ?? assignmentRes.error?.message ?? typeRes.error?.message ?? predicateRes.error?.message ?? "Gagal memuat data juziyah.", "error");
    } else {
      const loadedYears = (yearRes.data ?? []) as AcademicYearRow[];
      const loadedSemesters = (semesterRes.data ?? []) as SemesterRow[];
      const profile = (profileRes.data as UserProfileRow | null) ?? null;
      const loadedHalaqohs = filterHalaqohsForProfile(((halaqohRes.data as HalaqohQueryRow[] | null) ?? []).map(normalizeHalaqohRow), profile);
      const visibleHalaqohIds = new Set(loadedHalaqohs.map((halaqoh) => halaqoh.id));
      const loadedAssignments = ((assignmentRes.data as AssignmentQueryRow[] | null) ?? [])
        .map(normalizeAssignmentRow)
        .filter((assignment) => visibleHalaqohIds.has(assignment.halaqoh_id));
      const defaultYear = selectedYearId || loadedYears.find((year) => year.is_active)?.id || loadedYears[0]?.id || "";
      const defaultSemester =
        selectedSemesterId ||
        loadedSemesters.find((semester) => semester.is_active && semester.academic_year_id === defaultYear)?.id ||
        loadedSemesters.find((semester) => semester.academic_year_id === defaultYear)?.id ||
        "";
      const defaultHalaqoh = selectedHalaqohId || loadedHalaqohs.find((halaqoh) => halaqoh.academic_year_id === defaultYear && halaqoh.semester_id === defaultSemester)?.id || loadedHalaqohs[0]?.id || "";
      const defaultStudent = selectedStudentId || loadedAssignments.find((assignment) => assignment.halaqoh_id === defaultHalaqoh)?.student_id || "";

      setYears(loadedYears);
      setSemesters(loadedSemesters);
      setHalaqohs(loadedHalaqohs);
      setAssignments(loadedAssignments);
      setAssessment((typeRes.data as AssessmentTypeRow | null) ?? null);
      setPredicates((predicateRes.data ?? []) as PredicateRow[]);
      setProfile(profile);
      setSelectedYearId(defaultYear);
      setSelectedSemesterId(defaultSemester);
      setSelectedHalaqohId(defaultHalaqoh);
      setSelectedStudentId(defaultStudent);
      setMessage(profile?.role === "guru" ? "Data juziyah guru berhasil dimuat sesuai halaqoh yang diampu." : "Data juziyah berhasil dimuat.");
    }
    setLoading(false);
  }, [selectedHalaqohId, selectedSemesterId, selectedStudentId, selectedYearId]);

  const loadScore = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !selectedStudentId || !selectedYearId || !selectedSemesterId) return;

    const { data, error } = await supabase
      .from("juziyah_scores")
      .select("id,fluency_score,fashohah_score,tajwid_score,average_score,predicate,note,locked_at")
      .eq("student_id", selectedStudentId)
      .eq("academic_year_id", selectedYearId)
      .eq("semester_id", selectedSemesterId)
      .eq("juz", selectedJuz)
      .maybeSingle();

    if (error) {
      notify(error.message, "error");
      return;
    }

    const loaded = (data as JuziyahScoreRow | null) ?? null;
    setScore(loaded);
    if (loaded) {
      setForm({
        fluency_score: String(loaded.fluency_score),
        fashohah_score: String(loaded.fashohah_score),
        tajwid_score: String(loaded.tajwid_score),
        note: loaded.note ?? "",
      });
    }
  }, [selectedJuz, selectedSemesterId, selectedStudentId, selectedYearId]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    void loadScore();
  }, [loadScore]);

  async function saveJuziyah() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !selectedStudentId || !selectedYearId || !selectedSemesterId || !assessment) return;
    const halaqoh = halaqohs.find((item) => item.id === selectedHalaqohId);

    setLoading(true);
    const { error } = await supabase.from("juziyah_scores").upsert(
      {
        student_id: selectedStudentId,
        juz: selectedJuz,
        academic_year_id: selectedYearId,
        semester_id: selectedSemesterId,
        fluency_score: toNumber(form.fluency_score),
        fashohah_score: toNumber(form.fashohah_score),
        tajwid_score: toNumber(form.tajwid_score),
        average_score: average,
        predicate,
        note: form.note.trim() || null,
        assessed_by: halaqoh?.teachers?.id ?? null,
        assessment_type_id: assessment.id,
        assessment_version: assessment.version,
      },
      { onConflict: "student_id,juz,academic_year_id,semester_id" },
    );

    if (error) {
      notify(error.message, "error");
    } else {
      notify("Nilai juziyah berhasil disimpan.");
      await loadScore();
    }
    setLoading(false);
  }

  async function setScoreLock(locked: boolean) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !score) {
      notify("Simpan nilai juziyah dulu sebelum mengunci.", "info");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("juziyah_scores")
      .update({ locked_at: locked ? new Date().toISOString() : null })
      .eq("id", score.id);
    if (error) {
      notify(error.message, "error");
    } else {
      notify(locked ? "Nilai juziyah dikunci." : "Kunci nilai juziyah dibuka.");
      await loadScore();
    }
    setLoading(false);
  }

  const selectedYear = years.find((year) => year.id === selectedYearId);
  const selectedSemester = semesters.find((semester) => semester.id === selectedSemesterId);
  const selectedHalaqohForBar = halaqohs.find((halaqoh) => halaqoh.id === selectedHalaqohId);
  const selectedStudent = assignedStudents.find((student) => student.id === selectedStudentId);

  return (
    <div className="space-y-4">
      <ContextBar
        chips={[
          ...(selectedYear ? [{ label: "TA", value: selectedYear.name, tone: "primary" as const }] : []),
          ...(selectedSemester ? [{ label: "Sem", value: selectedSemester.name, tone: "primary" as const }] : []),
          ...(selectedHalaqohForBar ? [{ label: "Halaqoh", value: `${selectedHalaqohForBar.name} (${selectedHalaqohForBar.classes?.name ?? "-"})`, tone: "neutral" as const }] : []),
          ...(selectedStudent ? [{ label: "Santri", value: selectedStudent.full_name, tone: "neutral" as const }] : []),
          { label: "Juziyah", value: `Juz ${selectedJuz}`, tone: "primary" as const },
        ]}
      />
      <Card>
      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
      <SectionHeader
        title="Nilai Juziyah"
        description="Input nilai juziyah untuk tabel ringkasan rapor."
        action={
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Badge tone={score?.locked_at ? "amber" : score ? "green" : "neutral"}>
              {score?.locked_at ? "Terkunci" : score ? "Tersimpan" : "Draft"}
            </Badge>
            <Button className="w-full sm:w-auto" disabled={loading || !selectedStudentId || Boolean(score?.locked_at && !(profile?.role === "admin" || profile?.role === "koordinator"))} onClick={saveJuziyah} type="button">
              <Save size={18} />
              Simpan Juziyah
            </Button>
            {score && (profile?.role === "admin" || profile?.role === "koordinator") ? (
              score.locked_at ? (
                <Button className="w-full sm:w-auto" disabled={loading} onClick={() => setScoreLock(false)} type="button" variant="ghost">
                  <Unlock size={18} />
                  Buka Kunci
                </Button>
              ) : (
                <Button className="w-full sm:w-auto" disabled={loading} onClick={() => setScoreLock(true)} type="button" variant="ghost">
                  <Lock size={18} />
                  Kunci
                </Button>
              )
            ) : null}
            <Button className="w-full sm:w-auto" disabled={loading} onClick={loadBaseData} type="button" variant="secondary">
              <RefreshCw size={18} />
              Muat Ulang
            </Button>
          </div>
        }
      />
      <p className="mb-5 text-sm text-[var(--muted)]">{message}</p>
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
        <Field label="Juz">
          <Select value={selectedJuz} onChange={(event) => setSelectedJuz(Number(event.target.value) as 29 | 30)}>
            <option value={29}>Juz 29</option>
            <option value={30}>Juz 30</option>
          </Select>
        </Field>
      </div>

      {assignedStudents.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            description={selectedHalaqohId ? "Halaqoh ini belum punya santri. Hubungi admin untuk menempatkan santri pada halaqoh ini." : "Pilih halaqoh di filter di atas untuk mulai mengisi nilai juziyah."}
            icon={<Scroll size={28} />}
            title={selectedHalaqohId ? "Belum ada santri di halaqoh ini" : "Pilih halaqoh dulu"}
            tone={selectedHalaqohId ? "warning" : "primary"}
          />
        </div>
      ) : !selectedStudentId ? (
        <div className="mt-5">
          <EmptyState
            description="Pilih santri di filter di atas untuk mulai mengisi nilai juziyah."
            icon={<Scroll size={28} />}
            title="Pilih santri lebih dulu"
            tone="primary"
          />
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Field label="Kelancaran">
              <Input type="number" value={form.fluency_score} onChange={(event) => setForm((current) => ({ ...current, fluency_score: event.target.value }))} />
            </Field>
            <Field label="Fashohah">
              <Input type="number" value={form.fashohah_score} onChange={(event) => setForm((current) => ({ ...current, fashohah_score: event.target.value }))} />
            </Field>
            <Field label="Tajwid">
              <Input type="number" value={form.tajwid_score} onChange={(event) => setForm((current) => ({ ...current, tajwid_score: event.target.value }))} />
            </Field>
            <div className="rounded-md bg-[var(--surface-soft)] p-4">
              <p className="text-sm text-[var(--muted)]">Rata-rata</p>
              <p className="text-2xl font-bold">{average}</p>
            </div>
            <div className="rounded-md bg-[var(--surface-soft)] p-4">
              <p className="text-sm text-[var(--muted)]">Predikat</p>
              <p className="font-bold">{predicate}</p>
            </div>
          </div>
          <div className="mt-5">
            <Field label="Catatan Juziyah">
              <Textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Opsional" />
            </Field>
          </div>
        </>
      )}
    </Card>
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

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function getPredicate(score: number, predicates: PredicateRow[]) {
  return predicates.find((predicate) => {
    const min = predicate.min_score ?? Number.NEGATIVE_INFINITY;
    const max = predicate.max_score ?? Number.POSITIVE_INFINITY;
    return score >= min && score <= max;
  })?.label ?? "-";
}
