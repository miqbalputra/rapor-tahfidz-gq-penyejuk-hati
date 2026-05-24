# PRD Aplikasi Input Data dan Cetak Rapor Tahfidz

## 1. Ringkasan Produk

Aplikasi ini dibuat untuk Griya Qur'an Penyejuk Hati Purbalingga agar proses administrasi santri, guru, halaqoh, presensi, input nilai, sampai cetak rapor Juz 29 dan Rapor Juz 30 dapat dilakukan dalam satu sistem berbasis web.

Stack yang ditargetkan:

- Frontend dan backend app: Next.js
- Database, auth, storage: Supabase Free Tier
- Hosting: Vercel Free Tier
- Output akhir utama: PDF/print-ready Rapor Juz 29 dan Rapor Juz 30 sesuai format bahan Word.

Dokumen acuan di folder `bahan`:

- `1. Presensi.docx`
- `2. Blangko penilaian tahfidz.xlsx`
- `3. Blangko penilaian ujian lainnya - tartili dll.xlsx`
- `4. Rapor Juz 29.docx`
- `5. Rapor Juz 30.docx`

## 2. Tujuan

1. Mengganti proses manual dari Word/Excel menjadi aplikasi web.
2. Menyediakan master data santri, guru, halaqoh, tahun ajaran, kelas, jilid, dan jadwal.
3. Memudahkan guru mengisi presensi dan nilai ujian.
4. Menghasilkan rapor Juz 29 dan Juz 30 yang siap dicetak.
5. Menjaga data historis per tahun ajaran dan semester.
6. Meminimalkan salah hitung nilai, predikat, dan rata-rata.

## 3. Non-Goals MVP

- Tidak wajib membuat aplikasi mobile native.
- Tidak wajib integrasi pembayaran, WhatsApp, atau tanda tangan digital legal.
- Tidak wajib memakai Supabase Edge Functions kecuali dibutuhkan untuk PDF generation.
- Tidak wajib migrasi seluruh arsip lama, tetapi sistem harus mendukung import awal dari data bahan.

## 4. Analisis Bahan

### 4.1 Presensi

File `1. Presensi.docx` berisi 12 tabel absensi halaqoh untuk Semester II Tahun Ajaran 2025/2026. Setiap halaman memiliki:

- Jenis santri: Santriwan/Santriwati
- Nama lembaga
- Semester
- Tahun ajaran
- Kelas/halaqoh
- Waktu
- Pengampu
- Tabel absensi berkolom `No`, `Nama`, beberapa kolom `Bulan`, dan `Ket`
- Kode presensi:
  - `centang`: Hadir
  - `A`: Absen/tidak hadir tanpa keterangan
  - `I`: Izin
  - `S`: Sakit

Seed halaqoh dari bahan:

| Halaqoh/Kelas | Gender | Waktu | Pengampu | Jumlah Santri |
|---|---:|---|---|---:|
| Al Huda (1.A) | Santriwan | 15.30-16.20 | Ustadz Yusuf Pujianto | 6 |
| Al-Huda (1.A) | Santriwan | 13.30-14.30 | Ustadzah Indah Muniarti | 5 |
| At-Tanzil (1.B) | Santriwati | 15.30-16.20 | Ustadzah Indah Muniarti | 9 |
| Al Furqon (2.A) | Santriwati | 14.00-15.00 | Ust. Hermawan | 8 |
| An-Nur (2.B) | Santriwati | 15.30-16.20 | Ustadzah Ghibtia Dhofa Valwa | 8 |
| Al-Bayan (3.A) | Santriwan | 16.20-17.10 | Ustadz Yusuf Pujianto | 7 |
| Al-Bayan (3.A) | Santriwan | 15.30-16.20 | Ustadz Maulidin Nafsir | 7 |
| Al-Bayan (3.A) | Santriwan | 15.30-16.20 | Ustadz Hermawan | 7 |
| Ar-Rahmah (3.B) | Santriwati | 16.20-17.10 | Ustadz Maulidin Nafsir | 7 |
| Al-Mubin (4.A) | Santriwan | 16.20-17.10 | Ustadz Hermawan | 8 |
| Asy-Syifa (4.B) | Santriwati | 16.20-17.10 | Ustadzah Indah Muniarti | 8 |
| Al-Hikmah (R.Pi) | Santriwati | 16.20-17.10 | Ustadzah Ghibtia Dhofa Valwa | 8 |

### 4.2 Blangko Penilaian Tahfidz

File `2. Blangko penilaian tahfidz.xlsx` berisi dua sheet:

1. `juz 30`
2. `juz 29`

Struktur umum:

- Identitas peserta didik
- Kelas/NIS atau kelas/jilid
- Daftar surat
- Aspek penilaian:
  - Kelancaran
  - Fashohah
  - Tajwid
  - Catatan umum
- Ketentuan nilai:
  - Total maksimal 100
  - Fashohah maksimal 25
  - Kelancaran maksimal 25
  - Tajwid maksimal 50
  - Setiap 1 kesalahan mengurangi nilai 1
  - Lulus jika total nilai minimal 85 dan kesalahan kelancaran maksimal 5 kali

Catatan khusus:

- Sheet Juz 30 pada blangko memasukkan Al-Fatihah, tetapi template rapor Juz 30 mencetak An-Naba sampai An-Nas. Aplikasi harus menyimpan konfigurasi surat per jenis ujian dan konfigurasi surat yang ditampilkan di rapor.
- Sheet Juz 29 berisi Al-Mulk sampai Al-Mursalat, ditambah baris `1 JUZ` untuk ujian juziyah.

### 4.3 Blangko Ujian Lainnya

