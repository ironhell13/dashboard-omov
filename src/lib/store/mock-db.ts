import { Report, ReportData, UserRole } from '@/types/database';

export interface MasterVendor {
  id: number;
  nama: string;
  peran?: string;
}

export interface MasterMesin {
  id: number;
  tipe: string;
}

export interface MasterOrang {
  id: number;
  nama: string;
  jabatan?: string;
}

export interface UserAccount {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  aktif: boolean;
  createdAt: string;
}

// In-memory persistent database for testing/runtime
let mockReports: Report[] = [
  {
    id: 'rep-01',
    wsid: 'Z9KD',
    lokasi: 'SPBU 3415143 Otista',
    teknisi: 'Ahmad Fauzi',
    jenis_pekerjaan: 'Trade In',
    tanggal: '2026-11-15',
    status: 'menunggu_foto',
    claimed_by: 'user-02',
    claimed_at: '2026-11-15T02:30:00Z',
    created_at: '2026-11-15T01:00:00Z',
    updated_at: '2026-11-15T02:30:00Z',
    data: {
      wsid: 'Z9KD',
      lokasi: 'SPBU 3415143 Otista',
      teknisi: 'Ahmad Fauzi',
      alamat: 'Jl. Raya Otista No. 143, Tangerang',
      type_mesin_baru: 'NCR 6625',
      serial_nomor: 'SN-99887722',
      tegangan_ups_it: 220,
      grounding_ups_it: 1.2,
      ip_address: '10.24.112.45',
      cartridge: '4 Kaset (Rp 100.000,-)',
      reject: '1 Kaset',
      kunci: 'Lengkap di Posisi 1',
      kota: 'Jakarta',
      yang_melakukan: 'Ahmad Fauzi',
      mengetahui: 'Budi Santoso',
    },
  },
  {
    id: 'rep-02',
    wsid: 'B482',
    lokasi: 'KCP Daan Mogot Mall',
    teknisi: 'Bambang Irawan',
    jenis_pekerjaan: 'Replace',
    tanggal: '2026-11-15',
    status: 'foto_lengkap',
    claimed_by: 'user-03',
    claimed_at: '2026-11-15T03:00:00Z',
    created_at: '2026-11-15T02:00:00Z',
    updated_at: '2026-11-15T04:15:00Z',
    data: {
      wsid: 'B482',
      lokasi: 'KCP Daan Mogot Mall',
      teknisi: 'Bambang Irawan',
      alamat: 'Mall Daan Mogot Lt. Dasar, Jakarta Barat',
      type_mesin_baru: 'Diebold 5500',
      serial_nomor: 'DB-441122',
      tegangan_ups_it: 223,
      grounding_ups_it: 0.8,
      ip_address: '10.30.12.88',
      kota: 'Jakarta',
      yang_melakukan: 'Bambang Irawan',
      mengetahui: 'Budi Santoso',
    },
  },
  {
    id: 'rep-03',
    wsid: 'A199',
    lokasi: 'Indomaret HOS Cokroaminoto',
    teknisi: 'Eko Prasetyo',
    jenis_pekerjaan: 'Aktivasi Online Baru',
    tanggal: '2026-11-15',
    status: 'perlu_perbaikan',
    claimed_by: 'user-04',
    claimed_at: '2026-11-15T04:00:00Z',
    created_at: '2026-11-15T03:00:00Z',
    updated_at: '2026-11-15T04:45:00Z',
    data: {
      wsid: 'A199',
      lokasi: 'Indomaret HOS Cokroaminoto',
      teknisi: 'Eko Prasetyo',
      alamat: 'Jl. HOS Cokroaminoto No. 89, Larangan, Tangerang',
      type_mesin_baru: 'NCR 6632',
      serial_nomor: 'NC-772211',
      kota: 'Jakarta',
      yang_melakukan: 'Eko Prasetyo',
      mengetahui: 'Budi Santoso',
    },
  },
  {
    id: 'rep-04',
    wsid: 'K881',
    lokasi: 'Alfamart Ciledug Raya',
    teknisi: 'Ahmad Fauzi',
    jenis_pekerjaan: 'Relokasi',
    tanggal: '2026-11-14',
    status: 'final',
    created_at: '2026-11-14T05:00:00Z',
    updated_at: '2026-11-14T09:00:00Z',
    finalized_at: '2026-11-14T09:00:00Z',
    data: {
      wsid: 'K881',
      lokasi: 'Alfamart Ciledug Raya',
      teknisi: 'Ahmad Fauzi',
      alamat: 'Jl. Ciledug Raya No. 12, Tangerang',
      type_mesin_baru: 'Hyosung Monimax 5600',
      serial_nomor: 'HY-123456',
      kota: 'Jakarta',
      yang_melakukan: 'Ahmad Fauzi',
      mengetahui: 'Budi Santoso',
    },
  },
];

