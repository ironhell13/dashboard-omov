-- Migrasi 3: Storage Bucket dan Storage Policies
-- Mengikuti Dokumen SPEC.md Bagian A.6 dan A.13

-- 1. Buat bucket privat 'laporan-foto'
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'laporan-foto',
  'laporan-foto',
  false,
  10485760, -- 10 MB per file max
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 2. Kebijakan Storage: Supervisor Full Access
drop policy if exists "Storage: supervisor full access" on storage.objects;
create policy "Storage: supervisor full access"
  on storage.objects for all
  using (
    bucket_id = 'laporan-foto'
    and current_user_role() = 'supervisor'
  );

-- 3. Kebijakan Storage: Lapangan / Anon SELECT (hanya laporan aktif)
drop policy if exists "Storage: lapangan select active" on storage.objects;
create policy "Storage: lapangan select active"
  on storage.objects for select
  using (
    bucket_id = 'laporan-foto'
    and (current_user_role() = 'lapangan' or auth.role() = 'anon')
    and exists (
      select 1 from reports r
      where r.id::text = (storage.foldername(name))[1]
        and r.status in ('menunggu_foto', 'perlu_perbaikan', 'foto_lengkap')
    )
  );

-- 4. Kebijakan Storage: Lapangan / Anon INSERT (hanya laporan aktif)
drop policy if exists "Storage: lapangan insert active" on storage.objects;
create policy "Storage: lapangan insert active"
  on storage.objects for insert
  with check (
    bucket_id = 'laporan-foto'
    and (current_user_role() = 'lapangan' or auth.role() = 'anon')
    and exists (
      select 1 from reports r
      where r.id::text = (storage.foldername(name))[1]
        and r.status in ('menunggu_foto', 'perlu_perbaikan', 'foto_lengkap')
    )
  );

-- 5. Kebijakan Storage: Lapangan / Anon UPDATE (hanya laporan aktif)
drop policy if exists "Storage: lapangan update active" on storage.objects;
create policy "Storage: lapangan update active"
  on storage.objects for update
  using (
    bucket_id = 'laporan-foto'
    and (current_user_role() = 'lapangan' or auth.role() = 'anon')
    and exists (
      select 1 from reports r
      where r.id::text = (storage.foldername(name))[1]
        and r.status in ('menunggu_foto', 'perlu_perbaikan', 'foto_lengkap')
    )
  );

