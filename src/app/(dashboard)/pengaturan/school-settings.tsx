"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Image as ImageIcon, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/field";
import { StickySaveBar } from "@/components/ui/sticky-save-bar";
import { Toast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SchoolSettingsRow = {
  id: string;
  institution_name: string;
  short_name: string;
  address: string;
  logo_url: string | null;
  default_coordinator_name: string;
  default_homeroom_name: string;
  default_report_date: string | null;
  default_report_note: string;
};

type ProfileRow = { role: string; is_active: boolean };

const emptyForm = {
  institution_name: "",
  short_name: "",
  address: "",
  logo_url: "",
  default_coordinator_name: "",
  default_homeroom_name: "",
  default_report_date: "",
  default_report_note: "",
};

export function SchoolSettingsForm() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Login sebagai admin untuk mengubah profil lembaga.");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  const canManage = profile?.role === "admin" || profile?.role === "koordinator";

  const loadData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Environment Supabase belum lengkap.");
      return;
    }

    setLoading(true);
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      setMessage("Belum login.");
      setLoading(false);
      return;
    }

    const [profileRes, settingsRes] = await Promise.all([
      supabase.from("profiles").select("role,is_active").eq("id", user.data.user.id).maybeSingle(),
      supabase.from("school_settings").select("*").eq("id", "default").maybeSingle(),
    ]);

    if (profileRes.error) {
      notify(profileRes.error.message, "error");
      setLoading(false);
      return;
    }

    setProfile((profileRes.data as ProfileRow | null) ?? null);

    if (settingsRes.error) {
      notify(settingsRes.error.message, "error");
    } else {
      const data = (settingsRes.data as SchoolSettingsRow | null) ?? null;
      if (data) {
        setForm({
          institution_name: data.institution_name ?? "",
          short_name: data.short_name ?? "",
          address: data.address ?? "",
          logo_url: data.logo_url ?? "",
          default_coordinator_name: data.default_coordinator_name ?? "",
          default_homeroom_name: data.default_homeroom_name ?? "",
          default_report_date: data.default_report_date ?? "",
          default_report_note: data.default_report_note ?? "",
        });
      }
      setMessage("Profil lembaga dipakai pada header aplikasi dan template rapor.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function save() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    const { error } = await supabase
      .from("school_settings")
      .upsert(
        {
          id: "default",
          institution_name: form.institution_name.trim() || "GRIYA QUR'AN PENYEJUK HATI PURBALINGGA",
          short_name: form.short_name.trim() || "GQ Penyejuk Hati",
          address: form.address.trim(),
          logo_url: form.logo_url.trim() || null,
          default_coordinator_name: form.default_coordinator_name.trim(),
          default_homeroom_name: form.default_homeroom_name.trim(),
          default_report_date: form.default_report_date || null,
          default_report_note: form.default_report_note.trim(),
        },
        { onConflict: "id" },
      );

    if (error) {
      notify(error.message, "error");
    } else {
      notify("Profil lembaga berhasil disimpan.");
      await loadData();
    }
    setLoading(false);
  }

  return (
    <Card>
      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
      <SectionHeader
        title="Profil Lembaga dan Default Rapor"
        description="Data ini menjadi sumber utama header aplikasi, header rapor cetak, dan default tanggal/koordinator pada rapor baru."
        action={
          <div className="flex flex-wrap gap-2">
            <Button disabled={loading} onClick={loadData} type="button" variant="secondary">
              <RefreshCw size={18} />
              Muat Ulang
            </Button>
            {canManage ? (
              <Button disabled={loading} onClick={save} type="button">
                <Save size={18} />
                Simpan Profil
              </Button>
            ) : null}
          </div>
        }
      />
      <p className="mb-5 text-sm text-[var(--muted)]">{message}</p>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-4 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2 text-[var(--primary)]">
            <Building2 size={18} />
            <p className="font-semibold">Identitas Lembaga</p>
          </div>
          <div className="space-y-2">
            <Label>Nama Lengkap Lembaga</Label>
            <Input
              disabled={!canManage}
              onChange={(event) => setForm((current) => ({ ...current, institution_name: event.target.value }))}
              placeholder="GRIYA QUR'AN PENYEJUK HATI PURBALINGGA"
              value={form.institution_name}
            />
            <p className="text-xs text-[var(--muted)]">Tampil di header rapor cetak.</p>
          </div>
          <div className="space-y-2">
            <Label>Nama Pendek</Label>
            <Input
              disabled={!canManage}
              onChange={(event) => setForm((current) => ({ ...current, short_name: event.target.value }))}
              placeholder="GQ Penyejuk Hati"
              value={form.short_name}
            />
            <p className="text-xs text-[var(--muted)]">Tampil di sidebar dan halaman login.</p>
          </div>
          <div className="space-y-2">
            <Label>Alamat</Label>
            <Textarea
              disabled={!canManage}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              placeholder="Alamat lengkap lembaga"
              rows={3}
              value={form.address}
            />
          </div>
          <div className="space-y-2">
            <Label>URL Logo (opsional)</Label>
            <Input
              disabled={!canManage}
              onChange={(event) => setForm((current) => ({ ...current, logo_url: event.target.value }))}
              placeholder="https://..."
              value={form.logo_url}
            />
            {form.logo_url ? (
              <div className="mt-2 flex items-center gap-3 rounded-md bg-[var(--surface-soft)] p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Logo lembaga" className="size-12 rounded object-contain" src={form.logo_url} />
                <p className="text-xs text-[var(--muted)]">Pratinjau logo</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md bg-[var(--surface-soft)] p-3 text-xs text-[var(--muted)]">
                <ImageIcon size={16} />
                Belum ada logo. Boleh dikosongkan.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="font-semibold">Default Rapor</p>
          <div className="space-y-2">
            <Label>Nama Koordinator Default</Label>
            <Input
              disabled={!canManage}
              onChange={(event) => setForm((current) => ({ ...current, default_coordinator_name: event.target.value }))}
              value={form.default_coordinator_name}
            />
          </div>
          <div className="space-y-2">
            <Label>Nama Wali Kelas Default</Label>
            <Input
              disabled={!canManage}
              onChange={(event) => setForm((current) => ({ ...current, default_homeroom_name: event.target.value }))}
              value={form.default_homeroom_name}
            />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Rapor Default</Label>
            <Input
              disabled={!canManage}
              onChange={(event) => setForm((current) => ({ ...current, default_report_date: event.target.value }))}
              type="date"
              value={form.default_report_date}
            />
            <p className="text-xs text-[var(--muted)]">
              Boleh dikosongkan. Jika diisi, sistem akan memakai tanggal ini saat membuat rapor baru.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Catatan Default Rapor</Label>
            <Textarea
              disabled={!canManage}
              onChange={(event) => setForm((current) => ({ ...current, default_report_note: event.target.value }))}
              rows={6}
              value={form.default_report_note}
            />
            <p className="text-xs text-[var(--muted)]">
              Catatan ini muncul otomatis saat membuat rapor baru. Koordinator masih bisa mengedit per santri.
            </p>
          </div>
        </section>
      </div>
      {!canManage ? (
        <p className="mt-4 rounded-md bg-[var(--surface-soft)] p-3 text-sm text-[var(--muted)]">
          Hanya admin atau koordinator yang dapat mengubah profil lembaga.
        </p>
      ) : null}

      {canManage ? (
        <StickySaveBar
          message="Perubahan akan langsung berlaku di header rapor dan halaman aplikasi."
          primary={
            <Button className="w-full" disabled={loading} onClick={save} type="button">
              <Save size={18} />
              {loading ? "Menyimpan..." : "Simpan Profil"}
            </Button>
          }
        />
      ) : null}
    </Card>
  );

  function notify(messageText: string, tone: "success" | "error" | "info" = "success") {
    setMessage(messageText);
    setToast({ message: messageText, tone });
    window.setTimeout(() => setToast(null), 5000);
  }
}
