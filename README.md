# LAPORAN OMOV - Sistem Berita Acara ATM BCA

Sistem otomatisasi pembuatan Berita Acara (BA) pekerjaan mesin ATM BCA (Trade In, Replace, Aktivasi Online Baru, dan Relokasi) sebanyak 6 halaman dalam format Microsoft Word (`.docx`), identik 100% dengan dokumen acuan `BA_SAMPLE.docx`.

Aplikasi berbasis web Next.js 15 dengan dua peran pengguna (*Supervisor* dan *Tim Lapangan*), didukung fitur kompresi foto berjenjang di peramban, kapabilitas luring penuh (*offline-first* PWA via IndexedDB), studio foto canvas dengan locked aspect-ratio, integrasi arsip otomatis Google Drive, dan pembersihan terjadwal Vercel Cron.

---

## 1. Arsitektur & Alur Kerja

```
                      ┌──────────────────────────────────────┐
                      │        SUPERVISOR (Desktop)          │
                      │  - Buat Laporan Cepat (WSID, Lokasi) │
                      │  - Form Data 10 Seksi (Autosave)     │
                      │  - Review 34 Foto (Terima / Tolak)   │
                      │  - Finalisasi & Unduh Word (.docx)   │
                      └──────────────────┬───────────────────┘
                                         │ (Realtime Sync)
                                         ▼
                      ┌──────────────────────────────────────┐
                      │       TIM LAPANGAN (PWA Mobile)      │
                      │  - Klaim / Ambil Alih Lokasi         │
                      │  - Studio Kamera (Bingkai Rasio)     │
                      │  - Editor Canvas & Watermark WIB/GPS │
                      │  - Kompresi Berjenjang di HP (Tier)  │
                      │  - Antrean Pengunggahan Offline IDB  │
                      └──────────────────┬───────────────────┘
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
┌───────────────────────────────┐                       ┌───────────────────────────────┐
│     SUPABASE (BaaS / Cloud)   │                       │      GOOGLE DRIVE (Arsip)     │
│ - Database Postgres + RLS     │                       │ - Folder: LAPORAN OMOV/       │
│ - Auth (Email & Password)     │                       │           {tahun}/{bulan}/    │
│ - Storage: `laporan-foto`     │                       │ - Status Otomatis Terarsip    │
│ - Vercel Cron Pembersihan H+3 │                       │ - Unduh Manual Selalu Tersedia│
└───────────────────────────────┘                       └───────────────────────────────┘
```

---

## 2. Fitur Utama

- **Layout Berdasarkan Peran**:
  - *Supervisor (Desktop-first)*: Sidebar 240 px, beranda rekap KPI (target 13 laporan/hari), tabbed form 10 seksi dengan autosave 800 ms, kisi review 34 foto, manajemen pengguna, master data, dan pengaturan Google Drive.
  - *Tim Lapangan (Mobile-first)*: Bottom navigation dua tab (Lokasi & Antrean), target sentuh $\ge 48\text{ px}$, akordeon 7 grup slot, indikator klaim teknisi, dan modal impor banyak foto sekaligus dari galeri.
- **Studio Kamera & Editor Foto Layar Penuh (100% Client-Side Canvas)**:
  - Viewfinder kamera belakang dengan bingkai rasio terkunci (4:3, 5:6, 4:5, 7:10).
  - Zoom 1× s.d 3×, rotasi 90°, dan pelurusan halus $-15^\circ$ s.d $+15^\circ$.
  - Mode *Isi* (cover) dan Mode *Pas* (contain berlatar belakang putih).
  - Penyesuaian Kecerahan, Kontras, dan *Auto-Level* histogram persentil 1–99 (bebas bug `ctx.filter` Safari iOS).
  - Watermark resmi BCA OMOV: tanggal-jam WIB, `WSID · Lokasi`, dan koordinat GPS di atas pita gelap transparan 55%.
  - Peringatan kualitas non-blocking: deteksi foto terlalu gelap (luminans $< 45$) dan foto buram (*Variance of Laplacian* $< 100$).
- **Kompresi Berjenjang per Tier (SPEC A.10)**:
  - *Standar*: 1280 px sisi terpanjang, JPEG $q=0.78$, batas $\le 260\text{ KB}$.
  - *Detail*: 1600 px sisi terpanjang, JPEG $q=0.85$, batas $\le 450\text{ KB}$.
  - *Dokumen*: 1800 px sisi terpanjang, JPEG $q=0.85$, batas $\le 600\text{ KB}$.
  - Pembuatan thumbnail otomatis 400 px pada kualitas 0.70.
