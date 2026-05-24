"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, KeyRound, Power, RefreshCw, RotateCcw, Save, Search, ShieldCheck, UserCog, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/field";
import { DataTable } from "@/components/ui/table";
import { Toast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TeacherRow = {
  id: string;
  full_name: string;
  title: string | null;
  is_active: boolean;
};

type ProfileRow = {
  id: string;
  full_name: string;
  role: string;
  teacher_id: string | null;
  is_active: boolean;
  email: string;
};

export function TeacherAccountsClient() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ProfileRow | null>(null);
  const [form, setForm] = useState({ teacher_id: "", email: "", password: "" });
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: "", password: "" });
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Admin dapat membuat akun login guru sesuai data guru dan halaqoh masing-masing.");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const canManageTeacherAccounts = currentProfile?.role === "admin";

  const profileByTeacherId = useMemo(() => {
    return new Map(profiles.filter((profile) => profile.teacher_id).map((profile) => [profile.teacher_id, profile]));
  }, [profiles]);

  const filteredTeachers = useMemo(() => {
    const normalizedQuery = query.toLowerCase();

    return teachers.filter((teacher) => {
      const profile = profileByTeacherId.get(teacher.id);
      return `${teacher.title ?? ""} ${teacher.full_name} ${profile?.full_name ?? ""} ${profile?.email ?? ""}`.toLowerCase().includes(normalizedQuery);
    });
  }, [profileByTeacherId, query, teachers]);

  const teachersWithoutAccount = useMemo(() => teachers.filter((teacher) => !profileByTeacherId.has(teacher.id)), [profileByTeacherId, teachers]);

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
      setProfiles([]);
      setCurrentProfile(null);
      setMessage("Belum login. Masuk sebagai admin untuk mengelola akun guru.");
      setLoading(false);
      return;
    }

    const [profileRes, sessionRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, role, teacher_id, is_active").eq("id", user.data.user.id).maybeSingle(),
      supabase.auth.getSession(),
    ]);
    const {
      data: { session },
    } = sessionRes;

    if (profileRes.error || !profileRes.data) {
      setMessage(profileRes.error?.message ?? "Profil akun tidak ditemukan.");
      setLoading(false);
      return;
    }

    const loadedCurrentProfile = { ...(profileRes.data as Omit<ProfileRow, "email">), email: user.data.user.email ?? "" };
    setCurrentProfile(loadedCurrentProfile);

    if (loadedCurrentProfile.role !== "admin") {
      const teacherRes = loadedCurrentProfile.teacher_id
        ? await supabase.from("teachers").select("id, full_name, title, is_active").eq("id", loadedCurrentProfile.teacher_id)
        : { data: [], error: null };

      if (teacherRes.error) {
        notify(teacherRes.error.message, "error");
      } else {
        setTeachers((teacherRes.data ?? []) as TeacherRow[]);
        setProfiles([loadedCurrentProfile]);
        setMessage("Informasi akun guru berhasil dimuat.");
      }

      setLoading(false);
      return;
    }

    if (!session) {
      setMessage("Session login tidak ditemukan. Silakan login ulang.");
      setLoading(false);
      return;
    }

    const [teacherRes, accountRes] = await Promise.all([
      supabase.from("teachers").select("id, full_name, title, is_active").order("full_name"),
      fetch("/api/admin/teacher-accounts", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }),
    ]);
    const accountJson = (await accountRes.json().catch(() => null)) as { accounts?: ProfileRow[]; message?: string } | null;

    if (teacherRes.error || !accountRes.ok) {
      notify(teacherRes.error?.message ?? accountJson?.message ?? "Gagal memuat akun guru.", "error");
    } else {
      const loadedTeachers = teacherRes.data ?? [];
      const loadedProfiles = accountJson?.accounts ?? [];
      setTeachers(loadedTeachers);
      setProfiles(loadedProfiles);
      setForm((current) => ({
        ...current,
        teacher_id: current.teacher_id || loadedTeachers.find((teacher) => !loadedProfiles.some((profile) => profile.teacher_id === teacher.id))?.id || "",
      }));
      setMessage("Data akun guru berhasil dimuat.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function createTeacherAccount() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase || !form.teacher_id || !form.email.trim() || form.password.length < 8) {
      notify("Pilih guru, isi email, dan gunakan password minimal 8 karakter.", "error");
      return;
    }

    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      notify("Session login tidak ditemukan. Silakan login ulang.", "error");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/teacher-accounts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        teacherId: form.teacher_id,
        email: form.email.trim(),
        password: form.password,
      }),
    });
    const result = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      notify(result?.message ?? "Gagal membuat akun guru.", "error");
    } else {
      notify("Akun guru berhasil dibuat. Guru sudah bisa login dengan email dan password tersebut.");
      setForm({ teacher_id: "", email: "", password: "" });
      await loadData();
    }

    setLoading(false);
  }

  async function setTeacherAccountActive(profileId: string, isActive: boolean) {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) return;

    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      notify("Session login tidak ditemukan. Silakan login ulang.", "error");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/teacher-accounts", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ profileId, isActive }),
    });
    const result = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      notify(result?.message ?? "Gagal mengubah status akun guru.", "error");
    } else {
      notify(isActive ? "Akun guru berhasil diaktifkan." : "Akun guru berhasil dinonaktifkan.");
      await loadData();
    }

    setLoading(false);
  }

  function startEditAccount(profile: ProfileRow) {
    setEditingProfileId(profile.id);
    setEditForm({ email: profile.email, password: "" });
  }

  function cancelEditAccount() {
    setEditingProfileId(null);
    setEditForm({ email: "", password: "" });
  }

  async function saveAccountEdit() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase || !editingProfileId) return;

    if (!editForm.email.trim() && !editForm.password) {
      notify("Isi email atau password baru terlebih dahulu.", "error");
      return;
    }

    if (editForm.password && editForm.password.length < 8) {
      notify("Password baru minimal 8 karakter.", "error");
      return;
    }

    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      notify("Session login tidak ditemukan. Silakan login ulang.", "error");
      setLoading(false);
      return;
    }

    const body: { profileId: string; email?: string; password?: string } = {
      profileId: editingProfileId,
    };

    if (editForm.email.trim()) {
      body.email = editForm.email.trim();
    }

    if (editForm.password) {
      body.password = editForm.password;
    }

    const response = await fetch("/api/admin/teacher-accounts", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      notify(result?.message ?? "Gagal mengedit akun guru.", "error");
    } else {
      notify("Email/password akun guru berhasil diperbarui.");
      cancelEditAccount();
      await loadData();
    }

    setLoading(false);
  }

  const accountRows = filteredTeachers.map((teacher, index) => {
    const profile = profileByTeacherId.get(teacher.id);

    return [
      index + 1,
      `${teacher.title ?? ""} ${teacher.full_name}`.trim(),
      profile?.email || "-",
      <Badge key={`${teacher.id}-teacher-status`} tone={teacher.is_active ? "green" : "neutral"}>
        {teacher.is_active ? "Guru Aktif" : "Guru Nonaktif"}
      </Badge>,
      profile ? profile.full_name : "-",
      profile ? (
        <Badge key={`${teacher.id}-account-status`} tone={profile.is_active ? "green" : "red"}>
          {profile.is_active ? "Akun Aktif" : "Akun Nonaktif"}
        </Badge>
      ) : (
        <Badge key={`${teacher.id}-account-status`} tone="amber">
          Belum Ada Akun
        </Badge>
      ),
      profile ? (
        <div className="flex flex-wrap gap-2" key={`${teacher.id}-actions`}>
          <Button onClick={() => startEditAccount(profile)} type="button" variant="secondary">
            <Edit3 size={16} />
            Edit
          </Button>
          {profile.is_active ? (
            <Button onClick={() => setTeacherAccountActive(profile.id, false)} type="button" variant="ghost">
              <Power size={16} />
              Nonaktif
            </Button>
          ) : (
            <Button onClick={() => setTeacherAccountActive(profile.id, true)} type="button" variant="ghost">
              <RotateCcw size={16} />
              Aktifkan
            </Button>
          )}
        </div>
      ) : (
        <span className="text-sm text-[var(--muted)]" key={`${teacher.id}-empty-action`}>
          Buat dari form
        </span>
      ),
    ];
  });

  const ownTeacher = currentProfile?.teacher_id ? teachers.find((teacher) => teacher.id === currentProfile.teacher_id) : null;

  if (currentProfile && !canManageTeacherAccounts) {
    return (
      <div className="space-y-6">
        {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}

        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-md bg-[var(--surface-soft)] text-[var(--primary-strong)]">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--foreground)]">Akun Saya</h1>
                <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
              </div>
            </div>
            <Button disabled={loading} onClick={loadData} type="button" variant="secondary">
              <RefreshCw size={18} />
              {loading ? "Memuat..." : "Muat Ulang"}
            </Button>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Informasi Akun" description="Data akun guru bersifat baca saja. Perubahan email atau password dilakukan oleh admin." />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoItem label="Nama Profil" value={currentProfile.full_name} />
            <InfoItem label="Email Login" value={currentProfile.email || "-"} />
            <InfoItem label="Role" value="Guru" />
            <InfoItem label="Status Akun" value={currentProfile.is_active ? "Aktif" : "Nonaktif"} />
            <InfoItem label="Guru Pengampu" value={ownTeacher ? `${ownTeacher.title ?? ""} ${ownTeacher.full_name}`.trim() : "-"} />
            <InfoItem label="Password" value="Tidak dapat ditampilkan" />
          </div>
          <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            Password tidak bisa ditampilkan kembali karena disimpan aman oleh Supabase dalam bentuk hash. Jika lupa password, hubungi admin untuk membuat password baru.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-md bg-[var(--surface-soft)] text-[var(--primary-strong)]">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--foreground)]">Akun Guru</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">{message}</p>
            </div>
          </div>
          <Button disabled={loading} onClick={loadData} type="button" variant="secondary">
            <RefreshCw size={18} />
            {loading ? "Memuat..." : "Muat Ulang"}
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <SectionHeader
            title="Buat Akun Login Guru"
            description="Admin memilih data guru, lalu membuat email dan password sementara untuk login guru."
            action={
              <Button disabled={loading || !form.teacher_id || !form.email.trim() || form.password.length < 8} onClick={createTeacherAccount} type="button">
                <UserPlus size={18} />
                Buat Akun
              </Button>
            }
          />
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Guru</Label>
              <Select onChange={(event) => setForm((current) => ({ ...current, teacher_id: event.target.value }))} value={form.teacher_id}>
                <option value="">Pilih guru yang belum punya akun</option>
                {teachersWithoutAccount.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.title} {teacher.full_name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Email Login</Label>
              <Input
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="nama.guru@email.com"
                type="email"
                value={form.email}
              />
            </div>
            <div className="space-y-2">
              <Label>Password Sementara</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
                <Input
                  className="pl-10"
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Minimal 8 karakter"
                  type="text"
                  value={form.password}
                />
              </div>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              Simpan password sementara di catatan admin sebelum diberikan ke guru. Setelah login, guru bisa diarahkan untuk mengganti password dari Supabase Auth bila fitur reset password sudah ditambahkan.
            </div>
            {editingProfileId ? (
              <div className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[var(--foreground)]">Edit Email / Password</h3>
                    <p className="mt-1 text-sm text-[var(--muted)]">Kosongkan password jika tidak ingin menggantinya.</p>
                  </div>
                  <Button onClick={cancelEditAccount} type="button" variant="ghost">
                    <X size={16} />
                    Batal
                  </Button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email Login Baru</Label>
                    <Input
                      onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="email.guru@email.com"
                      type="email"
                      value={editForm.email}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password Baru</Label>
                    <Input
                      onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Minimal 8 karakter, kosongkan jika tetap"
                      type="text"
                      value={editForm.password}
                    />
                  </div>
                  <Button disabled={loading || (!editForm.email.trim() && !editForm.password)} onClick={saveAccountEdit} type="button">
                    <Save size={18} />
                    Simpan Akun
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Daftar Akun Guru" description="Status akun guru dipakai untuk membatasi akses input nilai sesuai profil guru." />
          <div className="mb-4 flex items-center gap-2">
            <Search size={18} className="text-[var(--muted)]" />
            <Input onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama guru" value={query} />
          </div>
          {teachers.length === 0 ? (
            <EmptyState
              description="Belum ada guru terdaftar. Silakan tambahkan guru di halaman Master Data → tab Guru lebih dulu."
              icon={<UserCog size={28} />}
              title="Belum ada guru"
              tone="warning"
            />
          ) : profiles.length === 0 || teachersWithoutAccount.length === teachers.length ? (
            <EmptyState
              description="Semua guru belum punya akun login. Pilih guru di formulir Tambah Akun Guru di atas, lalu isi email dan password awal."
              icon={<KeyRound size={28} />}
              title="Belum ada akun guru"
              tone="primary"
            />
          ) : (
            <DataTable
              columns={["No", "Guru", "Email", "Status Guru", "Profil Akun", "Status Akun", "Aksi"]}
              entityLabel="akun guru"
              pageSize={10}
              rows={accountRows}
            />
          )}
        </Card>
      </div>
    </div>
  );

  function notify(messageText: string, tone: "success" | "error" | "info" = "success") {
    setMessage(messageText);
    setToast({ message: messageText, tone });
    window.setTimeout(() => setToast(null), 5000);
  }
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] p-4">
      <p className="text-sm font-semibold text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}
