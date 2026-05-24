"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/field";
import { HelpText } from "@/components/ui/help-text";
import { Toast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fallbackSettings, type AppSettings } from "@/lib/settings/settings-client";

type ProfileRow = { role: string; is_active: boolean };

export function InstitutionSettings() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [form, setForm] = useState<AppSettings>(fallbackSettings);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Login sebagai admin untuk mengubah profil lembaga.");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const canEdit = profile?.role === "admin";

  const loadData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Environment Supabase belum lengkap.");
      return;
    }

    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setMessage("Belum login.");
      setLoading(false);
      return;
    }

    const [profileRes, settingsRes] = await Promise.all([
      supabase.from("profiles").select("role,is_active").eq("id", user.user.id).maybeSingle(),
      supabase.from("settings").select("*").eq("id", true).maybeSingle(),
    ]);

    if (profileRes.error) {
      setMessage(profileRes.error.message);
      setLoading(false);
      return;
    }

    setProfile((profileRes.data as ProfileRow | null) ?? null);
    if (settingsRes.data) {
      setForm({
        institution_name: settingsRes.data.institution_name ?? fallbackSettings.institution_name,
        institution_address: settingsRes.data.institution_address ?? fallbackSettings.institution_address,
        logo_url: settingsRes.data.logo_url ?? null,
        default_coordinator_name: settingsRes.data.default_coordinator_name ?? fallbackSettings.default_coordinator_name,
        default_homeroom_name: settingsRes.data.default_homeroom_name ?? fallbackSettings.default_homeroom_name,
        default_report_note: settingsRes.data.default_report_note ?? fallbackSettings.default_report_note,
        report_target_text: settingsRes.data.report_target_text ?? fallbackSettings.report_target_text,
      });
    }

    setMessage(profileRes.data?.role === "admin" ? "Profil lembaga siap diperbarui." : "Hanya admin yang dapat mengubah profil lembaga.");
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function saveSettings() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !canEdit) return;

    setLoading(true);
    const { error } = await supabase
      .from("settings")
      .update({
        institution_name: form.institution_name.trim() || fallbackSettings.institution_name,
        institution_address: form.institution_address.trim() || fallbackSettings.institution_address,
        logo_url: form.logo_url?.trim() || null,
        default_coordinator_name: form.default_coordinator_name.trim() || fallbackSettings.default_coordinator_name,
        default_homeroom_name: form.default_homeroom_name.trim() || fallbackSettings.default_homeroom_name,
        default_report_note: form.default_report_note.trim() || fallbackSettings.default_report_note,
        report_target_text: form.report_target_text.trim() || fallbackSettings.report_target_text,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    if (error) {
      notify(error.message, "error");
    } else {
      notify("Profil lembaga berhasil disimpan.");
    }
    setLoading(false);
  }

  return (
    <Card>
      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
      <SectionHeader
        title="Profil Lembaga"
        description="Nama, alamat, dan default penandatangan rapor diambil dari sini."
        action={
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button disabled={loading} onClick={loadData} type="button" variant="secondary">
              <RefreshCw size={18} />
              Muat Ulang
            </Button>
            {canEdit ? (
              <Button disabled={loading} onClick={saveSettings} type="button">
                <Save size={18} />
                Simpan
              </Button>
            ) : null}
          </div>
        }
      />

      <HelpText icon={<Building2 size={18} />} className="mb-4">
        {message}
      </HelpText>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Nama Lembaga</Label>
          <Input
            disabled={!canEdit}
            value={form.institution_name}
            onChange={(event) => setForm((current) => ({ ...current, institution_name: event.target.value }))}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Alamat Lembaga</Label>
          <Textarea
            disabled={!canEdit}
            value={form.institution_address}
            onChange={(event) => setForm((current) => ({ ...current, institution_address: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Default Koordinator</Label>
          <Input
            disabled={!canEdit}
            value={form.default_coordinator_name}
            onChange={(event) => setForm((current) => ({ ...current, default_coordinator_name: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Default Wali Kelas</Label>
          <Input
            disabled={!canEdit}
            value={form.default_homeroom_name}
            onChange={(event) => setForm((current) => ({ ...current, default_homeroom_name: event.target.value }))}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Catatan Default Rapor</Label>
          <Textarea
            disabled={!canEdit}
            value={form.default_report_note}
            onChange={(event) => setForm((current) => ({ ...current, default_report_note: event.target.value }))}
          />
          <p className="text-xs text-[var(--muted)]">
            Catatan ini muncul otomatis saat membuat rapor baru. Bisa diedit kapan saja sebelum cetak.
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Keterangan Target Hafalan</Label>
          <Input
            disabled={!canEdit}
            value={form.report_target_text}
            onChange={(event) => setForm((current) => ({ ...current, report_target_text: event.target.value }))}
          />
          <p className="text-xs text-[var(--muted)]">Tampil di bagian keterangan rapor cetak.</p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>URL Logo Lembaga (opsional)</Label>
          <Input
            disabled={!canEdit}
            placeholder="https://..."
            value={form.logo_url ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, logo_url: event.target.value }))}
          />
          <p className="text-xs text-[var(--muted)]">Kalau diisi, logo akan tampil pada preview rapor.</p>
        </div>
      </div>
    </Card>
  );

  function notify(messageText: string, tone: "success" | "error" | "info" = "success") {
    setMessage(messageText);
    setToast({ message: messageText, tone });
    window.setTimeout(() => setToast(null), 5000);
  }
}
