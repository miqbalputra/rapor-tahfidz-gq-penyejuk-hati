"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type HalaqohOption = {
  id: string;
  name: string;
  className: string;
  academic_year_id: string;
  semester_id: string;
};

type ParsedRow = {
  rowNumber: number;
  name: string;
  gender: "male" | "female";
  nis: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  address: string | null;
  halaqohName: string | null;
  // Hasil pencarian halaqoh berdasarkan nama (case-insensitive).
  resolvedHalaqohId: string | null;
  // Status validasi tiap baris untuk preview.
  errors: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  halaqohs: HalaqohOption[];
};

// Kolom yang diakui dari header CSV. Case-insensitive, spasi/dash diabaikan.
const HEADER_ALIASES = {
  name: ["nama", "namasantri", "namalengkap"],
  gender: ["gender", "jeniskelamin", "jk"],
  nis: ["nis", "nomorinduk"],
  guardian_name: ["wali", "namawali", "namaorangtua", "namaortu"],
  guardian_phone: ["hpwali", "nohp", "telpwali", "wa"],
  address: ["alamat"],
  halaqoh: ["halaqoh", "kelashalaqoh", "kelas"],
};

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[\s_\-]+/g, "");
}

function detectColumns(headerRow: string[]): Partial<Record<keyof typeof HEADER_ALIASES, number>> {
  const result: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
  headerRow.forEach((cell, index) => {
    const normalized = normalizeKey(cell);
    for (const key of Object.keys(HEADER_ALIASES) as Array<keyof typeof HEADER_ALIASES>) {
      if (HEADER_ALIASES[key].includes(normalized)) {
        result[key] = index;
        break;
      }
    }
  });
  return result;
}

function parseGender(value: string): "male" | "female" | null {
  const normalized = value.trim().toLowerCase();
  if (["male", "m", "l", "laki", "lakilaki", "laki-laki", "santriwan"].includes(normalized)) return "male";
  if (["female", "f", "p", "perempuan", "santriwati"].includes(normalized)) return "female";
  return null;
}