- **Offline & Upload Queue (IndexedDB)**:
  - Penyimpanan antrean lokal di IndexedDB (`idb`).
  - Sinkronisasi otomatis saat terhubung kembali ke internet dengan penanganan retry berjenjang (exponential backoff).
- **Mesin Pembangkit Word (`.docx`) & Golden Tests**:
  - Pemrosesan template bersih `template/BA_TEMPLATE.docx` bebas highlight kuning dengan tag gambar `{%foto_<key>}`.
  - Menggunakan `sharp` dengan mode `contain` latar putih `#FFFFFF` untuk mencegah foto gepeng atau terdistorsi pada sel tabel Word.
  - Penanganan otomatis reuse foto slot 34 (`ba_hdd_full` menduplikasi foto `ba_hdd`).
  - 4 Golden Tests untuk seluruh jenis pekerjaan (*Trade In*, *Replace*, *Aktivasi Online Baru*, *Relokasi*).
- **Arsip Google Drive & Vercel Cron**:
  - Unggah otomatis ke Google Drive pada folder `LAPORAN OMOV/{tahun}/{bulan Indonesia}/`.
  - Cron harian `0 18 * * *` (01:00 WIB) untuk menghapus foto storage dari laporan yang telah terarsip $> 3$ hari, melakukan keep-alive database, dan mencadangkan data mingguan setiap hari Minggu.
- **Rekap & Ekspor**:
  - Rekap laporan harian, bulanan, dan total.
  - Ekspor berkas CSV berstandar RFC 4180 berawalan UTF-8 BOM untuk kompatibilitas langsung di Microsoft Excel.
  - Ekspor cadangan sistem JSON lengkap.

---

## 3. Tech Stack

- **Framework**: Next.js 15 (App Router), React 18
- **Bahasa**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS (Design Token A.4), Lucide React
- **Backend & Database**: Supabase (PostgreSQL, Row-Level Security, Storage, Auth)
- **Pengolah Gambar & Canvas**: Canvas API, Sharp 0.33
- **Dokumen Word**: Docxtemplater, PizZip, Docxtemplater Image Module Free
- **Integrasi Cloud**: Google APIs Client Library (`googleapis`)
- **Penyimpanan Lokal**: IndexedDB (`idb`)
- **Pengujian**: Vitest

---

## 4. Instalasi & Pengaturan Lokal

### 4.1. Prasyarat
- Node.js versi 18.18 atau lebih baru.
- npm versi 9 atau lebih baru.

### 4.2. Langkah Instalasi

```bash
# 1. Klon repositori
git clone <url-repo>
cd "Dashboard Omov"

# 2. Pasang dependensi
npm install

# 3. Salin berkas lingkungan
cp .env.example .env.local
```

### 4.3. Variabel Lingkungan (`.env.local`)

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Drive OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground

# Vercel Cron Security
CRON_SECRET=your-random-cron-secret-32-chars
```

---

## 5. Pengaturan Database & Supabase

Jalankan script SQL migrasi berikut secara berurutan di SQL Editor Supabase:

1. `supabase/migrations/20261115000001_init_schema.sql`  
   *(Membuat tabel profiles, reports, photo_slots, report_photos, master data, activity_log, trigger updated_at)*
2. `supabase/migrations/20261115000002_rls_and_views.sql`  
   *(Mengaktifkan RLS, fungsi RPC claim/release, serta view `v_lokasi_lapangan`)*
3. `supabase/migrations/20261115000003_storage_bucket.sql`  
   *(Membuat bucket privat `laporan-foto` beserta RLS Storage)*
4. `supabase/seed/seed_slots.sql`  
   *(Mengisi data master 34 slot foto dengan rasio aspek, tier kompresi, dan ukuran sel tabel cm)*

---

## 6. Panduan Konfigurasi Google Drive OAuth 2.0 (In Production)

Agar arsip otomatis ke Google Drive berjalan permanen tanpa kedaluwarsa token setelah 7 hari (SPEC A.13), ikuti langkah berikut di [Google Cloud Console](https://console.cloud.google.com/):

1. **Buat Proyek Baru**:
   - Beri nama proyek, misalnya `LAPORAN-OMOV-ARCHIVE`.
2. **Aktifkan Google Drive API**:
   - Buka menu *APIs & Services* > *Library*, cari **Google Drive API**, lalu klik **Enable**.
3. **Konfigurasi Layar Persetujuan (OAuth Consent Screen)**:
   - Pilih tipe pengguna **External**.
   - Masukkan informasi aplikasi (Nama Aplikasi: `LAPORAN OMOV`, Email Dukungan Pemilik).
   - Pada bagian *Scopes*, tambahkan scope:
     `https://www.googleapis.com/auth/drive.file`
   - ⚠️ **LANGKAH KRUSIAL**: Pada halaman *OAuth Consent Screen*, klik tombol **PUBLISH APP** untuk mengubah status aplikasi dari **Testing** menjadi **In Production**.  
     *(Jika tetap Testing, refresh token akan kedaluwarsa setiap 7 hari).*
