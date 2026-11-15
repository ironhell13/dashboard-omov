# SPEC DOKUMEN LAPORAN OMOV

A.2 Konteks produk
LAPORAN OMOV menghasilkan Berita Acara (BA) mesin ATM BCA sebanyak 6 halaman dalam format Word (.docx), identik dengan /template/BA_SAMPLE.docx. Ada dua peran: supervisor mengisi data teks, tim lapangan mengunggah foto pada 34 slot yang ada di tabel.
Satu template dipakai untuk empat jenis pekerjaan: Trade In, Replace, Aktivasi Online Baru, Relokasi. Jenis dipilih lewat dropdown dan tercetak di dokumen.
Semua 34 slot foto wajib untuk semua jenis pekerjaan.
Supervisor cukup mengisi WSID dan Lokasi untuk membuat laporan. Laporan itu langsung muncul di dashboard tim lapangan.
Foto vendor boleh dipakai ulang antar slot.
Volume: 13 laporan per hari. Output hanya Word (tanpa PDF).
Foto sebagian dipakai di dua halaman (foto BA HDD di grid dan di halaman 6).
Tipe mesin baru dan lama memang berbeda pada proyek trade-in/replace; keduanya adalah isian terpisah.
A.3 Tech stack (wajib dipakai)
Next.js (App Router) + TypeScript strict + Tailwind CSS + shadcn/ui + lucide-react.
Form: react-hook-form + zod. Data fetching: TanStack Query.
Supabase: Postgres + RLS, Auth (email dan password), Storage (bucket privat laporan-foto). Klien: @supabase/supabase-js dan @supabase/ssr.
Editor foto: react-easy-crop (crop, zoom, rotasi) + Canvas API. Penyimpanan lokal: idb (IndexedDB).
PWA: Serwist (service worker + manifest).
Word: docxtemplater + pizzip + modul gambar yang kompatibel (mis. docxtemplater-image-module-free) + sharp.
Google Drive: googleapis (OAuth akun pemilik, scope drive.file).
Tes: Vitest (unit) dan Playwright (E2E).
Deploy: Vercel Hobby. Pakai versi stabil terbaru yang saling kompatibel; jangan memakai paket yang sudah tidak dirawat.
A.4 Desain visual (biru muda dan putih)
Kesan: clean, jelas, sederhana, profesional. Banyak ruang putih, fokus pada tugas, tanpa dekorasi berlebihan, tanpa gradien mencolok, tanpa ilustrasi berat. Versi 1 hanya tema terang.
Token warna (definisikan sebagai CSS variable dan tema Tailwind):
Token
Nilai
Pemakaian
--bg
#FFFFFF
Latar halaman dan kartu
--bg-subtle
#F4F9FF
Latar sidebar, header tabel, hover baris
--bg-tint
#E8F3FF
Item terpilih, track progress
--border
#D6E6F8
Garis kartu dan tabel
--border-strong
#B9D4F3
Garis input dan tombol outline
--primary
#1A73D9
Tombol utama, tautan, progress, fokus
--primary-hover
#1565C0
Hover tombol utama
--primary-soft
#DCEBFF
Tombol lembut, chip, ikon latar
--accent-light
#8EC5FF
Aksen halus (garis aktif, ilustrasi progres)
--text
#0F2A43
Teks utama
--text-muted
#5B7189
Teks sekunder
Sukses
teks #17714A pada #E3F6EC
Chip status sukses
Peringatan
teks #8A5300 pada #FFF3DC
Chip peringatan
Bahaya
teks #B02A2A pada #FDE8E8
Chip ditolak, error
Warna di luar palet ini tidak boleh dipakai, kecuali tiga warna status di atas.
Tipografi: Inter (via next/font). Dasar 16 px di dashboard lapangan, 14–15 px untuk tabel desktop. Judul halaman 24 px semibold, judul kartu 16 px semibold. Berat huruf hanya 400, 500, 600.
Bentuk dan jarak: radius 12 px untuk kartu dan 10 px untuk input dan tombol. Border 1 px --border. Bayangan sangat halus (0 1px 2px rgba(15,42,67,.06)). Jarak mengikuti kelipatan 8 px. Transisi hanya 150 ms.
Komponen:
Tombol: primer (solid --primary, teks putih), sekunder (outline --border-strong, teks --primary), ghost. Tinggi 44 px; di lapangan 48 px.
Input: tinggi 44 px, fokus berupa ring 2 px --primary transparan 40%. Label selalu tampak di atas input.
Chip status: bentuk pil, teks kecil berat 500.
Tabel: header --bg-subtle, baris hover --bg-subtle, tanpa garis vertikal.
Progress bar: track --bg-tint, isi --primary, tinggi 8 px.
Pelengkap: toast, dialog konfirmasi, skeleton loading, dan empty state sederhana dengan ikon Lucide (stroke 1.75).
Layout supervisor (desktop-first, tetap responsif): sidebar kiri putih selebar 240 px dengan teks logo LAPORAN OMOV (semibold, ikon file-check berwarna primary) dan menu Beranda, Laporan, Pengguna, Master Data. Topbar tipis berisi nama pengguna dan tombol keluar. Konten maksimal 1280 px. Di bawah 1024 px sidebar menjadi drawer.
Layout lapangan (mobile-first): top bar putih dan bottom navigation dua tab (Lokasi, Antrean). Kartu lokasi besar, tombol utama selebar layar, target sentuh minimal 48 px.
Warna chip status:
Status
Label
Gaya
menunggu_foto
Menunggu Foto
--primary pada --primary-soft
foto_lengkap
Foto Lengkap
Sukses
perlu_perbaikan
Perlu Perbaikan
Peringatan
final
Final
Putih berbingkai --primary, teks --primary
terarsip
Terarsip
--text-muted pada --bg-subtle
dibatalkan
Dibatalkan
Bahaya
A.5 Peran, alur, dan status
Peran: supervisor dan lapangan (kolom profiles.role). Login email dan password. Akun dibuat oleh supervisor lewat halaman Pengguna (route server dengan service role). Tidak ada pendaftaran mandiri dan tidak memakai email undangan.
Alur:
Supervisor membuat laporan (WSID, Lokasi, jenis pekerjaan, tanggal). Status awal menunggu_foto, lokasi langsung terlihat oleh tim lapangan.
Tim lapangan membuka lokasi dan mengisi 34 slot foto. Saat mereka membuka lokasi, sistem mengisi claimed_by (penanda Sedang dikerjakan oleh ...). Penanda ini bisa dilepas atau diambil alih.
Saat semua 34 slot terisi dan tidak ada foto berstatus ditolak, status otomatis foto_lengkap.
Supervisor meninjau foto: Terima atau Tolak (dengan catatan wajib). Foto ditolak membuat status perlu_perbaikan. Foto pengganti mereset review menjadi menunggu.
Supervisor melengkapi data teks kapan saja (autosave).
Supervisor menekan Generate Word, mengunduh file, lalu Tandai Final (hanya dari foto_lengkap). Final mengunci pengeditan. Supervisor boleh Buka kembali selama belum terarsip.
Saat Final, file Word diunggah ke Google Drive. Setelah arsip terverifikasi, status menjadi terarsip. Foto di Supabase dihapus 3 hari kemudian oleh cron.
Status: menunggu_foto, foto_lengkap, perlu_perbaikan, final, terarsip, dibatalkan.
A.6 Skema database
Buat sebagai migrasi SQL di supabase/migrations.
create table profiles (  id uuid primary key references auth.users on delete cascade,  nama text not null,  role text not null check (role in ('supervisor','lapangan')),  aktif boolean not null default true,  created_at timestamptz not null default now());create table reports (  id uuid primary key default gen_random_uuid(),  wsid text not null,  lokasi text not null,  jenis_pekerjaan text not null default 'Trade In'    check (jenis_pekerjaan in ('Trade In','Replace','Aktivasi Online Baru','Relokasi')),  tanggal date not null default current_date,  status text not null default 'menunggu_foto'    check (status in ('menunggu_foto','foto_lengkap','perlu_perbaikan','final','terarsip','dibatalkan')),  claimed_by uuid references profiles(id),  claimed_at timestamptz,  data jsonb not null default '{}'::jsonb,  created_by uuid references profiles(id),  created_at timestamptz not null default now(),  updated_at timestamptz not null default now(),  finalized_at timestamptz,  archived_at timestamptz,  drive_file_id text,  drive_url text);create index on reports (status, tanggal desc);create index on reports (wsid);create table photo_slots (  key text primary key,  label text not null,  grp text not null,  sort int not null,  aspect_w int not null,  aspect_h int not null,  tier text not null check (tier in ('standar','detail','dokumen')),  cell_w_cm numeric(4,1) not null,  cell_h_cm numeric(4,1) not null,  reuse_of text references photo_slots(key));create table report_photos (  id uuid primary key default gen_random_uuid(),  report_id uuid not null references reports(id) on delete cascade,  slot_key text not null references photo_slots(key),  storage_path text,  thumb_path text,  shared_from text references photo_slots(key),  width int, height int, bytes int,  source text check (source in ('kamera','galeri')),  taken_at timestamptz,  uploaded_by uuid references profiles(id),  uploaded_at timestamptz not null default now(),  review text not null default 'menunggu' check (review in ('menunggu','diterima','ditolak')),  review_note text,  unique (report_id, slot_key),  check (storage_path is not null or shared_from is not null));create table master_vendor (id serial primary key, nama text not null, peran text);create table master_mesin  (id serial primary key, tipe text not null);create table master_orang  (id serial primary key, nama text not null, jabatan text);create table activity_log  (id bigserial primary key, report_id uuid, user_id uuid, aksi text not null, detail jsonb, waktu timestamptz not null default now());
Aturan data:
shared_from: slot ini memakai foto milik slot lain pada laporan yang sama (untuk foto vendor yang sama). Slot dengan photo_slots.reuse_of (yaitu ba_hdd_full) otomatis memakai foto slot induknya dan tidak butuh baris sendiri.
Sebuah slot dianggap terisi jika punya storage_path, atau shared_from, atau reuse_of yang induknya terisi. Penyebut progres selalu 34.
Buat view v_lokasi_lapangan: id, wsid, lokasi, jenis_pekerjaan, tanggal, status, claimed_by_nama, terisi, total untuk laporan berstatus menunggu_foto, perlu_perbaikan, atau foto_lengkap.
Trigger updated_at pada reports. Simpan semua timestamp dalam UTC dan tampilkan dalam WIB.
RLS aktif di semua tabel:
Supervisor: akses penuh.
Lapangan: tidak membaca reports langsung; hanya lewat view di atas. Boleh insert dan update report_photos hanya untuk laporan berstatus menunggu_foto, perlu_perbaikan, atau foto_lengkap, dan hanya mengisi kolom foto (tidak mengubah review). Boleh memperbarui claimed_by laporan lewat fungsi RPC khusus.
Bucket laporan-foto privat. Kebijakan Storage mengikuti aturan yang sama dan memeriksa status laporan dari awalan jalur {report_id}/.
Tulis tes RLS yang membuktikan: lapangan tidak bisa membaca data laporan, tidak bisa mengubah laporan Final, dan tidak bisa mengakses foto laporan lain yang sudah Final.
A.7 Seed slot foto (34 penempatan)
Semua slot wajib. Urutan sort mengikuti nomor. Ukuran kotak (cm) di bawah adalah nilai awal; ukur ulang dari BA_TEMPLATE.docx lalu perbarui seed.
#
key
Label
Grup
Rasio
Tier
1
grounding_pln
Grounding dari PLN
Kelistrikan
4:3
detail
2
voltage_pln
Voltage dari PLN
Kelistrikan
4:3
detail
3
grounding_ups
Grounding setelah UPS-IT
Kelistrikan
4:3
detail
4
voltage_ups
Voltage setelah UPS-IT
Kelistrikan
4:3
detail
5
stop_kontak
Stop Kontak Dinding
Kelistrikan
4:3
standar
6
mcb
MCB
Kelistrikan
4:3
standar
7
tampak_mesin
Tampak Mesin
Tampak dan Perangkat
4:3
standar
8
perangkat_pendukung
Perangkat Pendukung
Tampak dan Perangkat
4:3
standar
9
sudut_kamera
Sudut Pandang Kamera
Tampak dan Perangkat
4:3
standar
10
jalur_kabel
Jalur Kabel Terproteksi
Tampak dan Perangkat
4:3
standar
11
cencon
Cencon
Tampak dan Perangkat
4:3
standar
12
neon_box
Neon Box
Tampak dan Perangkat
4:3
standar
13
led_sticker
LED dan Sticker
Tampak dan Perangkat
4:3
standar
14
kaset_cadangan
Kaset Cadangan
Tampak dan Perangkat
4:3
standar
15
dynabolt
Dynabolt
Tampak dan Perangkat
4:3
standar
16
sn_mesin
S/N Mesin
Nomor Seri
4:3
detail
17
sn_kamera
S/N Kamera
Nomor Seri
4:3
detail
18
sn_dvr
S/N DVR
Nomor Seri
4:3
detail
19
sn_ups
S/N UPS
Nomor Seri
4:3
detail
20
sn_led
SN LED
Nomor Seri
4:3
detail
21
hdd_sebelum
Sebelum Destroy HDD
Destroy HDD
4:3
standar
22
hdd_setelah
Setelah Destroy HDD
Destroy HDD
4:3
standar
23
ba_hdd
BA Destroy HDD
Destroy HDD
4:3 (sel grid), foto diambil 7:10
dokumen
24
v_mesin_online
Mesin Online
Waktu Hadir Vendor
5:6
standar
25
v_instalasi
Vendor Instalasi
Waktu Hadir Vendor
5:6
standar
26
v_mover
Vendor Mover
Waktu Hadir Vendor
5:6
standar
27
v_cctv
Vendor CCTV
Waktu Hadir Vendor
5:6
standar
28
v_mesin
Vendor Mesin
Waktu Hadir Vendor
5:6
standar
29
v_pkt1
PKT (1)
Waktu Hadir Vendor
5:6
standar
30
v_pkt2
PKT (2)
Waktu Hadir Vendor
5:6
standar
31
v_nb
Vendor NB
Waktu Hadir Vendor
5:6
standar
32
dyn_sebelum
Sebelum pemasangan dynabolt
BA Dynabolt
4:5
standar
33
dyn_sesudah
Sesudah pemasangan dynabolt
BA Dynabolt
4:5
standar
34
ba_hdd_full
Foto BA Penghancuran HDD (hal. 6)
Otomatis
7:10
dokumen, reuse_of = ba_hdd
Ukuran awal kotak: grid 4,5 × 3,4 cm; vendor 4,7 × 5,7 cm; dynabolt 5,2 × 6,5 cm; halaman 6 13,2 × 18,6 cm.
Slot 23 dan 34 memakai satu foto yang sama. Foto diambil dengan rasio 7:10 (besar di halaman 6); di grid ditampilkan utuh dengan mode Pas (A.10 dan A.12).
A.8 Dashboard Supervisor
Halaman:
/supervisor (Beranda rekap OMOV): kartu Dibuat hari ini / target 13, Menunggu Foto, Foto Lengkap, Perlu Perbaikan, Final. Di bawahnya tabel laporan terbaru.
/supervisor/laporan: tabel dengan kolom WSID, Lokasi, Jenis pekerjaan, Tanggal, Status (chip), Progres foto (bar dan angka, contoh 20/34), Dikerjakan oleh. Filter tanggal, status, jenis pekerjaan, pencarian WSID/lokasi. Pagination.
Tombol Buat Laporan membuka dialog: WSID*, Lokasi*, Jenis pekerjaan* (dropdown empat pilihan), Tanggal*, Alamat (opsional). WSID otomatis huruf kapital. Setelah disimpan laporan muncul di dashboard lapangan.
/supervisor/laporan/[id] dengan tiga tab:
Data: form bertab per bagian dengan autosave (debounce 800 ms) dan indikator Tersimpan/Menyimpan.
Foto: kisi 34 slot per grup. Tiap slot: thumbnail, status review, tombol Terima, Tolak (dialog catatan wajib), Ganti foto (supervisor boleh mengunggah, lewat editor yang sama), Pakai foto slot lain (hanya untuk grup Waktu Hadir Vendor), Lihat besar.
Dokumen: ringkasan kelengkapan, daftar isian kosong, tombol Generate Word, Tandai Final, Buka kembali, dan tautan Drive bila sudah diarsip. Riwayat aktivitas.
/supervisor/pengguna: daftar akun, buat akun (nama, email, password awal, peran), reset password, nonaktifkan.
/supervisor/master: kelola vendor, type mesin, dan penandatangan (tambah, ubah, hapus).
Aturan Generate: hanya lokasi, wsid, jenis_pekerjaan, tanggal yang memblokir. Isian teks lain yang kosong ditampilkan sebagai peringatan dan tercetak -. Tombol Generate aktif hanya jika semua 34 slot foto terisi.
Isian data (disimpan di reports.data, nama kunci dipakai juga sebagai placeholder Word; tanda * = wajib saat membuat laporan):
Bagian
Kunci dan tipe
Identitas
lokasi, wsid, alamat, lokasi_lama, wsid_lama, type_mesin_baru (dropdown master), serial_nomor, jenis pekerjaan* dan tanggal* (kolom tabel reports)
Kelistrikan
tegangan_ups_it (angka, Volt), grounding_ups_it (angka, Volt)
Jaringan
initial_vsat, konfigurasi (TCP/IP atau teks bebas), ip_address (validasi IPv4)
Isi mesin
cartridge, reject, kunci
Perangkat
cencon, kamera, perekam, pin_cover, fdi, ac (dropdown status umum), masterkey_triple_des (Ya/Tidak), masterkey_alasan
Outdoor
neon_sign, stiker_mesin (dropdown status umum)
Indoor
kabel_jalur, colokan_listrik; perekam_eksternal, kamera_eksternal, ups, led, masing-masing objek {status, merk, sn}
Letak dan pengaman
letak_mesin; angkur (Ya/Tidak), angkur_vendor, pengaman_pengganti (centang Dynabolt, Alarm), angkur_alasan; supersite (Ya/Tidak), supersite_vendor, supersite_alasan; exhaust_fan_jumlah, exhaust_fan_status (Nyala/Mati)
Lain-lain
tanggal_email_permintaan (tanggal), koordinat (lat dan lng, dengan tombol Ambil GPS)
Penandatangan
kota (default Jakarta), yang_melakukan, mengetahui (dropdown master, bisa ketik bebas)
Waktu hadir vendor
jadwal_aktivasi (tanggal); vendor_hadir: 8 baris tetap (mesin_online, vendor_instalasi, vendor_mover, vendor_cctv, vendor_mesin, pkt1, pkt2, vendor_nb) masing-masing {nama, waktu} (dropdown vendor, tanggal-jam WIB); keterangan; penandatangan_vendor
BA Dynabolt
type_mesin_lama, sn_mesin_lama
Dropdown status umum: Terpasang, Tidak terpasang, Tidak ada, Lainnya (teks bebas). Nilai awalnya dicocokkan dengan isi BA_SAMPLE.docx. Nama hari dan tanggal berformat Indonesia dihitung otomatis dari tanggal (tidak diketik).
A.9 Dashboard Tim Lapangan
Mobile-first, dioptimalkan untuk satu tangan.
/lapangan (tab Lokasi): kartu per lokasi berisi WSID (tebal), Lokasi, Jenis pekerjaan, Tanggal, bar progres dan angka (contoh 12/34), chip status, serta penanda Sedang dikerjakan oleh nama. Ada kolom pencarian dan filter cepat (Semua, Belum dimulai, Sedang dikerjakan, Perlu perbaikan). Tarik ke bawah untuk menyegarkan. Saat offline, daftar terakhir tetap tampil dengan label Terakhir diperbarui.
/lapangan/[id]: header berisi WSID dan Lokasi, bar progres, dan banner jika ada foto ditolak (dengan catatan). Slot dikelompokkan sesuai kolom Grup (A.7), tiap grup bisa dilipat. Tiap slot: thumbnail, label, rasio kecil, status (Kosong, Menunggu kirim, Terkirim, Ditolak + catatan), tombol Kamera dan Galeri. Slot vendor punya menu Pakai foto slot lain. Slot ba_hdd_full hanya menampilkan keterangan Otomatis memakai foto BA Destroy HDD.
/lapangan/[id]/foto/[slot]: layar kamera dan editor penuh (A.10).
Tab Antrean: daftar foto menunggu kirim (WSID, slot, ukuran, percobaan), tombol Kirim sekarang, dan opsi hapus dari antrean.
Banner status koneksi (Online/Offline) dan banner Pasang ke Layar Utama untuk iPhone.
A.10 Kamera, galeri, editor, dan kompresi
Alur: tap Kamera atau Galeri pada slot → Editor → Simpan → masuk antrean lokal → unggah otomatis.
Sumber foto
Kamera (viewfinder dalam aplikasi): getUserMedia kamera belakang (facingMode: environment, resolusi ideal setinggi mungkin). Pratinjau layar penuh dengan bingkai rasio terkunci sesuai slot; area di luar bingkai digelapkan. Bingkai menyesuaikan orientasi HP. Pakai ImageCapture.takePhoto() bila tersedia untuk foto resolusi penuh; jika tidak, ambil frame video. Tombol: Ambil, Senter (jika didukung), dan Pakai kamera HP (resolusi penuh) yang membuka <input type=file accept=image/* capture=environment> lalu meneruskan hasilnya ke Editor.
Galeri: <input type=file accept=image/*>, satu foto per slot, lalu ke Editor. Tujuannya agar tim lapangan bisa memotret saat tanpa sinyal (kamera bawaan atau aplikasi kamera GPS), lalu menyunting dan mengunggah belakangan.
Peringatan resolusi: jika area hasil crop kurang dari 85% piksel target tier, tampilkan peringatan kuning (Resolusi rendah, hasil kurang tajam; dekatkan objek atau miringkan HP untuk slot landscape). Peringatan tidak memblokir.
Editor (layar penuh, mobile-first, berjalan sepenuhnya di sisi klien dan tetap berfungsi offline)
Bingkai rasio terkunci; foto di bawah bingkai bisa digeser dan di-zoom.
Zoom: pinch dua jari, scroll mouse, slider 1× sampai 5×, tombol + dan −.
Rotasi: tombol putar 90° kiri dan kanan, slider putar halus −15° sampai +15° (langkah 0,5°), tombol reset rotasi.
Mode: Isi (default, foto memenuhi bingkai) dan Pas (foto utuh, latar putih) untuk dokumen seperti BA HDD.
Penyesuaian: kecerahan (−30 sampai +30), kontras (−30 sampai +30), tombol Otomatis (auto-level: regangkan histogram persentil 1 sampai 99). Implementasikan lewat manipulasi piksel di canvas; jangan bergantung pada ctx.filter karena tidak konsisten di Safari.
Watermark (toggle): tanggal-jam WIB, WSID · Lokasi, dan koordinat bila izin GPS diberikan. Posisi kiri bawah, pita gelap transparan 55% dengan teks putih, tinggi huruf 2,4% dari tinggi foto (minimal 14 px). Digambar setelah crop sehingga selalu terlihat. Default nyala untuk kamera, mati untuk galeri. Waktu diambil dari EXIF DateTimeOriginal jika ada, selain itu waktu saat ini.
Lihat di tabel: pratinjau hasil pada ukuran kotak sebenarnya, plus estimasi ukuran file (KB).
Tombol: Simpan, Ulangi (ambil atau pilih ulang), Atur ulang (kembali ke awal), Batal.
Orientasi EXIF diterapkan (createImageBitmap dengan imageOrientation: from-image). Foto sumber yang sangat besar diperkecil ke maksimal 3000 px sisi terpanjang sebelum disunting agar HP kelas bawah tidak kehabisan memori.
Pada tahap lanjutan: peringatan foto buram (variance of Laplacian) dan foto gelap (rata-rata luminans), tanpa memblokir.
Ekspor dan kompresi (dilakukan sekali di HP)
Tier
Sisi terpanjang
Kualitas JPEG awal
Batas ukuran
standar
1280 px
0,78
260 KB
detail
1600 px
0,85
450 KB
dokumen
1800 px
0,85
600 KB
Hitung ukuran keluaran dari rasio slot dan tier. Sisi terpanjang = nilai tier, sisi lainnya mengikuti rasio (4:3 → 1280×960; 5:6 → 1067×1280; 4:5 → 1024×1280; 7:10 → 1260×1800).
Gambar ke canvas dengan semua transformasi editor, latar putih.
Tambahkan watermark jika aktif.
canvas.toBlob('image/jpeg', q). Jika melebihi batas ukuran, turunkan kualitas bertahap 0,03 sampai minimal 0,70. Dimensi tidak pernah dikecilkan agar tetap tajam saat di-zoom.
Buat thumbnail 400 px sisi terpanjang, kualitas 0,70.
EXIF otomatis hilang karena digambar ulang. Simpan width, height, bytes, taken_at, dan source sebagai metadata.
Foto tidak boleh dikompres ulang di tahap lain.
Penyimpanan: laporan-foto/{report_id}/{slot_key}.jpg dan laporan-foto/{report_id}/thumbs/{slot_key}.jpg. Unggah memakai upsert sehingga idempoten, dan mengganti foto menimpa file yang sama. Setelah unggah berhasil, upsert baris report_photos. Pakai foto slot lain tidak mengunggah file; cukup membuat baris report_photos dengan shared_from.
A.11 Offline, antrean unggah, dan PWA
IndexedDB (idb): store queue berisi {id, reportId, slotKey, blob, thumbBlob, meta, status (pending, uploading, failed), attempts, lastError, createdAt}, dan store cache untuk daftar lokasi dan slot.
Pemicu kirim: event online, aplikasi dibuka atau mendapat fokus, interval 30 detik selama antrean tidak kosong, dan tombol Kirim sekarang. Retry dengan backoff (5 dtk, 15 dtk, 45 dtk, 2 mnt, maksimal 10 mnt), maksimal 2 unggahan paralel.
Menyunting ulang foto yang masih di antrean menggantikan item antrean (satu item per slot per laporan).
Indikator: ikon awan di tiap slot (menunggu kirim atau terkirim), badge jumlah di tab Antrean, banner koneksi global.
Persistensi: panggil navigator.storage.persist(). Jika antrean tidak kosong, logout diblokir sampai antrean kosong atau pengguna mengonfirmasi penghapusan.
PWA: manifest (nama LAPORAN OMOV, nama pendek OMOV, theme_color #1A73D9, background_color #FFFFFF, display: standalone, ikon 192 dan 512 termasuk maskable). Service worker Serwist: precache kerangka aplikasi, stale-while-revalidate untuk data lokasi, network-first untuk API, tidak meng-cache signed URL gambar. Aplikasi bisa dibuka offline dan sesi login tetap tersimpan.
iOS: tidak ada Background Sync, jadi antrean hanya terkirim saat aplikasi terbuka. Tampilkan petunjuk Pasang ke Layar Utama dan saran mengunggah dalam 24 jam.
Jika sesi kedaluwarsa saat offline, pengeditan dan antrean tetap boleh; minta login ulang saat online sebelum mengirim.
A.12 Pembuatan Word
Template: /template/BA_TEMPLATE.docx dan /template/placeholders.json (manifest berisi semua tag teks, tag gambar, dan ukuran kotak cm per slot). Pemetaan foto ke kotak memakai key, bukan urutan; urutan di dokumen tidak harus sama dengan urutan checklist. Jika file belum ada, buat dari BA_SAMPLE.docx lewat skrip scripts/prepare-template:
Gabungkan run teks yang terpecah sehingga satu nilai = satu run.
Ganti setiap teks berhighlight kuning dengan placeholder bernama sesuai kunci A.8 (contoh {wsid}, {lokasi}) dan hapus highlight kuningnya.
Ganti tiap gambar contoh dengan tag gambar {%foto_<key>} berukuran tetap sesuai kotak. Kunci tinggi baris tabel (hRule exact) dan pertahankan text box serta gambar anchor.
Ubah pilihan Ya/Tidak menjadi bagian bersyarat dengan coretan pada opsi yang tidak dipilih; ubah kotak centang menjadi simbol ☐ dan ☒.
Perbaiki label yang tertukar pada halaman BA Dynabolt (Lokasi dan WSID).
Seragamkan kotak grid menjadi 4:3.
jenis_pekerjaan tercetak di halaman 1 (baris Baru/Relokasi/Trade In) dan di halaman 4 (JENIS PEKERJAAN).
Pembangun data
Nilai turunan: hari (Senin sampai Minggu, dari tanggal), tanggal_teks (contoh 12 November 2026), waktu_teks (contoh 12 November 2026 14:44, WIB).
Nilai kosong tercetak -.
Pilihan Ya/Tidak menjadi dua flag; opsi terpilih tampil normal, yang tidak terpilih dicoret.
Foto: untuk tiap kotak, siapkan gambar dengan sharp persis dengan rasio kotak. Jika rasio foto sama, langsung dipakai. Jika berbeda, pakai mode Pas (contain, latar putih) agar tidak terpotong dan tidak melar. Jangan di-upscale. Ukuran sisip = ukuran kotak (cm → piksel 96 dpi → EMU). Untuk ba_hdd, rasio foto 7:10 sedangkan kotak grid 4:3, sehingga memakai mode Pas.
ba_hdd_full memakai foto ba_hdd; slot dengan shared_from memakai foto slot sumbernya.
Nama file: BERITA_ACARA_{JENIS_PEKERJAAN}_WSID_{WSID}_{LOKASI}.docx, huruf kapital, spasi dan karakter khusus menjadi _ (contoh: BERITA_ACARA_TRADE_IN_WSID_Z9KD_SPBU_3415143_Otista.docx).
Route POST /api/laporan/[id]/generate (runtime Node, maxDuration setinggi yang diizinkan paket): unduh foto dari Storage secara paralel, kembalikan stream .docx. Jika saat uji dengan 34 foto terlalu lambat, sediakan mode cadangan: generator yang sama berjalan di browser supervisor.
Validasi pasca-generate: berkas sah sebagai zip, tidak ada { atau } tersisa, jumlah gambar sesuai.
Tes wajib
Tes unit pembangun data (hari, tanggal, coretan Ya/Tidak, nilai kosong).
Golden test: isi template dengan data dan foto dari sampel, ubah ke PDF dengan LibreOffice (hanya di dev atau CI), bandingkan per halaman dengan sampel. Perbedaan hanya boleh pada perbaikan yang disengaja.
Uji dokumen untuk keempat jenis pekerjaan.
A.13 Arsip Drive, cron, dan keamanan
Drive: OAuth akun Google pemilik. Sediakan halaman /supervisor/pengaturan/drive untuk menghubungkan akun dan menampilkan status; refresh token disimpan di variabel lingkungan (langkah di README). Status aplikasi OAuth harus In production dengan scope drive.file agar token tidak kedaluwarsa dalam 7 hari. Struktur folder LAPORAN OMOV/{tahun}/{bulan Indonesia}/, nama file sama dengan unduhan. Setelah unggah, verifikasi dengan membaca metadata, simpan drive_file_id dan drive_url, isi archived_at, lalu ubah status menjadi terarsip. Jika gagal, status tetap final, tampilkan tombol Coba arsip lagi; unduh manual selalu tersedia.
Cron (vercel.json, satu cron harian sekitar 01:00 WIB, dilindungi CRON_SECRET): (a) hapus foto dan thumbnail laporan terarsip yang archived_at-nya lebih dari 3 hari, hanya jika drive_file_id terverifikasi; (b) kueri ringan ke database sebagai keep-alive; (c) tiap hari Minggu ekspor reports dan tabel master sebagai JSON ke folder _backup di Drive.
Admin pengguna: route server dengan service role untuk membuat user (email, password awal, baris profiles), reset password, dan menonaktifkan. Service role tidak pernah dipakai di klien.
Keamanan: validasi zod di semua route, header keamanan dasar, signed URL berumur 1 jam untuk tampilan foto, route supervisor menolak peran lapangan (middleware dan RLS), log aktivitas (buat, terima, tolak, generate, final, arsip).
Egress: pakai thumbnail di daftar dan kisi; foto penuh hanya saat dibuka atau saat generate.
A.14 Tahap pengerjaan dan kriteria penerimaan
Tahap 1–4 setara Fase 0–1 (MVP) di bagian 13, tahap 5 setara Fase 2, tahap 6 setara Fase 3.
Tahap
Isi
Bukti selesai
1. Fondasi
Proyek Next.js, token desain A.4, shadcn/ui, migrasi SQL dan seed slot, Auth, routing berdasarkan peran, shell layout supervisor dan lapangan
Login dua peran jalan, tes RLS lulus, screenshot shell
2. Supervisor
Beranda rekap, daftar dan buat laporan, form data dengan autosave, master data, pengguna
Laporan dibuat dan muncul di view lapangan, screenshot semua halaman
3. Lapangan
Daftar lokasi, halaman slot, kamera berbingkai rasio, galeri, editor, kompresi, antrean offline, PWA
Uji di viewport 390 px dan mode offline, ukuran foto sesuai tier
4. Word
Template bersih, pembangun data, generator, unduh
Golden test lulus untuk empat jenis pekerjaan
5. Operasional
Review foto (terima, tolak), Final dan Buka kembali, arsip Drive, cron pembersihan, watermark otomatis, impor banyak foto dari galeri, deteksi buram dan gelap
Arsip muncul di Drive, pembersihan teruji
6. Penyempurnaan
Rekap per hari dan per bulan, ekspor Excel/CSV, cadangan mingguan, polesan UI
Semua kriteria di bawah terpenuhi
Setelah tiap tahap, buat ringkasan berisi yang selesai, hasil tes, screenshot, dan hal yang perlu keputusan saya.
Kriteria penerimaan
Laporan yang dibuat supervisor dengan WSID dan Lokasi muncul di dashboard lapangan dalam beberapa detik.
Tim lapangan tidak bisa membaca data teks laporan maupun laporan Final (tes RLS).
Untuk setiap slot, rasio bingkai kamera dan editor sama dengan kotak di tabel; foto di Word tidak melar dan tidak terpotong tanpa disadari.
Ukuran foto sesuai tier (standar ≤ 260 KB, detail ≤ 450 KB, dokumen ≤ 600 KB); rata-rata per laporan di bawah 8 MB.
Pada zoom 400% di Word, teks SN dan angka multimeter tetap terbaca.
Foto yang diedit saat offline terkirim otomatis begitu online, tanpa duplikat.
Foto dari galeri bisa di-zoom, digeser, diputar, dipotong, dan disimpan tanpa koneksi internet.
Word hasil generate dengan data sampel identik dengan BA_SAMPLE.docx (golden test lulus) dan terbuka normal di Word dan LibreOffice.
Keempat jenis pekerjaan menghasilkan dokumen valid dengan jenis yang tercetak benar.
Tombol Generate nonaktif selama masih ada slot kosong.
Setelah Final, file muncul di Drive pada folder yang benar; foto di Supabase terhapus 3 hari kemudian (uji dengan jam dipercepat).
Tampilan hanya memakai palet A.4, kontras AA, tanpa scroll horizontal pada 390 px, target sentuh minimal 44 px.
Semua teks antarmuka berbahasa Indonesia; tanggal dan jam dalam WIB.
README lengkap; tes Vitest dan Playwright lulus.