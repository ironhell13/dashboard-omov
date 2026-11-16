-- Migrasi 1: Inisialisasi Skema Database LAPORAN OMOV
-- Mengikuti Dokumen SPEC.md Bagian A.6

-- Ekstensi pgcrypto untuk gen_random_uuid() jika belum ada
create extension if not exists "pgcrypto";

-- 1. Tabel Profil Pengguna (terhubung ke auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  nama text not null,
  role text not null check (role in ('superadmin', 'supervisor', 'lapangan')),
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table if exists profiles drop constraint if exists profiles_role_check;
alter table if exists profiles add constraint profiles_role_check check (role in ('superadmin', 'supervisor', 'lapangan'));

-- 2. Tabel Laporan (Reports)
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  wsid text not null,
  lokasi text not null,
  teknisi text,
  jenis_pekerjaan text not null default 'Trade In'
    check (jenis_pekerjaan in ('Trade In', 'Replace', 'Aktivasi Online Baru', 'Relokasi')),
  tanggal date not null default current_date,
  status text not null default 'menunggu_foto'
    check (status in ('menunggu_foto', 'foto_lengkap', 'perlu_perbaikan', 'final', 'terarsip', 'dibatalkan')),
  claimed_by uuid references profiles(id),
  claimed_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz,
  archived_at timestamptz,
  drive_file_id text,
  drive_url text
);

alter table if exists reports add column if not exists teknisi text;

create index if not exists idx_reports_status_tanggal on reports (status, tanggal desc);
create index if not exists idx_reports_wsid on reports (wsid);

-- 3. Tabel Slot Foto (34 slot master)
create table if not exists photo_slots (
  key text primary key,
  label text not null,
  grp text not null,
  sort int not null,
  aspect_w int not null,
  aspect_h int not null,
  tier text not null check (tier in ('standar', 'detail', 'dokumen')),
  cell_w_cm numeric(4,1) not null,
  cell_h_cm numeric(4,1) not null,
  reuse_of text references photo_slots(key)
);

-- 4. Tabel Foto Laporan (Report Photos)
create table if not exists report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  slot_key text not null references photo_slots(key),
  storage_path text,
  thumb_path text,
  shared_from text references photo_slots(key),
  width int,
  height int,
  bytes int,
  source text check (source in ('kamera', 'galeri')),
  taken_at timestamptz,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now(),
  review text not null default 'menunggu' check (review in ('menunggu', 'diterima', 'ditolak')),
  review_note text,
  unique (report_id, slot_key),
  check (storage_path is not null or shared_from is not null)
);

-- 5. Tabel Master Data
create table if not exists master_vendor (
  id serial primary key,
  nama text not null,
  peran text
);

create table if not exists master_mesin (
  id serial primary key,
  tipe text not null
);

create table if not exists master_orang (
  id serial primary key,
  nama text not null,
  jabatan text
);

-- 6. Tabel Log Aktivitas
create table if not exists activity_log (
  id bigserial primary key,
  report_id uuid references reports(id) on delete cascade,
  user_id uuid references profiles(id),
  aksi text not null,
  detail jsonb,
  waktu timestamptz not null default now()
);

-- 7. Trigger Otomatis updated_at pada Reports
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_reports_updated_at on reports;
create trigger trigger_reports_updated_at
  before update on reports
  for each row
  execute function update_updated_at_column();
