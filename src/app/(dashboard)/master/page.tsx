import { MasterDataClient } from "./master-data-client";

export default function MasterPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--primary)]">Data operasional</p>
        <h1 className="mt-1 text-2xl font-bold">Master Data</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Kelola dan pantau data santri, guru, halaqoh, serta relasi anggota halaqoh sesuai hak akses akun.
        </p>
      </div>
      <MasterDataClient />
    </div>
  );
}
