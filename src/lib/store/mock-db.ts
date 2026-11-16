import fs from 'fs';
import path from 'path';
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
  password?: string;
  aktif: boolean;
  createdAt: string;
}

const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

// Sample data hanya untuk pengujian unit otomatis (Vitest)
const sampleTestReports: Report[] = [
  {
    id: 'rep-test-01',
    wsid: 'Z9KD-TEST',
    lokasi: 'SPBU Otista Test',
    teknisi: 'Ahmad Fauzi',
    jenis_pekerjaan: 'Trade In',
    tanggal: '2026-11-15',
    status: 'menunggu_foto',
    created_at: '2026-11-15T01:00:00Z',
    updated_at: '2026-11-15T02:30:00Z',
    data: {
      wsid: 'Z9KD-TEST',
      lokasi: 'SPBU Otista Test',
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
];

function getStorageFilePath(): string {
  try {
    const localDir = path.resolve(process.cwd(), '.data');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, 'reports_store.json');
  } catch {
    return '/tmp/omov_reports_store.json';
  }
}

function loadPersistedReports(): Report[] {
  if (isTestEnv) {
    return [...sampleTestReports];
  }
  try {
    const filePath = getStorageFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Gagal membaca cache laporan disk:', err);
  }
  // Di lingkungan produksi/pengembangan, mulai bersih (kosong) tanpa data dummy
  return [];
}

function persistReports(reports: Report[]) {
  if (isTestEnv) return;
  try {
    const filePath = getStorageFilePath();
    fs.writeFileSync(filePath, JSON.stringify(reports, null, 2), 'utf-8');
  } catch (err) {
    console.error('Gagal menyimpan laporan ke disk:', err);
  }
}

let mockReports: Report[] = loadPersistedReports();

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

function getUsersStorageFilePath(): string {
  try {
    const localDir = path.resolve(process.cwd(), '.data');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return path.join(localDir, 'users_store.json');
  } catch {
    return '/tmp/omov_users_store.json';
  }
}

const defaultMockUsers: UserAccount[] = [
  { id: 'usr-0', nama: 'Super Administrator', email: 'admin@omov.com', role: 'superadmin', password: 'admin123', aktif: true, createdAt: '2026-11-01' },
  { id: 'usr-0b', nama: 'Supervisor Operasional', email: 'supervisor@omov.com', role: 'supervisor', password: 'supervisor123', aktif: true, createdAt: '2026-11-01' },
  { id: 'usr-1', nama: 'Budi Santoso', email: 'budi.santoso@omov.com', role: 'supervisor', password: 'supervisor123', aktif: true, createdAt: '2026-11-01' },
  { id: 'usr-2', nama: 'Ahmad Fauzi', email: 'ahmad.fauzi@omov.com', role: 'lapangan', password: 'Omov123!', aktif: true, createdAt: '2026-11-01' },
  { id: 'usr-3', nama: 'Bambang Irawan', email: 'bambang.irawan@omov.com', role: 'lapangan', password: 'Omov123!', aktif: true, createdAt: '2026-11-05' },
  { id: 'usr-4', nama: 'Eko Prasetyo', email: 'eko.prasetyo@omov.com', role: 'lapangan', password: 'Omov123!', aktif: true, createdAt: '2026-11-10' },
];

function loadPersistedUsers(): UserAccount[] {
  try {
    const filePath = getUsersStorageFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasAdmin = parsed.some((u: UserAccount) => u.email.toLowerCase() === 'admin@omov.com');
        const hasSupervisor = parsed.some((u: UserAccount) => u.email.toLowerCase() === 'supervisor@omov.com');
        const merged = [...parsed];
        if (!hasAdmin) {
          merged.unshift(defaultMockUsers[0]);
        }
        if (!hasSupervisor) {
          merged.unshift(defaultMockUsers[1]);
        }
        return merged;
      }
    }
  } catch (err) {
    console.error('Gagal membaca cache pengguna disk:', err);
  }
  return [...defaultMockUsers];
}

function persistUsers(users: UserAccount[]) {
  if (isTestEnv) return;
  try {
    const filePath = getUsersStorageFilePath();
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Gagal menyimpan pengguna ke disk:', err);
  }
}

let mockUsers: UserAccount[] = loadPersistedUsers();

