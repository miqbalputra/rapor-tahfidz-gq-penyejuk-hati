import { RaporWorkspace } from "./rapor-workspace";

export default function RaporPage() {
  return (
    <div className="space-y-6">
      <div className="no-print">
        <p className="text-sm font-semibold text-[var(--primary)]">Workspace Rapor</p>
        <h1 className="mt-1 text-2xl font-bold">Rapor Tahfidz dan Rapor Semester</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Aplikasi ini sekarang menjadi jembatan pendataan untuk dua keluaran: rapor tahfidz berbasis template Word dan rapor semester berbasis template Excel sekolah.
        </p>
      </div>

      <RaporWorkspace />
    </div>
  );
}