File `3. Blangko penilaian ujian lainnya - tartili dll.xlsx` berisi sheet:

| Sheet | Jenis Ujian | Komponen Nilai | Maksimal |
|---|---|---|---:|
| Tartili | Ujian tartili per baris | Kelancaran, Fashohah, Tajwid | 100 |
| Do'a | Ujian PAS doa | Kelancaran, Fasohah, Makna | 90 |
| Hadits | Ujian PAS hadits | Kelancaran, Fasohah, Makna | 90 |
| Wudhu | Ujian praktik wudhu | Ketepatan, Ketertiban, Do'a | 90 |
| Sholat | Ujian praktik sholat | Ketepatan, Ketertiban, Tuma'ninah, Bacaan | 90 |

Temuan validasi:

- Pada sheet Do'a/Hadits, Wudhu, dan Sholat, total maksimal tertulis 90, tetapi ambang predikat memakai angka 91 atau 95. Ini harus dibuat sebagai konfigurasi dan perlu dikonfirmasi ke sekolah sebelum rumus dikunci.

### 4.4 Rapor Juz 29

File `4. Rapor Juz 29.docx` adalah template cetak laporan hasil belajar tahfizul Quran.

Field yang dibutuhkan:

- Nama santri
- Jilid
- Kelas
- Semester
- Tahun ajaran
- Nilai setoran per surat:
  - Kelancaran
  - Fashohah
  - Tajwid
  - Nilai total
- Nilai juziyah:
  - Juz
  - Kelancaran
  - Fashohah
  - Tajwid
  - Rata-rata
  - Predikat per aspek dan rata-rata
- Catatan
- Tanggal rapor
- Koordinator Griya Qur'an
- Wali kelas
- Wali santri

Daftar surat Rapor Juz 29:

1. Q.S Al-Mulk
2. Q.S Al-Qalam
3. Q.S Al-Haqqah
4. Q.S Al-Ma'arij
5. Q.S Nuh
6. Q.S Al-Jin
7. Q.S Al-Muzzammil
8. Q.S Al-Muddatsir
9. Q.S Al-Qiyamah
10. Q.S Al-Insan
11. Q.S Al-Mursalat

Predikat rapor:

| Rentang | Predikat |
|---:|---|
| >= 95 | Mumtaz (Sempurna) |
| 90-94,9 | Jayyid Jiddan (Baik Sekali) |
| 86-89,9 | Jayyid (Baik) |
| <= 85 | Maqbul (Cukup) |

### 4.5 Rapor Juz 30

File `5. Rapor Juz 30.docx` adalah template cetak laporan hasil belajar untuk Juz 30.

Field yang dibutuhkan sama dengan Rapor Juz 29, tetapi daftar surat berbeda.

Daftar surat Rapor Juz 30:

1. Q.S An-Naba
2. Q.S An-Nazi'at
3. Q.S 'Abasa
4. Q.S At-Takwir
5. Q.S Al-Infithar
6. Q.S Al-Muthaffifin
7. Q.S Al-Insyiqaq
8. Q.S Al-Buruj
9. Q.S At-Thariq
10. Q.S Al-A'la
11. Q.S Al-Ghasyiyah
12. Q.S Al-Fajr
13. Q.S Al-Balad
14. Q.S Asy-Syams
15. Q.S Al-Lail
16. Q.S Ad-Dhuha
17. Q.S Al-Insyirah
18. Q.S At-Tin
19. Q.S Al-'Alaq
20. Q.S Al-Qadr
21. Q.S Al-Bayyinah
22. Q.S Az-Zalzalah
23. Q.S Al-'Adiyat
24. Q.S Al-Qari'ah
25. Q.S At-Takatsur
26. Q.S Al-'Ashr
27. Q.S Al-Humazah
28. Q.S Al-Fil
29. Q.S Quraisy
30. Q.S Al-Ma'un
31. Q.S Al-Kautsar
32. Q.S Al-Kafirun
33. Q.S An-Nasr
34. Q.S Al-Lahab
35. Q.S Al-Ikhlas
36. Q.S Al-Falaq
37. Q.S An-Nas

## 5. Pengguna dan Hak Akses

| Role | Hak Akses |
|---|---|
| Admin | Mengelola seluruh master data, user, konfigurasi nilai, import/export, dan rapor |
| Koordinator | Melihat semua halaqoh, mengunci nilai, mencetak rapor, mengelola catatan dan tanda tangan |
| Guru/Pengampu | Mengisi presensi dan nilai untuk halaqoh yang diampu |
| Wali Kelas | Melihat data kelas, validasi rapor, mengisi catatan jika diberi izin |
| Viewer/Operator | Membantu input data sesuai izin terbatas |

Hak akses harus menggunakan Supabase Auth dan Row Level Security.

## 6. Menu Aplikasi

### 6.1 Dashboard

Isi dashboard:

- Ringkasan jumlah santri aktif
- Jumlah guru/pengampu
- Jumlah halaqoh aktif
- Status input presensi bulan berjalan
- Status input nilai tahfidz
- Status rapor: draft, siap validasi, tervalidasi, tercetak
- Filter tahun ajaran dan semester

### 6.2 Master Data

Submenu:

1. Data Santri
2. Data Guru
3. Data Halaqoh/Kelas
4. Data Tahun Ajaran dan Semester
5. Data Jilid
6. Data Surat/Juz
7. Data Jenis Ujian
8. Data Rubrik Penilaian
9. Data Predikat

### 6.3 Data Santri

Field minimal:

