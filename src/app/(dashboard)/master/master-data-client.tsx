"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Database, Edit3, FileUp, GraduationCap, History, PenLine, Plus, Power, RefreshCw, RotateCcw, Save, Search, Users, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/field";
import { TabBar } from "@/components/ui/tab-bar";
import { DataTable } from "@/components/ui/table";
import { Toast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ImportStudentsModal } from "./import-students-modal";
import { SignaturePad } from "@/components/ui/signature-pad";

type MasterTab = "guru" | "halaqoh" | "santri" | "anggota";

type TeacherRow = {
  id: string;
  full_name: string;
  title: string | null;
  is_active: boolean;
  signature_url?: string | null;
};

type StudentRow = {
  id: string;
  nis: string | null;
  full_name: string;
  gender: "male" | "female";
  guardian_name: string | null;
  guardian_phone: string | null;
  address: string | null;
  status: string;
};

type HalaqohRow = {
  id: string;
  name: string;
  class_id: string | null;
  teacher_id: string | null;
  academic_year_id: string;
  semester_id: string;
  gender: "male" | "female" | "mixed";
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  teachers: { id: string; full_name: string; title: string | null } | null;
  classes: { name: string } | null;
};

type HalaqohQueryRow = Omit<HalaqohRow, "teachers" | "classes"> & {
  teachers: { id: string; full_name: string; title: string | null }[] | { id: string; full_name: string; title: string | null } | null;
  classes: { name: string }[] | { name: string } | null;
};

type ClassRow = {
  id: string;
  name: string;
  display_name: string;
};

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

type AssignmentRow = {
  id: string;
  student_id: string;
  halaqoh_id: string;
  is_active: boolean;
  joined_at?: string | null;
  left_at?: string | null;
  students: { id: string; full_name: string; gender: "male" | "female"; status: string } | null;
  halaqohs: {
    name: string;
    classes: { name: string } | null;
    teachers: { id: string; full_name: string; title: string | null } | null;
  } | null;
};

type AssignmentQueryRow = Omit<AssignmentRow, "students" | "halaqohs"> & {
  students:
    | { id: string; full_name: string; gender: "male" | "female"; status: string }[]
    | { id: string; full_name: string; gender: "male" | "female"; status: string }
    | null;
  halaqohs:
    | {
        name: string;
        classes: { name: string }[] | { name: string } | null;
        teachers: { id: string; full_name: string; title: string | null }[] | { id: string; full_name: string; title: string | null } | null;
      }[]
    | {
        name: string;
        classes: { name: string }[] | { name: string } | null;
        teachers: { id: string; full_name: string; title: string | null }[] | { id: string; full_name: string; title: string | null } | null;
      }
    | null;
};

type UserProfileRow = {
  role: string;
  teacher_id: string | null;
  is_active: boolean;
};

