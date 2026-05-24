"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Lock, RefreshCw, Save, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { ContextBar } from "@/components/ui/context-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/field";
import { DataTable } from "@/components/ui/table";
import { Toast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AcademicYearRow = { id: string; name: string; is_active: boolean };
type SemesterRow = { id: string; name: string; academic_year_id: string; is_active: boolean };
type UserProfileRow = { role: string; teacher_id: string | null; is_active: boolean };
type StudentRow = { id: string; full_name: string; gender: "male" | "female"; status: string };
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
type AttendanceSessionRow = { id: string; topic: string | null; locked_at: string | null };
type AttendanceRecordRow = { student_id: string; status: AttendanceStatus; note: string | null };
type AttendanceStatus = "present" | "absent" | "permission" | "sick";
type AttendanceDraft = { status: AttendanceStatus; note: string };

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Hadir",
  absent: "Alfa",
  permission: "Izin",
  sick: "Sakit",
};

const statusTones: Record<AttendanceStatus, "green" | "red" | "amber" | "neutral"> = {
  present: "green",
  absent: "red",
  permission: "amber",
  sick: "neutral",
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceClient() {
  const [years, setYears] = useState<AcademicYearRow[]>([]);
  const [semesters, setSemesters] = useState<SemesterRow[]>([]);
  const [halaqohs, setHalaqohs] = useState<HalaqohRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [session, setSession] = useState<AttendanceSessionRow | null>(null);
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedHalaqohId, setSelectedHalaqohId] = useState("");
  const [sessionDate, setSessionDate] = useState(todayInputValue());
  const [topic, setTopic] = useState("");
  const [drafts, setDrafts] = useState<Record<string, AttendanceDraft>>({});
  const [message, setMessage] = useState("Login sebagai admin/guru untuk mengisi presensi.");
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

  const attendanceSummary = useMemo(() => {
    return assignedStudents.reduce(
      (summary, student) => {
        const status = drafts[student.id]?.status ?? "present";
        summary[status] += 1;
        return summary;
      },
      { present: 0, absent: 0, permission: 0, sick: 0 } as Record<AttendanceStatus, number>,
    );
  }, [assignedStudents, drafts]);

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

    const [profileRes, yearRes, semesterRes, halaqohRes, assignmentRes] = await Promise.all([
      supabase.from("profiles").select("role,teacher_id,is_active").eq("id", user.data.user.id).maybeSingle(),
      supabase.from("academic_years").select("id,name,is_active").order("name"),
      supabase.from("semesters").select("id,name,academic_year_id,is_active").order("name"),
      supabase.from("halaqohs").select("id,name,academic_year_id,semester_id,is_active,classes(name),teachers(id,full_name,title)").order("name"),
      supabase.from("student_halaqohs").select("id,student_id,halaqoh_id,is_active,students(id,full_name,gender,status)").eq("is_active", true),
    ]);

    if (profileRes.error || yearRes.error || semesterRes.error || halaqohRes.error || assignmentRes.error) {
      notify(profileRes.error?.message ?? yearRes.error?.message ?? semesterRes.error?.message ?? halaqohRes.error?.message ?? assignmentRes.error?.message ?? "Gagal memuat data presensi.", "error");
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
      .filter((assignment) => visibleHalaqohIds.has(assignment.halaqoh_id) && assignment.students?.status === "active");
    const defaultYear = loadedYears.find((year) => year.is_active)?.id || loadedYears[0]?.id || "";
    const defaultSemester =
      loadedSemesters.find((semester) => semester.is_active && semester.academic_year_id === defaultYear)?.id ||
      loadedSemesters.find((semester) => semester.academic_year_id === defaultYear)?.id ||
      "";
    const defaultHalaqoh = loadedHalaqohs.find((halaqoh) => halaqoh.academic_year_id === defaultYear && halaqoh.semester_id === defaultSemester)?.id || loadedHalaqohs[0]?.id || "";

    setYears(loadedYears);
    setSemesters(loadedSemesters);
    setHalaqohs(loadedHalaqohs);
    setAssignments(loadedAssignments);
    setProfile(profile);
    setSelectedYearId(defaultYear);
    setSelectedSemesterId(defaultSemester);
    setSelectedHalaqohId(defaultHalaqoh);
    setMessage(profile?.role === "guru" ? "Data presensi guru berhasil dimuat sesuai halaqoh yang diampu." : "Data presensi berhasil dimuat.");
    setLoading(false);
  }, []);

  const loadAttendance = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase || !selectedHalaqohId || !sessionDate) {
      setSession(null);
      setDrafts({});
      return;
    }

    const { data: loadedSession, error: sessionError } = await supabase
      .from("attendance_sessions")
      .select("id,topic,locked_at")
      .eq("halaqoh_id", selectedHalaqohId)
      .eq("session_date", sessionDate)
      .maybeSingle();

    if (sessionError) {
      notify(sessionError.message, "error");
      return;
    }

    if (!loadedSession) {
      setSession(null);
      setTopic("");
      setDrafts(buildDefaultDrafts(assignedStudents, []));
      return;
    }

    const { data: records, error: recordsError } = await supabase
      .from("attendance_records")
      .select("student_id,status,note")
      .eq("session_id", loadedSession.id);

    if (recordsError) {
      notify(recordsError.message, "error");
      return;
    }

    setSession(loadedSession as AttendanceSessionRow);
    setTopic((loadedSession as AttendanceSessionRow).topic ?? "");
    setDrafts(buildDefaultDrafts(assignedStudents, (records ?? []) as AttendanceRecordRow[]));
  }, [assignedStudents, selectedHalaqohId, sessionDate]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  function updateDraft(studentId: string, field: keyof AttendanceDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] ?? { status: "present", note: "" }),
        [field]: value,
      },
    }));
  }

  async function saveAttendance() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase || !selectedHalaqohId || !sessionDate || assignedStudents.length === 0) {
      notify("Pilih halaqoh, tanggal, dan pastikan ada santri aktif.", "error");
      return;
    }

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: savedSession, error: sessionError } = await supabase
      .from("attendance_sessions")
      .upsert(
        {
          halaqoh_id: selectedHalaqohId,
          session_date: sessionDate,
          topic: topic.trim() || null,
          created_by: user?.id ?? null,
        },
        { onConflict: "halaqoh_id,session_date" },
      )
      .select("id,topic,locked_at")
      .single();

    if (sessionError || !savedSession) {
      notify(sessionError?.message ?? "Gagal menyimpan sesi presensi.", "error");
      setLoading(false);
      return;
    }

    const payload = assignedStudents.map((student) => {
      const draft = drafts[student.id] ?? { status: "present", note: "" };

      return {
        session_id: savedSession.id,
        student_id: student.id,
        status: draft.status,
        note: draft.note.trim() || null,
      };
    });

    const { error: recordsError } = await supabase.from("attendance_records").upsert(payload, {
      onConflict: "session_id,student_id",
    });

    if (recordsError) {
      notify(recordsError.message, "error");
    } else {
      notify("Presensi berhasil disimpan.");
      await loadAttendance();
    }

    setLoading(false);
  }

  async function setSessionLock(locked: boolean) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !session) {
      notify("Belum ada sesi presensi untuk dikunci.", "info");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("attendance_sessions")
      .update({ locked_at: locked ? new Date().toISOString() : null })
      .eq("id", session.id);
    if (error) {
      notify(error.message, "error");
    } else {
      notify(locked ? "Sesi presensi dikunci." : "Kunci sesi presensi dibuka.");
      await loadAttendance();
    }
    setLoading(false);
  }

  const isSupervisor = profile?.role === "admin" || profile?.role === "koordinator";
  const isLocked = Boolean(session?.locked_at);
  const inputsDisabled = isLocked && !isSupervisor;

  const rows = assignedStudents.map((student, index) => {
    const draft = drafts[student.id] ?? { status: "present", note: "" };

    return [
      index + 1,
      student.full_name,
      <Badge key={`${student.id}-badge`} tone={statusTones[draft.status]}>
        {statusLabels[draft.status]}
      </Badge>,
      <Select key={`${student.id}-status`} disabled={inputsDisabled} value={draft.status} onChange={(event) => updateDraft(student.id, "status", event.target.value)}>
        <option value="present">Hadir</option>
        <option value="sick">Sakit</option>
        <option value="permission">Izin</option>
        <option value="absent">Alfa</option>
      </Select>,
      <Input key={`${student.id}-note`} disabled={inputsDisabled} value={draft.note} onChange={(event) => updateDraft(student.id, "note", event.target.value)} placeholder="Catatan opsional" />,
    ];
  });

  const selectedYear = years.find((year) => year.id === selectedYearId);
  const selectedSemester = semesters.find((semester) => semester.id === selectedSemesterId);
  const selectedHalaqohForBar = halaqohs.find((halaqoh) => halaqoh.id === selectedHalaqohId);
  const contextChips: Array<{ label: string; value: string; tone?: "primary" | "neutral" }> = [];
  if (selectedYear) contextChips.push({ label: "TA", value: selectedYear.name, tone: "primary" });
  if (selectedSemester) contextChips.push({ label: "Sem", value: selectedSemester.name, tone: "primary" });
  if (selectedHalaqohForBar) contextChips.push({ label: "Halaqoh", value: `${selectedHalaqohForBar.name} (${selectedHalaqohForBar.classes?.name ?? "-"})`, tone: "neutral" });
  if (sessionDate) contextChips.push({ label: "Tanggal", value: sessionDate, tone: "neutral" });

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}

      <ContextBar chips={contextChips} />

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-md bg-[var(--surface-soft)] text-[var(--primary-strong)]">
              <CalendarCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--foreground)]">Presensi</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
            </div>
          </div>
          <Button disabled={loading} onClick={loadBaseData} type="button" variant="secondary">
            <RefreshCw size={18} />
            {loading ? "Memuat..." : "Muat Ulang"}
          </Button>
        </div>
      </Card>

      <Card>
        <SectionHeader
          action={
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button disabled={loading || !selectedHalaqohId || assignedStudents.length === 0 || Boolean(session?.locked_at && !(profile?.role === "admin" || profile?.role === "koordinator"))} onClick={saveAttendance} type="button">
                <Save size={18} />
                Simpan Presensi
              </Button>
              {session && (profile?.role === "admin" || profile?.role === "koordinator") ? (
                session.locked_at ? (
                  <Button disabled={loading} onClick={() => setSessionLock(false)} type="button" variant="ghost">
                    <Unlock size={18} />
                    Buka Kunci
                  </Button>
                ) : (
                  <Button disabled={loading} onClick={() => setSessionLock(true)} type="button" variant="ghost">
                    <Lock size={18} />
                    Kunci Sesi
                  </Button>
                )
              ) : null}
            </div>
          }
          title="Input Presensi Halaqoh"
          description={
            session?.locked_at
              ? "Sesi ini sudah terkunci. Hanya admin/koordinator yang dapat mengubah."
              : session
                ? "Presensi tanggal ini sudah ada dan bisa diperbarui."
                : "Presensi tanggal ini belum ada. Simpan untuk membuat sesi baru."
          }
        />
        <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
            <Select
              value={selectedHalaqohId}
              onChange={(event) => {
                setSelectedHalaqohId(event.target.value);
                setSession(null);
              }}
            >
              {activeHalaqohs.map((halaqoh) => <option key={halaqoh.id} value={halaqoh.id}>{halaqoh.name} ({halaqoh.classes?.name ?? "-"})</option>)}
            </Select>
          </Field>
          <Field label="Tanggal">
            <Input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} />
          </Field>
          <Field label="Materi">
            <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Opsional" />
          </Field>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-4">
          <SummaryCard label="Hadir" tone="green" value={attendanceSummary.present} />
          <SummaryCard label="Sakit" tone="neutral" value={attendanceSummary.sick} />
          <SummaryCard label="Izin" tone="amber" value={attendanceSummary.permission} />
          <SummaryCard label="Alfa" tone="red" value={attendanceSummary.absent} />
        </div>

        {halaqohs.length === 0 ? (
          <EmptyState
            description="Belum ada halaqoh yang bisa dipilih. Hubungi admin untuk membuat halaqoh dan menempatkan Anda sebagai pengampu."
            icon={<CalendarCheck size={28} />}
            title="Belum ada halaqoh"
            tone="warning"
          />
        ) : assignedStudents.length === 0 ? (
          <EmptyState
            description="Halaqoh ini belum punya anggota santri. Hubungi admin untuk menempatkan santri pada halaqoh ini lewat menu Master Data → Anggota Halaqoh."
            icon={<CalendarCheck size={28} />}
            title="Belum ada santri di halaqoh ini"
            tone="warning"
          />
        ) : (
          <DataTable columns={["No", "Nama", "Ringkas", "Status", "Catatan"]} rows={rows} />
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

function SummaryCard({ label, tone, value }: { label: string; tone: "green" | "red" | "amber" | "neutral"; value: number }) {
  return (
    <div className="rounded-md border border-[var(--line)] p-4">
      <Badge tone={tone}>{label}</Badge>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function buildDefaultDrafts(students: StudentRow[], records: AttendanceRecordRow[]) {
  const recordByStudent = new Map(records.map((record) => [record.student_id, record]));
  const drafts: Record<string, AttendanceDraft> = {};

  for (const student of students) {
    const record = recordByStudent.get(student.id);
    drafts[student.id] = {
      status: record?.status ?? "present",
      note: record?.note ?? "",
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

function normalizeAssignmentRow(row: AssignmentQueryRow): AssignmentRow {
  return {
    ...row,
    students: Array.isArray(row.students) ? row.students[0] ?? null : row.students,
  };
}

function filterHalaqohsForProfile(halaqohs: HalaqohRow[], profile: UserProfileRow | null) {
  if (profile?.role !== "guru") return halaqohs;
  if (!profile.is_active || !profile.teacher_id) return [];
  return halaqohs.filter((halaqoh) => halaqoh.teachers?.id === profile.teacher_id);
}
