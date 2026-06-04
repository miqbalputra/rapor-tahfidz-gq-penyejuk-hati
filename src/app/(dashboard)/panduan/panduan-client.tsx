"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowRightLeft,
  Bookmark,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Database,
  FileSignature,
  FileText,
  FileUp,
  GraduationCap,
  HelpCircle,
  History,
  Lightbulb,
  Lock,
  LogIn,
  MessageCircleQuestion,
  Moon,
  PenLine,
  Printer,
  Send,
  Sliders,
  Sparkles,
  UserCog,
  Users,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type SectionId =
  | "ringkasan"
  | "alur-utama"
  | "setup-admin"
  | "harian-guru"
  | "rapor-workflow"
  | "fitur-rapor"
  | "kunci-validasi"
  | "fitur-tambahan"
  | "tips"
  | "faq";

const sections: Array<{ id: SectionId; label: string; icon: React.ReactNode }> = [
  { id: "ringkasan", label: "Ringkasan Aplikasi", icon: <BookOpen size={18} /> },
  { id: "alur-utama", label: "Alur Utama", icon: <ArrowRight size={18} /> },
  { id: "setup-admin", label: "Setup Admin Pertama Kali", icon: <Building2 size={18} /> },
  { id: "harian-guru", label: "Pemakaian Harian Guru", icon: <ClipboardList size={18} /> },
  { id: "rapor-workflow", label: "Workflow Rapor", icon: <FileSignature size={18} /> },
  { id: "fitur-rapor", label: "Fitur Rapor Lanjutan", icon: <FileText size={18} /> },
  { id: "kunci-validasi", label: "Mengunci Data", icon: <Lock size={18} /> },
  { id: "fitur-tambahan", label: "Fitur Tambahan", icon: <Sparkles size={18} /> },
  { id: "tips", label: "Tips Pemakaian", icon: <Lightbulb size={18} /> },
  { id: "faq", label: "Pertanyaan Sering Ditanyakan", icon: <HelpCircle size={18} /> },
];

export function PanduanClient() {
  const [active, setActive] = useState<SectionId>("ringkasan");

  // IntersectionObserver untuk highlight section aktif di TOC saat scroll.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target.id as SectionId);
          }
        });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6">
      <header className="no-print flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--primary)]">Dokumentasi</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Panduan Penggunaan Aplikasi Rapor Tahfidz</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Halaman ini bisa dicetak atau disimpan sebagai PDF untuk dibagikan ke admin dan guru. Klik tombol Cetak Panduan di kanan, lalu pilih Save as PDF di dialog browser.
          </p>
        </div>
        <Button onClick={() => window.print()} type="button">
          <Printer size={18} />
          Cetak Panduan
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Table of Contents sticky (desktop) */}
        <aside className="no-print lg:sticky lg:top-24 lg:self-start">
          <Card className="lg:p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Daftar Isi</p>
            <nav className="space-y-1">
              {sections.map((section, index) => (
                <a
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition",
                    active === section.id
                      ? "bg-[var(--surface-soft)] text-[var(--primary-strong)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-soft)]/60 hover:text-[var(--foreground)]",
                  )}
                  href={`#${section.id}`}
                  key={section.id}
                  onClick={() => setActive(section.id)}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--surface-soft)] text-xs font-bold text-[var(--primary)]">
                    {index + 1}
                  </span>
                  <span className="flex-1 truncate">{section.label}</span>
                </a>
              ))}
            </nav>
          </Card>
        </aside>

        <main className="space-y-8">
          <Ringkasan />
          <AlurUtama />
          <SetupAdmin />
          <HarianGuru />
          <RaporWorkflow />
          <FiturRapor />
          <KunciValidasi />
          <FiturTambahan />
          <Tips />
          <FAQ />
        </main>
      </div>
    </div>
  );
}

