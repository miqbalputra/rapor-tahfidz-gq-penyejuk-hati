"use client";

import { Lock, Save, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

type ScoreDraft = {
  fluency_mistakes: string;
  fluency_score: string;
  fashohah_score: string;
  tajwid_score: string;
  note: string;
};

type SurahCardItem = {
  id: string;
  sortOrder: number;
  nameLatin: string;
  draft: ScoreDraft;
  total: number;
  fluency: number;
  fashohah: number;
  tajwid: number;
  predicate: string;
  passed: boolean;
  isSaved: boolean;
  isLocked: boolean;
  lockedAt?: string | null;
};

type Props = {
  // Tampilan kartu per surat khusus mobile, jadi pengguna tidak perlu scroll horizontal di tabel 11 kolom.
  items: SurahCardItem[];
  loading: boolean;
  inputsDisabledFor: (item: SurahCardItem) => boolean;
  canShowLock: (item: SurahCardItem) => boolean;
  onChangeDraft: (surahId: string, field: keyof ScoreDraft, value: string) => void;
  onSave: (surahId: string) => void;
  onToggleLock: (surahId: string, locked: boolean) => void;
  fluencyMax: number;
  fashohahMax: number;
  tajwidMax: number;
};

export function TahfidzMobileCards({
  items,
  loading,
  inputsDisabledFor,
  canShowLock,
  onChangeDraft,
  onSave,
  onToggleLock,
  fluencyMax,
  fashohahMax,
  tajwidMax,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--muted)]">
        Belum ada surat untuk juz yang dipilih.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const disabled = inputsDisabledFor(item);
        return (
          <article
            className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm"
            key={item.id}
          >
            <header className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Surat ke-{item.sortOrder}</p>
                <h3 className="text-base font-bold leading-tight">{item.nameLatin}</h3>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge tone={item.passed ? "green" : "red"}>{item.passed ? "Lulus" : "Belum"}</Badge>
                <Badge tone={item.isLocked ? "amber" : item.isSaved ? "green" : "neutral"}>
                  {item.isLocked ? "Terkunci" : item.isSaved ? "Tersimpan" : "Draft"}
                </Badge>
              </div>
            </header>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor={`mistakes-${item.id}`}>Jumlah Salah Kelancaran</Label>
                <Input
                  disabled={disabled}
                  id={`mistakes-${item.id}`}
                  inputMode="numeric"
                  onChange={(event) => onChangeDraft(item.id, "fluency_mistakes", event.target.value)}
                  placeholder="0"
                  type="number"
                  value={item.draft.fluency_mistakes}
                />
                <p className="text-xs text-[var(--muted)]">
                  Diisi guru. Sistem akan menghitung nilai kelancaran (maks {fluencyMax}) otomatis dari jumlah salah.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`fluency-${item.id}`}>Kelancaran (maks {fluencyMax})</Label>
                <Input
                  disabled={disabled}
                  id={`fluency-${item.id}`}
                  inputMode="decimal"
                  onChange={(event) => onChangeDraft(item.id, "fluency_score", event.target.value)}
                  type="number"
                  value={item.draft.fluency_score}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`fashohah-${item.id}`}>Fashohah (maks {fashohahMax})</Label>
                <Input
                  disabled={disabled}
                  id={`fashohah-${item.id}`}
                  inputMode="decimal"
                  onChange={(event) => onChangeDraft(item.id, "fashohah_score", event.target.value)}
                  type="number"
                  value={item.draft.fashohah_score}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor={`tajwid-${item.id}`}>Tajwid (maks {tajwidMax})</Label>
                <Input
                  disabled={disabled}
                  id={`tajwid-${item.id}`}
                  inputMode="decimal"
                  onChange={(event) => onChangeDraft(item.id, "tajwid_score", event.target.value)}
                  type="number"
                  value={item.draft.tajwid_score}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-md bg-[var(--surface-soft)] p-3 text-sm">
              <div>
                <p className="text-xs text-[var(--muted)]">Total</p>
                <p className="text-2xl font-bold leading-none">{item.total}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted)]">Predikat</p>
                <p className="font-semibold">{item.predicate}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                className="flex-1"
                disabled={loading || disabled}
                onClick={() => onSave(item.id)}
                type="button"
              >
                <Save size={18} />
                Simpan
              </Button>
              {canShowLock(item) ? (
                item.isLocked ? (
                  <Button disabled={loading} onClick={() => onToggleLock(item.id, false)} type="button" variant="secondary">
                    <Unlock size={18} />
                    Buka Kunci
                  </Button>
                ) : (
                  <Button disabled={loading} onClick={() => onToggleLock(item.id, true)} type="button" variant="secondary">
                    <Lock size={18} />
                    Kunci
                  </Button>
                )
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