- NIS atau nomor induk internal
- Nama lengkap
- Nama panggilan
- Gender
- Tempat lahir
- Tanggal lahir
- Nama wali/orang tua
- Nomor HP wali
- Alamat
- Status aktif/nonaktif/lulus/pindah
- Halaqoh aktif
- Kelas
- Jilid
- Catatan khusus

Fitur:

- Tambah/edit/hapus non-destruktif
- Pencarian dan filter
- Import CSV/XLSX
- Riwayat perpindahan halaqoh
- Export data santri

### 6.4 Data Guru

Field minimal:

- Nama lengkap
- Sapaan/gelar, contoh: Ustadz, Ustadzah
- Nomor HP
- Email/login
- Role
- Status aktif
- Tanda tangan digital opsional

Guru dari bahan:

- Ustadz Yusuf Pujianto
- Ustadzah Indah Muniarti
- Ustadzah Ghibtia Dhofa Valwa
- Ustadz Hermawan
- Ustadz Maulidin Nafsir

### 6.5 Data Halaqoh/Kelas

Field minimal:

- Nama halaqoh
- Level/kelas, contoh 1.A, 2.A, 4.B
- Gender kelompok
- Tahun ajaran
- Semester
- Jadwal mulai
- Jadwal selesai
- Pengampu utama
- Pengampu cadangan
- Status aktif

Fitur:

- Assign santri ke halaqoh
- Assign guru ke halaqoh
- Riwayat perubahan pengampu
- Cetak daftar santri

### 6.6 Presensi

Fitur:

- Input presensi per tanggal/pertemuan
- Mode cepat per halaqoh dengan daftar santri
- Status: Hadir, Absen, Izin, Sakit
- Catatan presensi
- Rekap per bulan dan semester
- Export/cetak format presensi seperti bahan

Aturan:

- Guru hanya dapat mengisi halaqoh yang diampu.
- Admin/koordinator dapat membuka koreksi presensi.
- Perubahan setelah dikunci harus masuk audit log.

### 6.7 Penilaian Tahfidz

Submenu:

1. Input Nilai Juz 29
2. Input Nilai Juz 30
3. Input Nilai Juziyah
4. Rekap Nilai Tahfidz

Field input per surat:

- Santri
- Tahun ajaran
- Semester
- Juz
- Surat
- Kelancaran jumlah salah
- Nilai kelancaran
- Fashohah:
  - Makharijul huruf
  - Mura'atul huruf
  - Mura'atul harokat
  - Nilai fashohah
- Tajwid:
  - Ahkamul huruf
  - Madd wal qashr
  - Al-waqfu wal ibtida
  - Nilai tajwid
- Total nilai
- Catatan per surat
- Status lulus/belum lulus

Rumus default:

- Kelancaran maksimal 25
- Fashohah maksimal 25
- Tajwid maksimal 50
- Total maksimal 100
- Total = kelancaran + fashohah + tajwid
- Lulus ujian jika total >= 85 dan jumlah salah kelancaran <= 5

Nilai juziyah:

- Input per santri dan juz
- Komponen: kelancaran, fashohah, tajwid, rata-rata
- Rata-rata dapat dihitung dari nilai setoran atau diisi manual jika sekolah memakai ujian juziyah terpisah
- Predikat dihitung otomatis dari konfigurasi predikat

### 6.8 Ujian Lainnya

Submenu:

1. Tartili
2. Do'a
3. Hadits
4. Wudhu
5. Sholat

Fitur:

- Input nilai per santri atau mass input per halaqoh
- Rubrik berbeda per jenis ujian
- Total otomatis
- Predikat otomatis
- Catatan dan nama penguji
- Cetak blangko atau rekap

Rubrik default:

| Jenis | Komponen | Total |
|---|---|---:|
| Tartili | 10 baris, nilai per baris 10, salah mengurangi nilai | 100 |
| Do'a | Kelancaran 30, Fasohah 30, Makna 30 | 90 |
| Hadits | Kelancaran 30, Fasohah 30, Makna 30 | 90 |
| Wudhu | Ketepatan 40, Ketertiban 40, Do'a 10 | 90 |
| Sholat | Ketepatan 30, Ketertiban 30, Tuma'ninah 30, Bacaan opsional sesuai klarifikasi | 90 |

Catatan implementasi:

- Karena bahan memiliki ambang predikat yang tidak selalu selaras dengan total maksimal 90, semua rubrik dan predikat harus disimpan sebagai konfigurasi, bukan hardcode.

### 6.9 Rapor

Submenu:

1. Rapor Juz 29
2. Rapor Juz 30
3. Validasi Rapor
4. Cetak Massal
5. Arsip Rapor

Status rapor:

- Draft
- Menunggu validasi
- Perlu revisi
- Tervalidasi
- Tercetak/terarsip

Fitur Rapor Juz 29:

- Pilih tahun ajaran, semester, halaqoh, santri
- Ambil nilai setoran Juz 29
- Ambil nilai juziyah Juz 29
- Hitung predikat otomatis
- Isi/edit catatan rapor
- Preview rapor
- Download PDF
- Cetak satuan atau massal

Fitur Rapor Juz 30:

- Sama seperti Rapor Juz 29
- Daftar surat mengikuti template Juz 30 dari An-Naba sampai An-Nas
- Al-Fatihah dari blangko tahfidz tidak dicetak di rapor kecuali sekolah meminta perubahan

Format cetak harus mengikuti template:

- Judul: LAPORAN HASIL BELAJAR TAHFIZUL QURAN
- Nama lembaga: GRIYA QUR'AN PENYEJUK HATI PURBALINGGA
- Tahun ajaran
- Alamat lembaga
- Identitas santri
- Tabel Nilai Setoran
- Tabel Nilai Juziyah
- Catatan
- Keterangan target dan predikat
- Tanda tangan Koordinator, Wali Kelas, Wali Santri