// =============================================================
// 1. Ringkasan
// =============================================================
function Ringkasan() {
  return (
    <section className="scroll-mt-24" id="ringkasan">
      <SectionTitle index={1} title="Ringkasan Aplikasi" icon={<BookOpen size={20} />} />
      <Card>
        <p className="leading-7 text-[var(--foreground)]">
          Aplikasi ini dipakai untuk mengelola data santri, nilai tahfidz, rekap presensi semester, dan cetak rapor Juz 29 / Juz 30 secara digital.
          Tujuannya menggantikan input manual di Word dan Excel agar lebih cepat, tidak salah hitung, dan rapi.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <RoleCard icon={<UserCog size={20} />} label="Admin" desc="Kelola guru, santri, halaqoh, akun guru, tahun ajaran, rubrik, dan profil lembaga." />
          <RoleCard icon={<UsersRound size={20} />} label="Koordinator" desc="Memvalidasi rapor, mengunci nilai, melihat semua halaqoh, audit log." />
          <RoleCard icon={<ClipboardList size={20} />} label="Guru" desc="Input nilai setoran, juziyah, ujian lainnya, dan rekap presensi semester pada halaqoh yang diampu." />
        </div>

        <div className="mt-5 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4">
          <p className="font-bold text-[var(--foreground)]">Yang dihasilkan aplikasi:</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[var(--muted)]">
            <li>• <strong className="text-[var(--foreground)]">File Word (.docx)</strong> rapor santri yang sesuai template sekolah, siap dicetak atau diedit.</li>
            <li>• <strong className="text-[var(--foreground)]">File ZIP</strong> berisi semua rapor santri satu halaqoh sekaligus.</li>
            <li>• <strong className="text-[var(--foreground)]">Rekap presensi semester</strong> yang diisi satu kali dari catatan manual sekolah sebelum rapor dicetak.</li>
            <li>• <strong className="text-[var(--foreground)]">Preview rapor live</strong> di browser yang persis sama dengan file Word yang akan didownload.</li>
            <li>• <strong className="text-[var(--foreground)]">Audit log otomatis</strong> mencatat semua perubahan nilai, presensi, dan rapor untuk transparansi.</li>
          </ul>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <FeatureBox icon={<Sparkles size={18} />} title="Panduan Setup" desc="Halaman Panduan menyediakan urutan setup awal untuk admin tanpa memenuhi tampilan Dashboard." />
          <FeatureBox icon={<Moon size={18} />} title="Mode Gelap" desc="Toggle ikon bulan/matahari di kanan atas. Disimpan otomatis per browser." />
        </div>
      </Card>
    </section>
  );
}

