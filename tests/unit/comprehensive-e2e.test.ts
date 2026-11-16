import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { GET as usersGet, POST as usersPost, PATCH as usersPatch, DELETE as usersDelete } from '@/app/api/users/route';
import { GET as reportsGet, POST as reportsPost } from '@/app/api/reports/route';
import { GET as reportDetailGet, PATCH as reportDetailPatch, DELETE as reportDetailDelete } from '@/app/api/reports/[id]/route';
import { GET as photosGet, POST as photosPost } from '@/app/api/photos/route';
import { POST as generatePost } from '@/app/api/laporan/[id]/generate/route';
import { GET as driveStatusGet } from '@/app/api/drive/status/route';
import { db } from '@/lib/store/mock-db';
import { photoStore } from '@/lib/store/photo-store';
import sharp from 'sharp';

describe('Pengujian Komprehensif Sistem Produksi Laporan OMOV (SPEC E2E)', () => {
  let createdUserId: string = '';
  let testReportId: string = '';
  let sampleImageBuffer: Buffer;

  beforeAll(async () => {
    // Siapkan buffer gambar JPEG valid untuk pengujian upload & generate
    sampleImageBuffer = await sharp({
      create: {
        width: 300,
        height: 200,
        channels: 3,
        background: { r: 59, g: 130, b: 246 },
      },
    })
      .jpeg()
      .toBuffer();
  });

  afterAll(() => {
    // Bersihkan data uji coba jika ada
    if (testReportId) {
      db.deleteReport(testReportId);
      photoStore.delete(`${testReportId}_01_tampak_muka`);
    }
    if (createdUserId) {
      db.deleteUser(createdUserId);
    }
  });

  describe('1. Keamanan & Autentikasi Pengguna (/api/auth/login)', () => {
    it('menolak login jika email atau password kosong', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '', password: '' }),
      });
      const res = await loginPost(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it('menolak login dengan kata sandi salah (mencegah akses ilegal)', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@omov.com', password: 'salah-password-123' }),
      });
      const res = await loginPost(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Kata sandi salah');
    });

    it('berhasil login sebagai Superadmin dengan kredensial yang valid dan memasang cookie sesi', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@omov.com', password: 'admin123' }),
      });
      const res = await loginPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.role).toBe('superadmin');

      // Verifikasi cookie sesi terpasang
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toContain('omov_role=superadmin');
    });

    it('berhasil login sebagai Superadmin dengan password Admin123!', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@omov.com', password: 'Admin123!' }),
      });
      const res = await loginPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.role).toBe('superadmin');
    });

    it('berhasil login sebagai Supervisor dengan kredensial yang valid (supervisor@omov.com)', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'supervisor@omov.com', password: 'supervisor123' }),
      });
      const res = await loginPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.role).toBe('supervisor');
    });

    it('berhasil login sebagai Supervisor dengan budi.santoso@omov.com', async () => {
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'budi.santoso@omov.com', password: 'supervisor123' }),
      });
      const res = await loginPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.role).toBe('supervisor');
    });
  });

  describe('2. Manajemen Pengguna CRUD Superadmin (/api/users)', () => {
    it('dapat membuat akun baru (CREATE)', async () => {
      const req = new Request('http://localhost:3000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: 'Teknisi E2E Baru',
          email: 'teknisi.e2e@omov.com',
          password: 'PasswordSuper123!',
          role: 'lapangan',
        }),
      });
      const res = await usersPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.nama).toBe('Teknisi E2E Baru');
      createdUserId = json.data.id;
    });

    it('dapat melihat daftar pengguna terdaftar (READ)', async () => {
      const res = await usersGet();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.some((u: any) => u.id === createdUserId)).toBe(true);
    });

    it('dapat mengubah peran dan nama pengguna (UPDATE)', async () => {
      const req = new Request('http://localhost:3000/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: createdUserId,
          nama: 'Teknisi E2E Diperbarui',
          role: 'supervisor',
        }),
      });
      const res = await usersPatch(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('dapat menonaktifkan dan mengaktifkan akun (TOGGLE ACTIVE)', async () => {
      const req = new Request('http://localhost:3000/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: createdUserId,
          action: 'toggle_active',
        }),
      });
      const res = await usersPatch(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('dapat menghapus akun pengguna (DELETE)', async () => {
      const req = new Request(`http://localhost:3000/api/users?id=${createdUserId}`, {
        method: 'DELETE',
      });
      const res = await usersDelete(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Pastikan sudah tidak ada di daftar
      const verifyRes = await usersGet();
      const verifyJson = await verifyRes.json();
      expect(verifyJson.data.some((u: any) => u.id === createdUserId)).toBe(false);
      createdUserId = '';
    });
  });

  describe('3. Alur Kerja Laporan & Pengisian Manual (/api/reports & /api/reports/[id])', () => {
    it('dapat membuat laporan baru secara lengkap', async () => {
      const req = new Request('http://localhost:3000/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wsid: 'BCA-PROD-999',
          lokasi: 'KCP BCA Menara Palma Kuningan',
          teknisi: 'Ahmad Fauzi',
          jenis_pekerjaan: 'Trade In',
          tanggal: '2026-11-16',
          alamat: 'Jl. H.R. Rasuna Said Blok X-2 Kav. 6, Jakarta Selatan',
        }),
      });
      const res = await reportsPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.wsid).toBe('BCA-PROD-999');
      testReportId = json.data.id;
    });

    it('dapat mengambil detail laporan berdasarkan ID', async () => {
      const req = new Request(`http://localhost:3000/api/reports/${testReportId}`);
      const res = await reportDetailGet(req, { params: Promise.resolve({ id: testReportId }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(testReportId);
      expect(json.data.wsid).toBe('BCA-PROD-999');
    });

    it('dapat memperbarui isian data teks teknis secara manual dan tersimpan persisten', async () => {
      const req = new Request(`http://localhost:3000/api/reports/${testReportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'siap_cetak',
          data: {
            snMesin: 'SN-NCR-88990011',
            merkMesin: 'NCR 6625',
            upsMerk: 'APC Smart-UPS RT 3000VA',
            cctvMerk: 'Hikvision Digital DS-2CD',
            modemMerk: 'Teltonika Dual SIM RUT950',
            tegangan_ups_it: 220,
            grounding_ups_it: 1.1,
            ip_address: '10.22.45.109',
            cartridge: '4 Kaset (Rp 100.000,-)',
            reject: '1 Kaset',
            kunci: 'Lengkap di Posisi 1',
            keterangan: 'Pekerjaan selesai 100% tanpa kendala, seluruh tes penarikan uang berhasil.',
            catatanSupervisor: 'Disetujui oleh Supervisor Budi Santoso.',
          },
        }),
      });
      const res = await reportDetailPatch(req, { params: Promise.resolve({ id: testReportId }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('siap_cetak');
      expect(json.data.data.snMesin).toBe('SN-NCR-88990011');
      expect(json.data.data.upsMerk).toBe('APC Smart-UPS RT 3000VA');
      expect(json.data.data.tegangan_ups_it).toBe(220);
    });
  });

  describe('4. Pemrosesan & Penyimpanan Foto Lapangan (/api/photos)', () => {
    it('dapat mengunggah foto slot beresolusi tinggi dengan metadata lengkap', async () => {
      const base64Data = `data:image/jpeg;base64,${sampleImageBuffer.toString('base64')}`;
      const req = new Request('http://localhost:3000/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: testReportId,
          slotKey: '01_tampak_muka',
          base64: base64Data,
          meta: {
            width: 1280,
            height: 960,
            source: 'galeri',
            blurScore: 450,
            isBlurry: false,
            isDark: false,
          },
        }),
      });

      const res = await photosPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.slotKey).toBe('01_tampak_muka');
    });

    it('dapat mengambil daftar foto yang telah diunggah untuk laporan tersebut', async () => {
      const req = new Request(`http://localhost:3000/api/photos?reportId=${testReportId}`);
      const res = await photosGet(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.photos)).toBe(true);
      expect(json.photos.some((p: any) => p.slotKey === '01_tampak_muka')).toBe(true);
    });
  });

  describe('5. Pembuatan Dokumen Word (.docx) Otomatis (/api/laporan/[id]/generate)', () => {
    it('berhasil mengompilasi dan mengunduh berkas Word .docx berisi data teks & foto', async () => {
      const req = new Request(`http://localhost:3000/api/laporan/${testReportId}/generate`, {
        method: 'POST',
      });
      const res = await generatePost(req, { params: Promise.resolve({ id: testReportId }) });

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      expect(res.headers.get('content-disposition')).toContain('BCA_PROD_999');

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Ukuran berkas .docx harus lebih dari 30 KB
      expect(buffer.length).toBeGreaterThan(30000);

      // Verifikasi Magic Number format berkas ZIP/DOCX ('PK\x03\x04')
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
      expect(buffer[2]).toBe(0x03);
      expect(buffer[3]).toBe(0x04);
    });
  });

  describe('6. Pengecekan Status Integrasi Cloud & Google Drive (/api/drive/status)', () => {
    it('mengembalikan status pengecekan koneksi Google Drive secara aman tanpa exception', async () => {
      const res = await driveStatusGet();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(typeof json.connected).toBe('boolean');
      expect(typeof json.message).toBe('string');
    });
  });

  describe('7. Penghapusan Laporan Uji Coba (Clean Teardown)', () => {
    it('dapat menghapus laporan uji coba sehingga database tetap bersih', async () => {
      const req = new Request(`http://localhost:3000/api/reports/${testReportId}`, {
        method: 'DELETE',
      });
      const res = await reportDetailDelete(req, { params: Promise.resolve({ id: testReportId }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Pastikan laporan benar-benar terhapus
      const verifyReq = new Request(`http://localhost:3000/api/reports/${testReportId}`);
      const verifyRes = await reportDetailGet(verifyReq, { params: Promise.resolve({ id: testReportId }) });
      expect(verifyRes.status).toBe(404);

      testReportId = '';
    });
  });
});