### 6.10 Pengaturan

Submenu:

- Profil lembaga
- Logo lembaga
- Alamat
- Tahun ajaran aktif
- Semester aktif
- Template rapor
- Tanggal rapor default
- Nama koordinator
- Konfigurasi predikat
- Konfigurasi rubrik nilai
- Backup/export data

### 6.11 Pengaturan Rubrik dan Porsi Nilai

Menu ini wajib ada agar aturan nilai tidak di-hardcode. Admin/koordinator harus dapat mengatur porsi nilai langsung dari aplikasi tanpa edit kode.

Fitur:

- Kelola jenis ujian, contoh: Tahfidz Juz 29, Tahfidz Juz 30, Juziyah, Tartili, Do'a, Hadits, Wudhu, Sholat.
- Kelola komponen nilai per jenis ujian.
- Atur nama komponen, porsi/maksimal nilai, urutan tampil, dan status aktif.
- Atur subkomponen jika dibutuhkan, contoh:
  - Fashohah: Makharijul huruf, Mura'atul huruf, Mura'atul harokat.
  - Tajwid: Ahkamul huruf, Madd wal qashr, Al-waqfu wal ibtida.
- Atur cara input komponen:
  - Input nilai langsung.
  - Input jumlah salah lalu sistem mengurangi dari nilai maksimal.
  - Input per baris/per item lalu sistem menjumlahkan.
- Atur rumus total:
  - Jumlah semua komponen.
  - Rata-rata beberapa komponen.
  - Manual override oleh koordinator.
- Atur syarat lulus, contoh:
  - Total minimal 85.
  - Kesalahan kelancaran maksimal 5.
  - Semua surat wajib sudah dinilai.
- Atur rentang predikat per jenis ujian atau global.
- Preview simulasi nilai: admin memasukkan contoh nilai dan sistem menampilkan total, status lulus, dan predikat.
- Versi aturan nilai: perubahan rubrik baru berlaku untuk penilaian berikutnya dan tidak otomatis mengubah rapor yang sudah divalidasi, kecuali admin menjalankan hitung ulang.

Contoh konfigurasi default dari bahan:

| Jenis Ujian | Komponen | Porsi Default | Dapat Diubah |
|---|---|---:|---|
| Tahfidz Juz 29/30 | Kelancaran | 25 | Ya |
| Tahfidz Juz 29/30 | Fashohah | 25 | Ya |
| Tahfidz Juz 29/30 | Tajwid | 50 | Ya |
| Do'a/Hadits | Kelancaran | 30 | Ya |
| Do'a/Hadits | Fasohah | 30 | Ya |
| Do'a/Hadits | Makna | 30 | Ya |
| Wudhu | Ketepatan | 40 | Ya |
| Wudhu | Ketertiban | 40 | Ya |
| Wudhu | Do'a | 10 | Ya |
| Sholat | Ketepatan | 30 | Ya |
| Sholat | Ketertiban | 30 | Ya |
| Sholat | Tuma'ninah/Bacaan | Sesuai keputusan sekolah | Ya |

## 7. Alur Kerja Step by Step

### 7.1 Setup Awal Admin

1. Admin login.
2. Admin mengisi profil lembaga.
3. Admin membuat tahun ajaran dan semester aktif.
4. Admin menginput data guru.
5. Admin menginput data halaqoh/kelas dan jadwal.
6. Admin menginput atau import data santri.
7. Admin assign santri ke halaqoh.
8. Admin mengatur rubrik nilai dan predikat.
9. Admin mengatur tanggal rapor dan nama koordinator.

### 7.2 Input Presensi

1. Guru login.
2. Guru membuka menu Presensi.
3. Guru memilih halaqoh dan tanggal pertemuan.
4. Sistem menampilkan daftar santri aktif.
5. Guru mengisi status Hadir/Absen/Izin/Sakit.
6. Guru menyimpan presensi.
7. Sistem menampilkan rekap kehadiran per santri.
8. Koordinator dapat mengunci presensi per bulan/semester.

### 7.3 Input Nilai Tahfidz Per Surat

1. Guru membuka Penilaian Tahfidz.
2. Guru memilih Juz 29 atau Juz 30.
3. Guru memilih halaqoh dan santri.
4. Sistem menampilkan daftar surat sesuai juz.
5. Guru mengisi nilai kelancaran, fashohah, tajwid, dan catatan.
6. Sistem menghitung total nilai dan status lulus.
7. Guru menyimpan nilai.
8. Sistem menandai surat selesai dinilai.

### 7.4 Input Nilai Juziyah

1. Guru/koordinator membuka Input Nilai Juziyah.
2. Pilih santri, juz, tahun ajaran, semester.
3. Isi kelancaran, fashohah, tajwid.
4. Sistem menghitung rata-rata.
5. Sistem menghitung predikat.
6. Simpan.

### 7.5 Input Ujian Lainnya

1. Guru memilih jenis ujian: Tartili, Do'a, Hadits, Wudhu, atau Sholat.
2. Guru memilih halaqoh dan santri.
3. Sistem menampilkan rubrik sesuai jenis ujian.
4. Guru mengisi nilai.
5. Sistem menghitung total dan predikat.
6. Guru menyimpan nilai.
7. Data tersedia untuk rekap internal.

### 7.6 Generate Rapor