4. **Buat Kredensial OAuth Client ID**:
   - Buka *APIs & Services* > *Credentials* > *Create Credentials* > *OAuth Client ID*.
   - Application Type: **Web Application**.
   - Authorized redirect URIs: tambahkan `https://developers.google.com/oauthplayground`.
   - Simpan `Client ID` dan `Client Secret`.
5. **Dapatkan Refresh Token**:
   - Buka [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
   - Klik ikon gerigi (kanan atas), centang **Use your own OAuth credentials**, lalu isi `Client ID` dan `Client Secret` Anda.
   - Pada panel kiri, cari *Drive API v3*, pilih scope `https://www.googleapis.com/auth/drive.file`, lalu klik **Authorize APIs**.
   - Masuk menggunakan akun Google pemilik arsip (misal: `bca.omov.archive@gmail.com`) dan izinkan akses.
   - Klik **Exchange authorization code for tokens**, lalu salin nilai **Refresh token** yang dihasilkan.
   - Masukkan nilai ke `GOOGLE_REFRESH_TOKEN` di `.env.local` atau Vercel Environment Variables.

---

## 7. Penerapan di Vercel & Konfigurasi Cron

1. Unggah kode ke repositori Git (GitHub/GitLab) dan hubungkan ke proyek baru di Vercel.
2. Tambahkan seluruh Environment Variables pada dashboard Vercel (*Project Settings* > *Environment Variables*).
3. Pastikan berkas `vercel.json` berada di root direktori proyek:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/cleanup",
         "schedule": "0 18 * * *"
       }
     ]
   }
   ```
   *Catatan: Jadwal `0 18 * * *` UTC sama dengan pukul 01:00 WIB (UTC+7).*
4. Cron akan otomatis memicu endpoint `/api/cron/cleanup` setiap hari untuk:
   - Menghapus foto dari laporan terarsip yang berusia lebih dari 3 hari.
   - Menjalankan kueri keep-alive ke database Supabase agar tidak masuk mode pause.
   - Membuat cadangan mingguan otomatis setiap hari Minggu.

---

## 8. Panduan PWA & Penggunaan Luring di Lapangan

- **Instalasi di Android (Chrome)**:
  - Buka alamat aplikasi di Chrome, ketuk menu titik tiga (kanan atas), lalu pilih **Tambahkan ke Layar Utama** (*Install App*).
- **Instalasi di iOS (Safari)**:
  - Buka alamat aplikasi di Safari, ketuk tombol **Bagikan** (*Share*), lalu pilih **Tambah ke Layar Utama** (*Add to Home Screen*).
- **Penggunaan saat Koneksi Terputus**:
  - Teknisi tetap dapat mengambil foto, mengedit, memutar, memotong, dan menyimpannya.
  - Foto tersimpan aman di IndexedDB perangkat teknisi.
  - Begitu perangkat terhubung kembali dengan internet, sistem secara otomatis menyinkronkan dan mengunggah antrean foto ke server.

---

## 9. Menjalankan Pengujian (Testing)

Proyek ini dilengkapi dengan 43 unit dan golden tests yang mencakup seluruh aspek spesifikasi:

```bash
# Menjalankan seluruh pengujian (RLS, Data Builder, Field Photo Engine, DOCX Golden Tests, Operasional, Kesiapan Produksi)
npm test

# Menjalankan pengecekan TypeScript (Typecheck)
npx tsc --noEmit

# Membangun versi produksi (Build)
npm run build

