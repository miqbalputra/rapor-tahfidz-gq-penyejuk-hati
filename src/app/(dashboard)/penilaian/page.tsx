import { PenilaianTabs } from "./penilaian-tabs";

export default function PenilaianPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--primary)]">Input nilai</p>
        <h1 className="mt-1 text-2xl font-bold">Penilaian</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Pilih jenis penilaian di tab di bawah. Nilai total, status lulus, dan predikat dihitung otomatis dari rubrik aktif di Pengaturan.
        </p>
      </div>

      <PenilaianTabs />
    </div>
  );
}