let mockVendors: MasterVendor[] = [
  { id: 1, nama: 'PT TAG', peran: 'Vendor Instalasi & Mover' },
  { id: 2, nama: 'PT ACS', peran: 'Vendor CCTV & Keamanan' },
  { id: 3, nama: 'PT NCR', peran: 'Vendor Mesin ATM' },
  { id: 4, nama: 'PT Diebold Nixdorf', peran: 'Vendor Mesin ATM' },
  { id: 5, nama: 'PT PKT', peran: 'Vendor Jaringan & Komunikasi' },
];

let mockMesin: MasterMesin[] = [
  { id: 1, tipe: 'NCR 6625' },
  { id: 2, tipe: 'NCR 6632' },
  { id: 3, tipe: 'Diebold 5500' },
  { id: 4, tipe: 'Diebold 7500' },
  { id: 5, tipe: 'Hyosung Monimax 5600' },
];

let mockOrang: MasterOrang[] = [
  { id: 1, nama: 'Budi Santoso', jabatan: 'Supervisor Operasional' },
  { id: 2, nama: 'Ahmad Fauzi', jabatan: 'Koordinator Lapangan' },
  { id: 3, nama: 'Bambang Irawan', jabatan: 'Teknisi Lapangan' },
  { id: 4, nama: 'Eko Prasetyo', jabatan: 'Teknisi Lapangan' },
];

let mockUsers: UserAccount[] = [
  { id: 'usr-1', nama: 'Budi Santoso', email: 'budi.santoso@omov.com', role: 'supervisor', aktif: true, createdAt: '2026-11-01' },
  { id: 'usr-2', nama: 'Ahmad Fauzi', email: 'ahmad.fauzi@omov.com', role: 'lapangan', aktif: true, createdAt: '2026-11-01' },
  { id: 'usr-3', nama: 'Bambang Irawan', email: 'bambang.irawan@omov.com', role: 'lapangan', aktif: true, createdAt: '2026-11-05' },
  { id: 'usr-4', nama: 'Eko Prasetyo', email: 'eko.prasetyo@omov.com', role: 'lapangan', aktif: true, createdAt: '2026-11-10' },
];

export const db = {
  // Reports
  getReports: () => [...mockReports],
  getReportById: (id: string) => mockReports.find(r => r.id === id),
  createReport: (report: Partial<Report>): Report => {
    const teknisiName = (report.teknisi || report.data?.teknisi || 'Tim Lapangan OMOV').trim();
    const newReport: Report = {
      id: `rep-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
      wsid: (report.wsid || '').toUpperCase().trim(),
      lokasi: (report.lokasi || '').trim(),
      teknisi: teknisiName,
      jenis_pekerjaan: report.jenis_pekerjaan || 'Trade In',
      tanggal: report.tanggal || new Date().toISOString().split('T')[0],
      status: 'menunggu_foto',
      data: {
        wsid: (report.wsid || '').toUpperCase().trim(),
        lokasi: (report.lokasi || '').trim(),
        teknisi: teknisiName,
        yang_melakukan: teknisiName,
        alamat: report.data?.alamat || '',
        ...report.data,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockReports.unshift(newReport);
    return newReport;
  },
  updateReportData: (id: string, data: Partial<ReportData>, status?: string) => {
    const rep = mockReports.find(r => r.id === id);
    if (!rep) return null;
    rep.data = { ...rep.data, ...data };
    if (data.teknisi) rep.teknisi = data.teknisi;
    if (data.yang_melakukan && !rep.teknisi) rep.teknisi = data.yang_melakukan;
    rep.updated_at = new Date().toISOString();
    if (status) rep.status = status as any;
    return rep;
  },
  deleteReport: (id: string) => {
    const idx = mockReports.findIndex(r => r.id === id);
    if (idx === -1) return false;
    mockReports.splice(idx, 1);
    return true;
  },

  // Masters
  getVendors: () => [...mockVendors],
  addVendor: (nama: string, peran?: string) => {
    const newV: MasterVendor = { id: Date.now(), nama, peran };
    mockVendors.push(newV);
    return newV;
  },
  deleteVendor: (id: number) => {
    mockVendors = mockVendors.filter(v => v.id !== id);
  },

  getMesin: () => [...mockMesin],
  addMesin: (tipe: string) => {
    const newM: MasterMesin = { id: Date.now(), tipe };
    mockMesin.push(newM);
    return newM;
  },
  deleteMesin: (id: number) => {
    mockMesin = mockMesin.filter(m => m.id !== id);
  },

  getOrang: () => [...mockOrang],
  addOrang: (nama: string, jabatan?: string) => {
    const newO: MasterOrang = { id: Date.now(), nama, jabatan };
    mockOrang.push(newO);
    return newO;
  },
  deleteOrang: (id: number) => {
    mockOrang = mockOrang.filter(o => o.id !== id);
  },

  // Users
  getUsers: () => [...mockUsers],
  addUser: (nama: string, email: string, role: UserRole) => {
    const newUser: UserAccount = {
      id: `usr-${Date.now().toString(36)}`,
      nama,
      email,
      role,
      aktif: true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    mockUsers.push(newUser);
    return newUser;
  },
  toggleUserActive: (id: string) => {
    const u = mockUsers.find(user => user.id === id);
    if (u) u.aktif = !u.aktif;
    return u;
  },
};
