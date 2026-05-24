import { SettingsTabs } from "./settings-tabs";

export default function PengaturanPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--primary)]">Konfigurasi sistem</p>
        <h1 className="mt-1 text-2xl font-bold">Pengaturan</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          Atur profil lembaga dan aturan nilai (rubrik, syarat lulus, predikat) tanpa perlu mengubah kode.
        </p>
      </div>

      <SettingsTabs />
    </div>
  );
}