1. Koordinator membuka menu Rapor.
2. Pilih Juz 29 atau Juz 30.
3. Pilih tahun ajaran, semester, halaqoh, dan santri.
4. Sistem mengambil data identitas santri.
5. Sistem mengambil nilai setoran per surat.
6. Sistem mengambil nilai juziyah.
7. Sistem menghitung predikat.
8. Koordinator mengisi atau memilih template catatan.
9. Sistem menampilkan preview rapor.
10. Koordinator validasi.
11. Sistem menghasilkan PDF.
12. PDF dapat diunduh atau dicetak.

### 7.7 Cetak Massal

1. Koordinator memilih jenis rapor dan halaqoh.
2. Sistem menampilkan daftar santri beserta status kelengkapan data.
3. Koordinator memilih santri yang siap dicetak.
4. Sistem generate PDF massal.
5. Sistem menyimpan arsip cetak per santri.

## 8. Kebutuhan Fungsional

### FR-001 Auth dan Role

Sistem harus menyediakan login berbasis email/password atau magic link melalui Supabase Auth. Setiap user harus memiliki role dan hak akses.

### FR-002 Master Santri

Sistem harus menyediakan pengelolaan data santri dengan status aktif dan riwayat halaqoh.

### FR-003 Master Guru

Sistem harus menyediakan pengelolaan data guru dan penempatan guru ke halaqoh.

### FR-004 Master Halaqoh

Sistem harus menyediakan pengelolaan halaqoh, jadwal, kelas, gender, pengampu, dan daftar santri.

### FR-005 Presensi

Sistem harus menyediakan input presensi per pertemuan dan rekap presensi.

### FR-006 Penilaian Tahfidz

Sistem harus menyediakan input nilai tahfidz Juz 29 dan Juz 30 per surat.

### FR-007 Penilaian Juziyah

Sistem harus menyediakan input nilai juziyah per santri dan juz.

### FR-008 Ujian Lainnya

Sistem harus menyediakan input nilai Tartili, Do'a, Hadits, Wudhu, dan Sholat.

### FR-009 Predikat

Sistem harus menghitung predikat otomatis berdasarkan konfigurasi rentang nilai.

### FR-010 Konfigurasi Porsi Nilai

Sistem harus menyediakan halaman pengaturan untuk mengubah porsi/maksimal komponen nilai, rumus total, syarat lulus, dan rentang predikat per jenis ujian tanpa perubahan kode.

### FR-011 Rapor Juz 29

Sistem harus menghasilkan Rapor Juz 29 sesuai template bahan.

### FR-012 Rapor Juz 30

Sistem harus menghasilkan Rapor Juz 30 sesuai template bahan.

### FR-013 Validasi dan Locking

Sistem harus mendukung penguncian data nilai dan rapor agar tidak berubah tanpa otorisasi.

### FR-014 Export dan Print

Sistem harus mendukung export PDF, print browser, dan arsip rapor.

### FR-015 Audit Log

Sistem harus mencatat perubahan penting: nilai, presensi, validasi rapor, dan pembukaan lock.

## 9. Kebutuhan Non-Fungsional

- Responsive untuk laptop dan tablet.
- Ringan agar cocok dengan Vercel dan Supabase Free Tier.
- Semua query utama harus difilter berdasarkan tahun ajaran/semester.
- PDF harus konsisten saat dicetak di A4.
- Data sensitif santri hanya dapat diakses oleh role yang berwenang.
- Semua perubahan nilai harus memiliki jejak audit.
- Aplikasi harus tetap usable dengan koneksi internet sekolah yang tidak selalu stabil.

## 10. Model Data Awal

### 10.1 Tabel `profiles`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | FK ke auth.users |
| full_name | text | Nama user |
| role | text | admin, koordinator, guru, wali_kelas, viewer |
| teacher_id | uuid nullable | Link ke guru jika user adalah guru |
| is_active | boolean | Status akun |
| created_at | timestamptz | Dibuat |

### 10.2 Tabel `students`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| nis | text nullable | NIS/nomor induk |
| full_name | text | Nama santri |
| nickname | text nullable | Nama panggilan |
| gender | text | male/female |
| birth_place | text nullable | Tempat lahir |
| birth_date | date nullable | Tanggal lahir |
| guardian_name | text nullable | Nama wali |
| guardian_phone | text nullable | HP wali |
| address | text nullable | Alamat |
| status | text | active/inactive/graduated/transferred |
| created_at | timestamptz | Dibuat |

### 10.3 Tabel `teachers`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| full_name | text | Nama guru |
| title | text nullable | Ustadz/Ustadzah |
| phone | text nullable | Nomor HP |
| email | text nullable | Email |
| signature_url | text nullable | Tanda tangan |
| is_active | boolean | Status |

### 10.4 Tabel `academic_years`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| name | text | Contoh 2025/2026 |
| is_active | boolean | Tahun ajaran aktif |

### 10.5 Tabel `semesters`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| academic_year_id | uuid | FK |
| name | text | I (Gasal), II (Genap) |
| start_date | date nullable | Mulai |
| end_date | date nullable | Selesai |
| is_active | boolean | Semester aktif |

### 10.6 Tabel `classes`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| name | text | 1.A, 4.B, R.Pi |
| display_name | text | Nama tampil |
| level | text nullable | Level kelas |

### 10.7 Tabel `halaqohs`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| name | text | Al-Huda, At-Tanzil, dst |
| class_id | uuid nullable | FK kelas |
| gender | text | male/female/mixed |
| academic_year_id | uuid | FK |
| semester_id | uuid | FK |
| teacher_id | uuid | Pengampu |
| start_time | time nullable | Jam mulai |
| end_time | time nullable | Jam selesai |
| is_active | boolean | Status |