export function MasterDataClient() {
  const [activeTab, setActiveTab] = useState<MasterTab>("guru");
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [halaqohs, setHalaqohs] = useState<HalaqohRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
  const [semesters, setSemesters] = useState<SemesterRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const [message, setMessage] = useState("Login sebagai admin untuk membaca dan mengubah data Supabase.");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingHalaqohId, setEditingHalaqohId] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState({ title: "Ustadz", full_name: "" });
  const [studentForm, setStudentForm] = useState({
    nis: "",
    full_name: "",
    gender: "male",
    guardian_name: "",
    guardian_phone: "",
    address: "",
    status: "active",
  });
  const [halaqohForm, setHalaqohForm] = useState({
    name: "",
    class_id: "",
    gender: "male",
    teacher_id: "",
    academic_year_id: "",
    semester_id: "",
    start_time: "15:30",
    end_time: "16:20",
  });
  const [assignmentForm, setAssignmentForm] = useState({
    halaqoh_id: "",
    student_id: "",
  });
  // State untuk fitur Pindah Halaqoh: simpan assignment lama yang sedang dipindahkan + tujuan halaqoh baru.
  const [transferState, setTransferState] = useState<{ assignment: AssignmentRow; targetHalaqohId: string } | null>(null);
  // State untuk konfirmasi keluarkan santri (modal in-app menggantikan window.confirm).
  const [confirmRemove, setConfirmRemove] = useState<AssignmentRow | null>(null);
  // Riwayat assignment (is_active=false) untuk satu santri yang sedang dilihat.
  const [historyStudent, setHistoryStudent] = useState<{ id: string; full_name: string } | null>(null);
  const [historyRows, setHistoryRows] = useState<AssignmentRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  // Modal import santri dari CSV.
  const [importOpen, setImportOpen] = useState(false);
  // Modal kelola tanda tangan digital guru.
  const [signatureTeacher, setSignatureTeacher] = useState<TeacherRow | null>(null);
  const [signatureDraft, setSignatureDraft] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const [query, setQuery] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [halaqohQuery, setHalaqohQuery] = useState("");
  const canManageMasterData = profile?.role === "admin" || profile?.role === "koordinator";

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => `${teacher.title ?? ""} ${teacher.full_name}`.toLowerCase().includes(query.toLowerCase()));
  }, [query, teachers]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => `${student.nis ?? ""} ${student.full_name}`.toLowerCase().includes(studentQuery.toLowerCase()));
  }, [studentQuery, students]);

  const filteredHalaqohs = useMemo(() => {
    return halaqohs.filter((halaqoh) =>
      `${halaqoh.name} ${halaqoh.classes?.name ?? ""} ${halaqoh.teachers?.full_name ?? ""}`.toLowerCase().includes(halaqohQuery.toLowerCase()),
    );
  }, [halaqohQuery, halaqohs]);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Environment Supabase belum lengkap.");
      return;
    }

    setLoading(true);
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      setTeachers([]);
      setStudents([]);
      setHalaqohs([]);
      setClasses([]);
      setAcademicYears([]);
      setSemesters([]);
      setAssignments([]);
      setMessage("Belum login. Masuk dulu agar RLS Supabase memberi akses data.");
      setLoading(false);
      return;
    }

    const [profileRes, teacherRes, studentRes, halaqohRes, classRes, academicYearRes, semesterRes, assignmentRes] = await Promise.all([
      supabase.from("profiles").select("role, teacher_id, is_active").eq("id", user.data.user.id).maybeSingle(),
      supabase.from("teachers").select("id, full_name, title, is_active, signature_url").order("full_name"),
      supabase
        .from("students")
        .select("id, nis, full_name, gender, guardian_name, guardian_phone, address, status")
        .order("full_name"),
      supabase
        .from("halaqohs")
        .select("id, name, class_id, teacher_id, academic_year_id, semester_id, gender, start_time, end_time, is_active, teachers(id,full_name,title), classes(name)")
        .order("name"),
      supabase.from("classes").select("id, name, display_name").order("name"),
      supabase.from("academic_years").select("id, name, is_active").order("name"),
      supabase.from("semesters").select("id, name, academic_year_id, is_active").order("name"),
      supabase
        .from("student_halaqohs")
        .select("id, student_id, halaqoh_id, is_active, students(id,full_name,gender,status), halaqohs(name, classes(name), teachers(id,full_name,title))")
        .eq("is_active", true)
        .order("id"),
    ]);

    if (profileRes.error || teacherRes.error || studentRes.error || halaqohRes.error || classRes.error || academicYearRes.error || semesterRes.error || assignmentRes.error) {
      setMessage(
        profileRes.error?.message ??
          teacherRes.error?.message ??
          studentRes.error?.message ??
          halaqohRes.error?.message ??
          classRes.error?.message ??
          academicYearRes.error?.message ??
          semesterRes.error?.message ??
          assignmentRes.error?.message ??
          "Gagal memuat data.",
      );
    } else {
      const loadedProfile = (profileRes.data as UserProfileRow | null) ?? null;
      const isGuru = loadedProfile?.role === "guru";
      const normalizedHalaqohs = filterHalaqohsForProfile(((halaqohRes.data as HalaqohQueryRow[] | null) ?? []).map(normalizeHalaqohRow), loadedProfile);
      const visibleHalaqohIds = new Set(normalizedHalaqohs.map((halaqoh) => halaqoh.id));
      const normalizedAssignments = ((assignmentRes.data as AssignmentQueryRow[] | null) ?? [])
        .map(normalizeAssignmentRow)
        .filter((assignment) => !isGuru || visibleHalaqohIds.has(assignment.halaqoh_id));
      const visibleStudentIds = new Set(normalizedAssignments.map((assignment) => assignment.student_id));
      const loadedTeachers = isGuru && loadedProfile?.teacher_id ? (teacherRes.data ?? []).filter((teacher) => teacher.id === loadedProfile.teacher_id) : (teacherRes.data ?? []);
      const loadedStudents = isGuru ? (studentRes.data ?? []).filter((student) => visibleStudentIds.has(student.id)) : (studentRes.data ?? []);
      const loadedYears = academicYearRes.data ?? [];
      const loadedSemesters = semesterRes.data ?? [];
      const defaultYearId = loadedYears.find((year) => year.is_active)?.id ?? loadedYears[0]?.id ?? "";
      const defaultSemesterId =
        loadedSemesters.find((semester) => semester.is_active && semester.academic_year_id === defaultYearId)?.id ??
        loadedSemesters.find((semester) => semester.academic_year_id === defaultYearId)?.id ??
        loadedSemesters[0]?.id ??
        "";

      setProfile(loadedProfile);
      setTeachers(loadedTeachers);
      setStudents(loadedStudents);
      setHalaqohs(normalizedHalaqohs);
      setClasses(classRes.data ?? []);
      setAcademicYears(loadedYears);
      setSemesters(loadedSemesters);
      setAssignments(normalizedAssignments);
      setHalaqohForm((current) => ({
        ...current,
        class_id: current.class_id || classRes.data?.[0]?.id || "",
        teacher_id: current.teacher_id || loadedTeachers.find((teacher) => teacher.is_active)?.id || loadedTeachers[0]?.id || "",
        academic_year_id: current.academic_year_id || defaultYearId,
        semester_id: current.semester_id || defaultSemesterId,
      }));
      setAssignmentForm((current) => ({
        halaqoh_id: current.halaqoh_id || normalizedHalaqohs[0]?.id || "",
        student_id: current.student_id || loadedStudents.find((student) => student.status === "active")?.id || loadedStudents[0]?.id || "",
      }));
      setMessage(isGuru ? "Data halaqoh sendiri berhasil dimuat. Perubahan master data hanya bisa dilakukan admin." : "Data Supabase berhasil dimuat.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function saveTeacher() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !teacherForm.full_name.trim()) return;

    setLoading(true);
    const payload = {
      title: teacherForm.title.trim(),
      full_name: teacherForm.full_name.trim(),
      is_active: true,
    };

    const result = editingId
      ? await supabase.from("teachers").update(payload).eq("id", editingId)
      : await supabase.from("teachers").insert(payload);

    if (result.error) {
      notify(result.error.message, "error");
    } else {
      notify(editingId ? "Data guru berhasil diedit." : "Data guru berhasil ditambahkan.");
      setEditingId(null);
      setTeacherForm({ title: "Ustadz", full_name: "" });
      await loadData();
    }
    setLoading(false);
  }

  async function deactivateTeacher(id: string) {
    await setTeacherActive(id, false);
  }

  async function activateTeacher(id: string) {
    await setTeacherActive(id, true);
  }

  async function setTeacherActive(id: string, isActive: boolean) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    const { error } = await supabase.from("teachers").update({ is_active: isActive }).eq("id", id);
    if (error) {
      notify(error.message, "error");
    } else {
      notify(isActive ? "Guru berhasil diaktifkan." : "Guru berhasil dinonaktifkan.");
      await loadData();
    }
    setLoading(false);
  }

  function editTeacher(teacher: TeacherRow) {
    setEditingId(teacher.id);
    setTeacherForm({
      title: teacher.title ?? "Ustadz",
      full_name: teacher.full_name,
    });
  }

  function openSignatureFor(teacher: TeacherRow) {
    setSignatureTeacher(teacher);
    setSignatureDraft(teacher.signature_url ?? null);
  }

  async function saveSignature() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !signatureTeacher) return;
    setLoading(true);
    const { error } = await supabase
      .from("teachers")
      .update({ signature_url: signatureDraft })
      .eq("id", signatureTeacher.id);
    if (error) {
      notify(error.message, "error");
    } else {
      notify(signatureDraft ? "Tanda tangan berhasil disimpan." : "Tanda tangan berhasil dihapus.");
      setSignatureTeacher(null);
      setSignatureDraft(null);
      await loadData();
    }
    setLoading(false);
  }

  async function saveStudent() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !studentForm.full_name.trim()) return;

    setLoading(true);
    const payload = {
      nis: studentForm.nis.trim() || null,
      full_name: studentForm.full_name.trim(),
      gender: studentForm.gender,
      guardian_name: studentForm.guardian_name.trim() || null,
      guardian_phone: studentForm.guardian_phone.trim() || null,
      address: studentForm.address.trim() || null,
      status: studentForm.status,
    };

    const result = editingStudentId
      ? await supabase.from("students").update(payload).eq("id", editingStudentId)
      : await supabase.from("students").insert(payload);

    if (result.error) {
      notify(result.error.message, "error");
    } else {
      notify(editingStudentId ? "Data santri berhasil diedit." : "Data santri berhasil ditambahkan.");
      resetStudentForm();
      await loadData();
    }

    setLoading(false);
  }

  async function deactivateStudent(id: string) {
    await setStudentStatus(id, "inactive");
  }

  async function activateStudent(id: string) {
    await setStudentStatus(id, "active");
  }

  async function setStudentStatus(id: string, status: "active" | "inactive") {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    const { error } = await supabase.from("students").update({ status }).eq("id", id);
    if (error) {
      notify(error.message, "error");
    } else {
      notify(status === "active" ? "Santri berhasil diaktifkan." : "Santri berhasil dinonaktifkan.");
      await loadData();
    }
    setLoading(false);
  }

  function editStudent(student: StudentRow) {
    setEditingStudentId(student.id);
    setStudentForm({
      nis: student.nis ?? "",
      full_name: student.full_name,
      gender: student.gender,
      guardian_name: student.guardian_name ?? "",
      guardian_phone: student.guardian_phone ?? "",
      address: student.address ?? "",
      status: student.status,
    });
  }

  function resetStudentForm() {
    setEditingStudentId(null);
    setStudentForm({
      nis: "",
      full_name: "",
      gender: "male",
      guardian_name: "",
      guardian_phone: "",
      address: "",
      status: "active",
    });
  }

  async function saveHalaqoh() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !halaqohForm.name.trim() || !halaqohForm.class_id || !halaqohForm.teacher_id || !halaqohForm.academic_year_id || !halaqohForm.semester_id) {
      return;
    }

    setLoading(true);
    const payload = {
      name: halaqohForm.name.trim(),
      class_id: halaqohForm.class_id,
      gender: halaqohForm.gender,
      teacher_id: halaqohForm.teacher_id,
      academic_year_id: halaqohForm.academic_year_id,
      semester_id: halaqohForm.semester_id,
      start_time: halaqohForm.start_time || null,
      end_time: halaqohForm.end_time || null,
      is_active: true,
    };

    const result = editingHalaqohId
      ? await supabase.from("halaqohs").update(payload).eq("id", editingHalaqohId)
      : await supabase.from("halaqohs").insert(payload);

    if (result.error) {
      notify(result.error.message, "error");
    } else {
      notify(editingHalaqohId ? "Data halaqoh berhasil diedit." : "Data halaqoh berhasil ditambahkan.");
      resetHalaqohForm();
      await loadData();
    }

    setLoading(false);
  }

  async function setHalaqohActive(id: string, isActive: boolean) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    const { error } = await supabase.from("halaqohs").update({ is_active: isActive }).eq("id", id);
    if (error) {
      notify(error.message, "error");
    } else {
      notify(isActive ? "Halaqoh berhasil diaktifkan." : "Halaqoh berhasil dinonaktifkan.");
      await loadData();
    }
    setLoading(false);
  }

  function editHalaqoh(halaqoh: HalaqohRow) {
    setEditingHalaqohId(halaqoh.id);
    setHalaqohForm({
      name: halaqoh.name,
      class_id: halaqoh.class_id ?? "",
      gender: halaqoh.gender,
      teacher_id: halaqoh.teacher_id ?? "",
      academic_year_id: halaqoh.academic_year_id,
      semester_id: halaqoh.semester_id,
      start_time: formatInputTime(halaqoh.start_time),
      end_time: formatInputTime(halaqoh.end_time),
    });
  }

  function resetHalaqohForm() {
    setEditingHalaqohId(null);
    setHalaqohForm((current) => ({
      name: "",
      class_id: classes[0]?.id ?? current.class_id,
      gender: "male",
      teacher_id: teachers.find((teacher) => teacher.is_active)?.id ?? teachers[0]?.id ?? current.teacher_id,
      academic_year_id: academicYears.find((year) => year.is_active)?.id ?? academicYears[0]?.id ?? current.academic_year_id,
      semester_id:
        semesters.find((semester) => semester.is_active && semester.academic_year_id === current.academic_year_id)?.id ??
        semesters.find((semester) => semester.academic_year_id === current.academic_year_id)?.id ??
        semesters[0]?.id ??
        current.semester_id,
      start_time: "15:30",
      end_time: "16:20",
    }));
  }

  async function assignStudent() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !assignmentForm.halaqoh_id || !assignmentForm.student_id) return;

    const halaqoh = halaqohs.find((item) => item.id === assignmentForm.halaqoh_id);
    if (!halaqoh) {
      notify("Pilih halaqoh terlebih dahulu.", "error");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("student_halaqohs").upsert(
      {
        student_id: assignmentForm.student_id,
        halaqoh_id: assignmentForm.halaqoh_id,
        academic_year_id: halaqoh.academic_year_id,
        semester_id: halaqoh.semester_id,
        is_active: true,
      },
      { onConflict: "student_id,halaqoh_id,academic_year_id,semester_id" },
    );

    if (error) {
      notify(error.message, "error");
    } else {
      notify("Santri berhasil dimasukkan ke halaqoh.");
      await loadData();
    }
    setLoading(false);
  }

  async function removeAssignment(id: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    const { error } = await supabase.from("student_halaqohs").update({ is_active: false, left_at: new Date().toISOString().slice(0, 10) }).eq("id", id);
    if (error) {
      notify(error.message, "error");
    } else {
      notify("Santri berhasil dikeluarkan dari halaqoh.");
      await loadData();
    }
    setLoading(false);
  }

  // Pindah santri dari halaqoh lama ke halaqoh baru sebagai satu transaksi UI:
  // 1. Set is_active=false + left_at pada record lama.
  // 2. Upsert record baru ke halaqoh tujuan dengan is_active=true.
  // Riwayat tersimpan otomatis karena record lama tidak dihapus (audit trail tetap utuh).
  async function transferStudent(assignment: AssignmentRow, targetHalaqohId: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const target = halaqohs.find((item) => item.id === targetHalaqohId);
    if (!target) {
      notify("Halaqoh tujuan tidak valid.", "error");
      return;
    }
    if (target.id === assignment.halaqoh_id) {
      notify("Halaqoh tujuan sama dengan halaqoh sekarang.", "info");
      return;
    }

    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    const { error: removeError } = await supabase
      .from("student_halaqohs")
      .update({ is_active: false, left_at: today })
      .eq("id", assignment.id);

    if (removeError) {
      notify(removeError.message, "error");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("student_halaqohs").upsert(
      {
        student_id: assignment.student_id,
        halaqoh_id: target.id,
        academic_year_id: target.academic_year_id,
        semester_id: target.semester_id,
        joined_at: today,
        is_active: true,
      },
      { onConflict: "student_id,halaqoh_id,academic_year_id,semester_id" },
    );

    if (insertError) {
      notify(insertError.message, "error");
    } else {
      notify(`${assignment.students?.full_name ?? "Santri"} berhasil dipindahkan ke ${target.name}.`);
      setTransferState(null);
      await loadData();
    }
    setLoading(false);
  }

  async function loadStudentHistory(student: { id: string; full_name: string }) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setHistoryStudent(student);
    setHistoryLoading(true);
    setHistoryRows([]);

    const { data, error } = await supabase
      .from("student_halaqohs")
      .select(
        "id, student_id, halaqoh_id, is_active, joined_at, left_at, students(id,full_name,gender,status), halaqohs(name, classes(name), teachers(id,full_name,title))",
      )
      .eq("student_id", student.id)
      .order("joined_at", { ascending: false });

    if (error) {
      notify(error.message, "error");
    } else {
      const rows = ((data as AssignmentQueryRow[] | null) ?? []).map(normalizeAssignmentRow);
      setHistoryRows(rows);
    }
    setHistoryLoading(false);
  }

  const teacherRows = filteredTeachers.map((teacher) => [
    teacher.title ?? "-",
    teacher.full_name,
    <Badge key={`${teacher.id}-status`} tone={teacher.is_active ? "green" : "neutral"}>
      {teacher.is_active ? "Aktif" : "Nonaktif"}
    </Badge>,
    <Badge key={`${teacher.id}-ttd`} tone={teacher.signature_url ? "green" : "neutral"}>
      {teacher.signature_url ? "Ada" : "Belum"}
    </Badge>,
    ...(canManageMasterData
      ? [
          <div className="flex flex-wrap gap-2" key={`${teacher.id}-actions`}>
            <Button onClick={() => editTeacher(teacher)} type="button" variant="secondary">
              <Edit3 size={16} />
              Edit
            </Button>
            <Button onClick={() => openSignatureFor(teacher)} type="button" variant="secondary">
              <PenLine size={16} />
              {teacher.signature_url ? "Ubah TTD" : "Buat TTD"}
            </Button>
            {teacher.is_active ? (
              <Button onClick={() => deactivateTeacher(teacher.id)} type="button" variant="ghost">
                <Power size={16} />
                Nonaktif
              </Button>
            ) : (
              <Button onClick={() => activateTeacher(teacher.id)} type="button" variant="ghost">
                <RotateCcw size={16} />
                Aktifkan
              </Button>
            )}
          </div>,
        ]
      : []),
  ]);

  const studentRows = filteredStudents.map((student, index) => [
    index + 1,
    student.nis ?? "-",
    student.full_name,
    student.gender === "male" ? "Santriwan" : "Santriwati",
    <Badge key={student.id} tone={student.status === "active" ? "green" : "neutral"}>{student.status}</Badge>,
    student.guardian_name ?? "-",
    ...(canManageMasterData
      ? [
          <div className="flex flex-wrap gap-2" key={`${student.id}-actions`}>
            <Button onClick={() => editStudent(student)} type="button" variant="secondary">
              <Edit3 size={16} />
              Edit
            </Button>
            {student.status === "active" ? (
              <Button onClick={() => deactivateStudent(student.id)} type="button" variant="ghost">
                <Power size={16} />
                Nonaktif
              </Button>
            ) : (
              <Button onClick={() => activateStudent(student.id)} type="button" variant="ghost">
                <RotateCcw size={16} />
                Aktifkan
              </Button>
            )}
          </div>,
        ]
      : []),
  ]);

  const halaqohRows = filteredHalaqohs.map((halaqoh) => [
    `${halaqoh.name} (${halaqoh.classes?.name ?? "-"})`,
    halaqoh.gender === "male" ? "Santriwan" : halaqoh.gender === "female" ? "Santriwati" : "Campur",
    `${formatTime(halaqoh.start_time)}-${formatTime(halaqoh.end_time)}`,
    `${halaqoh.teachers?.title ?? ""} ${halaqoh.teachers?.full_name ?? "-"}`.trim(),
    <Badge key={`${halaqoh.id}-status`} tone={halaqoh.is_active ? "green" : "neutral"}>
      {halaqoh.is_active ? "Aktif" : "Nonaktif"}
    </Badge>,
    ...(canManageMasterData
      ? [
          <div className="flex flex-wrap gap-2" key={`${halaqoh.id}-actions`}>
            <Button onClick={() => editHalaqoh(halaqoh)} type="button" variant="secondary">
              <Edit3 size={16} />
              Edit
            </Button>
            {halaqoh.is_active ? (
              <Button onClick={() => setHalaqohActive(halaqoh.id, false)} type="button" variant="ghost">
                <Power size={16} />
                Nonaktif
              </Button>
            ) : (
              <Button onClick={() => setHalaqohActive(halaqoh.id, true)} type="button" variant="ghost">
                <RotateCcw size={16} />
                Aktifkan
              </Button>
            )}
          </div>,
        ]
      : []),
  ]);

  const assignmentRows = assignments.map((assignment, index) => [
    index + 1,
    assignment.students?.full_name ?? "-",
    assignment.students?.gender === "male" ? "Santriwan" : "Santriwati",
    `${assignment.halaqohs?.name ?? "-"} (${assignment.halaqohs?.classes?.name ?? "-"})`,
    `${assignment.halaqohs?.teachers?.title ?? ""} ${assignment.halaqohs?.teachers?.full_name ?? "-"}`.trim(),
    ...(canManageMasterData
      ? [
          <div className="flex flex-wrap gap-2" key={`${assignment.id}-actions`}>
            <Button
              onClick={() =>
                setTransferState({
                  assignment,
                  targetHalaqohId:
                    halaqohs.find((h) => h.is_active && h.id !== assignment.halaqoh_id)?.id ?? "",
                })
              }
              type="button"
              variant="secondary"
            >
              <ArrowRightLeft size={16} />
              Pindah
            </Button>
            <Button
              onClick={() => {
                if (assignment.students) loadStudentHistory(assignment.students);
              }}
              type="button"
              variant="ghost"
            >
              <History size={16} />
              Riwayat
            </Button>
            <Button onClick={() => setConfirmRemove(assignment)} type="button" variant="ghost">
              <Power size={16} />
              Keluarkan
            </Button>
          </div>,
        ]
      : []),
  ]);

  // Halaqoh tujuan untuk modal Pindah: kecuali halaqoh asal, dan harus aktif.
  const transferTargetOptions = halaqohs.filter(
    (halaqoh) => halaqoh.is_active && halaqoh.id !== transferState?.assignment.halaqoh_id,
  );

  // Format tanggal Indonesia singkat untuk riwayat.
  function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
    } catch {
      return value;
    }
  }

  const historyTableRows = historyRows.map((row, index) => [
    index + 1,
    `${row.halaqohs?.name ?? "-"} (${row.halaqohs?.classes?.name ?? "-"})`,
    `${row.halaqohs?.teachers?.title ?? ""} ${row.halaqohs?.teachers?.full_name ?? "-"}`.trim(),
    formatDate(row.joined_at),
    formatDate(row.left_at),
    <Badge key={`${row.id}-status`} tone={row.is_active ? "green" : "neutral"}>
      {row.is_active ? "Aktif sekarang" : "Sudah keluar"}
    </Badge>,
  ]);

  return (
    <div className="space-y-5">
      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}

      <ImportStudentsModal
        halaqohs={halaqohs.map((h) => ({
          id: h.id,
          name: h.name,
          className: h.classes?.name ?? "",
          academic_year_id: h.academic_year_id,
          semester_id: h.semester_id,
        }))}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          notify("Import santri selesai. Memuat ulang data...");
          void loadData();
        }}
        open={importOpen}
      />

      {/* Modal Tanda Tangan Digital */}
      {signatureTeacher ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl bg-[var(--surface)] shadow-2xl flex flex-col">
            <div className="flex items-start gap-3 border-b border-[var(--line)] px-5 py-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-white">
                <PenLine size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold leading-tight">Tanda Tangan Digital</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Untuk{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {signatureTeacher.title} {signatureTeacher.full_name}
                  </span>
                  . Tanda tangan ini akan dipakai pada rapor sebagai pengganti tanda tangan manual.
                </p>
              </div>
              <button
                aria-label="Tutup"
                className="grid size-9 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
                onClick={() => {
                  setSignatureTeacher(null);
                  setSignatureDraft(null);
                }}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-auto px-5 py-4">
              <SignaturePad height={200} onChange={setSignatureDraft} value={signatureDraft} />
              <div className="mt-3 rounded-md bg-[var(--surface-soft)] p-3 text-xs leading-5 text-[var(--muted)]">
                <strong className="text-[var(--foreground)]">Tips:</strong> Pakai stylus di tablet/HP untuk hasil terbaik. Di desktop, tahan klik kiri mouse lalu gerakkan untuk menulis.
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] px-5 py-4 sm:flex-row sm:justify-end">
              <Button
                disabled={loading}
                onClick={() => {
                  setSignatureTeacher(null);
                  setSignatureDraft(null);
                }}
                type="button"
                variant="secondary"
              >
                Batal
              </Button>
              <Button disabled={loading} onClick={saveSignature} type="button">
                <Save size={18} />
                {loading ? "Menyimpan..." : "Simpan TTD"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Konfirmasi keluarkan santri dari halaqoh */}
      <ConfirmDialog
        cancelLabel="Batal"
        confirmLabel="Keluarkan"
        description={
          confirmRemove
            ? `${confirmRemove.students?.full_name ?? "Santri"} akan dikeluarkan dari ${confirmRemove.halaqohs?.name ?? "halaqoh"}. Datanya tetap tersimpan sebagai riwayat dan bisa dimasukkan kembali kapan saja.`
            : ""
        }
        loading={loading}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={async () => {
          if (!confirmRemove) return;
          await removeAssignment(confirmRemove.id);
          setConfirmRemove(null);
        }}
        open={Boolean(confirmRemove)}
        title="Keluarkan santri dari halaqoh?"
        tone="danger"
      />

      {/* Modal pindah halaqoh */}
      {transferState ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] shadow-2xl">
            <div className="flex items-start gap-3 px-5 pt-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-white">
                <ArrowRightLeft size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold leading-tight">Pindah Halaqoh</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Pindahkan{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {transferState.assignment.students?.full_name ?? "santri"}
                  </span>{" "}
                  dari{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {transferState.assignment.halaqohs?.name ?? "halaqoh asal"}
                  </span>{" "}
                  ke halaqoh lain. Aplikasi akan mencatat tanggal keluar dan tanggal masuk otomatis.
                </p>
              </div>
            </div>

            <div className="px-5 pt-5">
              <Label htmlFor="transfer-target">Halaqoh Tujuan</Label>
              <Select
                id="transfer-target"
                onChange={(event) =>
                  setTransferState((current) => (current ? { ...current, targetHalaqohId: event.target.value } : null))
                }
                value={transferState.targetHalaqohId}
              >
                <option value="">Pilih halaqoh tujuan</option>
                {transferTargetOptions.map((halaqoh) => (
                  <option key={halaqoh.id} value={halaqoh.id}>
                    {halaqoh.name} ({halaqoh.classes?.name ?? "-"}) — {halaqoh.teachers?.title ?? ""} {halaqoh.teachers?.full_name ?? "-"}
                  </option>
                ))}
              </Select>
              {transferTargetOptions.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--muted)]">Tidak ada halaqoh aktif lain. Buat halaqoh baru di tab Halaqoh terlebih dahulu.</p>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--line)] px-5 py-4 sm:flex-row sm:justify-end">
              <Button disabled={loading} onClick={() => setTransferState(null)} type="button" variant="secondary">
                Batal
              </Button>
              <Button
                disabled={loading || !transferState.targetHalaqohId}
                onClick={() => transferStudent(transferState.assignment, transferState.targetHalaqohId)}
                type="button"
              >
                <ArrowRightLeft size={18} />
                Pindahkan Sekarang
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal riwayat halaqoh santri */}
      {historyStudent ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-2xl bg-[var(--surface)] shadow-2xl">
            <div className="flex items-start gap-3 px-5 pt-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-white">
                <History size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold leading-tight">Riwayat Halaqoh</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Daftar halaqoh yang pernah dan sedang ditempati oleh{" "}
                  <span className="font-semibold text-[var(--foreground)]">{historyStudent.full_name}</span>.
                </p>
              </div>
            </div>

            <div className="px-5 pt-5">
              {historyLoading ? (
                <div className="rounded-md border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]">
                  Memuat riwayat...
                </div>
              ) : historyRows.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]">
                  Belum ada riwayat halaqoh.
                </div>
              ) : (
                <DataTable
                  columns={["No", "Halaqoh", "Pengampu", "Masuk", "Keluar", "Status"]}
                  entityLabel="periode"
                  pageSize={10}
                  rows={historyTableRows}
                />
              )}
            </div>

            <div className="mt-5 flex justify-end border-t border-[var(--line)] px-5 py-4">
              <Button onClick={() => setHistoryStudent(null)} type="button" variant="secondary">
                Tutup
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted)]">{message}</p>
          <Button disabled={loading} onClick={loadData} type="button" variant="secondary">
            <RefreshCw size={18} />
            {loading ? "Memuat..." : "Muat Ulang"}
          </Button>
        </div>
      </Card>

      <TabBar
        active={activeTab}
        items={[
          { id: "guru", label: "Guru", description: `${teachers.length} guru terdaftar`, icon: <UsersRound size={18} />, badge: teachers.length },
          { id: "halaqoh", label: "Halaqoh", description: `${halaqohs.length} halaqoh aktif`, icon: <GraduationCap size={18} />, badge: halaqohs.length },
          { id: "santri", label: "Santri", description: `${students.length} santri terdaftar`, icon: <Users size={18} />, badge: students.length },
          { id: "anggota", label: "Anggota Halaqoh", description: `${assignments.length} relasi aktif`, icon: <Database size={18} />, badge: assignments.length },
        ]}
        onChange={(id) => setActiveTab(id)}
      />

      {activeTab === "guru" ? (
        <Card>
          <SectionHeader
            title={canManageMasterData ? "Kelola Guru" : "Guru Pengampu"}
            description={canManageMasterData ? "Tambahkan, ubah, atau nonaktifkan data guru/pengampu." : "Guru hanya melihat data pengampu yang terhubung dengan akunnya."}
            action={
              canManageMasterData ? (
                <Button disabled={loading || !teacherForm.full_name.trim()} onClick={saveTeacher} type="button">
                  {editingId ? <Save size={18} /> : <Plus size={18} />}
                  {editingId ? "Simpan Edit" : "Tambah Guru"}
                </Button>
              ) : null
            }
          />
          {canManageMasterData ? (
            <div className="mb-5 grid gap-4 md:grid-cols-[0.35fr_0.65fr]">
              <div className="space-y-2">
                <Label>Sapaan</Label>
                <Select value={teacherForm.title} onChange={(event) => setTeacherForm((current) => ({ ...current, title: event.target.value }))}>
                  <option value="Ustadz">Ustadz</option>
                  <option value="Ustadzah">Ustadzah</option>
                  <option value="Ust.">Ust.</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nama Guru</Label>
                <Input
                  onChange={(event) => setTeacherForm((current) => ({ ...current, full_name: event.target.value }))}
                  placeholder="Nama lengkap guru"
                  value={teacherForm.full_name}
                />
              </div>
            </div>
          ) : null}
          <div className="mb-4 flex items-center gap-2">
            <Search size={18} className="text-[var(--muted)]" />
            <Input onChange={(event) => setQuery(event.target.value)} placeholder="Cari guru" value={query} />
          </div>
          {teachers.length === 0 ? (
            <EmptyState
              action={canManageMasterData ? (
                <Button onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Nama lengkap guru"]')?.focus()} type="button">
                  <Plus size={18} />
                  Tambah Guru Pertama
                </Button>
              ) : undefined}
              description="Mulai dengan menambah satu guru/pengampu. Setelah ada guru, Anda bisa membuat halaqoh dan menempatkan santri di dalamnya."
              icon={<UsersRound size={28} />}
              title="Belum ada data guru"
              tone="primary"
            />
          ) : (
            <DataTable columns={canManageMasterData ? ["Sapaan", "Nama", "Status", "TTD", "Aksi"] : ["Sapaan", "Nama", "Status", "TTD"]} rows={teacherRows} />
          )}
        </Card>
      ) : null}

      {activeTab === "halaqoh" ? (
        <Card>
          <SectionHeader
            title={canManageMasterData ? "Kelola Halaqoh" : "Halaqoh Saya"}
            description={canManageMasterData ? "Atur kelas/halaqoh, pengampu, jadwal, dan status aktif." : "Daftar halaqoh yang terhubung dengan akun guru ini."}
            action={
              canManageMasterData ? (
                <div className="flex flex-wrap gap-2">
                  {editingHalaqohId ? (
                    <Button onClick={resetHalaqohForm} type="button" variant="secondary">
                      Batal Edit
                    </Button>
                  ) : null}
                  <Button disabled={loading || !halaqohForm.name.trim()} onClick={saveHalaqoh} type="button">
                    {editingHalaqohId ? <Save size={18} /> : <Plus size={18} />}
                    {editingHalaqohId ? "Simpan Halaqoh" : "Tambah Halaqoh"}
                  </Button>
                </div>
              ) : null
            }
          />
          {canManageMasterData ? (
            <div className="mb-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nama Halaqoh</Label>
                <Input
                  onChange={(event) => setHalaqohForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Contoh: Al-Huda"
                  value={halaqohForm.name}
                />
              </div>
              <div className="space-y-2">
                <Label>Kelas</Label>
                <Select onChange={(event) => setHalaqohForm((current) => ({ ...current, class_id: event.target.value }))} value={halaqohForm.class_id}>
                  <option value="">Pilih kelas</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.display_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select onChange={(event) => setHalaqohForm((current) => ({ ...current, gender: event.target.value }))} value={halaqohForm.gender}>
                  <option value="male">Santriwan</option>
                  <option value="female">Santriwati</option>
                  <option value="mixed">Campur</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pengampu</Label>
                <Select onChange={(event) => setHalaqohForm((current) => ({ ...current, teacher_id: event.target.value }))} value={halaqohForm.teacher_id}>
                  <option value="">Pilih guru</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.title} {teacher.full_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jam Mulai</Label>
                <Input
                  onChange={(event) => setHalaqohForm((current) => ({ ...current, start_time: event.target.value }))}
                  type="time"
                  value={halaqohForm.start_time}
                />
              </div>
              <div className="space-y-2">
                <Label>Jam Selesai</Label>
                <Input
                  onChange={(event) => setHalaqohForm((current) => ({ ...current, end_time: event.target.value }))}
                  type="time"
                  value={halaqohForm.end_time}
                />
              </div>
              <div className="space-y-2">
                <Label>Tahun Ajaran</Label>
                <Select
                  onChange={(event) =>
                    setHalaqohForm((current) => ({
                      ...current,
                      academic_year_id: event.target.value,
                      semester_id:
                        semesters.find((semester) => semester.academic_year_id === event.target.value && semester.is_active)?.id ??
                        semesters.find((semester) => semester.academic_year_id === event.target.value)?.id ??
                        "",
                    }))
                  }
                  value={halaqohForm.academic_year_id}
                >
                  <option value="">Pilih tahun</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semester</Label>
                <Select onChange={(event) => setHalaqohForm((current) => ({ ...current, semester_id: event.target.value }))} value={halaqohForm.semester_id}>
                  <option value="">Pilih semester</option>
                  {semesters
                    .filter((semester) => !halaqohForm.academic_year_id || semester.academic_year_id === halaqohForm.academic_year_id)
                    .map((semester) => (
                      <option key={semester.id} value={semester.id}>
                        {semester.name}
                      </option>
                    ))}
                </Select>
              </div>
            </div>
          ) : null}
          <div className="mb-4 flex items-center gap-2">
            <Search size={18} className="text-[var(--muted)]" />
            <Input onChange={(event) => setHalaqohQuery(event.target.value)} placeholder="Cari halaqoh, kelas, atau pengampu" value={halaqohQuery} />
          </div>
          {halaqohs.length === 0 ? (
            <EmptyState
              action={
                canManageMasterData ? (
                  teachers.length === 0 ? (
                    <Button onClick={() => setActiveTab("guru")} type="button" variant="secondary">
                      Tambah Guru Dulu
                    </Button>
                  ) : (
                    <Button onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Contoh: Al-Huda"]')?.focus()} type="button">
                      <Plus size={18} />
                      Tambah Halaqoh Pertama
                    </Button>
                  )
                ) : undefined
              }
              description={
                teachers.length === 0
                  ? "Belum ada guru yang terdaftar. Tambah guru dulu sebelum membuat halaqoh."
                  : "Halaqoh adalah kelompok belajar santri yang diampu seorang guru. Buat halaqoh pertama untuk mulai mencatat presensi dan nilai."
              }
              icon={<GraduationCap size={28} />}
              title="Belum ada halaqoh"
              tone="primary"
            />
          ) : (
            <DataTable
              columns={canManageMasterData ? ["Halaqoh", "Gender", "Waktu", "Pengampu", "Status", "Aksi"] : ["Halaqoh", "Gender", "Waktu", "Pengampu", "Status"]}
              entityLabel="halaqoh"
              pageSize={10}
              rows={halaqohRows}
            />
          )}
        </Card>
      ) : null}

      {activeTab === "santri" ? (
        <Card>
          <SectionHeader
            title={canManageMasterData ? "Kelola Santri" : "Santri Halaqoh Saya"}
            description={canManageMasterData ? "Tambah satu per satu, atau import banyak sekaligus dari file CSV/Excel." : "Guru hanya melihat santri yang terdaftar pada halaqoh yang diampu."}
            action={
              canManageMasterData ? (
                <div className="flex flex-wrap gap-2">
                  <Button disabled={loading} onClick={() => setImportOpen(true)} type="button" variant="secondary">
                    <FileUp size={18} />
                    Import dari CSV
                  </Button>
                  {editingStudentId ? (
                    <Button onClick={resetStudentForm} type="button" variant="secondary">
                      Batal Edit
                    </Button>
                  ) : null}
                  <Button disabled={loading || !studentForm.full_name.trim()} onClick={saveStudent} type="button">
                    {editingStudentId ? <Save size={18} /> : <Plus size={18} />}
                    {editingStudentId ? "Simpan Santri" : "Tambah Santri"}
                  </Button>
                </div>
              ) : null
            }
          />
          {canManageMasterData ? (
            <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>NIS</Label>
                <Input
                  onChange={(event) => setStudentForm((current) => ({ ...current, nis: event.target.value }))}
                  placeholder="Opsional"
                  value={studentForm.nis}
                />
              </div>
              <div className="space-y-2 xl:col-span-2">
                <Label>Nama Santri</Label>
                <Input
                  onChange={(event) => setStudentForm((current) => ({ ...current, full_name: event.target.value }))}
                  placeholder="Nama lengkap santri"
                  value={studentForm.full_name}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  onChange={(event) => setStudentForm((current) => ({ ...current, gender: event.target.value }))}
                  value={studentForm.gender}
                >
                  <option value="male">Santriwan</option>
                  <option value="female">Santriwati</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nama Wali</Label>
                <Input
                  onChange={(event) => setStudentForm((current) => ({ ...current, guardian_name: event.target.value }))}
                  placeholder="Opsional"
                  value={studentForm.guardian_name}
                />
              </div>
              <div className="space-y-2">
                <Label>HP Wali</Label>
                <Input
                  onChange={(event) => setStudentForm((current) => ({ ...current, guardian_phone: event.target.value }))}
                  placeholder="Opsional"
                  value={studentForm.guardian_phone}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  onChange={(event) => setStudentForm((current) => ({ ...current, status: event.target.value }))}
                  value={studentForm.status}
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                  <option value="graduated">Lulus</option>
                  <option value="transferred">Pindah</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alamat</Label>
                <Input
                  onChange={(event) => setStudentForm((current) => ({ ...current, address: event.target.value }))}
                  placeholder="Opsional"
                  value={studentForm.address}
                />
              </div>
            </div>
          ) : null}
          <div className="mb-4 flex items-center gap-2">
            <Search size={18} className="text-[var(--muted)]" />
            <Input onChange={(event) => setStudentQuery(event.target.value)} placeholder="Cari santri atau NIS" value={studentQuery} />
          </div>
          {students.length === 0 ? (
            <EmptyState
              action={
                canManageMasterData ? (
                  <Button onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Nama lengkap santri"]')?.focus()} type="button">
                    <Plus size={18} />
                    Tambah Santri Pertama
                  </Button>
                ) : undefined
              }
              description="Daftarkan santri satu per satu di sini. Setelah itu, masuk ke tab Anggota Halaqoh untuk menempatkan mereka pada halaqoh masing-masing."
              icon={<Users size={28} />}
              title="Belum ada data santri"
              tone="primary"
            />
          ) : (
            <DataTable
              columns={canManageMasterData ? ["No", "NIS", "Nama", "Gender", "Status", "Wali", "Aksi"] : ["No", "NIS", "Nama", "Gender", "Status", "Wali"]}
              entityLabel="santri"
              pageSize={10}
              rows={studentRows}
            />
          )}
        </Card>
      ) : null}

      {activeTab === "anggota" ? (
        <Card>
          <SectionHeader
            title={canManageMasterData ? "Anggota Halaqoh" : "Anggota Halaqoh Saya"}
            description={canManageMasterData ? "Tempatkan santri pada halaqoh yang sesuai. Relasi ini dipakai untuk presensi, nilai, dan rapor." : "Relasi santri dan halaqoh ditentukan oleh admin."}
            action={
              canManageMasterData ? (
                <Button disabled={loading || !assignmentForm.halaqoh_id || !assignmentForm.student_id} onClick={assignStudent} type="button">
                  <Plus size={18} />
                  Masukkan Santri
                </Button>
              ) : null
            }
          />
          {canManageMasterData ? (
            <div className="mb-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Halaqoh</Label>
                <Select onChange={(event) => setAssignmentForm((current) => ({ ...current, halaqoh_id: event.target.value }))} value={assignmentForm.halaqoh_id}>
                  <option value="">Pilih halaqoh</option>
                  {halaqohs
                    .filter((halaqoh) => halaqoh.is_active)
                    .map((halaqoh) => (
                      <option key={halaqoh.id} value={halaqoh.id}>
                        {halaqoh.name} ({halaqoh.classes?.name ?? "-"})
                      </option>
                    ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Santri</Label>
                <Select onChange={(event) => setAssignmentForm((current) => ({ ...current, student_id: event.target.value }))} value={assignmentForm.student_id}>
                  <option value="">Pilih santri</option>
                  {students
                    .filter((student) => student.status === "active")
                    .map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} ({student.gender === "male" ? "Santriwan" : "Santriwati"})
                      </option>
                    ))}
                </Select>
              </div>
            </div>
          ) : null}
          {assignments.length === 0 ? (
            <EmptyState
              action={
                canManageMasterData ? (
                  halaqohs.length === 0 || students.length === 0 ? (
                    <Button onClick={() => setActiveTab(halaqohs.length === 0 ? "halaqoh" : "santri")} type="button" variant="secondary">
                      {halaqohs.length === 0 ? "Buat Halaqoh Dulu" : "Tambah Santri Dulu"}
                    </Button>
                  ) : undefined
                ) : undefined
              }
              description={
                halaqohs.length === 0
                  ? "Belum ada halaqoh. Buat halaqoh dulu sebelum menempatkan santri."
                  : students.length === 0
                    ? "Belum ada santri. Tambah santri dulu sebelum menempatkan ke halaqoh."
                    : "Pilih halaqoh dan santri di atas, lalu klik Masukkan Santri untuk membuat relasi."
              }
              icon={<Database size={28} />}
              title="Belum ada anggota halaqoh"
              tone="primary"
            />
          ) : (
            <DataTable
              columns={canManageMasterData ? ["No", "Santri", "Gender", "Halaqoh", "Pengampu", "Aksi"] : ["No", "Santri", "Gender", "Halaqoh", "Pengampu"]}
              entityLabel="anggota"
              pageSize={10}
              rows={assignmentRows}
            />
          )}
        </Card>
      ) : null}
    </div>
  );

  function notify(messageText: string, tone: "success" | "error" | "info" = "success") {
    setMessage(messageText);
    setToast({ message: messageText, tone });
    window.setTimeout(() => setToast(null), 5000);
  }
}

