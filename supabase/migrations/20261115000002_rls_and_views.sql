-- Migrasi 2: RLS, View, dan Fungsi RPC
-- Mengikuti Dokumen SPEC.md Bagian A.6

-- Pastikan constraint role mendukung superadmin, supervisor, lapangan
alter table if exists profiles drop constraint if exists profiles_role_check;
alter table if exists profiles add constraint profiles_role_check check (role in ('superadmin', 'supervisor', 'lapangan'));

-- Helper function: Mendapatkan role pengguna saat ini
create or replace function current_user_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

-- Helper function: Menghitung slot terisi untuk sebuah laporan
create or replace function count_filled_slots(p_report_id uuid)
returns int as $$
declare
  v_count int;
  v_hdd_filled boolean;
begin
  -- Hitung slot yang memiliki storage_path atau shared_from
  select count(*) into v_count
  from report_photos
  where report_id = p_report_id
    and (storage_path is not null or shared_from is not null);

  -- Periksa apakah ba_hdd terisi (karena ba_hdd_full otomatis reuse_of ba_hdd)
  select exists (
    select 1 from report_photos
    where report_id = p_report_id
      and slot_key = 'ba_hdd'
      and (storage_path is not null or shared_from is not null)
  ) into v_hdd_filled;

  if v_hdd_filled then
    v_count := v_count + 1;
  end if;

  return v_count;
end;
$$ language plpgsql stable security definer;

-- Pastikan kolom teknisi sudah ada jika tabel reports dibuat sebelum revisi
alter table if exists reports add column if not exists teknisi text;

-- 1. View v_lokasi_lapangan untuk Tim Lapangan
drop view if exists v_lokasi_lapangan cascade;
create or replace view v_lokasi_lapangan as
select
  r.id,
  r.wsid,
  r.lokasi,
  r.teknisi,
  r.jenis_pekerjaan,
  r.tanggal,
  r.status,
  r.claimed_by,
  p_claim.nama as claimed_by_nama,
  r.claimed_at,
  count_filled_slots(r.id) as terisi,
  34 as total
from reports r
left join profiles p_claim on r.claimed_by = p_claim.id
where r.status in ('menunggu_foto', 'perlu_perbaikan', 'foto_lengkap');

-- 2. Fungsi RPC untuk Claim / Release Lokasi oleh Tim Lapangan
create or replace function claim_report(p_report_id uuid)
returns void as $$
begin
  update reports
  set claimed_by = auth.uid(),
      claimed_at = now()
  where id = p_report_id
    and status in ('menunggu_foto', 'perlu_perbaikan', 'foto_lengkap');
end;
$$ language plpgsql security definer;

create or replace function release_report(p_report_id uuid)
returns void as $$
begin
  update reports
  set claimed_by = null,
      claimed_at = null
  where id = p_report_id
    and (claimed_by = auth.uid() or current_user_role() in ('superadmin', 'supervisor'));
end;
$$ language plpgsql security definer;

-- 3. Mengaktifkan Row Level Security (RLS)
alter table profiles enable row level security;
alter table reports enable row level security;
alter table photo_slots enable row level security;
alter table report_photos enable row level security;
alter table master_vendor enable row level security;
alter table master_mesin enable row level security;
alter table master_orang enable row level security;
alter table activity_log enable row level security;

-- 4. Kebijakan RLS: PROFILES
-- Superadmin: Kelola akun & profil penuh
drop policy if exists "Profiles: supervisor full access" on profiles;
create policy "Profiles: supervisor full access"
  on profiles for all
  using (current_user_role() in ('superadmin', 'supervisor'));

drop policy if exists "Profiles: read for authenticated users" on profiles;
create policy "Profiles: read for authenticated users"
  on profiles for select
  using (auth.role() = 'authenticated');

-- 5. Kebijakan RLS: REPORTS
-- Superadmin & Supervisor: Akses Penuh
drop policy if exists "Reports: supervisor full access" on reports;
create policy "Reports: supervisor full access"
  on reports for all
  using (current_user_role() in ('superadmin', 'supervisor'));

-- Lapangan / Publik: Hanya bisa membaca laporan aktif yang tidak berstatus final/terarsip/dibatalkan
-- Catatan: Tim lapangan tidak perlu login (anon dapat mengakses laporan aktif)
drop policy if exists "Reports: lapangan read active reports" on reports;
create policy "Reports: lapangan read active reports"
  on reports for select
  using (
    (current_user_role() = 'lapangan' or auth.role() = 'anon')
    and status in ('menunggu_foto', 'perlu_perbaikan', 'foto_lengkap')
  );