// =============================================================
// 2. Alur Utama (FLOWCHART)
// =============================================================
function AlurUtama() {
  const flow: Array<{ icon: React.ReactNode; label: string; actor: string; desc: string }> = [
    { icon: <Building2 size={22} />, label: "Setup Profil & Master Data", actor: "Admin", desc: "Lengkapi profil lembaga, tahun ajaran, guru, halaqoh, santri, dan tempatkan santri ke halaqoh." },
    { icon: <UserCog size={22} />, label: "Buat Akun Guru", actor: "Admin", desc: "Buat email & password login untuk tiap guru." },
    { icon: <LogIn size={22} />, label: "Guru Login", actor: "Guru", desc: "Guru login lalu otomatis hanya melihat halaqoh yang diampunya." },
    { icon: <CalendarCheck size={22} />, label: "Rekap Presensi Semester", actor: "Guru", desc: "Di Rapor Semester, isi total Sakit/Izin/Tanpa Keterangan dari catatan kertas sekolah." },
    { icon: <ClipboardList size={22} />, label: "Input Nilai", actor: "Guru", desc: "Isi nilai setoran tiap surat, lalu nilai juziyah, dan ujian lainnya bila perlu." },
    { icon: <FileSignature size={22} />, label: "Validasi Rapor", actor: "Koordinator", desc: "Periksa kelengkapan, ajukan validasi, lalu validasi rapor." },
    { icon: <FileText size={22} />, label: "Cetak Word", actor: "Admin/Koord.", desc: "Klik Cetak Word (Santri Ini) atau Cetak Word Halaqoh (ZIP)." },
  ];

  return (
    <section className="scroll-mt-24" id="alur-utama">
      <SectionTitle index={2} title="Alur Utama Pemakaian" icon={<ArrowRight size={20} />} />

      <Card>
        <p className="mb-5 text-sm leading-6 text-[var(--muted)]">
          Inilah urutan pemakaian dari awal sampai rapor tercetak. Setiap kotak adalah satu tahap, dan tanda panah menunjukkan urutannya.
        </p>

        {/* Flowchart vertikal */}
        <div className="space-y-2">
          {flow.map((step, index) => (
            <div key={index}>
              <FlowBox actor={step.actor} desc={step.desc} icon={step.icon} index={index + 1} label={step.label} />
              {index < flow.length - 1 ? (
                <div className="my-1 flex items-center justify-center text-[var(--primary)]">
                  <ArrowDown className="animate-pulse" size={22} />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-md border-l-4 border-[var(--primary)] bg-[var(--surface-soft)] p-4 text-sm leading-6">
          <p className="font-bold text-[var(--foreground)]">Catatan penting:</p>
          <p className="mt-1 text-[var(--muted)]">
            Tiap tahap punya prasyarat. Misalnya, guru tidak bisa input nilai sebelum admin menempatkan santri ke halaqoh. Aplikasi akan menunjukkan empty state dengan instruksi jika ada tahap yang dilewati.
          </p>
        </div>
      </Card>
    </section>
  );
}

function FlowBox({ index, label, actor, desc, icon }: { index: number; label: string; actor: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-stretch gap-3 rounded-lg border-2 border-[var(--primary)]/30 bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex flex-col items-center gap-2">
        <span className="grid size-10 place-items-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">{index}</span>
        <div className="grid size-10 place-items-center rounded-md bg-[var(--surface-soft)] text-[var(--primary)]">{icon}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-[var(--foreground)]">{label}</h3>
          <Badge tone="green">{actor}</Badge>
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{desc}</p>
      </div>
    </div>
  );
}

// =============================================================
// 3. Setup Admin Pertama Kali
// =============================================================
function SetupAdmin() {
  const steps = [
    { num: 1, icon: <Building2 size={18} />, title: "Lengkapi profil lembaga", detail: "Buka Pengaturan → tab Profil Lembaga. Isi nama, alamat, koordinator default. Ini muncul di header rapor cetak." },
    { num: 2, icon: <CalendarRange size={18} />, title: "Atur tahun ajaran & semester", detail: "Buka Pengaturan → tab Tahun Ajaran. Tambah tahun ajaran (mis. 2026/2027), tandai aktif. Tambah semester I/II, tandai mana yang sedang berjalan." },
    { num: 3, icon: <Sliders size={18} />, title: "Cek pengaturan rubrik", detail: "Buka Pengaturan → tab Rubrik dan Predikat. Default sudah sesuai bahan sekolah (Kelancaran 25, Fashohah 25, Tajwid 50). Ubah hanya jika diperlukan." },
    { num: 4, icon: <UsersRound size={18} />, title: "Tambah guru", detail: "Buka Master Data → tab Guru. Isi sapaan dan nama tiap guru pengampu, klik Tambah Guru. Bisa juga tambahkan tanda tangan digital lewat tombol Buat TTD di tiap baris guru." },
    { num: 5, icon: <GraduationCap size={18} />, title: "Buat halaqoh", detail: "Buka tab Halaqoh. Isi nama, kelas, gender, pengampu, jam, dan tahun ajaran/semester. Klik Tambah Halaqoh." },
    { num: 6, icon: <Users size={18} />, title: "Tambah santri", detail: "Buka tab Santri. Isi satu per satu, atau pakai tombol Import dari CSV untuk upload banyak santri sekaligus dari file Excel/CSV." },
    { num: 7, icon: <Database size={18} />, title: "Tempatkan santri ke halaqoh", detail: "Buka tab Anggota Halaqoh. Pilih halaqoh + santri, klik Masukkan Santri. Atau, kalau import CSV punya kolom 'halaqoh', santri otomatis tertempat saat import." },
    { num: 8, icon: <UserCog size={18} />, title: "Buat akun login guru", detail: "Buka menu Akun Guru. Pilih guru, isi email dan password minimal 8 karakter, klik Simpan. Bagikan kredensial ke guru." },
  ];

  return (
    <section className="scroll-mt-24" id="setup-admin">
      <SectionTitle index={3} title="Setup Admin Pertama Kali" icon={<Building2 size={20} />} />

      <Card>
        <p className="mb-4 text-sm leading-6 text-[var(--muted)]">
          Lakukan urutan ini sekali saat pertama kali memakai aplikasi. Gunakan checklist panduan ini sebagai acuan setup awal.
        </p>

        <ol className="space-y-3">
          {steps.map((step) => (
            <li className="flex items-start gap-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4" key={step.num}>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">{step.num}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[var(--foreground)]">
                  <span className="text-[var(--primary)]">{step.icon}</span>
                  <p className="font-bold">{step.title}</p>
                </div>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-md bg-[var(--surface-soft)] p-4 text-sm leading-6">
          <p className="font-bold text-[var(--foreground)]">Estimasi waktu setup awal:</p>
          <p className="mt-1 text-[var(--muted)]">15-30 menit tergantung jumlah guru, halaqoh, dan santri. Untuk sekolah dengan ~90 santri dan 12 halaqoh, biasanya selesai dalam 25 menit. Pakai Import CSV bisa hemat banyak waktu untuk batch input santri.</p>
        </div>
      </Card>
    </section>
  );
}

// =============================================================
// 4. Pemakaian Harian Guru
// =============================================================
function HarianGuru() {
  return (
    <section className="scroll-mt-24" id="harian-guru">
      <SectionTitle index={4} title="Pemakaian Harian Guru" icon={<ClipboardList size={20} />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <CalendarCheck size={18} />
            </span>
            <h3 className="font-bold">Menjelang cetak rapor semester</h3>
          </div>
          <ol className="space-y-2 text-sm leading-6 text-[var(--muted)]">
            <li><strong className="text-[var(--foreground)]">1.</strong> Siapkan rekap kertas presensi semester dari sekolah.</li>
            <li><strong className="text-[var(--foreground)]">2.</strong> Buka menu Rapor → Rapor Semester.</li>
            <li><strong className="text-[var(--foreground)]">3.</strong> Pilih tahun ajaran, semester, halaqoh, dan santri.</li>
            <li><strong className="text-[var(--foreground)]">4.</strong> Isi total Sakit, Izin, dan Tanpa Keterangan satu kali.</li>
            <li><strong className="text-[var(--foreground)]">5.</strong> Klik Simpan Draft sebelum download PDF atau Excel.</li>
          </ol>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <BookOpen size={18} />
            </span>
            <h3 className="font-bold">Setelah santri setor hafalan</h3>
          </div>
          <ol className="space-y-2 text-sm leading-6 text-[var(--muted)]">
            <li><strong className="text-[var(--foreground)]">1.</strong> Buka menu Penilaian → tab Setoran Surat.</li>
            <li><strong className="text-[var(--foreground)]">2.</strong> Pilih halaqoh, santri, dan Juz 29 atau Juz 30.</li>
            <li><strong className="text-[var(--foreground)]">3.</strong> Untuk tiap surat, isi:
              <ul className="ml-5 mt-1 space-y-0.5 list-disc">
                <li>Jumlah salah kelancaran</li>
                <li>Nilai fashohah (max 25)</li>
                <li>Nilai tajwid (max 50)</li>
              </ul>
            </li>
            <li><strong className="text-[var(--foreground)]">4.</strong> Total dan predikat dihitung otomatis.</li>
            <li><strong className="text-[var(--foreground)]">5.</strong> Klik Simpan tiap baris atau Simpan Semua Surat.</li>
          </ol>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <FileSignature size={18} />
            </span>
            <h3 className="font-bold">Menjelang akhir semester</h3>
          </div>
          <ol className="space-y-2 text-sm leading-6 text-[var(--muted)]">
            <li><strong className="text-[var(--foreground)]">1.</strong> Buka tab Juziyah, isi nilai juziyah tiap santri.</li>
            <li><strong className="text-[var(--foreground)]">2.</strong> Buka tab Ujian Lainnya jika ada (Tartili, Doa, Hadits, Wudhu, Sholat).</li>
            <li><strong className="text-[var(--foreground)]">3.</strong> Buka menu Rapor, cek tabel Kelengkapan Rapor Halaqoh.</li>
            <li><strong className="text-[var(--foreground)]">4.</strong> Lengkapi nilai santri yang masih bertanda kuning.</li>
            <li><strong className="text-[var(--foreground)]">5.</strong> Klik Simpan Draft, lalu Ajukan Validasi.</li>
          </ol>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <FileText size={18} />
            </span>
            <h3 className="font-bold">Saat cetak rapor</h3>
          </div>
          <ol className="space-y-2 text-sm leading-6 text-[var(--muted)]">
            <li><strong className="text-[var(--foreground)]">1.</strong> Buka menu Rapor.</li>
            <li><strong className="text-[var(--foreground)]">2.</strong> Pilih tahun ajaran, semester, halaqoh, santri, jenis rapor (Juz 29 / Juz 30).</li>
            <li><strong className="text-[var(--foreground)]">3.</strong> <strong className="text-[var(--foreground)]">Preview live</strong> langsung muncul di bawah menampilkan persis isi file Word.</li>
            <li><strong className="text-[var(--foreground)]">4.</strong> Sesuaikan catatan, target, atau predikat di form sebelum cetak.</li>
            <li><strong className="text-[var(--foreground)]">5.</strong> Klik tombol hijau <strong className="text-[var(--foreground)]">Cetak Word (Santri Ini)</strong> atau <strong className="text-[var(--foreground)]">Cetak Word Halaqoh (ZIP)</strong>.</li>
            <li><strong className="text-[var(--foreground)]">6.</strong> File DOCX terdownload, buka di Word, lalu cetak.</li>
          </ol>
        </Card>
      </div>
    </section>
  );
}

// =============================================================
// 5. Workflow Rapor (DIAGRAM HORIZONTAL)
// =============================================================
function RaporWorkflow() {
  const states = [
    { label: "Draft", actor: "Guru/Admin", desc: "Bisa diedit bebas", tone: "neutral" as const },
    { label: "Menunggu Validasi", actor: "Setelah klik Ajukan Validasi", desc: "Menunggu koordinator review", tone: "amber" as const },
    { label: "Tervalidasi", actor: "Koord./Admin klik Validasi", desc: "Terkunci, hanya supervisor yang bisa edit", tone: "green" as const },
    { label: "Tercetak", actor: "Setelah klik Tandai Tercetak", desc: "Final, tersimpan di arsip", tone: "green" as const },
  ];

  return (
    <section className="scroll-mt-24" id="rapor-workflow">
      <SectionTitle index={5} title="Workflow Rapor" icon={<FileSignature size={20} />} />

      <Card>
        <p className="mb-5 text-sm leading-6 text-[var(--muted)]">
          Setiap rapor punya 4 status. Status menentukan siapa yang boleh mengubahnya.
        </p>

        {/* Diagram horizontal di desktop, vertikal di mobile */}
        <div className="grid gap-3 sm:grid-cols-4 sm:gap-2">
          {states.map((state, index) => (
            <div className="relative" key={state.label}>
              <div
                className={cn(
                  "rounded-lg border-2 bg-[var(--surface)] p-4 text-center",
                  state.tone === "green" && "border-emerald-300 dark:border-emerald-700",
                  state.tone === "amber" && "border-amber-300 dark:border-amber-700",
                  state.tone === "neutral" && "border-[var(--line)]",
                )}
              >
                <Badge tone={state.tone}>{state.label}</Badge>
                <p className="mt-2 text-xs font-semibold text-[var(--foreground)]">{state.actor}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{state.desc}</p>
              </div>
              {index < states.length - 1 ? (
                <>
                  <div className="my-2 flex justify-center text-[var(--primary)] sm:hidden">
                    <ArrowDown size={20} />
                  </div>
                  <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-1 text-[var(--primary)] sm:block">
                    <ArrowRight size={20} />
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <ButtonInfoBox icon={<Send size={16} />} title="Tombol Ajukan Validasi" desc="Diklik guru saat draft sudah final. Status pindah ke Menunggu Validasi." iconClass="text-[var(--primary)]" />
          <ButtonInfoBox icon={<CheckCircle2 size={16} />} title="Tombol Validasi Rapor" desc="Diklik koordinator atau admin. Setelah ini rapor terkunci dari guru." iconClass="text-emerald-600 dark:text-emerald-400" />
          <ButtonInfoBox icon={<Lightbulb size={16} />} title="Tombol Minta Revisi" desc="Jika koordinator menemukan kesalahan, klik ini untuk mengembalikan ke guru." iconClass="text-amber-600 dark:text-amber-400" />
          <ButtonInfoBox icon={<Printer size={16} />} title="Tombol Tandai Tercetak" desc="Diklik setelah rapor benar-benar dicetak dan diserahkan ke wali santri." iconClass="text-[var(--primary)]" />
        </div>
      </Card>
    </section>
  );
}

// =============================================================
// 6. Fitur Rapor Lanjutan
// =============================================================
function FiturRapor() {
  return (
    <section className="scroll-mt-24" id="fitur-rapor">
      <SectionTitle index={6} title="Fitur Rapor Lanjutan" icon={<FileText size={20} />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <FileText size={18} />
            </span>
            <h3 className="font-bold">Preview DOCX Live</h3>
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Saat memilih santri di halaman Rapor, preview file Word langsung tampil di bawah form. Apa yang Anda lihat di preview = persis isi file DOCX yang akan didownload, tidak ada divergensi.
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Preview otomatis update saat Anda mengubah catatan, target, atau predikat di form.
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <Bookmark size={18} />
            </span>
            <h3 className="font-bold">Preferensi Per Guru</h3>
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Tiap guru bisa simpan default-nya sendiri untuk:
          </p>
          <ul className="mt-2 ml-4 space-y-1 text-sm leading-6 text-[var(--muted)] list-disc">
            <li>Catatan default rapor</li>
            <li>Keterangan target Tahfizul Quran (kelas + range surat)</li>
            <li>4 baris keterangan Predikat Nilai</li>
          </ul>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Klik tombol <strong className="text-[var(--foreground)]">Simpan Preferensi Saya</strong> setelah edit. Tiap login berikutnya, form auto-terisi sesuai preferensi guru tersebut.
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <Sliders size={18} />
            </span>
            <h3 className="font-bold">Custom Target & Predikat</h3>
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Kelas, semester, range surat target, dan 4 baris predikat (range, label, deskripsi, italic) semuanya bisa diatur per rapor lewat form di halaman Rapor.
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Kosongkan untuk pakai default template. Isi untuk override.
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <Printer size={18} />
            </span>
            <h3 className="font-bold">Cetak Word Massal</h3>
          </div>
          <ol className="space-y-1 text-sm leading-6 text-[var(--muted)]">
            <li><strong className="text-[var(--foreground)]">1.</strong> Pastikan semua santri di halaqoh sudah lengkap (cek tabel Kelengkapan).</li>
            <li><strong className="text-[var(--foreground)]">2.</strong> Klik <strong className="text-[var(--foreground)]">Cetak Word Halaqoh (ZIP)</strong>.</li>
            <li><strong className="text-[var(--foreground)]">3.</strong> File ZIP berisi DOCX tiap santri otomatis terdownload.</li>
            <li><strong className="text-[var(--foreground)]">4.</strong> Extract dan buka satu per satu di Word untuk cetak.</li>
          </ol>
        </Card>
      </div>
    </section>
  );
}

// =============================================================
// 7. Mengunci Data
// =============================================================
function KunciValidasi() {
  return (
    <section className="scroll-mt-24" id="kunci-validasi">
      <SectionTitle index={7} title="Mengunci Nilai dan Presensi Harian Opsional" icon={<Lock size={20} />} />

      <Card>
        <p className="mb-4 text-sm leading-6 text-[var(--muted)]">
          Saat data nilai atau sesi presensi opsional sudah final, admin atau koordinator dapat mengunci agar tidak terubah tanpa sengaja oleh guru.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <LockBox
            title="Nilai Setoran Surat"
            place="Penilaian → Setoran Surat → tombol Kunci di tiap baris"
            who="Admin / Koordinator"
          />
          <LockBox
            title="Nilai Juziyah"
            place="Penilaian → Juziyah → tombol Kunci di header"
            who="Admin / Koordinator"
          />
          <LockBox
            title="Sesi Presensi Harian"
            place="Presensi → tombol Kunci Sesi setelah pilih halaqoh jika fitur harian dipakai"
            who="Admin / Koordinator"
          />
        </div>

        <div className="mt-5 rounded-md border-l-4 border-amber-500 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-bold">Penting:</p>
          <p className="mt-1">
            Setelah dikunci, guru tidak bisa lagi mengubah data tersebut. Untuk Rapor Semester, presensi utama tetap diisi sebagai rekap manual di menu Rapor. Jika perlu koreksi data terkunci, admin/koordinator harus membuka kunci dulu lewat tombol Buka Kunci. Semua aktivitas kunci/buka kunci tercatat di Audit Log.
          </p>
        </div>
      </Card>
    </section>
  );
}

function LockBox({ title, place, who }: { title: string; place: string; who: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <Lock className="text-[var(--primary)]" size={16} />
        <p className="font-bold text-sm text-[var(--foreground)]">{title}</p>
      </div>
      <p className="text-xs leading-5 text-[var(--muted)]">
        <strong className="text-[var(--foreground)]">Lokasi:</strong> {place}
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
        <strong className="text-[var(--foreground)]">Akses:</strong> {who}
      </p>
    </div>
  );
}

// =============================================================
// 8. Fitur Tambahan
// =============================================================
function FiturTambahan() {
  return (
    <section className="scroll-mt-24" id="fitur-tambahan">
      <SectionTitle index={8} title="Fitur Tambahan" icon={<Sparkles size={20} />} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <FileUp size={18} />
            </span>
            <h3 className="font-bold">Import Santri dari CSV</h3>
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Saat semester baru atau onboarding awal, admin tidak perlu input santri satu per satu.
          </p>
          <ol className="mt-2 space-y-1 text-sm leading-6 text-[var(--muted)]">
            <li><strong className="text-[var(--foreground)]">1.</strong> Master Data → tab Santri → klik <strong className="text-[var(--foreground)]">Import dari CSV</strong>.</li>
            <li><strong className="text-[var(--foreground)]">2.</strong> Klik &quot;Unduh contoh template CSV&quot; untuk dapat file referensi.</li>
            <li><strong className="text-[var(--foreground)]">3.</strong> Edit di Excel/Google Sheets, save sebagai CSV UTF-8.</li>
            <li><strong className="text-[var(--foreground)]">4.</strong> Upload, lihat preview validasi (sistem auto-detect kolom).</li>
            <li><strong className="text-[var(--foreground)]">5.</strong> Kalau kolom &quot;halaqoh&quot; diisi nama persis, santri otomatis tertempat ke halaqoh.</li>
          </ol>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <ArrowRightLeft size={18} />
            </span>
            <h3 className="font-bold">Pindah Halaqoh + Riwayat</h3>
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Saat santri ganti halaqoh, admin tinggal klik <strong className="text-[var(--foreground)]">Pindah</strong> di tabel Anggota Halaqoh.
          </p>
          <ul className="mt-2 ml-4 space-y-1 text-sm leading-6 text-[var(--muted)] list-disc">
            <li>Modal pilih halaqoh tujuan, otomatis catat tanggal keluar/masuk</li>
            <li>Tombol <strong className="text-[var(--foreground)]">Riwayat</strong> menampilkan semua periode halaqoh santri</li>
            <li>Riwayat tidak hilang saat santri pindah, bisa dilihat kapan saja</li>
          </ul>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <PenLine size={18} />
            </span>
            <h3 className="font-bold">Tanda Tangan Digital</h3>
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Master Data → tab Guru → tombol <strong className="text-[var(--foreground)]">Buat TTD</strong> di tiap baris guru. Tanda tangan dengan jari (HP) atau mouse (desktop).
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            TTD tersimpan dan bisa dipakai sebagai pengganti tanda tangan manual.
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <CalendarRange size={18} />
            </span>
            <h3 className="font-bold">Manajemen Tahun Ajaran</h3>
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Pengaturan → tab Tahun Ajaran. Admin bisa tambah tahun ajaran baru, set tahun & semester aktif tanpa perlu akses database.
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Saat semester baru dimulai, admin tinggal aktivasi semester baru di sini.
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <History size={18} />
            </span>
            <h3 className="font-bold">Audit Log</h3>
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Pengaturan → tab Audit Log. Menampilkan riwayat perubahan nilai, presensi, rapor, akun guru.
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Berguna saat ada keluhan &quot;kok nilai saya berubah?&quot; — admin bisa lihat siapa ubah apa kapan. Tercatat otomatis lewat trigger database.
          </p>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <CalendarCheck size={18} />
            </span>
            <h3 className="font-bold">Rekap Presensi Harian Opsional</h3>
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Halaman Presensi → scroll ke bawah ke section Rekap. Fitur ini opsional untuk sekolah yang tetap ingin mencatat per pertemuan; cetak Rapor Semester memakai rekap manual di menu Rapor.
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Tombol <strong className="text-[var(--foreground)]">Export CSV</strong> menghasilkan file siap buka di Excel jika rekap harian tetap digunakan.
          </p>
        </Card>
      </div>
    </section>
  );
}

// =============================================================
// 9. Tips Pemakaian
// =============================================================
function Tips() {
  const tips: Array<{ title: string; desc: string }> = [
    {
      title: "Pakai aplikasi dari HP",
      desc: "Aplikasi sudah dioptimalkan untuk HP. Klik Install di prompt PWA untuk menempatkan ikon di home screen seperti aplikasi native.",
    },
    {
      title: "Aktifkan mode gelap saat malam",
      desc: "Klik ikon bulan/matahari di kanan atas header untuk beralih mode terang/gelap. Pengaturan tersimpan otomatis.",
    },
    {
      title: "Geser tabel ke samping di HP",
      desc: "Tabel dengan banyak kolom otomatis bisa di-scroll horizontal. Hint geser muncul di atas tabel.",
    },
    {
      title: "Pakai context chip untuk orientasi",
      desc: "Chip hijau di atas (TA · Sem · Halaqoh · Santri) selalu menunjukkan data yang sedang Anda kerjakan. Pastikan benar sebelum simpan.",
    },
    {
      title: "Simpan preferensi rapor",
      desc: "Setelah edit catatan/target/predikat di rapor, klik Simpan Preferensi Saya. Tiap rapor baru otomatis terisi sesuai preferensi Anda.",
    },
    {
      title: "Pakai Cetak Word, bukan Cetak Browser",
      desc: "Cetak Word menghasilkan file DOCX sesuai template asli sekolah dan bisa diedit di Word. Cetak Browser hanya alternatif untuk PDF cepat.",
    },
    {
      title: "Cek Audit Log saat ada keluhan",
      desc: "Pengaturan → Audit Log. Admin bisa lihat siapa, kapan, dan apa yang berubah pada nilai/presensi/rapor.",
    },
    {
      title: "Panduan setup awal tersedia",
      desc: "Gunakan halaman Panduan untuk mengikuti urutan setup awal tanpa memenuhi tampilan Dashboard.",
    },
  ];

  return (
    <section className="scroll-mt-24" id="tips">
      <SectionTitle index={9} title="Tips Pemakaian" icon={<Lightbulb size={20} />} />
      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          {tips.map((tip, index) => (
            <div className="flex items-start gap-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3" key={index}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--surface-soft)] text-xs font-bold text-[var(--primary)]">
                {index + 1}
              </span>
              <div>
                <p className="font-bold text-sm text-[var(--foreground)]">{tip.title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

// =============================================================
// 10. FAQ
// =============================================================
function FAQ() {
  const items: Array<{ q: string; a: string }> = [
    {
      q: "Saya guru, kenapa hanya melihat sebagian halaqoh?",
      a: "Itu wajar. Guru hanya melihat halaqoh yang dia diampu. Kalau ada halaqoh Anda yang tidak tampil, hubungi admin untuk memperbaiki data pengampu.",
    },
    {
      q: "Saya tidak bisa edit nilai yang sudah saya simpan, kenapa?",
      a: "Cek apakah statusnya Terkunci (badge kuning). Setelah dikunci admin/koordinator, hanya mereka yang dapat membuka kembali. Hubungi admin/koordinator untuk minta dibuka.",
    },
    {
      q: "Total nilai tidak sesuai harapan, di mana ubah porsinya?",
      a: "Buka Pengaturan → tab Rubrik dan Predikat. Pilih jenis ujian, lalu ubah porsi tiap komponen. Aktifkan Mode Lanjutan untuk mengubah cara hitung total.",
    },
    {
      q: "File Word tidak terbuka di Word lama, bagaimana?",
      a: "Pastikan Microsoft Word minimal versi 2010, atau buka dengan Google Docs / LibreOffice. Alternatif: pakai opsi Cetak Browser dari menu titik tiga, lalu Save as PDF.",
    },
    {
      q: "Bagaimana ganti nama lembaga atau alamat di header rapor?",
      a: "Buka Pengaturan → tab Profil Lembaga, ubah Nama Lengkap dan Alamat. Perubahan langsung tampil di rapor cetak berikutnya.",
    },
    {
      q: "Bagaimana ganti tahun ajaran saat semester baru?",
      a: "Buka Pengaturan → tab Tahun Ajaran. Tambah tahun ajaran baru jika belum ada (mis. 2026/2027), klik tombol Aktifkan untuk men-set sebagai aktif. Lakukan hal yang sama untuk semester.",
    },
    {
      q: "Rapor sudah Tervalidasi tapi salah ketik. Bagaimana memperbaikinya?",
      a: "Admin/koordinator buka rapor santri tersebut, klik Buka Kembali. Status kembali ke Draft sehingga bisa diedit. Setelah selesai, Ajukan Validasi lagi.",
    },
    {
      q: "Saya guru, ingin catatan rapor saya beda dari guru lain. Bisa?",
      a: "Bisa. Edit catatan di form Rapor, lalu klik Simpan Preferensi Saya. Tiap kali login, catatan default Anda akan otomatis terisi. Guru lain punya preferensi sendiri.",
    },
    {
      q: "Preview rapor di browser akurat dengan file Word yang didownload?",
      a: "Ya, persis sama. Preview di browser itu sebenarnya file DOCX yang di-render langsung. Jadi apa yang Anda lihat = apa yang akan dicetak.",
    },
    {
      q: "Saya lupa password saya. Apa yang harus dilakukan?",
      a: "Hubungi admin sekolah. Admin dapat membuka menu Akun Guru, memilih akun Anda, dan klik Edit untuk mengganti password Anda.",
    },
    {
      q: "Berapa banyak santri sekaligus bisa dicetak Word?",
      a: "Maksimal 120 santri per halaqoh dalam satu request ZIP. Untuk halaqoh lebih besar, cetak per kelompok.",
    },
    {
      q: "Kalau internet putus saat input nilai, datanya hilang?",
      a: "Selama Anda belum klik Simpan, data masih di form. Aplikasi akan menampilkan error koneksi jika gagal simpan, sehingga Anda bisa coba lagi setelah internet kembali.",
    },
    {
      q: "Bagaimana cara pindahkan santri ke halaqoh lain?",
      a: "Master Data → tab Anggota Halaqoh. Klik Pindah di baris santri yang akan dipindah, pilih halaqoh tujuan, klik Pindahkan Sekarang. Riwayat tersimpan otomatis.",
    },
    {
      q: "Ada catatan keluhan, kapan nilai saya diubah?",
      a: "Buka Pengaturan → tab Audit Log. Filter berdasarkan tabel atau actor untuk lihat siapa, kapan, dan field apa yang berubah. Admin/koordinator yang punya akses.",
    },
  ];

  return (
    <section className="scroll-mt-24" id="faq">
      <SectionTitle index={10} title="Pertanyaan Sering Ditanyakan" icon={<HelpCircle size={20} />} />
      <Card>
        <div className="space-y-2">
          {items.map((item, index) => (
            <details
              className="group rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 transition open:bg-[var(--surface-soft)]/40"
              key={index}
            >
              <summary className="flex cursor-pointer list-none items-start gap-3 font-semibold text-[var(--foreground)]">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[var(--surface-soft)] text-[var(--primary)]">
                  <MessageCircleQuestion size={14} />
                </span>
                <span className="flex-1">{item.q}</span>
                <span className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--muted)] transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 pl-10 text-sm leading-6 text-[var(--muted)]">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface-soft)] p-5 text-center">
          <p className="font-bold text-[var(--foreground)]">Masih ada pertanyaan?</p>
          <p className="max-w-md text-sm leading-6 text-[var(--muted)]">
            Hubungi admin sekolah. Untuk panduan interaktif, buka menu Dashboard yang juga punya panduan ringkas dengan tombol langsung ke setiap halaman terkait.
          </p>
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-strong)]"
            href="/dashboard"
          >
            Buka Dashboard
            <ArrowRight size={16} />
          </Link>
        </div>
      </Card>
    </section>
  );
}

// =============================================================
// Helper components
// =============================================================
function SectionTitle({ index, title, icon }: { index: number; title: string; icon: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--primary)] text-white">{icon}</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Bagian {index}</p>
        <h2 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl">{title}</h2>
      </div>
    </div>
  );
}

function RoleCard({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-md bg-[var(--surface-soft)] text-[var(--primary)]">{icon}</span>
        <p className="font-bold text-[var(--foreground)]">{label}</p>
      </div>
      <p className="text-sm leading-6 text-[var(--muted)]">{desc}</p>
    </div>
  );
}

function FeatureBox({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--primary)] text-white">{icon}</span>
      <div className="min-w-0">
        <p className="font-bold text-sm text-[var(--foreground)]">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-[var(--muted)]">{desc}</p>
      </div>
    </div>
  );
}

function ButtonInfoBox({ icon, title, desc, iconClass }: { icon: React.ReactNode; title: string; desc: string; iconClass?: string }) {
  return (
    <div className="rounded-md bg-[var(--surface-soft)] p-4 text-sm leading-6">
      <div className="flex items-center gap-2 font-bold text-[var(--foreground)]">
        <span className={iconClass}>{icon}</span>
        {title}
      </div>
      <p className="mt-1 text-[var(--muted)]">{desc}</p>
    </div>
  );
}
