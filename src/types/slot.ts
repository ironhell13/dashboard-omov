export type PhotoSlotTier = 'standar' | 'detail' | 'dokumen';
export type PhotoSource = 'kamera' | 'galeri';
export type PhotoReviewStatus = 'menunggu' | 'diterima' | 'ditolak';

export interface PhotoSlot {
  key: string;
  label: string;
  grp: string;
  sort: number;
  aspect_w: number;
  aspect_h: number;
  tier: PhotoSlotTier;
  cell_w_cm: number;
  cell_h_cm: number;
  reuse_of?: string | null;
}

export const PHOTO_SLOTS: PhotoSlot[] = [
  // 1-6 Kelistrikan
  { key: 'grounding_pln', label: 'Grounding dari PLN', grp: 'Kelistrikan', sort: 1, aspect_w: 4, aspect_h: 3, tier: 'detail', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'voltage_pln', label: 'Voltage dari PLN', grp: 'Kelistrikan', sort: 2, aspect_w: 4, aspect_h: 3, tier: 'detail', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'grounding_ups', label: 'Grounding setelah UPS-IT', grp: 'Kelistrikan', sort: 3, aspect_w: 4, aspect_h: 3, tier: 'detail', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'voltage_ups', label: 'Voltage setelah UPS-IT', grp: 'Kelistrikan', sort: 4, aspect_w: 4, aspect_h: 3, tier: 'detail', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'stop_kontak', label: 'Stop Kontak Dinding', grp: 'Kelistrikan', sort: 5, aspect_w: 4, aspect_h: 3, tier: 'standar', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'mcb', label: 'MCB', grp: 'Kelistrikan', sort: 6, aspect_w: 4, aspect_h: 3, tier: 'standar', cell_w_cm: 4.5, cell_h_cm: 3.4 },

  // 7-15 Tampak dan Perangkat
  { key: 'tampak_mesin', label: 'Tampak Mesin', grp: 'Tampak dan Perangkat', sort: 7, aspect_w: 4, aspect_h: 3, tier: 'standar', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'perangkat_pendukung', label: 'Perangkat Pendukung', grp: 'Tampak dan Perangkat', sort: 8, aspect_w: 4, aspect_h: 3, tier: 'standar', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'sudut_kamera', label: 'Sudut Pandang Kamera', grp: 'Tampak dan Perangkat', sort: 9, aspect_w: 4, aspect_h: 3, tier: 'standar', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'jalur_kabel', label: 'Jalur Kabel Terproteksi', grp: 'Tampak dan Perangkat', sort: 10, aspect_w: 4, aspect_h: 3, tier: 'standar', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'cencon', label: 'Cencon', grp: 'Tampak dan Perangkat', sort: 11, aspect_w: 4, aspect_h: 3, tier: 'standar', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'neon_box', label: 'Neon Box', grp: 'Tampak dan Perangkat', sort: 12, aspect_w: 4, aspect_h: 3, tier: 'standar', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'led_sticker', label: 'LED dan Sticker', grp: 'Tampak dan Perangkat', sort: 13, aspect_w: 4, aspect_h: 3, tier: 'standar', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'kaset_cadangan', label: 'Kaset Cadangan', grp: 'Tampak dan Perangkat', sort: 14, aspect_w: 4, aspect_h: 3, tier: 'standar', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'dynabolt', label: 'Dynabolt', grp: 'Tampak dan Perangkat', sort: 15, aspect_w: 4, aspect_h: 3, tier: 'standar', cell_w_cm: 4.5, cell_h_cm: 3.4 },

  // 16-20 Nomor Seri
  { key: 'sn_mesin', label: 'S/N Mesin', grp: 'Nomor Seri', sort: 16, aspect_w: 4, aspect_h: 3, tier: 'detail', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'sn_kamera', label: 'S/N Kamera', grp: 'Nomor Seri', sort: 17, aspect_w: 4, aspect_h: 3, tier: 'detail', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'sn_dvr', label: 'S/N DVR', grp: 'Nomor Seri', sort: 18, aspect_w: 4, aspect_h: 3, tier: 'detail', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'sn_ups', label: 'S/N UPS', grp: 'Nomor Seri', sort: 19, aspect_w: 4, aspect_h: 3, tier: 'detail', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'sn_led', label: 'SN LED', grp: 'Nomor Seri', sort: 20, aspect_w: 4, aspect_h: 3, tier: 'detail', cell_w_cm: 4.5, cell_h_cm: 3.4 },

  // 21-23 Destroy HDD
  { key: 'hdd_sebelum', label: 'Sebelum Destroy HDD', grp: 'Destroy HDD', sort: 21, aspect_w: 4, aspect_h: 3, tier: 'standar', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'hdd_setelah', label: 'Setelah Destroy HDD', grp: 'Destroy HDD', sort: 22, aspect_w: 4, aspect_h: 3, tier: 'standar', cell_w_cm: 4.5, cell_h_cm: 3.4 },
  { key: 'ba_hdd', label: 'BA Destroy HDD', grp: 'Destroy HDD', sort: 23, aspect_w: 4, aspect_h: 3, tier: 'dokumen', cell_w_cm: 4.5, cell_h_cm: 3.4 },

  // 24-31 Waktu Hadir Vendor
  { key: 'v_mesin_online', label: 'Mesin Online', grp: 'Waktu Hadir Vendor', sort: 24, aspect_w: 5, aspect_h: 6, tier: 'standar', cell_w_cm: 4.7, cell_h_cm: 5.7 },
  { key: 'v_instalasi', label: 'Vendor Instalasi', grp: 'Waktu Hadir Vendor', sort: 25, aspect_w: 5, aspect_h: 6, tier: 'standar', cell_w_cm: 4.7, cell_h_cm: 5.7 },
  { key: 'v_mover', label: 'Vendor Mover', grp: 'Waktu Hadir Vendor', sort: 26, aspect_w: 5, aspect_h: 6, tier: 'standar', cell_w_cm: 4.7, cell_h_cm: 5.7 },
  { key: 'v_cctv', label: 'Vendor CCTV', grp: 'Waktu Hadir Vendor', sort: 27, aspect_w: 5, aspect_h: 6, tier: 'standar', cell_w_cm: 4.7, cell_h_cm: 5.7 },
  { key: 'v_mesin', label: 'Vendor Mesin', grp: 'Waktu Hadir Vendor', sort: 28, aspect_w: 5, aspect_h: 6, tier: 'standar', cell_w_cm: 4.7, cell_h_cm: 5.7 },
  { key: 'v_pkt1', label: 'PKT (1)', grp: 'Waktu Hadir Vendor', sort: 29, aspect_w: 5, aspect_h: 6, tier: 'standar', cell_w_cm: 4.7, cell_h_cm: 5.7 },
  { key: 'v_pkt2', label: 'PKT (2)', grp: 'Waktu Hadir Vendor', sort: 30, aspect_w: 5, aspect_h: 6, tier: 'standar', cell_w_cm: 4.7, cell_h_cm: 5.7 },
  { key: 'v_nb', label: 'Vendor NB', grp: 'Waktu Hadir Vendor', sort: 31, aspect_w: 5, aspect_h: 6, tier: 'standar', cell_w_cm: 4.7, cell_h_cm: 5.7 },

  // 32-33 BA Dynabolt
  { key: 'dyn_sebelum', label: 'Sebelum pemasangan dynabolt', grp: 'BA Dynabolt', sort: 32, aspect_w: 4, aspect_h: 5, tier: 'standar', cell_w_cm: 5.2, cell_h_cm: 6.5 },
  { key: 'dyn_sesudah', label: 'Sesudah pemasangan dynabolt', grp: 'BA Dynabolt', sort: 33, aspect_w: 4, aspect_h: 5, tier: 'standar', cell_w_cm: 5.2, cell_h_cm: 6.5 },

  // 34 Halaman 6
  { key: 'ba_hdd_full', label: 'Foto BA Penghancuran HDD (hal. 6)', grp: 'Otomatis', sort: 34, aspect_w: 7, aspect_h: 10, tier: 'dokumen', cell_w_cm: 13.2, cell_h_cm: 18.6, reuse_of: 'ba_hdd' },
];

export const GROUPS = [
  'Kelistrikan',
  'Tampak dan Perangkat',
  'Nomor Seri',
  'Destroy HDD',
  'Waktu Hadir Vendor',
  'BA Dynabolt',
  'Otomatis',
] as const;

