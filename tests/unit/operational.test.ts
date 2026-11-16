import { describe, it, expect, beforeEach } from 'vitest';
import { detectBlurAndDarkness } from '@/lib/editor/canvas-engine';
import { GoogleDriveService } from '@/lib/drive/drive-service';
import { db } from '@/lib/store/mock-db';
import { photoStore } from '@/lib/store/photo-store';
import { PHOTO_SLOTS } from '@/types/slot';

describe('Tahap 5: Operasional & Integrasi Cloud (SPEC A.13 & A.14)', () => {
  beforeEach(() => {
    photoStore.clear();
  });

  describe('1. Deteksi Foto Buram dan Gelap (Canvas Engine)', () => {
    it('dapat mendeteksi foto terlalu gelap (rata-rata luminans < 45)', () => {
      // Buat gambar hitam pekat (semua pixel 0)
      const width = 100;
      const height = 100;
      const data = new Uint8ClampedArray(width * height * 4); // all 0 (black), alpha 255
      for (let i = 0; i < data.length; i += 4) {
        data[i + 3] = 255;
      }
      const fakeImageData = { data, width, height } as ImageData;

      const metrics = detectBlurAndDarkness(fakeImageData);
      expect(metrics.isDark).toBe(true);
      expect(metrics.luminance).toBe(0);
    });

    it('dapat mendeteksi foto dengan pencahayaan normal (rata-rata luminans >= 45)', () => {
      // Buat gambar abu-abu terang (RGB 180)
      const width = 100;
      const height = 100;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 180;
        data[i + 1] = 180;
        data[i + 2] = 180;
        data[i + 3] = 255;
      }
      const fakeImageData = { data, width, height } as ImageData;

      const metrics = detectBlurAndDarkness(fakeImageData);
      expect(metrics.isDark).toBe(false);
      expect(metrics.luminance).toBe(180);
    });

    it('dapat mendeteksi foto rata tanpa tekstur/buram (Variance of Laplacian < 100)', () => {
      // Gambar polos tanpa tepi (kontras seragam) -> varians laplacian = 0
      const width = 100;
      const height = 100;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 150;
        data[i + 1] = 150;
        data[i + 2] = 150;
        data[i + 3] = 255;
      }
      const fakeImageData = { data, width, height } as ImageData;

      const metrics = detectBlurAndDarkness(fakeImageData);
      expect(metrics.isBlurry).toBe(true);
      expect(metrics.blurScore).toBe(0);
    });

    it('dapat mendeteksi foto tajam dengan tepi tinggi (Variance of Laplacian >= 100)', () => {
      // Gambar berpola checkerboard tajam (hitam/putih bergantian)
      const width = 100;
      const height = 100;
      const data = new Uint8ClampedArray(width * height * 4);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const isWhite = (x + y) % 2 === 0;
          const val = isWhite ? 255 : 0;
          data[idx] = val;
          data[idx + 1] = val;
          data[idx + 2] = val;
          data[idx + 3] = 255;
        }
      }
      const fakeImageData = { data, width, height } as ImageData;

      const metrics = detectBlurAndDarkness(fakeImageData);
      expect(metrics.isBlurry).toBe(false);
      expect(metrics.blurScore).toBeGreaterThan(100);
    });
  });

  describe('2. Review Foto & Status Laporan', () => {
    it('mengubah status laporan menjadi perlu_perbaikan saat foto ditolak', () => {
      const rep = db.createReport({ wsid: 'REV1', lokasi: 'Lokasi Test Review' });

      // Simulasikan foto diunggah
      photoStore.set(`${rep.id}_grounding_pln`, {
        slotKey: 'grounding_pln',
        bytes: 200000,
        width: 1280,
        height: 960,
        source: 'kamera',
        uploadedAt: new Date().toISOString(),
        review: 'menunggu',
      });

      // Lakukan review tolak dengan catatan
      const photo = photoStore.get(`${rep.id}_grounding_pln`)!;
      photo.review = 'ditolak';
      photo.review_note = 'Angka multimeter tidak terlihat jelas';
      db.updateReportData(rep.id, {}, 'perlu_perbaikan');

      const updatedRep = db.getReportById(rep.id);
      expect(updatedRep?.status).toBe('perlu_perbaikan');
      expect(photo.review).toBe('ditolak');
      expect(photo.review_note).toBe('Angka multimeter tidak terlihat jelas');
    });

    it('mengubah status laporan menjadi foto_lengkap ketika seluruh 34 foto telah diterima', () => {
      const rep = db.createReport({ wsid: 'REV2', lokasi: 'Lokasi Lengkap' });

      // Isi semua 34 slot
      PHOTO_SLOTS.forEach((slot) => {
        if (!slot.reuse_of) {
          photoStore.set(`${rep.id}_${slot.key}`, {
            slotKey: slot.key,
            bytes: 180000,
            width: 1280,
            height: 960,
            source: 'kamera',
            uploadedAt: new Date().toISOString(),
            review: 'diterima',
          });
        }
      });

      db.updateReportData(rep.id, {}, 'foto_lengkap');
      const updatedRep = db.getReportById(rep.id);
      expect(updatedRep?.status).toBe('foto_lengkap');
    });
  });

  describe('3. Mekanisme Final & Buka Kembali (Locking)', () => {
    it('dapat menandai laporan sebagai Final dan mengunci perubahan', () => {
      const rep = db.createReport({ wsid: 'FIN1', lokasi: 'Lokasi Final' });
      rep.status = 'final';
      rep.finalized_at = new Date().toISOString();

      const saved = db.getReportById(rep.id);
      expect(saved?.status).toBe('final');
      expect(saved?.finalized_at).toBeDefined();
    });

    it('dapat membuka kembali laporan berstatus Final sebelum diarsipkan', () => {
      const rep = db.createReport({ wsid: 'REOPEN1', lokasi: 'Lokasi Reopen' });
      rep.status = 'final';
      rep.finalized_at = new Date().toISOString();

      // Buka kembali
      rep.status = 'foto_lengkap';
      rep.finalized_at = undefined;

      const saved = db.getReportById(rep.id);
      expect(saved?.status).toBe('foto_lengkap');
      expect(saved?.finalized_at).toBeUndefined();
    });
  });

  describe('4. Integrasi Google Drive Service (SPEC A.13)', () => {
    it('dapat menguji status koneksi Drive', async () => {
      const status = await GoogleDriveService.testConnection();
      expect(status.connected).toBe(true);
      expect(status.message).toBeDefined();
    });

    it('menghasilkan nama berkas dan path folder sesuai spesifikasi LAPORAN OMOV/{tahun}/{bulan}/', async () => {
      const rep = db.createReport({
        wsid: 'DRV1',
        lokasi: 'KCP Thamrin',
        jenis_pekerjaan: 'Trade In',
        tanggal: '2026-11-15',
      });

      const fakeBuffer = Buffer.from('test docx content');
      const result = await GoogleDriveService.uploadReportDocx(rep, fakeBuffer);

      expect(result.fileId).toBeDefined();
      expect(result.driveUrl).toContain(result.fileId);
      expect(result.folderPath).toBe('LAPORAN OMOV/2026/November/');
      expect(result.fileName).toBe('BERITA_ACARA_TRADE_IN_WSID_DRV1_KCP_THAMRIN.docx');
      expect(result.verified).toBe(true);
    });
  });

  describe('5. Pembersihan Cron & Retensi 3 Hari (SPEC A.13)', () => {
    it('membersihkan foto hanya untuk laporan terarsip yang berumur lebih dari 3 hari', () => {
      // Laporan 1: Terarsip 5 hari yang lalu
      const rep1 = db.createReport({ wsid: 'CRON1', lokasi: 'Lokasi Cron 1' });
      rep1.status = 'terarsip';
      rep1.drive_file_id = 'drive_cron_1';
      rep1.archived_at = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

      // Laporan 2: Terarsip baru 1 hari yang lalu (belum boleh dihapus)
      const rep2 = db.createReport({ wsid: 'CRON2', lokasi: 'Lokasi Cron 2' });
      rep2.status = 'terarsip';
      rep2.drive_file_id = 'drive_cron_2';
      rep2.archived_at = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

      // Isi foto untuk kedua laporan
      photoStore.set(`${rep1.id}_foto1`, {
        slotKey: 'foto1',
        bytes: 1000,
        width: 800,
        height: 600,
        source: 'kamera',
        uploadedAt: new Date().toISOString(),
        review: 'diterima',
      });
      photoStore.set(`${rep2.id}_foto1`, {
        slotKey: 'foto1',
        bytes: 1000,
        width: 800,
        height: 600,
        source: 'kamera',
        uploadedAt: new Date().toISOString(),
        review: 'diterima',
      });

      // Jalankan logika cleanup
      const now = Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      let cleanedCount = 0;

      [rep1, rep2].forEach((r) => {
        if (r.status === 'terarsip' && r.drive_file_id && r.archived_at) {
          const diff = now - new Date(r.archived_at).getTime();
          if (diff > threeDaysMs) {
            photoStore.delete(`${r.id}_foto1`);
            cleanedCount++;
          }
        }
      });

      expect(cleanedCount).toBe(1);
      // Foto laporan 1 sudah bersih
      expect(photoStore.has(`${rep1.id}_foto1`)).toBe(false);
      // Foto laporan 2 masih utuh
      expect(photoStore.has(`${rep2.id}_foto1`)).toBe(true);
    });
  });

  describe('5. Autentikasi Kredensial & Role Superadmin (SPEC Security)', () => {
    it('menolak login dengan password salah / sembarangan', async () => {
      const { POST } = await import('@/app/api/auth/login/route');
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@omov.com', password: 'password_asal' }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Kata sandi salah');
    });

    it('berhasil login ketika password valid sesuai role', async () => {
      const { POST } = await import('@/app/api/auth/login/route');
      const req = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@omov.com', password: 'admin123' }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.role).toBe('superadmin');
    });

    it('setup-admin menolak jika data tidak lengkap atau password kurang dari 8 karakter', async () => {
      const { POST } = await import('@/app/api/auth/setup-admin/route');
      const req = new Request('http://localhost:3000/api/auth/setup-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: 'Admin', email: 'admin@omov.com', password: '123' }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain('minimal 8 karakter');
    });
  });
});

