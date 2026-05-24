"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, CheckCircle2, Plus, RefreshCw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { HelpText } from "@/components/ui/help-text";
import { DataTable } from "@/components/ui/table";
import { Toast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProfileRow = { role: string; is_active: boolean };
type AcademicYearRow = { id: string; name: string; is_active: boolean };
type SemesterRow = { id: string; name: string; academic_year_id: string; is_active: boolean; start_date: string | null; end_date: string | null };

export function AcademicSettings() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [years, setYears] = useState<AcademicYearRow[]>([]);
  const [semesters, setSemesters] = useState<SemesterRow[]>([]);
  const [yearForm, setYearForm] = useState({ name: "" });
  const [semesterForm, setSemesterForm] = useState({ academic_year_id: "", name: "I (Gasal)", start_date: "", end_date: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Login sebagai admin untuk mengelola tahun ajaran.");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const canManage = profile?.role === "admin" || profile?.role === "koordinator";

  const activeYear = useMemo(() => years.find((year) => year.is_active), [years]);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setMessage("Belum login.");
      setLoading(false);
      return;
    }

    const [profileRes, yearRes, semesterRes] = await Promise.all([
      supabase.from("profiles").select("role,is_active").eq("id", user.user.id).maybeSingle(),
      supabase.from("academic_years").select("id,name,is_active").order("name"),
      supabase.from("semesters").select("id,name,academic_year_id,is_active,start_date,end_date").order("name"),
    ]);

    if (profileRes.error || yearRes.error || semesterRes.error) {
      setMessage(profileRes.error?.message ?? yearRes.error?.message ?? semesterRes.error?.message ?? "Gagal memuat data.");
      setLoading(false);
      return;
    }

    setProfile((profileRes.data as ProfileRow | null) ?? null);
    setYears((yearRes.data ?? []) as AcademicYearRow[]);
    setSemesters((semesterRes.data ?? []) as SemesterRow[]);
    setSemesterForm((current) => ({
      ...current,
      academic_year_id: current.academic_year_id || (yearRes.data ?? [])[0]?.id || "",
    }));
    setMessage(profileRes.data?.role === "admin" || profileRes.data?.role === "koordinator" ? "Atur tahun ajaran dan semester aktif di sini." : "Hanya admin/koordinator yang dapat mengubah.");
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function addYear() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !canManage || !yearForm.name.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("academic_years").insert({ name: yearForm.name.trim() });
    if (error) notify(error.message, "error");
    else {
      notify("Tahun ajaran berhasil ditambahkan.");
      setYearForm({ name: "" });
      await loadData();
    }
    setLoading(false);
  }

  async function setYearActive(id: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !canManage) return;
    setLoading(true);
    // matikan semua dulu, lalu aktifkan yang dipilih
    await supabase.from("academic_years").update({ is_active: false }).neq("id", id);
    const { error } = await supabase.from("academic_years").update({ is_active: true }).eq("id", id);
    if (error) notify(error.message, "error");
    else {
      notify("Tahun ajaran aktif berhasil diubah.");
      await loadData();
    }
    setLoading(false);
  }

  async function addSemester() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !canManage || !semesterForm.academic_year_id || !semesterForm.name.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("semesters").insert({
      academic_year_id: semesterForm.academic_year_id,
      name: semesterForm.name.trim(),
      start_date: semesterForm.start_date || null,
      end_date: semesterForm.end_date || null,
    });
    if (error) notify(error.message, "error");
    else {
      notify("Semester berhasil ditambahkan.");
      setSemesterForm((current) => ({ ...current, name: "I (Gasal)", start_date: "", end_date: "" }));
      await loadData();
    }
    setLoading(false);
  }

  async function setSemesterActive(id: string, yearId: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !canManage) return;
    setLoading(true);
    await supabase.from("semesters").update({ is_active: false }).eq("academic_year_id", yearId).neq("id", id);
    const { error } = await supabase.from("semesters").update({ is_active: true }).eq("id", id);
    if (error) notify(error.message, "error");
    else {
      notify("Semester aktif berhasil diubah.");
      await loadData();
    }
    setLoading(false);
  }

  const yearRows = years.map((year) => [
    year.name,
    <Badge key={`${year.id}-status`} tone={year.is_active ? "green" : "neutral"}>
      {year.is_active ? "Aktif" : "Arsip"}
    </Badge>,
    canManage && !year.is_active ? (
      <Button key={`${year.id}-act`} onClick={() => setYearActive(year.id)} type="button" variant="secondary">
        <CheckCircle2 size={16} />
        Jadikan Aktif
      </Button>
    ) : (
      <span className="text-sm text-[var(--muted)]">—</span>
    ),
  ]);

  const semesterRows = semesters.map((semester) => {
    const yearName = years.find((year) => year.id === semester.academic_year_id)?.name ?? "-";
    return [
      yearName,
      semester.name,
      semester.start_date ?? "-",
      semester.end_date ?? "-",
      <Badge key={`${semester.id}-status`} tone={semester.is_active ? "green" : "neutral"}>
        {semester.is_active ? "Aktif" : "Arsip"}
      </Badge>,
      canManage && !semester.is_active ? (
        <Button key={`${semester.id}-act`} onClick={() => setSemesterActive(semester.id, semester.academic_year_id)} type="button" variant="secondary">
          <CheckCircle2 size={16} />
          Jadikan Aktif
        </Button>
      ) : (
        <span className="text-sm text-[var(--muted)]">—</span>
      ),
    ];
  });

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}

      <HelpText icon={<CalendarRange size={18} />} title="Tahun ajaran aktif menentukan filter default semua menu">
        {message}
        {activeYear ? (
          <p className="mt-1">
            Tahun ajaran aktif saat ini: <strong>{activeYear.name}</strong>.
          </p>
        ) : (
          <p className="mt-1">Belum ada tahun ajaran aktif. Tandai salah satu tahun di tabel berikut.</p>
        )}
      </HelpText>

      <Card>
        <SectionHeader
          title="Tahun Ajaran"
          description="Hanya satu tahun ajaran yang aktif dalam satu waktu."
          action={
            <Button disabled={loading} onClick={loadData} type="button" variant="secondary">
              <RefreshCw size={18} />
              Muat Ulang
            </Button>
          }
        />
        {canManage ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label>Nama Tahun Ajaran</Label>
              <Input
                placeholder="2026/2027"
                value={yearForm.name}
                onChange={(event) => setYearForm({ name: event.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button disabled={loading || !yearForm.name.trim()} onClick={addYear} type="button">
                <Plus size={18} />
                Tambah
              </Button>
            </div>
          </div>
        ) : null}
        <DataTable columns={["Tahun", "Status", "Aksi"]} rows={yearRows} />
      </Card>

      <Card>
        <SectionHeader title="Semester" description="Setiap tahun ajaran biasanya berisi Semester I (Gasal) dan Semester II (Genap)." />
        {canManage ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <Label>Tahun Ajaran</Label>
              <Select
                value={semesterForm.academic_year_id}
                onChange={(event) => setSemesterForm((current) => ({ ...current, academic_year_id: event.target.value }))}
              >
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nama Semester</Label>
              <Select value={semesterForm.name} onChange={(event) => setSemesterForm((current) => ({ ...current, name: event.target.value }))}>
                <option value="I (Gasal)">I (Gasal)</option>
                <option value="II (Genap)">II (Genap)</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input
                type="date"
                value={semesterForm.start_date}
                onChange={(event) => setSemesterForm((current) => ({ ...current, start_date: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Selesai</Label>
              <Input
                type="date"
                value={semesterForm.end_date}
                onChange={(event) => setSemesterForm((current) => ({ ...current, end_date: event.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" disabled={loading || !semesterForm.academic_year_id || !semesterForm.name.trim()} onClick={addSemester} type="button">
                <Save size={18} />
                Simpan Semester
              </Button>
            </div>
          </div>
        ) : null}
        <DataTable columns={["Tahun Ajaran", "Semester", "Mulai", "Selesai", "Status", "Aksi"]} rows={semesterRows} />
      </Card>
    </div>
  );

  function notify(messageText: string, tone: "success" | "error" | "info" = "success") {
    setMessage(messageText);
    setToast({ message: messageText, tone });
    window.setTimeout(() => setToast(null), 5000);
  }
}
