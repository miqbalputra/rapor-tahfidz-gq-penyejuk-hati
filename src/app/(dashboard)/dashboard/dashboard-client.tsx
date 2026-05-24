"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  Database,
  FileText,
  HelpCircle,
  ListChecks,
  Lock,
  MessageCircleQuestion,
  Printer,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  UserCog,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { SkeletonMetricGrid } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/table";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSchoolSettings } from "@/lib/settings/use-school-settings";
import { cn } from "@/lib/utils/cn";
import { OnboardingWizard } from "./onboarding-wizard";

type UserProfileRow = { role: string; teacher_id: string | null; is_active: boolean; full_name: string };
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
type AssignmentRow = { id: string; student_id: string; halaqoh_id: string; is_active: boolean; students: { id: string; full_name: string; status: string } | null };
type AssignmentQueryRow = Omit<AssignmentRow, "students"> & { students: { id: string; full_name: string; status: string }[] | { id: string; full_name: string; status: string } | null };
type AttendanceSessionRow = { id: string; halaqoh_id: string };
type AttendanceRecordRow = { id: string; session_id: string; status: "present" | "absent" | "permission" | "sick" };
type ReportRow = { id: string; status: string };

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardClient() {
  const { settings, period } = useSchoolSettings();
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const [halaqohs, setHalaqohs] = useState<HalaqohRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSessionRow[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordRow[]>([]);
  const [surahCount, setSurahCount] = useState(0);
  const [tahfidzCount, setTahfidzCount] = useState(0);
  const [juziyahCount, setJuziyahCount] = useState(0);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [message, setMessage] = useState("Memuat ringkasan operasional.");
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const isGuru = profile?.role === "guru";
  const isAdmin = profile?.role === "admin";
  const isKoordinator = profile?.role === "koordinator";
  const isSupervisor = isAdmin || isKoordinator;

  const visibleHalaqohIds = useMemo(() => new Set(halaqohs.map((halaqoh) => halaqoh.id)), [halaqohs]);
  const activeAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.is_active && assignment.students?.status === "active" && visibleHalaqohIds.has(assignment.halaqoh_id)),
    [assignments, visibleHalaqohIds],
  );
  const activeStudentIds = useMemo(() => new Set(activeAssignments.map((assignment) => assignment.student_id)), [activeAssignments]);
  const todayPresentCount = attendanceRecords.filter((record) => record.status === "present").length;
  const todayNotPresentCount = attendanceRecords.length - todayPresentCount;
  const expectedTahfidzCount = activeStudentIds.size * surahCount;
  const tahfidzPercent = expectedTahfidzCount > 0 ? Math.round((tahfidzCount / expectedTahfidzCount) * 100) : 0;
  const juziyahPercent = activeStudentIds.size > 0 ? Math.round((juziyahCount / activeStudentIds.size) * 100) : 0;
  const reportsValidated = reports.filter((report) => report.status === "validated" || report.status === "printed").length;
  const reportsDraft = reports.filter((report) => report.status === "draft" || report.status === "needs_revision").length;
  const reportsWaiting = reports.filter((report) => report.status === "waiting_validation").length;

  const loadDashboard = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Environment Supabase belum lengkap.");
      return;
    }

    setLoading(true);
    const user = await supabase.auth.getUser();

    if (!user.data.user) {
      setMessage("Belum login. Masuk dulu untuk melihat dashboard.");
      setLoading(false);
      return;
    }

    const [profileRes, halaqohRes, assignmentRes, surahRes] = await Promise.all([
      supabase.from("profiles").select("role,teacher_id,is_active,full_name").eq("id", user.data.user.id).maybeSingle(),
      supabase.from("halaqohs").select("id,name,academic_year_id,semester_id,is_active,classes(name),teachers(id,full_name,title)").eq("is_active", true).order("name"),
      supabase.from("student_halaqohs").select("id,student_id,halaqoh_id,is_active,students(id,full_name,status)").eq("is_active", true),
      supabase.from("surahs").select("id", { count: "exact", head: true }).eq("show_in_report", true),
    ]);

    if (profileRes.error || halaqohRes.error || assignmentRes.error || surahRes.error) {
      setMessage(profileRes.error?.message ?? halaqohRes.error?.message ?? assignmentRes.error?.message ?? surahRes.error?.message ?? "Gagal memuat dashboard.");
      setLoading(false);
      return;
    }

    const loadedProfile = (profileRes.data as UserProfileRow | null) ?? null;
    const loadedHalaqohs = filterHalaqohsForProfile(((halaqohRes.data as HalaqohQueryRow[] | null) ?? []).map(normalizeHalaqohRow), loadedProfile);
    const loadedHalaqohIds = new Set(loadedHalaqohs.map((halaqoh) => halaqoh.id));
    const loadedAssignments = ((assignmentRes.data as AssignmentQueryRow[] | null) ?? [])
      .map(normalizeAssignmentRow)
      .filter((assignment) => loadedHalaqohIds.has(assignment.halaqoh_id));
    const studentIds = Array.from(new Set(loadedAssignments.filter((assignment) => assignment.students?.status === "active").map((assignment) => assignment.student_id)));
    const today = todayInputValue();

    const [sessionRes, tahfidzRes, juziyahRes, reportRes] = await Promise.all([
      loadedHalaqohs.length
        ? supabase.from("attendance_sessions").select("id,halaqoh_id").eq("session_date", today).in("halaqoh_id", Array.from(loadedHalaqohIds))
        : Promise.resolve({ data: [], error: null }),
      studentIds.length
        ? supabase.from("tahfidz_scores").select("id", { count: "exact", head: true }).in("student_id", studentIds)
        : Promise.resolve({ count: 0, error: null }),
      studentIds.length
        ? supabase.from("juziyah_scores").select("id", { count: "exact", head: true }).in("student_id", studentIds)
        : Promise.resolve({ count: 0, error: null }),
      studentIds.length
        ? supabase.from("report_cards").select("id,status").in("student_id", studentIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (sessionRes.error || tahfidzRes.error || juziyahRes.error || reportRes.error) {
      setMessage(sessionRes.error?.message ?? tahfidzRes.error?.message ?? juziyahRes.error?.message ?? reportRes.error?.message ?? "Gagal memuat ringkasan dashboard.");
      setLoading(false);
      return;
    }

    const sessions = (sessionRes.data ?? []) as AttendanceSessionRow[];
    const recordRes = sessions.length
      ? await supabase.from("attendance_records").select("id,session_id,status").in("session_id", sessions.map((session) => session.id))
      : { data: [], error: null };

    if (recordRes.error) {
      setMessage(recordRes.error.message);
      setLoading(false);
      return;
    }

    setProfile(loadedProfile);
    setHalaqohs(loadedHalaqohs);
    setAssignments(loadedAssignments);
    setAttendanceSessions(sessions);
    setAttendanceRecords((recordRes.data ?? []) as AttendanceRecordRow[]);
    setSurahCount(surahRes.count ?? 0);
    setTahfidzCount(tahfidzRes.count ?? 0);
    setJuziyahCount(juziyahRes.count ?? 0);
    setReports((reportRes.data ?? []) as ReportRow[]);
    setMessage(loadedProfile?.role === "guru" ? "Ringkasan khusus halaqoh yang diampu." : "Ringkasan seluruh operasional aktif.");
    setLoading(false);
    setInitialLoad(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const greeting = profile?.full_name ? `Assalamualaikum, ${profile.full_name}` : "Assalamualaikum";
  const roleLabel = isAdmin ? "Admin" : isKoordinator ? "Koordinator" : isGuru ? "Guru" : "Pengguna";

  const halaqohRows = halaqohs.slice(0, 6).map((halaqoh, index) => {
    const memberCount = activeAssignments.filter((assignment) => assignment.halaqoh_id === halaqoh.id).length;
    const hasAttendance = attendanceSessions.some((session) => session.halaqoh_id === halaqoh.id);

    return [
      index + 1,
      `${halaqoh.name} (${halaqoh.classes?.name ?? "-"})`,
      `${halaqoh.teachers?.title ?? ""} ${halaqoh.teachers?.full_name ?? "-"}`.trim(),
      memberCount,
      <Badge key={`${halaqoh.id}-attendance`} tone={hasAttendance ? "green" : "amber"}>
        {hasAttendance ? "Sudah" : "Belum"}
      </Badge>,
    ];
  });

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-[var(--surface-soft)] to-[var(--surface)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--primary)]">{greeting}</p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Dashboard {roleLabel}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              {settings.institution_name}
              {period.academic_year_name ? ` · Tahun Ajaran ${period.academic_year_name}` : ""}
              {period.semester_name ? ` · Semester ${period.semester_name}` : ""}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{message}</p>
          </div>
          <Button disabled={loading} onClick={loadDashboard} type="button" variant="secondary">
            <RefreshCw size={18} />
            {loading ? "Memuat..." : "Muat Ulang"}
          </Button>
        </div>
      </Card>

      <OnboardingWizard role={isAdmin ? "admin" : isKoordinator ? "koordinator" : isGuru ? "guru" : "viewer"} />

      {initialLoad ? (
        <SkeletonMetricGrid count={4} />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard help={isGuru ? "Halaqoh yang diampu" : "Halaqoh aktif"} icon={<UsersRound size={22} />} label="Halaqoh" value={halaqohs.length} />
          <MetricCard help="Santri aktif dalam halaqoh" icon={<UsersRound size={22} />} label="Santri" value={activeStudentIds.size} />
          <MetricCard help={`${todayPresentCount} hadir, ${todayNotPresentCount} sakit/izin/alfa`} icon={<CalendarCheck size={22} />} label="Presensi Hari Ini" value={attendanceRecords.length} />
          <MetricCard
            help={`${reportsValidated} tervalidasi · ${reportsWaiting} menunggu · ${reportsDraft} draft`}
            icon={<FileText size={22} />}
            label="Rapor Tersimpan"
            value={reports.length}
          />
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <SectionHeader title="Aksi Cepat" description="Menu yang paling sering dibuka." />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <QuickLink href="/presensi" icon={<CalendarCheck size={19} />} label="Input Presensi" desc="Catat kehadiran santri pada pertemuan hari ini." />
            <QuickLink href="/penilaian" icon={<ClipboardList size={19} />} label="Input Nilai" desc="Nilai setoran surat, juziyah, dan ujian lainnya." />
            <QuickLink href="/rapor" icon={<FileText size={19} />} label="Rapor" desc="Cek kelengkapan, cetak satuan, atau cetak massal." />
            {isAdmin ? <QuickLink href="/akun-guru" icon={<UserCog size={19} />} label="Akun Guru" desc="Buat dan kelola akun login untuk guru." /> : null}
            {isSupervisor ? <QuickLink href="/master" icon={<Database size={19} />} label="Master Data" desc="Kelola guru, santri, halaqoh, dan anggota." /> : null}
            {isSupervisor ? <QuickLink href="/pengaturan" icon={<Settings size={19} />} label="Pengaturan" desc="Profil lembaga dan rubrik nilai." /> : null}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Kelengkapan Data Akademik" description="Perkiraan progress input nilai dan rapor." />
          <div className="space-y-4">
            <ProgressItem label="Nilai setoran surat" value={tahfidzPercent} detail={`${tahfidzCount} dari ${expectedTahfidzCount} nilai`} />
            <ProgressItem label="Nilai juziyah" value={juziyahPercent} detail={`${juziyahCount} dari ${activeStudentIds.size} santri`} />
            <ProgressItem
              label="Rapor tervalidasi/cetak"
              value={activeStudentIds.size ? Math.round((reportsValidated / Math.max(activeStudentIds.size, 1)) * 100) : 0}
              detail={`${reportsValidated} dari ${activeStudentIds.size} santri`}
            />
          </div>
        </Card>
      </section>

      {/* Panduan teknis lengkap */}
      <PanduanTeknis role={isAdmin ? "admin" : isKoordinator ? "koordinator" : isGuru ? "guru" : "viewer"} />

      <Card>
        <SectionHeader title="Presensi Halaqoh Hari Ini" description="Daftar halaqoh dan status sesi presensi tanggal hari ini." />
        <DataTable columns={["No", "Halaqoh", "Pengampu", "Santri Aktif", "Presensi"]} rows={halaqohRows} />
      </Card>

      {/* FAQ + Troubleshooting */}
      <FAQ />
    </div>
  );
}

function MetricCard({ help, icon, label, value }: { help: string; icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{help}</p>
        </div>
        <div className="grid size-10 place-items-center rounded-md bg-[var(--surface-soft)] text-[var(--primary)]">{icon}</div>
      </div>
    </Card>
  );
}

function ProgressItem({ detail, label, value }: { detail: string; label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-[var(--muted)]">{detail}</p>
        </div>
        <Badge tone={value >= 100 ? "green" : value > 0 ? "amber" : "neutral"}>{value}%</Badge>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label, desc }: { href: string; icon: React.ReactNode; label: string; desc: string }) {
  return (
    <Link
      className="group flex items-start gap-3 rounded-md border border-[var(--line)] p-3 transition hover:border-[var(--primary)]/50 hover:bg-[var(--surface-soft)]"
      href={href}
    >
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-[var(--surface-soft)] text-[var(--primary)] group-hover:bg-[var(--surface)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-sm font-semibold text-[var(--foreground)]">
          {label}
          <ArrowRight className="text-[var(--muted)]" size={16} />
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-[var(--muted)]">{desc}</span>
      </span>
    </Link>
  );
}

function PanduanTeknis({ role }: { role: "admin" | "koordinator" | "guru" | "viewer" }) {
  const [openId, setOpenId] = useState<string>("alur-utama");

  type StepGroup = {
    id: string;
    title: string;
    icon: React.ReactNode;
    description: string;
    visibleFor: Array<typeof role>;
    steps: Array<{ title: string; detail: string; href?: string; hrefLabel?: string }>;
  };

  const groups: StepGroup[] = [
    {
      id: "alur-utama",
      title: "Alur Utama: Master Data → Input Nilai → Cetak Rapor",
      icon: <ListChecks size={20} />,
      description: "Urutan ringkas paling penting yang harus dipahami semua pengguna.",
      visibleFor: ["admin", "koordinator", "guru", "viewer"],
      steps: [
        { title: "Admin menyiapkan data dasar", detail: "Buka Master Data, pastikan guru, santri, kelas, halaqoh, dan anggota halaqoh sudah benar.", href: "/master", hrefLabel: "Buka Master Data" },
        { title: "Admin membuat akun guru", detail: "Buka Akun Guru, klik Tambah, pilih guru, isi email dan password minimal 8 karakter, klik Simpan.", href: "/akun-guru", hrefLabel: "Buka Akun Guru" },
        { title: "Guru login dan input presensi", detail: "Guru login dengan email/password yang dibuat admin, masuk Presensi, pilih halaqoh dan tanggal, isi status hadir/sakit/izin/alfa, klik Simpan Presensi.", href: "/presensi", hrefLabel: "Buka Presensi" },
        { title: "Guru input nilai", detail: "Buka Penilaian, isi nilai setoran tiap surat (kolom kelancaran, fashohah, tajwid), simpan; lalu isi nilai juziyah; isi ujian lainnya jika ada.", href: "/penilaian", hrefLabel: "Buka Penilaian" },
        { title: "Cek kelengkapan rapor", detail: "Buka Rapor, pilih tahun ajaran, semester, halaqoh, santri, dan Juz 29 atau Juz 30. Lihat tabel Kelengkapan Rapor Halaqoh untuk memastikan semua santri siap.", href: "/rapor", hrefLabel: "Buka Rapor" },
        { title: "Cetak rapor sebagai Word", detail: "Pada halaman Rapor, klik Simpan Draft, lalu klik Cetak Word (Santri Ini) untuk file DOCX satu santri, atau Cetak Word Halaqoh untuk semua santri dalam ZIP. Word adalah format utama yang sesuai template asli sekolah.", href: "/rapor", hrefLabel: "Buka Rapor" },
      ],
    },
    {
      id: "admin-onboarding",
      title: "Setup Awal untuk Admin",
      icon: <ShieldCheck size={20} />,
      description: "Lakukan ini sekali saat sekolah pertama kali memakai aplikasi.",
      visibleFor: ["admin"],
      steps: [
        { title: "Isi profil lembaga", detail: "Buka Pengaturan → Profil Lembaga. Isi nama lembaga, alamat lengkap, nama koordinator default, dan catatan default rapor. Data ini akan tampil di header rapor cetak.", href: "/pengaturan", hrefLabel: "Buka Pengaturan" },
        { title: "Atur rubrik nilai", detail: "Buka Pengaturan → Rubrik dan Predikat. Tetapkan jenis ujian, porsi nilai per komponen (kelancaran 25, fashohah 25, tajwid 50), syarat lulus (minimal 85, salah maksimal 5), dan rentang predikat (Mumtaz, Jayyid Jiddan, Jayyid, Maqbul).", href: "/pengaturan", hrefLabel: "Buka Pengaturan" },
        { title: "Cek dan tambah master data", detail: "Buka Master Data → Kelola Guru. Tambahkan guru jika belum ada. Lalu pindah ke Kelola Halaqoh dan Kelola Anggota Halaqoh untuk memastikan semua santri sudah masuk halaqoh yang benar.", href: "/master", hrefLabel: "Buka Master Data" },
        { title: "Buat akun guru", detail: "Buka Akun Guru. Untuk tiap guru, klik Tambah Akun, isi email guru dan password awal, klik Simpan. Bagikan email/password tersebut ke guru terkait.", href: "/akun-guru", hrefLabel: "Buka Akun Guru" },
        { title: "Beritahu guru cara login", detail: "Guru login di halaman utama dengan email dan password tersebut. Setelah login, guru hanya akan melihat halaqoh yang diampunya saja." },
      ],
    },
    {
      id: "guru-harian",
      title: "Cara Pakai Harian untuk Guru",
      icon: <ClipboardList size={20} />,
      description: "Yang biasa dilakukan guru setiap pertemuan dan menjelang akhir semester.",
      visibleFor: ["admin", "guru"],
      steps: [
        { title: "Login ke aplikasi", detail: "Buka aplikasi, klik Login, masukkan email dan password yang diberikan admin." },
        { title: "Isi presensi tiap pertemuan", detail: "Buka menu Presensi. Pilih halaqoh, pilih tanggal, isi materi (opsional). Untuk tiap santri, pilih Hadir/Sakit/Izin/Alfa, tambahkan catatan jika perlu, klik Simpan Presensi.", href: "/presensi", hrefLabel: "Buka Presensi" },
        { title: "Input nilai setoran tahfidz", detail: "Buka Penilaian. Pilih tahun ajaran, semester, halaqoh, santri, dan Juz 29 atau Juz 30. Untuk tiap surat, isi jumlah salah kelancaran (sistem otomatis hitung nilai kelancaran), nilai fashohah, dan tajwid. Klik Simpan tiap baris atau Simpan Semua.", href: "/penilaian", hrefLabel: "Buka Penilaian" },
        { title: "Input nilai juziyah", detail: "Pada halaman Penilaian, scroll ke bagian Nilai Juziyah. Isi kelancaran, fashohah, tajwid (rata-rata dan predikat dihitung otomatis). Klik Simpan Juziyah.", href: "/penilaian", hrefLabel: "Buka Penilaian" },
        { title: "Cek kelengkapan menjelang rapor", detail: "Buka Rapor. Tabel Kelengkapan Rapor Halaqoh menunjukkan santri yang setoran, juziyah, atau drafnya belum lengkap. Lengkapi dulu sebelum cetak.", href: "/rapor", hrefLabel: "Buka Rapor" },
        { title: "Cetak rapor", detail: "Pada halaman Rapor, klik Simpan Draft, lalu klik Cetak Word (Santri Ini) untuk satu santri, atau Cetak Word Halaqoh untuk seluruh halaqoh dalam satu ZIP. File DOCX otomatis terdownload dan bisa langsung dibuka di Microsoft Word.", href: "/rapor", hrefLabel: "Buka Rapor" },
      ],
    },
    {
      id: "workflow-rapor",
      title: "Workflow Rapor: Draft → Validasi → Cetak",
      icon: <Send size={20} />,
      description: "Tahapan rapor agar nilai final aman dan tidak berubah tanpa otorisasi.",
      visibleFor: ["admin", "koordinator", "guru"],
      steps: [
        { title: "Draft", detail: "Saat guru pertama kali Simpan Draft, status rapor adalah Draft. Guru/admin masih bisa mengubah catatan dan data rapor." },
        { title: "Ajukan Validasi", detail: "Saat guru sudah yakin nilai dan catatan benar, klik tombol Ajukan Validasi. Status berubah menjadi Menunggu Validasi." },
        { title: "Validasi oleh koordinator/admin", detail: "Koordinator/admin membuka Rapor santri tersebut. Klik Validasi Rapor jika sudah benar, atau klik Minta Revisi jika ada yang perlu diperbaiki." },
        { title: "Tandai Tercetak", detail: "Setelah rapor benar-benar dicetak/diberikan ke wali, klik Tandai Tercetak. Setelah ini hanya admin/koordinator yang dapat membuka kembali rapor." },
        { title: "Buka kembali jika perlu", detail: "Admin/koordinator dapat menggunakan tombol Buka Kembali jika ternyata perlu mengubah rapor yang sudah tervalidasi atau tercetak.", href: "/rapor", hrefLabel: "Buka Rapor" },
      ],
    },
    {
      id: "kunci-nilai",
      title: "Mengunci Nilai dan Presensi",
      icon: <Lock size={20} />,
      description: "Saat data sudah final, kunci agar tidak diubah tanpa sengaja.",
      visibleFor: ["admin", "koordinator"],
      steps: [
        { title: "Kunci nilai surat tertentu", detail: "Pada halaman Penilaian Tahfidz, tiap baris surat punya tombol Kunci di kolom Aksi (hanya untuk admin/koordinator). Klik untuk mengunci nilai surat itu agar guru tidak bisa mengubahnya lagi." },
        { title: "Kunci nilai juziyah", detail: "Pada bagian Nilai Juziyah, klik tombol Kunci. Setelah dikunci, hanya admin/koordinator yang dapat mengubah." },
        { title: "Kunci sesi presensi", detail: "Pada halaman Presensi, setelah memilih halaqoh dan tanggal, klik tombol Kunci Sesi (hanya admin/koordinator). Ini mencegah guru mengubah presensi yang sudah final." },
        { title: "Buka kunci jika perlu koreksi", detail: "Klik tombol Buka Kunci. Setelah dibuka, guru bisa mengedit lagi. Jangan lupa kunci kembali setelah koreksi selesai." },
      ],
    },
    {
      id: "cetak-massal",
      title: "Cetak Word Massal dan Cetak Browser",
      icon: <Printer size={20} />,
      description: "Cara mencetak rapor satu halaqoh sekaligus, dalam Word atau lewat browser.",
      visibleFor: ["admin", "koordinator", "guru"],
      steps: [
        { title: "Pastikan kelengkapan", detail: "Buka Rapor. Pastikan tabel Kelengkapan Rapor Halaqoh menunjukkan semua santri Siap. Jika belum, lengkapi dulu di Penilaian." },
        { title: "Pilih opsi cetak", detail: "Cetak Word Halaqoh (utama): mengunduh file ZIP berisi DOCX tiap santri yang siap dibagikan. Cetak Browser Halaqoh (alternatif): membuka pratinjau cetak browser untuk Save as PDF atau cetak fisik." },
        { title: "Konfirmasi jika ada yang belum lengkap", detail: "Jika masih ada santri yang belum lengkap, sistem akan menampilkan dialog konfirmasi. Anda bisa lanjut atau batal untuk melengkapi dulu." },
        { title: "Simpan hasil", detail: "Untuk Cetak Word Halaqoh: file ZIP otomatis terdownload. Buka di Word, edit jika perlu, lalu cetak. Untuk Cetak Browser: pakai dialog cetak browser, pilih Save as PDF atau printer fisik.", href: "/rapor", hrefLabel: "Buka Rapor" },
      ],
    },
  ];

  const visible = groups.filter((group) => group.visibleFor.includes(role));

  return (
    <Card>
      <SectionHeader
        title="Panduan Penggunaan Aplikasi"
        description="Klik salah satu bagian di bawah untuk melihat langkah-langkah detail. Panduan disesuaikan dengan akun yang sedang login."
      />
      <div className="space-y-3">
        {visible.map((group) => {
          const isOpen = openId === group.id;
          return (
            <div className="overflow-hidden rounded-md border border-[var(--line)]" key={group.id}>
              <button
                aria-expanded={isOpen}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition",
                  isOpen ? "bg-[var(--surface-soft)]" : "bg-[var(--surface)] hover:bg-[var(--surface-soft)]/60",
                )}
                onClick={() => setOpenId((current) => (current === group.id ? "" : group.id))}
                type="button"
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-md",
                    isOpen ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-soft)] text-[var(--primary)]",
                  )}
                >
                  {group.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <p className={cn("font-bold", isOpen ? "text-[var(--primary-strong)]" : "text-[var(--foreground)]")}>{group.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{group.description}</p>
                </span>
                <ArrowRight className={cn("shrink-0 text-[var(--muted)] transition", isOpen ? "rotate-90" : "")} size={18} />
              </button>
              {isOpen ? (
                <ol className="space-y-3 border-t border-[var(--line)] bg-[var(--surface)] p-4">
                  {group.steps.map((step, index) => (
                    <li className="flex gap-3" key={`${group.id}-${index}`}>
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--surface-soft)] text-xs font-bold text-[var(--primary)]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--foreground)]">{step.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{step.detail}</p>
                        {step.href ? (
                          <Link
                            className="mt-2 inline-flex items-center gap-2 rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface-soft)]"
                            href={step.href}
                          >
                            {step.hrefLabel ?? "Buka halaman"}
                            <ArrowRight size={14} />
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function FAQ() {
  const items: Array<{ question: string; answer: string; tone?: "warning" }> = [
    {
      question: "Saya guru, kenapa hanya melihat sebagian halaqoh?",
      answer:
        "Itu wajar. Guru hanya melihat halaqoh yang dia diampu sesuai pengaturan admin. Hubungi admin jika ada halaqoh Anda yang belum tampil.",
    },
    {
      question: "Saya tidak bisa edit nilai/presensi, kenapa?",
      answer:
        "Cek apakah nilai/presensinya berstatus Terkunci. Setelah dikunci oleh admin/koordinator, hanya mereka yang dapat membukanya kembali.",
      tone: "warning",
    },
    {
      question: "Total nilai tidak sesuai harapan, di mana saya mengubah porsinya?",
      answer:
        "Buka Pengaturan → Rubrik dan Predikat. Pilih jenis ujian, lalu ubah porsi tiap komponen (misal kelancaran 25, fashohah 25, tajwid 50). Total dihitung otomatis dari porsi tersebut.",
    },
    {
      question: "File Word yang saya download tidak terbuka di Word lama. Apa solusinya?",
      answer:
        "Pastikan Microsoft Word minimal versi 2010, atau buka dengan Google Docs / LibreOffice. Jika tetap tidak bisa, gunakan opsi Cetak Browser dari menu titik tiga di halaman Rapor lalu pilih Save as PDF dari dialog cetak browser.",
    },
    {
      question: "Bagaimana mengganti nama lembaga atau alamat di header rapor?",
      answer:
        "Buka Pengaturan → Profil Lembaga, ubah Nama Lengkap Lembaga dan Alamat. Perubahan akan tampil di header rapor cetak berikutnya.",
    },
    {
      question: "Rapor sudah Tervalidasi tapi ternyata ada salah ketik. Bagaimana memperbaikinya?",
      answer:
        "Admin/koordinator membuka rapor santri tersebut, klik Buka Kembali. Status kembali ke Draft sehingga bisa diedit. Setelah selesai, Ajukan Validasi lagi.",
    },
    {
      question: "Saya lupa password saya. Bagaimana?",
      answer:
        "Hubungi admin sekolah. Admin dapat membuka menu Akun Guru, memilih akun Anda, dan klik Edit untuk mengganti password Anda.",
    },
  ];

  return (
    <Card>
      <SectionHeader
        title="Pertanyaan Sering Ditanyakan"
        description="Jawaban cepat untuk hal yang biasa ditanyakan guru dan admin."
      />
      <div className="space-y-2">
        {items.map((item, index) => (
          <details
            className="group rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:bg-[var(--surface-soft)]/40"
            key={index}
          >
            <summary className="flex cursor-pointer list-none items-start gap-3 font-semibold text-[var(--foreground)]">
              <span
                className={cn(
                  "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                  item.tone === "warning" ? "bg-amber-100 text-amber-800" : "bg-[var(--surface-soft)] text-[var(--primary)]",
                )}
              >
                {item.tone === "warning" ? <AlertTriangle size={14} /> : <MessageCircleQuestion size={14} />}
              </span>
              <span className="flex-1">{item.question}</span>
            </summary>
            <p className="mt-3 pl-10 text-sm leading-6 text-[var(--muted)]">{item.answer}</p>
          </details>
        ))}
      </div>

      <div className="mt-5 rounded-md bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted)]">
        <div className="flex items-start gap-2">
          <HelpCircle className="mt-0.5 shrink-0 text-[var(--primary)]" size={18} />
          <div>
            <p className="font-semibold text-[var(--foreground)]">Belum ketemu jawabannya?</p>
            <p className="mt-1">
              Buka panduan langkah-demi-langkah di bagian atas. Jika masih bingung, hubungi admin sekolah atau Koordinator Griya Qur&apos;an
              untuk panduan lebih lanjut.
            </p>
          </div>
        </div>
      </div>
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

function filterHalaqohsForProfile(halaqohs: HalaqohRow[], profile: UserProfileRow | null) {
  if (profile?.role !== "guru") return halaqohs;
  if (!profile.is_active || !profile.teacher_id) return [];
  return halaqohs.filter((halaqoh) => halaqoh.teachers?.id === profile.teacher_id);
}