# Menjalankan server produksi
npm start
```

---

## 10. Daftar 34 Slot Foto Master

| No | Kunci Slot (`key`) | Label | Grup | Rasio | Tier Kompresi | Keterangan |
|---|---|---|---|---|---|---|
| 1 | `grounding_pln` | Grounding PLN | Kelistrikan | 4:3 | Standar | Tegangan & grounding |
| 2 | `grounding_ups` | Grounding UPS | Kelistrikan | 4:3 | Standar | Tegangan & grounding |
| 3 | `tampak_depan` | Tampak Depan Mesin | Tampak & Perangkat | 4:3 | Standar | Foto menyeluruh |
| 4 | `tampak_samping_kiri` | Tampak Samping Kiri | Tampak & Perangkat | 4:3 | Standar | Samping kiri mesin |
| 5 | `tampak_samping_kanan` | Tampak Samping Kanan | Tampak & Perangkat | 4:3 | Standar | Samping kanan mesin |
| 6 | `tampak_belakang` | Tampak Belakang Mesin | Tampak & Perangkat | 4:3 | Standar | Belakang mesin |
| 7 | `fascia_atas` | Fascia Atas | Tampak & Perangkat | 4:3 | Standar | Fascia atas ATM |
| 8 | `fascia_bawah` | Fascia Bawah | Tampak & Perangkat | 4:3 | Standar | Fascia bawah ATM |
| 9 | `kamera_eksternal` | Kamera Eksternal | Tampak & Perangkat | 4:3 | Standar | Posisi kamera |
| 10 | `pin_cover` | PIN Cover | Tampak & Perangkat | 4:3 | Standar | Pelindung PIN |
| 11 | `kunci_tombak` | Kunci Tombak | Tampak & Perangkat | 4:3 | Standar | Posisi kunci |
| 12 | `bracket_modem` | Bracket Modem | Tampak & Perangkat | 4:3 | Standar | Perangkat modem |
| 13 | `modem` | Modem | Tampak & Perangkat | 4:3 | Standar | Modem terpasang |
| 14 | `ups` | UPS | Tampak & Perangkat | 4:3 | Standar | Unit UPS |
| 15 | `trafo_isolasi` | Trafo Isolasi | Tampak & Perangkat | 4:3 | Standar | Trafo |
| 16 | `sn_mesin_baru` | SN Mesin Baru | Nomor Seri | 4:3 | Detail | Wajib tajam terbaca |
| 17 | `sn_mesin_lama` | SN Mesin Lama | Nomor Seri | 4:3 | Detail | Wajib tajam terbaca |
| 18 | `sn_cctv` | SN CCTV | Nomor Seri | 4:3 | Detail | Wajib tajam terbaca |
| 19 | `sn_dvr` | SN DVR | Nomor Seri | 4:3 | Detail | Wajib tajam terbaca |
| 20 | `sn_modem` | SN Modem | Nomor Seri | 4:3 | Detail | Wajib tajam terbaca |
| 21 | `sn_ups` | SN UPS | Nomor Seri | 4:3 | Detail | Wajib tajam terbaca |
| 22 | `sn_trafo_isolasi` | SN Trafo Isolasi | Nomor Seri | 4:3 | Detail | Wajib tajam terbaca |
| 23 | `ba_hdd` | BA Destroy HDD (Grid) | Destroy HDD | 7:10 | Dokumen | Mode contain |
| 24 | `waktu_vendor_cctv` | Vendor CCTV | Kehadiran Vendor | 4:3 | Standar | Waktu hadir vendor |
| 25 | `waktu_vendor_kebersihan`| Vendor Kebersihan | Kehadiran Vendor | 4:3 | Standar | Waktu hadir vendor |
| 26 | `waktu_vendor_promosi` | Vendor Promosi | Kehadiran Vendor | 4:3 | Standar | Waktu hadir vendor |
| 27 | `waktu_vendor_slm` | Vendor SLM | Kehadiran Vendor | 4:3 | Standar | Waktu hadir vendor |
| 28 | `waktu_vendor_mesin` | Vendor Mesin | Kehadiran Vendor | 4:3 | Standar | Waktu hadir vendor |
| 29 | `waktu_pkt1` | PKT 1 | Kehadiran Vendor | 4:3 | Standar | Waktu hadir vendor |
| 30 | `waktu_pkt2` | PKT 2 | Kehadiran Vendor | 4:3 | Standar | Waktu hadir vendor |
| 31 | `waktu_vendor_nb` | Vendor NB | Kehadiran Vendor | 4:3 | Standar | Waktu hadir vendor |
| 32 | `ba_dynabolt_sebelum` | Sebelum Tarik Dynabolt | BA Dynabolt | 5:6 | Standar | Label dikoreksi |
| 33 | `ba_dynabolt_sesudah` | Sesudah Tarik Dynabolt | BA Dynabolt | 5:6 | Standar | Label dikoreksi |
| 34 | `ba_hdd_full` | BA Destroy HDD (Halaman 6)| Otomatis | 7:10 | Dokumen | Reuse dari slot 23 |

---

## 11. Lisensi & Hak Cipta

Sistem dikembangkan untuk kebutuhan operasional **LAPORAN OMOV (Berita Acara ATM BCA)**. Hak cipta milik organisasi terkait.

