export type UserRole = 'superadmin' | 'supervisor' | 'lapangan';

export type ReportStatus =
  | 'menunggu_foto'
  | 'foto_lengkap'
  | 'perlu_perbaikan'
  | 'final'
  | 'terarsip'
  | 'dibatalkan';

export type JenisPekerjaan =
  | 'Trade In'
  | 'Replace'
  | 'Aktivasi Online Baru'
  | 'Relokasi';

export interface Profile {
  id: string;
  nama: string;
  role: UserRole;
  aktif: boolean;
  created_at: string;
}

export interface ReportData {
  // Identitas
  lokasi?: string;
  wsid?: string;
  teknisi?: string;
  jenis_pekerjaan?: JenisPekerjaan;
  tanggal?: string;
  alamat?: string;
  lokasi_lama?: string;
  wsid_lama?: string;
  type_mesin_baru?: string;
  serial_nomor?: string;

  // Kelistrikan
  tegangan_ups_it?: string | number;
  grounding_ups_it?: string | number;

  // Jaringan
  initial_vsat?: string;
  konfigurasi?: string;
  ip_address?: string;

  // Isi Mesin
  cartridge?: string;
  reject?: string;
  kunci?: string;

  // Perangkat
  cencon?: string;
  kamera?: string;
  perekam?: string;
  pin_cover?: string;
  fdi?: string;
  ac?: string;
  masterkey_triple_des?: 'Ya' | 'Tidak';
  masterkey_alasan?: string;

  // Outdoor
  neon_sign?: string;
  stiker_mesin?: string;

  // Indoor
  kabel_jalur?: string;
  colokan_listrik?: string;
  perekam_eksternal?: { status?: string; merk?: string; sn?: string };
  kamera_eksternal?: { status?: string; merk?: string; sn?: string };
  ups?: { status?: string; merk?: string; sn?: string };
  led?: { status?: string; merk?: string; sn?: string };

  // Letak dan Pengaman
  letak_mesin?: string;
  angkur?: 'Ya' | 'Tidak';
  angkur_vendor?: string;
  pengaman_pengganti?: { dynabolt?: boolean; alarm?: boolean };
  angkur_alasan?: string;
  supersite?: 'Ya' | 'Tidak';
  supersite_vendor?: string;
  supersite_alasan?: string;
  exhaust_fan_jumlah?: string | number;
  exhaust_fan_status?: 'Nyala' | 'Mati';

  // Lain-lain
  tanggal_email_permintaan?: string;
  koordinat?: { lat?: number; lng?: number };

  // Penandatangan
  kota?: string;
  yang_melakukan?: string;
  mengetahui?: string;

  // Waktu Hadir Vendor
  jadwal_aktivasi?: string;
  vendor_hadir?: {
    mesin_online?: { nama?: string; waktu?: string };
    vendor_instalasi?: { nama?: string; waktu?: string };
    vendor_mover?: { nama?: string; waktu?: string };
    vendor_cctv?: { nama?: string; waktu?: string };
    vendor_mesin?: { nama?: string; waktu?: string };
    pkt1?: { nama?: string; waktu?: string };
    pkt2?: { nama?: string; waktu?: string };
    vendor_nb?: { nama?: string; waktu?: string };
  };
  keterangan_vendor?: string;
  penandatangan_vendor?: string;

  // BA Dynabolt
  type_mesin_lama?: string;
  sn_mesin_lama?: string;
}

export interface Report {
  id: string;
  wsid: string;
  lokasi: string;
  teknisi?: string;
  jenis_pekerjaan: JenisPekerjaan;
  tanggal: string;
  status: ReportStatus;
  claimed_by?: string | null;
  claimed_at?: string | null;
  data: ReportData;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  finalized_at?: string | null;
  archived_at?: string | null;
  drive_file_id?: string | null;
  drive_url?: string | null;
}

export interface ReportPhoto {
  id: string;
  report_id: string;
  slot_key: string;
  storage_path?: string | null;
  thumb_path?: string | null;
  shared_from?: string | null;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
  source?: 'kamera' | 'galeri' | null;
  taken_at?: string | null;
  uploaded_by?: string | null;
  uploaded_at: string;
  review: 'menunggu' | 'diterima' | 'ditolak';
  review_note?: string | null;
}

export interface LokasiLapanganView {
  id: string;
  wsid: string;
  lokasi: string;
  teknisi?: string;
  jenis_pekerjaan: JenisPekerjaan;
  tanggal: string;
  status: ReportStatus;
  claimed_by?: string | null;
  claimed_by_nama?: string | null;
  claimed_at?: string | null;
  terisi: number;
  total: number;
}