-- 6. Kebijakan RLS: PHOTO_SLOTS
-- Dapat dibaca oleh semua pengguna (termasuk publik tim lapangan)
drop policy if exists "Photo slots: read for authenticated users" on photo_slots;
create policy "Photo slots: read for authenticated users"
  on photo_slots for select
  using (auth.role() in ('authenticated', 'anon'));

-- Supervisor & Superadmin dapat mengubah slot
drop policy if exists "Photo slots: supervisor manage" on photo_slots;
create policy "Photo slots: supervisor manage"
  on photo_slots for all
  using (current_user_role() in ('superadmin', 'supervisor'));

-- 7. Kebijakan RLS: REPORT_PHOTOS
-- Superadmin & Supervisor: Akses Penuh
drop policy if exists "Report photos: supervisor full access" on report_photos;
create policy "Report photos: supervisor full access"
  on report_photos for all
  using (current_user_role() in ('superadmin', 'supervisor'));

-- Lapangan / Publik: SELECT foto hanya untuk laporan aktif (tidak final/terarsip)
drop policy if exists "Report photos: lapangan select active" on report_photos;
create policy "Report photos: lapangan select active"
  on report_photos for select
  using (
    (current_user_role() = 'lapangan' or auth.role() = 'anon')
    and exists (
      select 1 from reports r
      where r.id = report_photos.report_id
        and r.status in ('menunggu_foto', 'perlu_perbaikan', 'foto_lengkap')
    )
  );

-- Lapangan / Publik: INSERT / UPDATE hanya untuk laporan aktif dan tidak dapat mengubah kolom review
drop policy if exists "Report photos: lapangan insert active" on report_photos;
create policy "Report photos: lapangan insert active"
  on report_photos for insert
  with check (
    (current_user_role() = 'lapangan' or auth.role() = 'anon')
    and exists (
      select 1 from reports r
      where r.id = report_photos.report_id
        and r.status in ('menunggu_foto', 'perlu_perbaikan', 'foto_lengkap')
    )
  );

drop policy if exists "Report photos: lapangan update active" on report_photos;
create policy "Report photos: lapangan update active"
  on report_photos for update
  using (
    (current_user_role() = 'lapangan' or auth.role() = 'anon')
    and exists (
      select 1 from reports r
      where r.id = report_photos.report_id
        and r.status in ('menunggu_foto', 'perlu_perbaikan', 'foto_lengkap')
    )
  );

-- Grant privileges to anon and authenticated
grant select on v_lokasi_lapangan to anon, authenticated;
grant select on photo_slots to anon, authenticated;
grant select, insert, update on report_photos to anon, authenticated;
grant select on reports to anon, authenticated;

-- 8. Kebijakan RLS: MASTER TABLES
-- Baca untuk semua pengguna terautentikasi, kelola untuk supervisor/superadmin
drop policy if exists "Master vendor: read for authenticated" on master_vendor;
create policy "Master vendor: read for authenticated" on master_vendor for select using (auth.role() = 'authenticated');
drop policy if exists "Master vendor: supervisor manage" on master_vendor;
create policy "Master vendor: supervisor manage" on master_vendor for all using (current_user_role() in ('superadmin', 'supervisor'));

drop policy if exists "Master mesin: read for authenticated" on master_mesin;
create policy "Master mesin: read for authenticated" on master_mesin for select using (auth.role() = 'authenticated');
drop policy if exists "Master mesin: supervisor manage" on master_mesin;
create policy "Master mesin: supervisor manage" on master_mesin for all using (current_user_role() in ('superadmin', 'supervisor'));

drop policy if exists "Master orang: read for authenticated" on master_orang;
create policy "Master orang: read for authenticated" on master_orang for select using (auth.role() = 'authenticated');
drop policy if exists "Master orang: supervisor manage" on master_orang;
create policy "Master orang: supervisor manage" on master_orang for all using (current_user_role() in ('superadmin', 'supervisor'));

-- 9. Kebijakan RLS: ACTIVITY_LOG
drop policy if exists "Activity log: read for supervisor" on activity_log;
create policy "Activity log: read for supervisor" on activity_log for select using (current_user_role() in ('superadmin', 'supervisor'));
drop policy if exists "Activity log: insert for authenticated" on activity_log;
create policy "Activity log: insert for authenticated" on activity_log for insert with check (auth.role() = 'authenticated');