export const db = {
  // Reports
  getReports: () => [...mockReports],
  getReportById: (id: string) => mockReports.find((r) => r.id === id),
  createReport: (report: Partial<Report>): Report => {
    const teknisiName = (report.teknisi || report.data?.teknisi || 'Tim Lapangan OMOV').trim();
    const newReport: Report = {
      id: report.id || `rep-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
      wsid: (report.wsid || '').toUpperCase().trim(),
      lokasi: (report.lokasi || '').trim(),
      teknisi: teknisiName,
      jenis_pekerjaan: report.jenis_pekerjaan || 'Trade In',
      tanggal: report.tanggal || new Date().toISOString().split('T')[0],
      status: report.status || 'menunggu_foto',
      claimed_by: report.claimed_by,
      claimed_at: report.claimed_at,
      data: {
        wsid: (report.wsid || '').toUpperCase().trim(),
        lokasi: (report.lokasi || '').trim(),
        teknisi: teknisiName,
        yang_melakukan: teknisiName,
        alamat: report.data?.alamat || '',
        ...report.data,
      },
      created_at: report.created_at || new Date().toISOString(),
      updated_at: report.updated_at || new Date().toISOString(),
    };

    // Cegah duplikasi jika id sudah ada
    const existingIdx = mockReports.findIndex((r) => r.id === newReport.id);
    if (existingIdx !== -1) {
      mockReports[existingIdx] = newReport;
    } else {
      mockReports.unshift(newReport);
    }

    persistReports(mockReports);
    return newReport;
  },
  updateReportData: (id: string, data: Partial<ReportData>, status?: string) => {
    const rep = mockReports.find((r) => r.id === id);
    if (!rep) return null;
    rep.data = { ...rep.data, ...data };
    if (data.wsid) rep.wsid = data.wsid.toUpperCase().trim();
    if (data.lokasi) rep.lokasi = data.lokasi.trim();
    if (data.teknisi) rep.teknisi = data.teknisi;
    if (data.yang_melakukan && !rep.teknisi) rep.teknisi = data.yang_melakukan;
    if (data.jenis_pekerjaan) rep.jenis_pekerjaan = data.jenis_pekerjaan as any;
    if (data.tanggal) rep.tanggal = data.tanggal;
    rep.updated_at = new Date().toISOString();
    if (status) rep.status = status as any;

    persistReports(mockReports);
    return rep;
  },
  deleteReport: (id: string) => {
    const idx = mockReports.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    mockReports.splice(idx, 1);
    persistReports(mockReports);
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
    const idx = mockVendors.findIndex((v) => v.id === id);
    if (idx !== -1) mockVendors.splice(idx, 1);
  },

  getMesin: () => [...mockMesin],
  addMesin: (tipe: string) => {
    const newM: MasterMesin = { id: Date.now(), tipe };
    mockMesin.push(newM);
    return newM;
  },
  deleteMesin: (id: number) => {
    const idx = mockMesin.findIndex((m) => m.id === id);
    if (idx !== -1) mockMesin.splice(idx, 1);
  },

  getOrang: () => [...mockOrang],
  addOrang: (nama: string, jabatan?: string) => {
    const newO: MasterOrang = { id: Date.now(), nama, jabatan };
    mockOrang.push(newO);
    return newO;
  },
  deleteOrang: (id: number) => {
    const idx = mockOrang.findIndex((o) => o.id === id);
    if (idx !== -1) mockOrang.splice(idx, 1);
  },

  // Users
  getUsers: () => [...mockUsers],
  getUserById: (id: string) => mockUsers.find((u) => u.id === id),
  getUserByEmail: (email: string) =>
    mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()),
  addUser: (nama: string, email: string, role: UserRole, password?: string) => {
    const existing = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      existing.nama = nama;
      existing.role = role;
      if (password) existing.password = password;
      persistUsers(mockUsers);
      return existing;
    }
    const newUser: UserAccount = {
      id: `usr-${Date.now().toString(36)}`,
      nama,
      email,
      role,
      password: password || (role === 'superadmin' ? 'admin123' : 'supervisor123'),
      aktif: true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    mockUsers.unshift(newUser);
    persistUsers(mockUsers);
    return newUser;
  },
  toggleUserActive: (id: string) => {
    const u = mockUsers.find((user) => user.id === id);
    if (u) {
      u.aktif = !u.aktif;
      persistUsers(mockUsers);
    }
    return u;
  },
  createUser: (user: Partial<UserAccount>): UserAccount => {
    const newUser: UserAccount = {
      id: `usr-${Date.now().toString(36)}`,
      nama: user.nama || 'Pengguna Baru',
      email: user.email || '',
      role: user.role || 'lapangan',
      password: user.password || (user.role === 'superadmin' ? 'admin123' : 'supervisor123'),
      aktif: user.aktif !== undefined ? user.aktif : true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    mockUsers.unshift(newUser);
    persistUsers(mockUsers);
    return newUser;
  },
  updateUser: (id: string, updates: Partial<UserAccount>): UserAccount | null => {
    const u = mockUsers.find((usr) => usr.id === id);
    if (!u) return null;
    if (updates.nama !== undefined) u.nama = updates.nama;
    if (updates.email !== undefined) u.email = updates.email;
    if (updates.role !== undefined) u.role = updates.role;
    if (updates.aktif !== undefined) u.aktif = updates.aktif;
    if (updates.password !== undefined) u.password = updates.password;
    persistUsers(mockUsers);
    return u;
  },
  deleteUser: (id: string): boolean => {
    const idx = mockUsers.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    mockUsers.splice(idx, 1);
    persistUsers(mockUsers);
    return true;
  },
};
