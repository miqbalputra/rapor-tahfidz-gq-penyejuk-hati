# Deployment Checklist

Checklist singkat sebelum aplikasi dipakai client sekolah.

## Supabase

- Jalankan semua SQL di folder `supabase/migrations` secara berurutan dari 0001 sampai 0006.
  - `0006_settings_audit_locking.sql` membuat tabel `school_settings`, trigger audit log otomatis, dan menerapkan locking RLS pada nilai/presensi/rapor.
- Pastikan tabel utama sudah berisi seed awal: guru, santri, halaqoh, surat, jenis ujian, komponen nilai, dan predikat.
- Buat minimal satu user admin di Supabase Auth.
- Insert/update profil admin di tabel `profiles` dengan `role = 'admin'` dan `is_active = true`.
- Pastikan RLS aktif dan akun guru hanya melihat halaqoh yang diampu.

## Environment

Isi variable berikut di `.env.local` untuk development dan di Vercel Project Settings untuk production:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Catatan:

- `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` boleh dipakai browser.
- `SUPABASE_SERVICE_ROLE_KEY` hanya untuk server/API admin. Jangan ditaruh di kode client, screenshot publik, atau repository.

## Vercel

- Import project Next.js ke Vercel.
- Tambahkan semua environment variable production.
- Build command: `npm run build`.
- `next.config.ts` sudah men-include `src/lib/reports/templates/**/*` lewat `outputFileTracingIncludes` agar template DOCX rapor ikut ke runtime serverless.
- Setelah deploy, buka `/login`, masuk sebagai admin, lalu cek menu `Akun Guru`.
- Jika PWA belum update di HP, tutup aplikasi/browser lalu buka ulang agar service worker versi terbaru aktif.

## Setup Awal Setelah Deploy

1. Login sebagai admin.
2. Buka **Pengaturan → Profil Lembaga**, lengkapi nama lembaga, alamat, koordinator default, dan catatan default rapor.
3. Buka **Pengaturan → Rubrik dan Predikat**, sesuaikan porsi nilai dan rentang predikat jika berbeda dari default.
4. Buka **Master Data**, verifikasi guru, santri, halaqoh, dan anggota halaqoh.
5. Buka **Akun Guru**, buat akun untuk tiap guru (email + password minimal 8 karakter).
6. Bagikan kredensial ke tiap guru.

## Alur Uji Akhir

- Admin login dan cek Dashboard.
- Admin tambah/edit/nonaktifkan guru, santri, halaqoh, dan relasi santri-halaqoh.
- Admin buat akun guru.
- Guru login dan pastikan hanya melihat halaqoh sendiri.
- Guru input presensi, nilai tahfidz, juziyah, dan ujian lainnya.
- Rapor menampilkan progress kelengkapan.
- Cetak/download DOCX tunggal berjalan.
- ZIP Massal dan Cetak Massal memberi peringatan jika nilai belum lengkap.
- Workflow rapor: Draft → Ajukan Validasi → Validasi → Tandai Tercetak.
- Rekap presensi bulanan tampil dan bisa di-export ke CSV.
- Locking nilai/presensi: admin/koordinator dapat mengunci dan membuka kembali.