### 10.8 Tabel `student_halaqohs`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| student_id | uuid | FK santri |
| halaqoh_id | uuid | FK halaqoh |
| academic_year_id | uuid | FK |
| semester_id | uuid | FK |
| joined_at | date nullable | Tanggal masuk |
| left_at | date nullable | Tanggal keluar |
| is_active | boolean | Aktif |

### 10.9 Tabel `attendance_sessions`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| halaqoh_id | uuid | FK |
| session_date | date | Tanggal |
| topic | text nullable | Materi |
| locked_at | timestamptz nullable | Waktu lock |
| created_by | uuid | User pembuat |

### 10.10 Tabel `attendance_records`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| session_id | uuid | FK |
| student_id | uuid | FK |
| status | text | present/absent/permission/sick |
| note | text nullable | Catatan |

### 10.11 Tabel `surahs`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| juz | int | 29 atau 30 |
| sort_order | int | Urutan rapor |
| name_latin | text | Nama surat latin |
| name_arabic | text nullable | Nama Arab |
| show_in_report | boolean | Tampil di rapor |

### 10.12 Tabel `assessment_types`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| code | text | tahfidz_juz29, tahfidz_juz30, tartili, doa, hadits, wudhu, sholat |
| name | text | Nama ujian |
| max_score | numeric | Nilai maksimal |
| total_formula | text | sum, average, manual |
| passing_min_score | numeric nullable | Nilai minimal lulus |
| max_fluency_mistakes | int nullable | Batas salah kelancaran jika berlaku |
| applies_to_report | boolean | Dipakai pada rapor |
| version | int | Versi aturan |
| is_active | boolean | Status |

### 10.13 Tabel `assessment_components`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| assessment_type_id | uuid | FK |
| parent_component_id | uuid nullable | Untuk subkomponen |
| code | text | kelancaran, fashohah, tajwid, dst |
| name | text | Nama komponen |
| max_score | numeric | Nilai maksimal |
| input_mode | text | direct_score, mistake_deduction, per_item |
| deduction_per_mistake | numeric nullable | Pengurang per kesalahan |
| is_required | boolean | Wajib diisi |
| sort_order | int | Urutan |

### 10.14 Tabel `assessment_rules`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| assessment_type_id | uuid | FK jenis ujian |
| rule_key | text | total_formula, passing_rule, report_display, dll |
| rule_value | jsonb | Konfigurasi fleksibel |
| version | int | Versi aturan |
| is_active | boolean | Status |

### 10.15 Tabel `tahfidz_scores`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| student_id | uuid | FK |
| surah_id | uuid | FK |
| academic_year_id | uuid | FK |
| semester_id | uuid | FK |
| fluency_mistakes | int nullable | Jumlah salah kelancaran |
| fluency_score | numeric | Nilai kelancaran |
| fashohah_score | numeric | Nilai fashohah |
| tajwid_score | numeric | Nilai tajwid |
| total_score | numeric | Total |
| passed | boolean | Status lulus |
| note | text nullable | Catatan |
| assessed_by | uuid | Guru |
| assessment_type_id | uuid | FK rubrik yang dipakai |
| assessment_version | int | Versi rubrik saat nilai dibuat |
| locked_at | timestamptz nullable | Lock |

### 10.16 Tabel `juziyah_scores`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| student_id | uuid | FK |
| juz | int | 29/30 |
| academic_year_id | uuid | FK |
| semester_id | uuid | FK |
| fluency_score | numeric | Kelancaran |
| fashohah_score | numeric | Fashohah |
| tajwid_score | numeric | Tajwid |
| average_score | numeric | Rata-rata |
| predicate | text | Predikat |
| note | text nullable | Catatan |
| assessed_by | uuid | Guru |
| assessment_type_id | uuid | FK rubrik yang dipakai |
| assessment_version | int | Versi rubrik saat nilai dibuat |

### 10.17 Tabel `other_exam_scores`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| student_id | uuid | FK |
| assessment_type_id | uuid | FK |
| academic_year_id | uuid | FK |
| semester_id | uuid | FK |
| payload | jsonb | Nilai komponen fleksibel |
| total_score | numeric | Total |
| predicate | text | Predikat |
| note | text nullable | Catatan |
| assessed_by | uuid | Guru |
| assessment_version | int | Versi rubrik saat nilai dibuat |

### 10.18 Tabel `predicate_rules`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| assessment_type_id | uuid nullable | Bisa global atau per ujian |
| min_score | numeric nullable | Batas bawah |
| max_score | numeric nullable | Batas atas |
| label | text | Mumtaz/Jayyid/etc |
| description | text | Terjemahan |
| sort_order | int | Urutan |

### 10.19 Tabel `report_cards`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| student_id | uuid | FK |
| juz | int | 29/30 |
| academic_year_id | uuid | FK |
| semester_id | uuid | FK |
| report_date | date | Tanggal rapor |
| note | text | Catatan |
| coordinator_name | text | Nama koordinator |
| homeroom_teacher_name | text | Nama wali kelas |
| status | text | draft/validated/printed |
| pdf_url | text nullable | Arsip PDF |
| validated_by | uuid nullable | Validator |
| validated_at | timestamptz nullable | Waktu validasi |

### 10.20 Tabel `audit_logs`

| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid | Primary key |
| actor_id | uuid | User |
| entity_type | text | Nama tabel/entity |
| entity_id | uuid | ID data |
| action | text | create/update/delete/lock/unlock/print |
| before | jsonb nullable | Data sebelum |
| after | jsonb nullable | Data sesudah |
| created_at | timestamptz | Waktu |

## 11. RLS dan Keamanan

RLS wajib aktif untuk tabel utama.

Aturan minimal:

- Admin dapat membaca dan menulis semua data.
- Koordinator dapat membaca semua data akademik dan mengunci/memvalidasi rapor.
- Guru hanya dapat melihat santri pada halaqoh yang diampu.
- Guru hanya dapat mengubah presensi dan nilai pada halaqoh yang diampu sebelum data dikunci.
- Viewer hanya dapat membaca data yang diberikan.
- Audit log tidak boleh diedit dari client.

## 12. Desain UI

Prinsip UI:

- Dashboard dan tabel data harus padat, rapi, dan cepat dipindai.
- Input nilai harus mendukung keyboard navigation.
- Gunakan filter tahun ajaran, semester, halaqoh, dan santri di halaman akademik.
- Form nilai massal harus mirip spreadsheet tetapi tetap divalidasi.
- Preview rapor harus tampil sebelum cetak.
- Gunakan layout sidebar:
  - Dashboard
  - Master Data
  - Presensi
  - Penilaian Tahfidz
  - Ujian Lainnya
  - Rapor
  - Pengaturan

## 13. PDF dan Cetak Rapor

Opsi teknis yang disarankan:

1. Render template rapor sebagai halaman Next.js khusus print.
2. Gunakan CSS `@media print` untuk ukuran A4.
3. Untuk download PDF:
   - MVP: browser print to PDF.
   - Lanjutan: server-side PDF generation memakai Playwright/Puppeteer jika masih aman untuk limit Vercel, atau Supabase Storage untuk menyimpan hasil.

Ketentuan format:

- Ukuran kertas A4.
- Margin mengikuti template Word.
- Tabel nilai setoran harus muat dalam satu atau beberapa halaman tanpa terpotong.
- Rapor Juz 30 harus tetap terbaca walaupun memiliki 37 surat.
- Font dan border meniru template bahan.

## 14. Seed Data Awal

### 14.1 Santri dari Presensi

Daftar santri awal diambil dari 12 halaqoh pada file presensi. Saat import, normalisasi perlu dilakukan karena ada variasi penulisan seperti:

- `Al Huda` dan `Al-Huda`
- `An-Nur (2.b)` menjadi `An-Nur (2.B)`
- `Ustazah` dan `Ustadzah`
- Spasi/titik pada nama santri

Daftar seed santri per halaqoh:

| Halaqoh | Santri |
|---|---|
| Al Huda (1.A), Ustadz Yusuf Pujianto | Azril Nur Hidayat; Keander RayyanHerlandi; Kelvin Adnan Permana; Muhammad Denish Syauqi El Mahdi; Muhammad Syafiq Yudistira; Nohan Andreas Pradika |
| Al-Huda (1.A), Ustadzah Indah Muniarti | Denara Nada .P; Haidar Tiyan Nizam; Hanan Anandito; Huda Al Fatih; Usamah Raqila .Y |
| At-Tanzil (1.B), Ustadzah Indah Muniarti | Adiba Shaqilah; Anin Taqrim; Ansellma Sheika; Aretha Kanza; Azizah Putri N.; Fadiyah Syafiqoh; Farra Shhia N.; Lutfia Giza; Nawang Senja |
| Al Furqon (2.A), Ust. Hermawan | Adzkiya Althafunnisa; Alesha Nayla Putri; Alifia Yumna; Andhara kirana Mahestri; Najwa Kirania Oktavia; Nufah Nur Afifah; Sri Rahma Anggiyana. N; Tsabita Sofwa Nur Zahidah |
| An-Nur (2.B), Ustadzah Ghibtia Dhofa Valwa | Asyifah putri Ramadhani; Insyira Fauziah Ahmad; Kinaria Maurdha Alena; Marwa Ashafa; Naqiya Rofi'atul Aulia; Nur Riska Bela; Sabiya Nadhifah; Vioneta Rachmatya Rizki |
| Al-Bayan (3.A), Ustadz Yusuf Pujianto | Abrisam Veldy Javas Wistara; Arya yoga Dwi Saputra; Azzam Abid Hanan; Gusti Putra Bramasta; Hafidz isya Ananta; Muhammad Arfi; Ziyan Dhiyaul Haq |
| Al-Bayan (3.A), Ustadz Maulidin Nafsir | Abqari Annar Hadyan Pranaja; Al Khalifi Dzikra Faith; Anis Rahmat Nurrodja; Anung Hanindito Nareswara; Genji Yafiq Hamizan; Muhammad Ulul Azmi; Naafis Tian Ahir R |
| Al-Bayan (3.A), Ustadz Hermawan | Aditiya Desta Maulana; Ata Fardhan Al Ghifari; Daryl Gibran Alvaro; Faqih Masaid Nurrodja; Muhammad Fikri; Muhammad Ukasyah uwais; Zivkan Akbar |
| Ar-Rahmah (3.B), Ustadz Maulidin Nafsir | Aisya Syifa Alinarohman; Almira Aulia Salasa; Arfela Aliqa Dzahin; Asri Nurivah; Isna Aulia Rahmatika; Qiana Aysila Syafani; Siti Maisaroh |
| Al-Mubin (4.A), Ustadz Hermawan | Ades Widianto; Bisma Dwi Haryanto; Haikal Ar-rahim; Hamba Ramadhana; Mafi Maulana; Muhammad Nur Faeyza; Tomi Puji Nurrohman; Toni Puji Nurrohim |
| Asy-Syifa (4.B), Ustadzah Indah Muniarti | Afifah Khoirunnisa Salsabila; Anna Nur Farizki; Asyla Aulia; Faiha Ardelia; Faizah Nur .R; Messi Kanza .A; Vesa Talita .R; Xasya Ufayroh |
| Al-Hikmah (R.Pi), Ustadzah Ghibtia Dhofa Valwa | Akilah Fabiana Clarissa; Aulia Nur Salsabila; Flora Oktavia; Hayfa Khanza Purnomo; Khansa Anindita Carissa; Salsabila izzatullatifah; Vanya Celena Naradita P; Wulan Purbodjati |

