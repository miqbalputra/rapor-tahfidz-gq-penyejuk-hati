"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, Download, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AcademicYearRow = { id: string; name: string; is_active: boolean };
type SemesterRow = { id: string; name: string; academic_year_id: string; is_active: boolean };
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
type StudentRow = { id: string; full_name: string };
type AssignmentRow = { id: string; student_id: string; halaqoh_id: string; is_active: boolean; students: StudentRow | null };
type AssignmentQueryRow = Omit<AssignmentRow, "students"> & { students: StudentRow[] | StudentRow | null };
type SessionRow = { id: string; halaqoh_id: string; session_date: string };
type RecordRow = { session_id: string; student_id: string; status: "present" | "absent" | "permission" | "sick" };
type ProfileRow = { role: string; teacher_id: string | null; is_active: boolean };

type RecapStat = {
  student: StudentRow;
  present: number;
  sick: number;
  permission: number;
  absent: number;
  total: number;
  percentage: number;
};

function formatYM(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function startOfMonth(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function endOfMonth(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month, 0);
}

export function MonthlyAttendanceRecap() {
  const [years, setYears] = useState<AcademicYearRow[]>([]);
  const [semesters, setSemesters] = useState<SemesterRow[]>([]);
  const [halaqohs, setHalaqohs] = useState<HalaqohRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [stats, setStats] = useState<RecapStat[]>([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedHalaqohId, setSelectedHalaqohId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(formatYM(new Date()));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Pilih halaqoh dan bulan untuk melihat rekap kehadiran.");
  const [sessionCount, setSessionCount] = useState(0);

  const activeHalaqohs = useMemo(
    () => halaqohs.filter((halaqoh) => halaqoh.is_active && (!selectedYearId || halaqoh.academic_year_id === selectedYearId) && (!selectedSemesterId || halaqoh.semester_id === selectedSemesterId)),
    [halaqohs, selectedSemesterId, selectedYearId],
  );

  const loadBaseData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      setLoading(false);
      return;
    }

    const [profileRes, yearRes, semesterRes, halaqohRes, assignmentRes] = await Promise.all([
      supabase.from("profiles").select("role,teacher_id,is_active").eq("id", user.data.user.id).maybeSingle(),
      supabase.from("academic_years").select("id,name,is_active").order("name"),
      supabase.from("semesters").select("id,name,academic_year_id,is_active").order("name"),
      supabase.from("halaqohs").select("id,name,academic_year_id,semester_id,is_active,classes(name),teachers(id,full_name,title)").order("name"),
      supabase.from("student_halaqohs").select("id,student_id,halaqoh_id,is_active,students(id,full_name)").eq("is_active", true),
    ]);

    if (profileRes.error || yearRes.error || semesterRes.error || halaqohRes.error || assignmentRes.error) {
      setMessage(profileRes.error?.message ?? yearRes.error?.message ?? semesterRes.error?.message ?? halaqohRes.error?.message ?? assignmentRes.error?.message ?? "Gagal memuat data.");
      setLoading(false);
      return;
    }

    const loadedYears = (yearRes.data ?? []) as AcademicYearRow[];
    const loadedSemesters = (semesterRes.data ?? []) as SemesterRow[];
    const profile = (profileRes.data as ProfileRow | null) ?? null;
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

    setYears(loadedYears);
    setSemesters(loadedSemesters);
    setHalaqohs(loadedHalaqohs);
    setAssignments(loadedAssignments);
    setSelectedYearId(defaultYear);
    setSelectedSemesterId(defaultSemester);
    setSelectedHalaqohId(defaultHalaqoh);
    setLoading(false);
  }, []);

  const loadRecap = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !selectedHalaqohId || !selectedMonth) {
      setStats([]);
      return;
    }

    setLoading(true);
    const startDate = startOfMonth(selectedMonth).toISOString().slice(0, 10);
    const endDate = endOfMonth(selectedMonth).toISOString().slice(0, 10);

    const { data: sessions, error: sessionError } = await supabase
      .from("attendance_sessions")
      .select("id,halaqoh_id,session_date")
      .eq("halaqoh_id", selectedHalaqohId)
      .gte("session_date", startDate)
      .lte("session_date", endDate);

    if (sessionError) {
      setMessage(sessionError.message);
      setLoading(false);
      return;
    }

    const sessionRows = (sessions ?? []) as SessionRow[];
    setSessionCount(sessionRows.length);

    if (sessionRows.length === 0) {
      setStats([]);
      setMessage("Belum ada sesi presensi pada bulan dan halaqoh ini.");
      setLoading(false);
      return;
    }

    const { data: records, error: recordError } = await supabase
      .from("attendance_records")
      .select("session_id,student_id,status")
      .in("session_id", sessionRows.map((session) => session.id));

    if (recordError) {
      setMessage(recordError.message);
      setLoading(false);
      return;
    }

    const recordRows = (records ?? []) as RecordRow[];
    const studentsInHalaqoh = assignments
      .filter((assignment) => assignment.halaqoh_id === selectedHalaqohId && assignment.students)
      .map((assignment) => assignment.students as StudentRow);

    const recap: RecapStat[] = studentsInHalaqoh
      .map((student) => {
        const studentRecords = recordRows.filter((row) => row.student_id === student.id);
        const present = studentRecords.filter((row) => row.status === "present").length;
        const sick = studentRecords.filter((row) => row.status === "sick").length;
        const permission = studentRecords.filter((row) => row.status === "permission").length;
        const absent = studentRecords.filter((row) => row.status === "absent").length;
        const total = present + sick + permission + absent;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        return { student, present, sick, permission, absent, total, percentage };
      })
      .sort((a, b) => a.student.full_name.localeCompare(b.student.full_name));

    setStats(recap);
    setMessage(`Rekap ${sessionRows.length} pertemuan pada ${selectedMonth}.`);
    setLoading(false);
  }, [assignments, selectedHalaqohId, selectedMonth]);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    void loadRecap();
  }, [loadRecap]);

  function exportCSV() {
    if (stats.length === 0) return;
    const halaqohName = activeHalaqohs.find((halaqoh) => halaqoh.id === selectedHalaqohId)?.name ?? "halaqoh";
    const header = ["No", "Nama Santri", "Hadir", "Sakit", "Izin", "Alfa", "Total Pertemuan", "Persentase Hadir"];
    const rows = stats.map((stat, index) => [
      index + 1,
      stat.student.full_name,
      stat.present,
      stat.sick,
      stat.permission,
      stat.absent,
      stat.total,
      `${stat.percentage}%`,
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rekap Presensi ${halaqohName} ${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <SectionHeader
        title="Rekap Presensi Bulanan"
        description={message}
        action={
          <div className="flex flex-wrap gap-2">
            <Button disabled={loading || stats.length === 0} onClick={exportCSV} type="button" variant="secondary">
              <Download size={18} />
              Export CSV
            </Button>
            <Button disabled={loading} onClick={loadRecap} type="button" variant="secondary">
              <RefreshCw size={18} />
              Muat Ulang
            </Button>
          </div>
        }
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label>Tahun Ajaran</Label>
          <Select value={selectedYearId} onChange={(event) => setSelectedYearId(event.target.value)}>
            {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Semester</Label>
          <Select value={selectedSemesterId} onChange={(event) => setSelectedSemesterId(event.target.value)}>
            {semesters.filter((semester) => !selectedYearId || semester.academic_year_id === selectedYearId).map((semester) => (
              <option key={semester.id} value={semester.id}>{semester.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Halaqoh</Label>
          <Select value={selectedHalaqohId} onChange={(event) => setSelectedHalaqohId(event.target.value)}>
            {activeHalaqohs.map((halaqoh) => (
              <option key={halaqoh.id} value={halaqoh.id}>
                {halaqoh.name} ({halaqoh.classes?.name ?? "-"})
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Bulan</Label>
          <Input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-md bg-[var(--surface-soft)] p-4">
        <CalendarRange className="text-[var(--primary)]" size={20} />
        <p className="text-sm font-semibold">{sessionCount} pertemuan tercatat pada bulan ini</p>
      </div>

      {stats.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">
          Belum ada data presensi yang bisa direkap. Pilih halaqoh dan bulan yang lain, atau pastikan presensi sudah pernah diisi.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[var(--line)]">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-[var(--surface-soft)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-3 py-3">No</th>
                <th className="px-3 py-3">Nama Santri</th>
                <th className="px-3 py-3 text-center">Hadir</th>
                <th className="px-3 py-3 text-center">Sakit</th>
                <th className="px-3 py-3 text-center">Izin</th>
                <th className="px-3 py-3 text-center">Alfa</th>
                <th className="px-3 py-3 text-center">Total</th>
                <th className="px-3 py-3 text-center">% Hadir</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat, index) => (
                <tr className="border-t border-[var(--line)]" key={stat.student.id}>
                  <td className="px-3 py-3">{index + 1}</td>
                  <td className="px-3 py-3 font-semibold">{stat.student.full_name}</td>
                  <td className="px-3 py-3 text-center text-[var(--primary)]">{stat.present}</td>
                  <td className="px-3 py-3 text-center">{stat.sick}</td>
                  <td className="px-3 py-3 text-center">{stat.permission}</td>
                  <td className="px-3 py-3 text-center text-red-600 dark:text-red-400">{stat.absent}</td>
                  <td className="px-3 py-3 text-center font-semibold">{stat.total}</td>
                  <td className="px-3 py-3 text-center">
                    <Badge tone={stat.percentage >= 80 ? "green" : stat.percentage >= 50 ? "amber" : "red"}>
                      {stat.percentage}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
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

function filterHalaqohsForProfile(halaqohs: HalaqohRow[], profile: ProfileRow | null) {
  if (profile?.role !== "guru") return halaqohs;
  if (!profile.is_active || !profile.teacher_id) return [];
  return halaqohs.filter((halaqoh) => halaqoh.teachers?.id === profile.teacher_id);
}