function formatTime(value: string | null) {
  if (!value) return "--.--";
  return value.slice(0, 5).replace(":", ".");
}

function formatInputTime(value: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

function normalizeHalaqohRow(row: HalaqohQueryRow): HalaqohRow {
  return {
    ...row,
    teachers: Array.isArray(row.teachers) ? row.teachers[0] ?? null : row.teachers,
    classes: Array.isArray(row.classes) ? row.classes[0] ?? null : row.classes,
  };
}

function filterHalaqohsForProfile(halaqohs: HalaqohRow[], profile: UserProfileRow | null) {
  if (profile?.role !== "guru") return halaqohs;
  if (!profile.is_active || !profile.teacher_id) return [];
  return halaqohs.filter((halaqoh) => halaqoh.teacher_id === profile.teacher_id || halaqoh.teachers?.id === profile.teacher_id);
}

function normalizeAssignmentRow(row: AssignmentQueryRow): AssignmentRow {
  const halaqoh = Array.isArray(row.halaqohs) ? row.halaqohs[0] ?? null : row.halaqohs;

  return {
    ...row,
    students: Array.isArray(row.students) ? row.students[0] ?? null : row.students,
    halaqohs: halaqoh
      ? {
          ...halaqoh,
          classes: Array.isArray(halaqoh.classes) ? halaqoh.classes[0] ?? null : halaqoh.classes,
          teachers: Array.isArray(halaqoh.teachers) ? halaqoh.teachers[0] ?? null : halaqoh.teachers,
        }
      : null,
  };
}
