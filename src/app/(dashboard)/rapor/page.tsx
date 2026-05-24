import { ReportCardClient } from "./report-card-client";

export default function RaporPage() {
  return (
    <div className="space-y-6">
      <div className="no-print">
        <p className="text-sm font-semibold text-[var(--primary)]">Target MVP</p>
        <h1 className="mt-1 text-2xl font-bold">Rapor Juz 29 dan Juz 30</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Generate rapor print-ready berdasarkan template bahan Word: nilai setoran, nilai juziyah, catatan, keterangan predikat, dan tanda tangan.
        </p>
      </div>

      <ReportCardClient />
    </div>
  );
}