// CSV parser sederhana: dukung quoted field, escaped quotes, koma, newline, dan CRLF.
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === "," || ch === ";" || ch === "\t") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch === "\r") {
      // skip; \n akan urus
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export function ImportStudentsModal({ open, onClose, onSuccess, halaqohs }: Props) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; messages: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const halaqohByName = useMemo(() => {
    const map = new Map<string, HalaqohOption>();
    halaqohs.forEach((halaqoh) => {
      map.set(normalizeKey(halaqoh.name), halaqoh);
      map.set(normalizeKey(`${halaqoh.name} ${halaqoh.className}`), halaqoh);
      map.set(normalizeKey(`${halaqoh.name}(${halaqoh.className})`), halaqoh);
    });
    return map;
  }, [halaqohs]);

  function reset() {
    setParsedRows([]);
    setFileName(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    if (importing) return;
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    setImportResult(null);
    setFileName(file.name);

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      setParsedRows([]);
      return;
    }

    const headerRow = rows[0];
    const columns = detectColumns(headerRow);

    if (columns.name === undefined) {
      setParsedRows([
        {
          rowNumber: 0,
          name: "",
          gender: "male",
          nis: null,
          guardian_name: null,
          guardian_phone: null,
          address: null,
          halaqohName: null,
          resolvedHalaqohId: null,
          errors: ["Kolom 'nama' tidak ditemukan di header CSV. Pastikan baris pertama berisi judul kolom seperti: nama, gender, nis."],
        },
      ]);
      return;
    }

    const dataRows = rows.slice(1);
    const parsed: ParsedRow[] = dataRows.map((row, index) => {
      const get = (key: keyof typeof HEADER_ALIASES) => {
        const colIndex = columns[key];
        return colIndex !== undefined ? (row[colIndex] ?? "").trim() : "";
      };

      const errors: string[] = [];
      const name = get("name");
      const genderRaw = get("gender");
      const gender = parseGender(genderRaw);
      const halaqohName = get("halaqoh") || null;

      if (!name) errors.push("Nama santri kosong.");
      if (!gender) errors.push(`Gender '${genderRaw}' tidak dikenali (gunakan: laki/perempuan, santriwan/santriwati, L/P).`);

      let resolvedHalaqohId: string | null = null;
      if (halaqohName) {
        const halaqoh = halaqohByName.get(normalizeKey(halaqohName));
        if (halaqoh) {
          resolvedHalaqohId = halaqoh.id;
        } else {
          errors.push(`Halaqoh '${halaqohName}' tidak ditemukan. Santri akan diimport tanpa halaqoh.`);
        }
      }

      return {
        rowNumber: index + 2, // +2 karena header di baris 1, data mulai baris 2
        name,
        gender: gender ?? "male",
        nis: get("nis") || null,
        guardian_name: get("guardian_name") || null,
        guardian_phone: get("guardian_phone") || null,
        address: get("address") || null,
        halaqohName,
        resolvedHalaqohId,
        errors,
      };
    });

    setParsedRows(parsed);
  }

  async function handleImport() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const validRows = parsedRows.filter((row) => row.name && parseGender(row.gender === "male" ? "male" : "female"));
    if (validRows.length === 0) return;

    setImporting(true);
    let successCount = 0;
    let failedCount = 0;
    const messages: string[] = [];

    for (const row of validRows) {
      // Skip baris fatal error (nama kosong atau gender tidak valid).
      const fatalError = row.errors.find((e) => e.includes("Nama santri kosong") || e.includes("tidak dikenali"));
      if (fatalError) {
        failedCount += 1;
        messages.push(`Baris ${row.rowNumber}: ${fatalError}`);
        continue;
      }

      // Insert student. Pakai full_name+gender unique constraint untuk hindari duplicate.
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .upsert(
          {
            full_name: row.name,
            gender: row.gender,
            nis: row.nis,
            guardian_name: row.guardian_name,
            guardian_phone: row.guardian_phone,
            address: row.address,
            status: "active",
          },
          { onConflict: "full_name,gender" },
        )
        .select("id")
        .single();

      if (studentError || !studentData) {
        failedCount += 1;
        messages.push(`Baris ${row.rowNumber} (${row.name}): ${studentError?.message ?? "Gagal insert santri."}`);
        continue;
      }

      // Jika halaqoh ditentukan, otomatis tempatkan santri ke halaqoh tersebut.
      if (row.resolvedHalaqohId) {
        const halaqoh = halaqohs.find((h) => h.id === row.resolvedHalaqohId);
        if (halaqoh) {
          const { error: assignError } = await supabase.from("student_halaqohs").upsert(
            {
              student_id: studentData.id,
              halaqoh_id: halaqoh.id,
              academic_year_id: halaqoh.academic_year_id,
              semester_id: halaqoh.semester_id,
              joined_at: new Date().toISOString().slice(0, 10),
              is_active: true,
            },
            { onConflict: "student_id,halaqoh_id,academic_year_id,semester_id" },
          );
          if (assignError) {
            messages.push(`Baris ${row.rowNumber} (${row.name}): santri berhasil ditambah, tapi gagal masuk halaqoh: ${assignError.message}`);
          }
        }
      }

      successCount += 1;
    }

    setImporting(false);
    setImportResult({ success: successCount, failed: failedCount, messages });
    if (successCount > 0) onSuccess();
  }

  if (!open) return null;

  const validCount = parsedRows.filter((r) => r.errors.every((e) => !e.includes("kosong") && !e.includes("tidak dikenali"))).length;
  const errorCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-[var(--surface)] shadow-2xl flex flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-white">
              <FileUp size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold leading-tight">Import Santri dari CSV</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Upload file CSV/Excel untuk menambah banyak santri sekaligus.
              </p>
            </div>
          </div>
          <button
            aria-label="Tutup"
            className="grid size-9 shrink-0 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={importing}
            onClick={handleClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {!fileName ? (
            <>
              <div className="mb-5 rounded-md bg-[var(--surface-soft)] p-4 text-sm leading-6">
                <p className="font-bold text-[var(--foreground)]">Format CSV yang diharapkan:</p>
                <p className="mt-1 text-[var(--muted)]">
                  Baris pertama berisi nama kolom. Kolom yang dikenali (case-insensitive, urutan bebas):
                </p>
                <ul className="mt-2 grid gap-1 text-xs text-[var(--muted)] sm:grid-cols-2">
                  <li>• <code>nama</code> (wajib)</li>
                  <li>• <code>gender</code> (wajib: L/P, laki/perempuan, santriwan/santriwati)</li>
                  <li>• <code>nis</code> (opsional)</li>
                  <li>• <code>wali</code> (opsional, nama wali)</li>
                  <li>• <code>hp_wali</code> (opsional)</li>
                  <li>• <code>alamat</code> (opsional)</li>
                  <li>• <code>halaqoh</code> (opsional, nama halaqoh persis)</li>
                </ul>
                <p className="mt-3 text-xs text-[var(--muted)]">
                  Pemisah: koma, titik koma, atau tab. Encoding: UTF-8.
                </p>
              </div>

              <label
                className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-[var(--primary)]/40 bg-[var(--surface-soft)] p-8 text-center transition hover:bg-[var(--surface-soft)]/70"
                htmlFor="csv-file-input"
              >
                <Upload className="text-[var(--primary)]" size={36} />
                <span className="font-bold text-[var(--foreground)]">Klik untuk pilih file CSV</span>
                <span className="text-sm text-[var(--muted)]">atau drag &amp; drop file ke sini</span>
                <input
                  accept=".csv,text/csv"
                  className="hidden"
                  id="csv-file-input"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                  ref={fileInputRef}
                  type="file"
                />
              </label>
              <button
                className="mt-3 text-sm font-semibold text-[var(--primary)] hover:underline"
                onClick={() => downloadTemplate()}
                type="button"
              >
                Unduh contoh template CSV
              </button>
            </>
          ) : importResult ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                <CheckCircle2 className="text-emerald-700 dark:text-emerald-400" size={20} />
                <p className="font-bold">{importResult.success} santri berhasil diimport</p>
              </div>
              {importResult.failed > 0 ? (
                <div className="rounded-md bg-amber-50 p-4 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={20} />
                    <p className="font-bold">{importResult.failed} baris gagal diimport</p>
                  </div>
                  {importResult.messages.length > 0 ? (
                    <ul className="mt-2 max-h-48 overflow-auto space-y-1 text-xs">
                      {importResult.messages.map((msg, index) => (
                        <li key={index}>• {msg}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold text-[var(--foreground)]">{fileName}</p>
                <Badge tone="green">{validCount} valid</Badge>
                {errorCount > 0 ? <Badge tone="red">{errorCount} error</Badge> : null}
                <button
                  className="ml-auto text-xs font-semibold text-[var(--primary)] hover:underline"
                  onClick={reset}
                  type="button"
                >
                  Pilih file lain
                </button>
              </div>

              <div className="overflow-x-auto rounded-md border border-[var(--line)]">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="bg-[var(--surface-soft)] text-left text-xs uppercase text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2">Baris</th>
                      <th className="px-3 py-2">Nama</th>
                      <th className="px-3 py-2">Gender</th>
                      <th className="px-3 py-2">NIS</th>
                      <th className="px-3 py-2">Halaqoh</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 50).map((row) => {
                      const hasError = row.errors.some((e) => e.includes("kosong") || e.includes("tidak dikenali"));
                      return (
                        <tr className="border-t border-[var(--line)]" key={row.rowNumber}>
                          <td className="px-3 py-2 text-xs text-[var(--muted)]">{row.rowNumber}</td>
                          <td className="px-3 py-2 font-semibold">{row.name || <span className="text-red-600">kosong</span>}</td>
                          <td className="px-3 py-2 text-xs">{row.gender === "male" ? "Santriwan" : "Santriwati"}</td>
                          <td className="px-3 py-2 text-xs text-[var(--muted)]">{row.nis ?? "-"}</td>
                          <td className="px-3 py-2 text-xs">
                            {row.halaqohName ? (row.resolvedHalaqohId ? row.halaqohName : <span className="text-amber-700">{row.halaqohName} (tidak ketemu)</span>) : "-"}
                          </td>
                          <td className="px-3 py-2">
                            {hasError ? <Badge tone="red">Error</Badge> : row.errors.length > 0 ? <Badge tone="amber">Warning</Badge> : <Badge tone="green">OK</Badge>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 ? (
                <p className="text-xs text-[var(--muted)]">Menampilkan 50 baris pertama dari total {parsedRows.length} baris.</p>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] px-5 py-4 sm:flex-row sm:justify-end">
          <Button disabled={importing} onClick={handleClose} type="button" variant="secondary">
            {importResult ? "Tutup" : "Batal"}
          </Button>
          {fileName && !importResult ? (
            <Button disabled={importing || validCount === 0} onClick={handleImport} type="button">
              <Upload size={18} />
              {importing ? "Mengimport..." : `Import ${validCount} santri`}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function downloadTemplate() {
  const csv = [
    "nama,gender,nis,wali,hp_wali,alamat,halaqoh",
    "Ahmad Fauzi,L,2025001,Bapak Ahmad,081234567890,Jl. Mawar No. 1,Al-Huda",
    "Siti Aisyah,P,2025002,Ibu Siti,081234567891,Jl. Melati No. 2,At-Tanzil",
    "Muhammad Zaki,santriwan,2025003,,,,",
  ].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-import-santri.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