### 14.2 Surat Juz 29 dan Juz 30

Data surat harus di-seed ke tabel `surahs` dengan urutan sesuai rapor. Nama Arab dari blangko Excel dapat disimpan sebagai field tambahan untuk tampilan blangko ujian.

### 14.3 Predikat Default

Predikat tahfidz/rapor:

| Min | Max | Label |
|---:|---:|---|
| 95 | 100 | Mumtaz (Sempurna) |
| 90 | 94.9 | Jayyid Jiddan (Baik Sekali) |
| 86 | 89.9 | Jayyid (Baik) |
| 0 | 85 | Maqbul (Cukup) |

Predikat ujian praktik harus dikonfirmasi ulang karena konflik antara total maksimal dan ambang predikat pada bahan.

## 15. Validasi Data

Validasi wajib:

- Nama santri wajib.
- Gender santri wajib.
- Tahun ajaran dan semester wajib pada semua data akademik.
- Nilai tidak boleh melebihi maksimal komponen.
- Total harus sama dengan jumlah komponen.
- Jika nilai terkunci, hanya admin/koordinator yang bisa membuka.
- Rapor tidak dapat divalidasi jika nilai surat wajib belum lengkap.
- Rapor tidak dapat dicetak massal jika status belum tervalidasi, kecuali admin mengaktifkan override.

## 16. Acceptance Criteria MVP

MVP dianggap selesai jika:

1. Admin bisa login dan mengelola santri, guru, halaqoh, tahun ajaran, semester.
2. Guru bisa mengisi presensi per halaqoh.
3. Guru bisa mengisi nilai tahfidz Juz 29 dan Juz 30.
4. Guru/koordinator bisa mengisi nilai juziyah.
5. Sistem menghitung total nilai dan predikat otomatis.
6. Koordinator bisa preview Rapor Juz 29.
7. Koordinator bisa preview Rapor Juz 30.
8. Rapor bisa dicetak/download PDF.
9. Data tersimpan di Supabase dengan RLS.
10. Aplikasi dapat dideploy ke Vercel Free Tier.
11. Admin/koordinator bisa mengubah porsi nilai, syarat lulus, dan predikat dari menu Pengaturan tanpa edit kode.

## 17. Tahapan Implementasi

### Phase 1 - Fondasi

1. Setup Next.js, TypeScript, Tailwind, Supabase client.
2. Setup Supabase project.
3. Buat schema database dan migration.
4. Setup Supabase Auth dan role profile.
5. Buat layout aplikasi dan dashboard dasar.

### Phase 2 - Master Data

1. Kelola tahun ajaran dan semester.
2. Kelola guru.
3. Kelola santri.
4. Kelola kelas/halaqoh.
5. Assign santri dan guru ke halaqoh.
6. Seed data dari bahan.

### Phase 3 - Presensi

1. Buat halaman input presensi.
2. Buat rekap presensi bulanan/semester.
3. Buat fitur lock presensi.
4. Buat export/cetak presensi sederhana.

### Phase 4 - Penilaian

1. Seed daftar surat Juz 29 dan Juz 30.
2. Buat konfigurasi rubrik nilai.
3. Buat UI pengaturan porsi nilai, syarat lulus, dan predikat.
4. Buat input nilai tahfidz per surat.
5. Buat input nilai juziyah.
6. Buat rekap nilai.
7. Buat predikat otomatis.

### Phase 5 - Rapor

1. Buat template HTML Rapor Juz 29.
2. Buat template HTML Rapor Juz 30.
3. Buat preview rapor.
4. Buat validasi kelengkapan data.
5. Buat cetak satuan.
6. Buat cetak massal.
7. Simpan arsip PDF.

### Phase 6 - Hardening

1. Terapkan RLS penuh.
2. Audit log untuk nilai dan rapor.
3. Import/export CSV/XLSX.
4. Testing responsif.
5. Testing print A4.
6. Deploy Vercel dan Supabase production.

## 18. Risiko dan Keputusan yang Perlu Dikonfirmasi

1. Ambang predikat pada ujian selain tahfidz tidak selaras dengan total maksimal 90, sehingga MVP harus menyediakan pengaturan porsi nilai dan predikat yang dapat disesuaikan dari UI.
2. Juz 30 pada blangko tahfidz memuat Al-Fatihah, tetapi rapor hanya mencetak An-Naba sampai An-Nas.
3. Ada beberapa variasi penulisan nama guru dan kelas yang perlu dinormalisasi.
4. Perlu keputusan apakah nilai juziyah dihitung dari rata-rata nilai surat atau diinput sebagai ujian tersendiri.
5. Perlu keputusan apakah rapor harus identik 1:1 dengan Word atau cukup sangat mirip secara visual.
6. Vercel Free Tier bisa membatasi server-side PDF berat; MVP disarankan memakai print-to-PDF browser dulu.

## 19. Definition of Done

- Semua halaman MVP dapat digunakan tanpa error utama.
- Database Supabase memiliki migration dan seed.
- RLS aktif dan sudah diuji per role.
- Rapor Juz 29 dan Juz 30 dapat dipreview dan dicetak.
- Hasil cetak sudah dibandingkan dengan template bahan.
- Perhitungan nilai, rata-rata, lulus, dan predikat sudah diuji.
- Dokumentasi setup lokal dan deployment tersedia.
