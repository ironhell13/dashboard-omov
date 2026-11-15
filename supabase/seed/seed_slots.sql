-- Seed: 34 Slot Foto LAPORAN OMOV
-- Mengikuti Dokumen SPEC.md Bagian A.7

insert into photo_slots (key, label, grp, sort, aspect_w, aspect_h, tier, cell_w_cm, cell_h_cm, reuse_of)
values
  ('grounding_pln', 'Grounding dari PLN', 'Kelistrikan', 1, 4, 3, 'detail', 4.5, 3.4, null),
  ('voltage_pln', 'Voltage dari PLN', 'Kelistrikan', 2, 4, 3, 'detail', 4.5, 3.4, null),
  ('grounding_ups', 'Grounding setelah UPS-IT', 'Kelistrikan', 3, 4, 3, 'detail', 4.5, 3.4, null),
  ('voltage_ups', 'Voltage setelah UPS-IT', 'Kelistrikan', 4, 4, 3, 'detail', 4.5, 3.4, null),
  ('stop_kontak', 'Stop Kontak Dinding', 'Kelistrikan', 5, 4, 3, 'standar', 4.5, 3.4, null),
  ('mcb', 'MCB', 'Kelistrikan', 6, 4, 3, 'standar', 4.5, 3.4, null),

  ('tampak_mesin', 'Tampak Mesin', 'Tampak dan Perangkat', 7, 4, 3, 'standar', 4.5, 3.4, null),
  ('perangkat_pendukung', 'Perangkat Pendukung', 'Tampak dan Perangkat', 8, 4, 3, 'standar', 4.5, 3.4, null),
  ('sudut_kamera', 'Sudut Pandang Kamera', 'Tampak dan Perangkat', 9, 4, 3, 'standar', 4.5, 3.4, null),
  ('jalur_kabel', 'Jalur Kabel Terproteksi', 'Tampak dan Perangkat', 10, 4, 3, 'standar', 4.5, 3.4, null),
  ('cencon', 'Cencon', 'Tampak dan Perangkat', 11, 4, 3, 'standar', 4.5, 3.4, null),
  ('neon_box', 'Neon Box', 'Tampak dan Perangkat', 12, 4, 3, 'standar', 4.5, 3.4, null),
  ('led_sticker', 'LED dan Sticker', 'Tampak dan Perangkat', 13, 4, 3, 'standar', 4.5, 3.4, null),
  ('kaset_cadangan', 'Kaset Cadangan', 'Tampak dan Perangkat', 14, 4, 3, 'standar', 4.5, 3.4, null),
  ('dynabolt', 'Dynabolt', 'Tampak dan Perangkat', 15, 4, 3, 'standar', 4.5, 3.4, null),

  ('sn_mesin', 'S/N Mesin', 'Nomor Seri', 16, 4, 3, 'detail', 4.5, 3.4, null),
  ('sn_kamera', 'S/N Kamera', 'Nomor Seri', 17, 4, 3, 'detail', 4.5, 3.4, null),
  ('sn_dvr', 'S/N DVR', 'Nomor Seri', 18, 4, 3, 'detail', 4.5, 3.4, null),
  ('sn_ups', 'S/N UPS', 'Nomor Seri', 19, 4, 3, 'detail', 4.5, 3.4, null),
  ('sn_led', 'SN LED', 'Nomor Seri', 20, 4, 3, 'detail', 4.5, 3.4, null),

  ('hdd_sebelum', 'Sebelum Destroy HDD', 'Destroy HDD', 21, 4, 3, 'standar', 4.5, 3.4, null),
  ('hdd_setelah', 'Setelah Destroy HDD', 'Destroy HDD', 22, 4, 3, 'standar', 4.5, 3.4, null),
  ('ba_hdd', 'BA Destroy HDD', 'Destroy HDD', 23, 4, 3, 'dokumen', 4.5, 3.4, null),

  ('v_mesin_online', 'Mesin Online', 'Waktu Hadir Vendor', 24, 5, 6, 'standar', 4.7, 5.7, null),
  ('v_instalasi', 'Vendor Instalasi', 'Waktu Hadir Vendor', 25, 5, 6, 'standar', 4.7, 5.7, null),
  ('v_mover', 'Vendor Mover', 'Waktu Hadir Vendor', 26, 5, 6, 'standar', 4.7, 5.7, null),
  ('v_cctv', 'Vendor CCTV', 'Waktu Hadir Vendor', 27, 5, 6, 'standar', 4.7, 5.7, null),
  ('v_mesin', 'Vendor Mesin', 'Waktu Hadir Vendor', 28, 5, 6, 'standar', 4.7, 5.7, null),
  ('v_pkt1', 'PKT (1)', 'Waktu Hadir Vendor', 29, 5, 6, 'standar', 4.7, 5.7, null),
  ('v_pkt2', 'PKT (2)', 'Waktu Hadir Vendor', 30, 5, 6, 'standar', 4.7, 5.7, null),
  ('v_nb', 'Vendor NB', 'Waktu Hadir Vendor', 31, 5, 6, 'standar', 4.7, 5.7, null),

  ('dyn_sebelum', 'Sebelum pemasangan dynabolt', 'BA Dynabolt', 32, 4, 5, 'standar', 5.2, 6.5, null),
  ('dyn_sesudah', 'Sesudah pemasangan dynabolt', 'BA Dynabolt', 33, 4, 5, 'standar', 5.2, 6.5, null),

  ('ba_hdd_full', 'Foto BA Penghancuran HDD (hal. 6)', 'Otomatis', 34, 7, 10, 'dokumen', 13.2, 18.6, 'ba_hdd')
on conflict (key) do update set
  label = excluded.label,
  grp = excluded.grp,
  sort = excluded.sort,
  aspect_w = excluded.aspect_w,
  aspect_h = excluded.aspect_h,
  tier = excluded.tier,
  cell_w_cm = excluded.cell_w_cm,
  cell_h_cm = excluded.cell_h_cm,
  reuse_of = excluded.reuse_of;

-- Master data awal
insert into master_vendor (nama, peran) values
  ('PT TAG', 'Vendor Instalasi & Mover'),
  ('PT ACS', 'Vendor CCTV & Keamanan'),
  ('PT NCR', 'Vendor Mesin ATM'),
  ('PT Diebold Nixdorf', 'Vendor Mesin ATM'),
  ('PT PKT', 'Vendor Jaringan & Komunikasi')
on conflict do nothing;

insert into master_mesin (tipe) values
  ('NCR 6625'),
  ('NCR 6632'),
  ('Diebold 5500'),
  ('Diebold 7500'),
  ('Hyosung Monimax 5600')
on conflict do nothing;

insert into master_orang (nama, jabatan) values
  ('Budi Santoso', 'Supervisor Operasional'),
  ('Ahmad Fauzi', 'Koordinator Lapangan')
on conflict do nothing;

