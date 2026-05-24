# Rencana Pembuatan Aplikasi Rapor Tahfidz

Dokumen ini adalah rencana eksekusi pembuatan aplikasi berdasarkan `PRD.md`. Tujuannya agar development berjalan efektif, efisien, dan tidak lompat-lompat.

Stack:

- Next.js + TypeScript
- Tailwind CSS
- Supabase Auth, Database, Storage
- Vercel Free Tier

## Prinsip Eksekusi

1. Bangun dari fondasi data dulu, bukan langsung rapor.
2. Semua aturan nilai harus configurable dari menu Pengaturan.
3. Rapor Juz 29 dan Juz 30 menjadi target akhir MVP.
4. Setiap phase harus menghasilkan fitur yang bisa diuji.
5. Hindari fitur tambahan sebelum alur utama selesai: master data -> input nilai -> cetak rapor.

## Urutan Paling Efektif

### Phase 0 - Persiapan Keputusan Client

Tujuan: mengunci keputusan yang memengaruhi struktur aplikasi.

Checklist:

- Konfirmasi apakah tampilan rapor harus sama 1:1 dengan file Word atau cukup sangat mirip.
- Konfirmasi nilai juziyah:
  - dihitung otomatis dari nilai surat, atau
  - diinput manual sebagai ujian tersendiri.
- Konfirmasi aturan predikat untuk ujian dengan total maksimal 90.
- Konfirmasi apakah Al-Fatihah pada blangko Juz 30 ikut dinilai tetapi tidak tampil di rapor.
- Konfirmasi format tanggal rapor dan nama penandatangan default.

Output:

- Catatan keputusan client.
- Jika belum ada jawaban, gunakan default dari `PRD.md` dan buat semua aturan nilai configurable.

### Phase 1 - Scaffold Project

Tujuan: membuat aplikasi Next.js siap dikembangkan.

Task:

1. Buat project Next.js dengan TypeScript.
2. Setup Tailwind CSS.
3. Setup struktur folder.
4. Setup Supabase client.
5. Setup environment variable.
6. Buat layout dasar:
   - sidebar
   - topbar
   - halaman dashboard
   - halaman login
7. Setup komponen UI dasar:
   - button
   - input
   - select
   - table
   - modal
   - badge
   - toast/alert

Output:

- Aplikasi bisa dijalankan lokal.
- Halaman login dan dashboard awal tampil.
- Supabase client sudah siap dipakai.

### Phase 2 - Database Supabase dan Auth

Tujuan: membuat fondasi data dan akses user.

Task:

1. Buat migration schema utama:
   - profiles
   - students
   - teachers
   - academic_years
   - semesters
   - classes
   - halaqohs
   - student_halaqohs
   - attendance_sessions
   - attendance_records
   - surahs
   - assessment_types
   - assessment_components
   - assessment_rules
   - tahfidz_scores
   - juziyah_scores
   - other_exam_scores
   - predicate_rules
   - report_cards
   - audit_logs
2. Setup Supabase Auth.
3. Buat sistem role:
   - admin
   - koordinator
   - guru
   - wali_kelas
   - viewer
4. Buat RLS awal.
5. Buat seed awal:
   - tahun ajaran 2025/2026
   - semester I dan II
   - guru dari bahan
   - halaqoh dari bahan
   - surat Juz 29 dan Juz 30
   - rubrik default
   - predikat default

Output:

- Database siap.
- Auth dan role bekerja.
- Data awal dari bahan tersedia.

### Phase 3 - Pengelolaan Master Data

Tujuan: semua data dasar bisa dikelola dari UI.

Prioritas pengelolaan data:

1. Tahun Ajaran dan Semester
2. Guru
3. Santri
4. Kelas
5. Halaqoh
6. Assign Santri ke Halaqoh
7. Surat/Juz

Fitur wajib:

- tambah
- edit
- nonaktifkan/hapus aman
- pencarian
- filter status
- filter tahun ajaran/semester

Output:

- Admin bisa mengelola data dasar tanpa edit database manual.
- Data santri dan halaqoh siap dipakai untuk presensi dan nilai.

### Phase 4 - Pengaturan Rubrik dan Predikat

Tujuan: aturan nilai bisa diatur dari aplikasi.

Task:

1. Kelola jenis ujian:
   - Tahfidz Juz 29
   - Tahfidz Juz 30
   - Juziyah
   - Tartili
   - Do'a
   - Hadits
   - Wudhu
   - Sholat
2. Kelola komponen nilai.
3. Atur porsi/maksimal nilai tiap komponen.
4. Atur input mode:
   - nilai langsung
   - pengurangan dari jumlah salah
   - input per item/baris
5. Atur rumus total:
   - sum
   - average
   - manual
6. Atur syarat lulus.
7. Kelola rentang predikat.
8. Buat preview simulasi nilai.

Output:

- Admin/koordinator bisa mengatur porsi nilai tanpa edit kode.
- Konflik aturan nilai di bahan dapat ditangani dari UI.

### Phase 5 - Presensi

Tujuan: mengganti presensi Word menjadi input aplikasi.

Task:

1. Halaman pilih halaqoh dan tanggal.
2. Tampilkan daftar santri aktif.
3. Input status:
   - Hadir
   - Absen
   - Izin
   - Sakit
4. Simpan presensi.
5. Rekap per santri.
6. Rekap per halaqoh.
7. Lock presensi.
8. Cetak/export presensi sederhana.

Output:

- Guru bisa input presensi halaqoh.
- Koordinator bisa melihat rekap.

### Phase 6 - Input Nilai Tahfidz

Tujuan: input nilai setoran per surat untuk Juz 29 dan Juz 30.

Task:

1. Halaman pilih:
   - tahun ajaran
   - semester
   - halaqoh
   - santri
   - juz
2. Tampilkan daftar surat sesuai juz.
3. Input komponen nilai:
   - kelancaran
   - fashohah
   - tajwid
   - catatan
4. Hitung total otomatis dari rubrik aktif.
5. Hitung status lulus.
6. Hitung predikat jika dibutuhkan.
7. Simpan nilai.
8. Lock nilai.
9. Rekap kelengkapan nilai per santri.

Output:

- Nilai setoran Juz 29 dan Juz 30 lengkap dan siap dipakai rapor.

### Phase 7 - Input Nilai Juziyah

Tujuan: membuat nilai juziyah yang tampil di rapor.

Task:

1. Halaman input juziyah per santri.
2. Pilih Juz 29 atau Juz 30.
3. Input:
   - kelancaran
   - fashohah
   - tajwid
4. Hitung rata-rata.
5. Hitung predikat per aspek dan rata-rata.
6. Sediakan opsi:
   - hitung dari nilai surat
   - input manual
7. Simpan dan lock.

Output:

- Tabel Nilai Juziyah pada rapor bisa terisi.

### Phase 8 - Ujian Lainnya

Tujuan: mendukung blangko Tartili, Do'a, Hadits, Wudhu, dan Sholat.

Task:

1. Halaman pilih jenis ujian.
2. Pilih halaqoh dan santri.
3. Render form nilai berdasarkan rubrik.
4. Hitung total otomatis.
5. Hitung predikat otomatis.
6. Simpan catatan dan penguji.
7. Rekap nilai per jenis ujian.

Output:

- Semua blangko penilaian dari bahan punya padanan input di aplikasi.

Catatan:

- Phase ini boleh dikerjakan setelah rapor MVP jika waktu client terbatas, karena output akhir utama adalah Rapor Juz 29 dan Juz 30.

### Phase 9 - Rapor Juz 29

Tujuan: menghasilkan rapor Juz 29 sesuai bahan.

Task:

1. Buat halaman daftar rapor Juz 29.
2. Pilih tahun ajaran, semester, halaqoh, santri.
3. Ambil identitas santri.
4. Ambil nilai setoran Juz 29.
5. Ambil nilai juziyah Juz 29.
6. Hitung predikat.
7. Buat field catatan rapor.
8. Buat template print A4.
9. Buat preview.
10. Buat validasi kelengkapan data.
11. Buat status:
    - draft
    - menunggu validasi
    - tervalidasi
    - tercetak
12. Buat download/cetak PDF.

Output:

- Rapor Juz 29 bisa dipreview dan dicetak.

### Phase 10 - Rapor Juz 30

Tujuan: menghasilkan rapor Juz 30 sesuai bahan.

Task:

1. Gunakan pola Rapor Juz 29.
2. Ganti daftar surat menjadi An-Naba sampai An-Nas.
3. Pastikan tabel 37 surat tetap rapi di A4.
4. Ambil nilai setoran Juz 30.
5. Ambil nilai juziyah Juz 30.
6. Preview dan cetak.

Output:

- Rapor Juz 30 bisa dipreview dan dicetak.

### Phase 11 - Cetak Massal dan Arsip

Tujuan: mempercepat kerja operator/koordinator.

Task:

1. Pilih jenis rapor.
2. Pilih tahun ajaran, semester, halaqoh.
3. Tampilkan daftar santri.
4. Tampilkan status kelengkapan data.
5. Pilih santri yang akan dicetak.
6. Generate/cetak massal.
7. Simpan arsip PDF ke Supabase Storage jika memungkinkan.

Output:

- Koordinator bisa cetak banyak rapor sekaligus.

### Phase 12 - Audit, RLS, dan Hardening

Tujuan: memastikan aplikasi aman dan siap dipakai.

Task:

1. Lengkapi RLS semua tabel.
2. Audit log untuk:
   - perubahan nilai
   - perubahan presensi
   - validasi rapor
   - unlock data
   - cetak rapor
3. Validasi form.
4. Loading dan empty state.
5. Error handling.
6. Testing role guru/admin/koordinator.
7. Testing print A4.
8. Testing deploy Vercel.

Output:

- Aplikasi siap demo dan uji coba client.

## Prioritas MVP

Jika waktu terbatas, kerjakan urutan ini:

1. Auth dan role admin/guru/koordinator.
2. Kelola tahun ajaran, semester, guru, santri, halaqoh.
3. Pengaturan rubrik dan predikat.
4. Input nilai tahfidz Juz 29 dan Juz 30.
5. Input nilai juziyah.
6. Rapor Juz 29.
7. Rapor Juz 30.
8. Presensi.
9. Cetak massal.
10. Ujian lainnya.

## Urutan File/Modul yang Disarankan

Struktur awal yang disarankan:

```text
src/
  app/
    (auth)/
    (dashboard)/
      dashboard/
      master/
      presensi/
      penilaian/
      rapor/
      pengaturan/
  components/
    ui/
    layout/
    forms/
    tables/
    print/
  lib/
    supabase/
    auth/
    validations/
    scoring/
    reports/
  types/
  data/
supabase/
  migrations/
  seed.sql
```

Modul penting:

- `lib/scoring`: menghitung total, lulus, predikat.
- `lib/reports`: mengambil data dan membentuk payload rapor.
- `components/print`: template cetak Rapor Juz 29 dan Juz 30.
- `lib/validations`: validasi form dan nilai maksimal.

## Checkpoint Testing

### Setelah Phase 3

- Admin bisa membuat santri.
- Admin bisa membuat guru.
- Admin bisa membuat halaqoh.
- Santri bisa dimasukkan ke halaqoh.

### Setelah Phase 4

- Admin bisa mengubah porsi Tahfidz dari 25/25/50 menjadi nilai lain.
- Sistem menghitung total sesuai porsi baru.
- Predikat berubah sesuai konfigurasi.

### Setelah Phase 6

- Guru bisa input nilai Juz 29.
- Guru bisa input nilai Juz 30.
- Total tidak melebihi maksimal.
- Data tersimpan per tahun ajaran dan semester.

### Setelah Phase 9 dan 10

- Rapor Juz 29 tampil dengan data santri yang benar.
- Rapor Juz 30 tampil dengan data santri yang benar.
- Nilai setoran sesuai input.
- Nilai juziyah sesuai input/perhitungan.
- Predikat sesuai konfigurasi.
- Print A4 rapi.

## Hal yang Jangan Dikerjakan Terlalu Awal

- Dashboard statistik yang terlalu kompleks.
- Import Excel yang terlalu otomatis.
- WhatsApp notification.
- Tanda tangan digital canggih.
- Multi-cabang/lembaga.
- PDF server-side berat sebelum print browser stabil.

## Instruksi Lanjutan untuk Mulai Development

Saat akan mulai membuat aplikasi, baca dokumen ini bersama:

1. `PRD.md`
2. `rencana.md`

Lalu mulai dari:

1. Scaffold Next.js.
2. Setup Supabase.
3. Buat schema database.
4. Buat auth dan layout.
5. Lanjut pengelolaan master data.
