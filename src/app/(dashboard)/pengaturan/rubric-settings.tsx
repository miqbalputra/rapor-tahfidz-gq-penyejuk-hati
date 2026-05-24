"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Edit3, HelpCircle, Plus, Power, RefreshCw, RotateCcw, Save, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/field";
import { DataTable } from "@/components/ui/table";
import { Toast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TotalFormula = "sum" | "average" | "manual";
type InputMode = "direct_score" | "mistake_deduction" | "per_item";

const totalFormulaLabels: Record<TotalFormula, string> = {
  sum: "Jumlah",
  average: "Rata-rata",
  manual: "Manual",
};

const inputModeLabels: Record<InputMode, string> = {
  direct_score: "Langsung",
  mistake_deduction: "Hitung dari salah",
  per_item: "Per baris/item",
};

type AssessmentTypeRow = {
  id: string;
  code: string;
  name: string;
  max_score: number;
  total_formula: TotalFormula;
  passing_min_score: number | null;
  max_fluency_mistakes: number | null;
  applies_to_report: boolean;
  version: number;
  is_active: boolean;
};

type ComponentRow = {
  id: string;
  assessment_type_id: string;
  code: string;
  name: string;
  max_score: number;
  input_mode: InputMode;
  deduction_per_mistake: number | null;
  is_required: boolean;
  sort_order: number;
};

type PredicateRow = {
  id: string;
  assessment_type_id: string | null;
  min_score: number | null;
  max_score: number | null;
  label: string;
  description: string | null;
  sort_order: number;
};

type UserProfileRow = {
  role: string;
  is_active: boolean;
};

const emptyTypeForm = {
  code: "",
  name: "",
  max_score: "100",
  total_formula: "sum" as TotalFormula,
  passing_min_score: "",
  max_fluency_mistakes: "",
  applies_to_report: false,
};

const emptyComponentForm = {
  code: "",
  name: "",
  max_score: "",
  input_mode: "direct_score" as InputMode,
  deduction_per_mistake: "",
  is_required: true,
  sort_order: "1",
};

const emptyPredicateForm = {
  assessment_type_id: "",
  min_score: "",
  max_score: "",
  label: "",
  description: "",
  sort_order: "1",
};

export function RubricSettings() {
  const [types, setTypes] = useState<AssessmentTypeRow[]>([]);
  const [components, setComponents] = useState<ComponentRow[]>([]);
  const [predicates, setPredicates] = useState<PredicateRow[]>([]);
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [typeForm, setTypeForm] = useState(emptyTypeForm);
  const [componentForm, setComponentForm] = useState(emptyComponentForm);
  const [predicateForm, setPredicateForm] = useState(emptyPredicateForm);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [editingPredicateId, setEditingPredicateId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Login sebagai admin untuk mengubah konfigurasi rubrik.");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);
  const canManageRubrics = profile?.role === "admin" || profile?.role === "koordinator";

  const selectedType = useMemo(() => types.find((type) => type.id === selectedTypeId) ?? types[0], [selectedTypeId, types]);
  const selectedComponents = useMemo(
    () => components.filter((component) => component.assessment_type_id === selectedType?.id).sort((a, b) => a.sort_order - b.sort_order),
    [components, selectedType?.id],
  );
  const visibleTypes = useMemo(
    () => types.filter((type) => `${type.code} ${type.name}`.toLowerCase().includes(query.toLowerCase())),
    [query, types],
  );
  const componentTotal = useMemo(() => selectedComponents.reduce((sum, component) => sum + Number(component.max_score), 0), [selectedComponents]);

  const loadData = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Environment Supabase belum lengkap.");
      return;
    }

    setLoading(true);
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      setTypes([]);
      setComponents([]);
      setPredicates([]);
      setProfile(null);
      setMessage("Belum login. Masuk dulu agar RLS Supabase memberi akses data.");
      setLoading(false);
      return;
    }

    const [profileRes, typeRes, componentRes, predicateRes] = await Promise.all([
      supabase.from("profiles").select("role,is_active").eq("id", user.data.user.id).maybeSingle(),
      supabase.from("assessment_types").select("*").order("name"),
      supabase.from("assessment_components").select("*").order("sort_order"),
      supabase.from("predicate_rules").select("*").order("sort_order"),
    ]);

    if (profileRes.error || typeRes.error || componentRes.error || predicateRes.error) {
      notify(profileRes.error?.message ?? typeRes.error?.message ?? componentRes.error?.message ?? predicateRes.error?.message ?? "Gagal memuat rubrik.", "error");
    } else {
      const loadedTypes = (typeRes.data ?? []) as AssessmentTypeRow[];
      const loadedProfile = (profileRes.data as UserProfileRow | null) ?? null;
      setProfile(loadedProfile);
      setTypes(loadedTypes);
      setComponents((componentRes.data ?? []) as ComponentRow[]);
      setPredicates((predicateRes.data ?? []) as PredicateRow[]);
      setSelectedTypeId((current) => current || loadedTypes[0]?.id || "");
      setPredicateForm((current) => ({
        ...current,
        assessment_type_id: current.assessment_type_id || "",
      }));
      setMessage(loadedProfile?.role === "admin" || loadedProfile?.role === "koordinator" ? "Data rubrik Supabase berhasil dimuat." : "Aturan penilaian tampil baca saja. Perubahan hanya bisa dilakukan admin.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function saveType() {
    const supabase = createSupabaseBrowserClient();
    if (!canManageRubrics) return;
    if (!supabase || !typeForm.code.trim() || !typeForm.name.trim()) return;

    setLoading(true);
    const payload = {
      code: typeForm.code.trim(),
      name: typeForm.name.trim(),
      max_score: toNumber(typeForm.max_score, 0),
      total_formula: typeForm.total_formula,
      passing_min_score: toNullableNumber(typeForm.passing_min_score),
      max_fluency_mistakes: toNullableInteger(typeForm.max_fluency_mistakes),
      applies_to_report: typeForm.applies_to_report,
      is_active: true,
    };

    const result = editingTypeId
      ? await supabase.from("assessment_types").update(payload).eq("id", editingTypeId)
      : await supabase.from("assessment_types").insert(payload);

    if (result.error) {
      notify(result.error.message, "error");
    } else {
      notify(editingTypeId ? "Jenis ujian berhasil diedit." : "Jenis ujian berhasil ditambahkan.");
      resetTypeForm();
      await loadData();
    }
    setLoading(false);
  }

  async function setTypeActive(id: string, isActive: boolean) {
    const supabase = createSupabaseBrowserClient();
    if (!canManageRubrics) return;
    if (!supabase) return;

    setLoading(true);
    const { error } = await supabase.from("assessment_types").update({ is_active: isActive }).eq("id", id);
    if (error) {
      notify(error.message, "error");
    } else {
      notify(isActive ? "Jenis ujian berhasil diaktifkan." : "Jenis ujian berhasil dinonaktifkan.");
      await loadData();
    }
    setLoading(false);
  }

  function editType(type: AssessmentTypeRow) {
    setEditingTypeId(type.id);
    setTypeForm({
      code: type.code,
      name: type.name,
      max_score: String(type.max_score),
      total_formula: type.total_formula,
      passing_min_score: type.passing_min_score == null ? "" : String(type.passing_min_score),
      max_fluency_mistakes: type.max_fluency_mistakes == null ? "" : String(type.max_fluency_mistakes),
      applies_to_report: type.applies_to_report,
    });
    setSelectedTypeId(type.id);
  }

  function resetTypeForm() {
    setEditingTypeId(null);
    setTypeForm(emptyTypeForm);
  }

  async function saveComponent() {
    const supabase = createSupabaseBrowserClient();
    if (!canManageRubrics) return;
    const typeId = selectedType?.id;
    if (!supabase || !typeId || !componentForm.code.trim() || !componentForm.name.trim()) return;

    setLoading(true);
    const payload = {
      assessment_type_id: typeId,
      code: componentForm.code.trim(),
      name: componentForm.name.trim(),
      max_score: toNumber(componentForm.max_score, 0),
      input_mode: componentForm.input_mode,
      deduction_per_mistake: toNullableNumber(componentForm.deduction_per_mistake),
      is_required: componentForm.is_required,
      sort_order: toNumber(componentForm.sort_order, 0),
    };

    const result = editingComponentId
      ? await supabase.from("assessment_components").update(payload).eq("id", editingComponentId)
      : await supabase.from("assessment_components").insert(payload);

    if (result.error) {
      notify(result.error.message, "error");
    } else {
      notify(editingComponentId ? "Komponen nilai berhasil diedit." : "Komponen nilai berhasil ditambahkan.");
      resetComponentForm();
      await loadData();
    }
    setLoading(false);
  }

  function editComponent(component: ComponentRow) {
    setEditingComponentId(component.id);
    setSelectedTypeId(component.assessment_type_id);
    setComponentForm({
      code: component.code,
      name: component.name,
      max_score: String(component.max_score),
      input_mode: component.input_mode,
      deduction_per_mistake: component.deduction_per_mistake == null ? "" : String(component.deduction_per_mistake),
      is_required: component.is_required,
      sort_order: String(component.sort_order),
    });
  }

  function resetComponentForm() {
    setEditingComponentId(null);
    setComponentForm({
      ...emptyComponentForm,
      sort_order: String(selectedComponents.length + 1),
    });
  }

  async function savePredicate() {
    const supabase = createSupabaseBrowserClient();
    if (!canManageRubrics) return;
    if (!supabase || !predicateForm.label.trim()) return;

    setLoading(true);
    const payload = {
      assessment_type_id: predicateForm.assessment_type_id || null,
      min_score: toNullableNumber(predicateForm.min_score),
      max_score: toNullableNumber(predicateForm.max_score),
      label: predicateForm.label.trim(),
      description: predicateForm.description.trim() || null,
      sort_order: toNumber(predicateForm.sort_order, 0),
    };

    const result = editingPredicateId
      ? await supabase.from("predicate_rules").update(payload).eq("id", editingPredicateId)
      : await supabase.from("predicate_rules").insert(payload);

    if (result.error) {
      notify(result.error.message, "error");
    } else {
      notify(editingPredicateId ? "Predikat berhasil diedit." : "Predikat berhasil ditambahkan.");
      resetPredicateForm();
      await loadData();
    }
    setLoading(false);
  }

  function editPredicate(predicate: PredicateRow) {
    setEditingPredicateId(predicate.id);
    setPredicateForm({
      assessment_type_id: predicate.assessment_type_id ?? "",
      min_score: predicate.min_score == null ? "" : String(predicate.min_score),
      max_score: predicate.max_score == null ? "" : String(predicate.max_score),
      label: predicate.label,
      description: predicate.description ?? "",
      sort_order: String(predicate.sort_order),
    });
  }

  function resetPredicateForm() {
    setEditingPredicateId(null);
    setPredicateForm(emptyPredicateForm);
  }

  const typeRows = visibleTypes.map((type) => [
    type.code,
    type.name,
    type.max_score,
    totalFormulaLabels[type.total_formula] ?? type.total_formula,
    type.passing_min_score ?? "-",
    type.max_fluency_mistakes ?? "-",
    <Badge key={`${type.id}-report`} tone={type.applies_to_report ? "green" : "neutral"}>
      {type.applies_to_report ? "Rapor" : "Internal"}
    </Badge>,
    <Badge key={`${type.id}-status`} tone={type.is_active ? "green" : "neutral"}>
      {type.is_active ? "Aktif" : "Nonaktif"}
    </Badge>,
    ...(canManageRubrics
      ? [
          <div className="flex flex-wrap gap-2" key={`${type.id}-actions`}>
            <Button onClick={() => editType(type)} type="button" variant="secondary">
              <Edit3 size={16} />
              Edit
            </Button>
            {type.is_active ? (
              <Button onClick={() => setTypeActive(type.id, false)} type="button" variant="ghost">
                <Power size={16} />
                Nonaktif
              </Button>
            ) : (
              <Button onClick={() => setTypeActive(type.id, true)} type="button" variant="ghost">
                <RotateCcw size={16} />
                Aktifkan
              </Button>
            )}
          </div>,
        ]
      : []),
  ]);

  const componentRows = selectedComponents.map((component) => [
    component.sort_order,
    component.code,
    component.name,
    component.max_score,
    inputModeLabels[component.input_mode] ?? component.input_mode,
    component.deduction_per_mistake ?? "-",
    component.is_required ? "Ya" : "Tidak",
    ...(canManageRubrics
      ? [
          <Button key={`${component.id}-edit`} onClick={() => editComponent(component)} type="button" variant="secondary">
            <Edit3 size={16} />
            Edit
          </Button>,
        ]
      : []),
  ]);

  const predicateRows = predicates.map((predicate) => [
    predicate.sort_order,
    predicate.assessment_type_id ? types.find((type) => type.id === predicate.assessment_type_id)?.name ?? "Khusus" : "Global",
    predicate.min_score ?? "-",
    predicate.max_score ?? "-",
    predicate.label,
    predicate.description ?? "-",
    ...(canManageRubrics
      ? [
          <Button key={`${predicate.id}-edit`} onClick={() => editPredicate(predicate)} type="button" variant="secondary">
            <Edit3 size={16} />
            Edit
          </Button>,
        ]
      : []),
  ]);

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--muted)]">{message}</p>
          <Button disabled={loading} onClick={loadData} type="button" variant="secondary">
            <RefreshCw size={18} />
            {loading ? "Memuat..." : "Muat Ulang"}
          </Button>
        </div>
      </Card>

      <Card>
        <SectionHeader
          title={canManageRubrics ? "Kelola Jenis Ujian" : "Jenis Ujian"}
          description={
            canManageRubrics
              ? "Jenis ujian seperti Tahfidz Juz 29, Juziyah, atau Tartili. Tiap jenis menentukan nilai maksimal, rumus total, dan syarat lulusnya."
              : "Guru hanya dapat membaca jenis ujian yang sedang berlaku."
          }
          action={
            canManageRubrics ? (
              <div className="flex flex-wrap gap-2">
                {editingTypeId ? (
                  <Button onClick={resetTypeForm} type="button" variant="secondary">
                    Batal Edit
                  </Button>
                ) : null}
                <Button disabled={loading || !typeForm.code.trim() || !typeForm.name.trim()} onClick={saveType} type="button">
                  {editingTypeId ? <Save size={18} /> : <Plus size={18} />}
                  {editingTypeId ? "Simpan Jenis" : "Tambah Jenis"}
                </Button>
              </div>
            ) : null
          }
        />

        {canManageRubrics ? (
          <>
            <HelpBox
              text="Mode Sederhana hanya menampilkan kolom utama. Aktifkan Mode Lanjutan jika ingin mengatur kode, rumus total, syarat lulus, dan opsi rapor."
            />
            <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FieldWithHelp label="Nama Jenis Ujian" hint="Contoh: Tahfidz Juz 29, Tartili, Wudhu. Inilah yang akan dipilih guru saat input nilai.">
                <Input onChange={(event) => setTypeForm((current) => ({ ...current, name: event.target.value }))} placeholder="Tahfidz Juz 29" value={typeForm.name} />
              </FieldWithHelp>
              <FieldWithHelp label="Nilai Maksimal" hint="Total nilai tertinggi yang bisa diperoleh. Untuk tahfidz biasanya 100.">
                <Input onChange={(event) => setTypeForm((current) => ({ ...current, max_score: event.target.value }))} type="number" value={typeForm.max_score} />
              </FieldWithHelp>
              <FieldWithHelp label="Tampil di Rapor" hint="Pilih Ya jika nilai jenis ujian ini ikut dicetak di rapor santri.">
                <Select
                  onChange={(event) => setTypeForm((current) => ({ ...current, applies_to_report: event.target.value === "true" }))}
                  value={String(typeForm.applies_to_report)}
                >
                  <option value="false">Tidak</option>
                  <option value="true">Ya</option>
                </Select>
              </FieldWithHelp>
            </div>

            <div className="mb-5">
              <button
                aria-expanded={showAdvanced}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-soft)]"
                onClick={() => setShowAdvanced((current) => !current)}
                type="button"
              >
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showAdvanced ? "Sembunyikan Mode Lanjutan" : "Tampilkan Mode Lanjutan"}
              </button>
            </div>

            {showAdvanced ? (
              <div className="mb-5 grid gap-4 rounded-md border border-dashed border-[var(--line)] bg-[var(--surface-soft)]/40 p-4 md:grid-cols-2 xl:grid-cols-3">
                <FieldWithHelp label="Kode Internal" hint="Penanda unik untuk sistem. Hanya huruf kecil dan underscore. Contoh: tahfidz_juz29.">
                  <Input onChange={(event) => setTypeForm((current) => ({ ...current, code: event.target.value }))} placeholder="tahfidz_juz29" value={typeForm.code} />
                </FieldWithHelp>
                <FieldWithHelp label="Cara Hitung Total" hint="Pilih Jumlah jika total adalah penjumlahan komponen. Pilih Rata-rata jika total adalah rata-rata. Pilih Manual jika total diisi langsung oleh guru.">
                  <Select onChange={(event) => setTypeForm((current) => ({ ...current, total_formula: event.target.value as TotalFormula }))} value={typeForm.total_formula}>
                    <option value="sum">Jumlah</option>
                    <option value="average">Rata-rata</option>
                    <option value="manual">Manual</option>
                  </Select>
                </FieldWithHelp>
                <FieldWithHelp label="Nilai Minimum agar Lulus" hint="Boleh dikosongkan kalau jenis ujian ini tidak punya status lulus/tidak lulus.">
                  <Input onChange={(event) => setTypeForm((current) => ({ ...current, passing_min_score: event.target.value }))} placeholder="Contoh 85" type="number" value={typeForm.passing_min_score} />
                </FieldWithHelp>
                <FieldWithHelp label="Maksimum Salah Kelancaran" hint="Khusus tahfidz: jumlah salah kelancaran maksimum agar dianggap lulus. Boleh dikosongkan jika tidak relevan.">
                  <Input onChange={(event) => setTypeForm((current) => ({ ...current, max_fluency_mistakes: event.target.value }))} placeholder="Contoh 5" type="number" value={typeForm.max_fluency_mistakes} />
                </FieldWithHelp>
              </div>
            ) : null}

            <div className="mb-4 flex items-center gap-2">
              <Search size={18} className="text-[var(--muted)]" />
              <Input onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama jenis ujian" value={query} />
            </div>
          </>
        ) : (
          <div className="mb-5 flex items-center gap-2">
            <Search size={18} className="text-[var(--muted)]" />
            <Input onChange={(event) => setQuery(event.target.value)} placeholder="Cari kode/nama" value={query} />
          </div>
        )}

        <DataTable
          columns={canManageRubrics ? ["Kode", "Nama", "Maks", "Rumus", "Lulus", "Salah", "Tampil", "Status", "Aksi"] : ["Kode", "Nama", "Maks", "Rumus", "Lulus", "Salah", "Tampil", "Status"]}
          rows={typeRows}
        />
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <SectionHeader
            title={canManageRubrics ? "Kelola Komponen Nilai" : "Komponen Nilai"}
            description={selectedType ? `Komponen untuk ${selectedType.name}. Total porsi saat ini ${componentTotal}.` : "Pilih jenis ujian dahulu."}
            action={
              canManageRubrics ? <div className="flex flex-wrap gap-2">
                {editingComponentId ? (
                  <Button onClick={resetComponentForm} type="button" variant="secondary">
                    Batal Edit
                  </Button>
                ) : null}
                <Button disabled={loading || !selectedType || !componentForm.code.trim() || !componentForm.name.trim()} onClick={saveComponent} type="button">
                  {editingComponentId ? <Save size={18} /> : <Plus size={18} />}
                  {editingComponentId ? "Simpan Komponen" : "Tambah Komponen"}
                </Button>
              </div> : null
            }
          />

          {canManageRubrics ? <div className="mb-5 grid gap-4 md:grid-cols-2">
            <Field label="Jenis Ujian">
              <Select value={selectedTypeId} onChange={(event) => setSelectedTypeId(event.target.value)}>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Kode Komponen">
              <Input onChange={(event) => setComponentForm((current) => ({ ...current, code: event.target.value }))} placeholder="kelancaran" value={componentForm.code} />
            </Field>
            <Field label="Nama Komponen">
              <Input onChange={(event) => setComponentForm((current) => ({ ...current, name: event.target.value }))} placeholder="Kelancaran" value={componentForm.name} />
            </Field>
            <FieldWithHelp label="Porsi Maksimal" hint="Batas tertinggi nilai komponen ini. Total semua komponen biasanya = nilai maksimal jenis ujian.">
              <Input onChange={(event) => setComponentForm((current) => ({ ...current, max_score: event.target.value }))} type="number" value={componentForm.max_score} />
            </FieldWithHelp>
            <FieldWithHelp label="Cara Mengisi Nilai" hint="Langsung: guru ketik nilai komponen. Hitung dari salah: guru hanya isi jumlah salah, sistem hitung nilainya. Per baris: untuk komponen yang dinilai per baris seperti tartili.">
              <Select onChange={(event) => setComponentForm((current) => ({ ...current, input_mode: event.target.value as InputMode }))} value={componentForm.input_mode}>
                <option value="direct_score">Langsung</option>
                <option value="mistake_deduction">Hitung dari salah</option>
                <option value="per_item">Per baris/item</option>
              </Select>
            </FieldWithHelp>
            <FieldWithHelp label="Pengurang per Salah" hint="Hanya berlaku jika cara mengisi adalah Hitung dari salah. Contoh: 1 berarti tiap kesalahan mengurangi 1 poin dari nilai maksimal.">
              <Input onChange={(event) => setComponentForm((current) => ({ ...current, deduction_per_mistake: event.target.value }))} placeholder="Contoh 1" type="number" value={componentForm.deduction_per_mistake} />
            </FieldWithHelp>
            <Field label="Wajib Diisi">
              <Select onChange={(event) => setComponentForm((current) => ({ ...current, is_required: event.target.value === "true" }))} value={String(componentForm.is_required)}>
                <option value="true">Ya</option>
                <option value="false">Tidak</option>
              </Select>
            </Field>
            <Field label="Urutan Tampil">
              <Input onChange={(event) => setComponentForm((current) => ({ ...current, sort_order: event.target.value }))} type="number" value={componentForm.sort_order} />
            </Field>
          </div> : (
            <div className="mb-5 max-w-md space-y-2">
              <Label>Jenis Ujian</Label>
              <Select value={selectedTypeId} onChange={(event) => setSelectedTypeId(event.target.value)}>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <DataTable columns={canManageRubrics ? ["Urut", "Kode", "Nama", "Porsi", "Mode", "Pengurang", "Wajib", "Aksi"] : ["Urut", "Kode", "Nama", "Porsi", "Mode", "Pengurang", "Wajib"]} rows={componentRows} />
        </Card>

        <Card>
          <SectionHeader
            title={canManageRubrics ? "Kelola Predikat" : "Predikat"}
            description={canManageRubrics ? "Predikat bisa global atau khusus untuk jenis ujian tertentu." : "Predikat nilai tampil baca saja untuk guru."}
            action={
              canManageRubrics ? <div className="flex flex-wrap gap-2">
                {editingPredicateId ? (
                  <Button onClick={resetPredicateForm} type="button" variant="secondary">
                    Batal Edit
                  </Button>
                ) : null}
                <Button disabled={loading || !predicateForm.label.trim()} onClick={savePredicate} type="button">
                  {editingPredicateId ? <Save size={18} /> : <Plus size={18} />}
                  {editingPredicateId ? "Simpan Predikat" : "Tambah Predikat"}
                </Button>
              </div> : null
            }
          />

          {canManageRubrics ? <div className="mb-5 grid gap-4 md:grid-cols-2">
            <Field label="Berlaku Untuk">
              <Select onChange={(event) => setPredicateForm((current) => ({ ...current, assessment_type_id: event.target.value }))} value={predicateForm.assessment_type_id}>
                <option value="">Global semua ujian</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Label Predikat">
              <Input onChange={(event) => setPredicateForm((current) => ({ ...current, label: event.target.value }))} placeholder="Mumtaz (Sempurna)" value={predicateForm.label} />
            </Field>
            <Field label="Nilai Min">
              <Input onChange={(event) => setPredicateForm((current) => ({ ...current, min_score: event.target.value }))} placeholder="0" type="number" value={predicateForm.min_score} />
            </Field>
            <Field label="Nilai Max">
              <Input onChange={(event) => setPredicateForm((current) => ({ ...current, max_score: event.target.value }))} placeholder="100" type="number" value={predicateForm.max_score} />
            </Field>
            <Field label="Deskripsi">
              <Input onChange={(event) => setPredicateForm((current) => ({ ...current, description: event.target.value }))} placeholder="Sempurna" value={predicateForm.description} />
            </Field>
            <Field label="Urutan">
              <Input onChange={(event) => setPredicateForm((current) => ({ ...current, sort_order: event.target.value }))} type="number" value={predicateForm.sort_order} />
            </Field>
          </div> : null}

          <DataTable columns={canManageRubrics ? ["Urut", "Scope", "Min", "Max", "Predikat", "Deskripsi", "Aksi"] : ["Urut", "Scope", "Min", "Max", "Predikat", "Deskripsi"]} rows={predicateRows} />
        </Card>
      </section>
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

function FieldWithHelp({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      <p className="flex items-start gap-1.5 text-xs leading-5 text-[var(--muted)]">
        <HelpCircle className="mt-0.5 shrink-0" size={12} />
        <span>{hint}</span>
      </p>
    </div>
  );
}

function HelpBox({ text }: { text: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-md bg-[var(--surface-soft)] p-3 text-xs leading-5 text-[var(--muted)]">
      <HelpCircle className="mt-0.5 shrink-0 text-[var(--primary)]" size={14} />
      <span>{text}</span>
    </div>
  );
}

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableInteger(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
