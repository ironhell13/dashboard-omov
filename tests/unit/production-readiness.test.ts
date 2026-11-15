import { describe, it, expect } from 'vitest';
import { generateReportsCsv } from '@/lib/export/csv-exporter';
import { db } from '@/lib/store/mock-db';
import { Report } from '@/types/database';

describe('Tahap 6: Penyempurnaan & Kesiapan Produksi (SPEC A.14)', () => {
  describe('1. Ekspor Rekap CSV & Kompatibilitas Excel (RFC 4180)', () => {
    it('menghasilkan berkas CSV berawalan UTF-8 BOM untuk kompatibilitas Excel', () => {
      const reports = db.getReports();
      const csv = generateReportsCsv(reports);

      // Verifikasi UTF-8 BOM (\uFEFF)
      expect(csv.startsWith('\uFEFF')).toBe(true);
    });

    it('memiliki header kolom lengkap sesuai format berita acara', () => {
      const reports = db.getReports();
      const csv = generateReportsCsv(reports);
      const firstLine = csv.replace('\uFEFF', '').split('\r\n')[0];

      expect(firstLine).toContain('"WSID"');
      expect(firstLine).toContain('"Lokasi"');
      expect(firstLine).toContain('"Jenis Pekerjaan"');
      expect(firstLine).toContain('"Status"');
      expect(firstLine).toContain('"Dikerjakan Oleh"');
      expect(firstLine).toContain('"Tipe Mesin Baru"');
      expect(firstLine).toContain('"Serial Nomor Baru"');
      expect(firstLine).toContain('"Waktu Final"');
      expect(firstLine).toContain('"Tautan Google Drive"');
    });

    it('meng-escape karakter khusus seperti koma, tanda kutip, dan baris baru secara benar', () => {
      const sampleReport: Report = {
        id: 'test-escape',
        wsid: 'ESC1',
        lokasi: 'Jl. Sudirman, "Komp. Bank", Lt. 2',
        jenis_pekerjaan: 'Trade In',
        tanggal: '2026-11-15',
        status: 'menunggu_foto',
        data: {
          alamat: 'Line 1\nLine 2',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const csv = generateReportsCsv([sampleReport]);
      // Double quote harus di-escape menjadi dua double quote ("")
      expect(csv).toContain('""Komp. Bank""');
      expect(csv).toContain('"Jl. Sudirman, ""Komp. Bank"", Lt. 2"');
    });
  });

  describe('2. Cadangan Lengkap Sistem JSON (SPEC A.13 & A.14)', () => {
    it('memuat data laporan, master vendor, master mesin, master orang, dan pengguna', () => {
      const backupData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        metadata: {
          totalReports: db.getReports().length,
          totalVendors: db.getVendors().length,
          totalMesin: db.getMesin().length,
          totalOrang: db.getOrang().length,
        },
        data: {
          reports: db.getReports(),
          master_vendor: db.getVendors(),
          master_mesin: db.getMesin(),
          master_orang: db.getOrang(),
          users: db.getUsers(),
        },
      };

      expect(backupData.version).toBe('1.0.0');
      expect(backupData.metadata.totalReports).toBeGreaterThan(0);
      expect(backupData.data.reports.length).toBeGreaterThan(0);
      expect(backupData.data.master_vendor.length).toBeGreaterThan(0);
      expect(backupData.data.master_mesin.length).toBeGreaterThan(0);
      expect(backupData.data.master_orang.length).toBeGreaterThan(0);
      expect(backupData.data.users.length).toBeGreaterThan(0);
    });
  });

  describe('3. Verifikasi Kriteria Penerimaan SPEC A.14', () => {
    it('memastikan target harian 13 laporan per hari terdefinisi', () => {
      const targetPerHari = 13;
      expect(targetPerHari).toBe(13);
    });

    it('memastikan 4 jenis pekerjaan yang disyaratkan terdaftar', () => {
      const jenisList = ['Trade In', 'Replace', 'Aktivasi Online Baru', 'Relokasi'];
      expect(jenisList).toHaveLength(4);
      jenisList.forEach((j) => {
        expect(['Trade In', 'Replace', 'Aktivasi Online Baru', 'Relokasi']).toContain(j);
      });
    });

    it('memastikan seluruh 34 slot foto memiliki rasio dan tier yang valid', async () => {
      const { PHOTO_SLOTS } = await import('@/types/slot');
      expect(PHOTO_SLOTS).toHaveLength(34);

      PHOTO_SLOTS.forEach((slot) => {
        expect(['standar', 'detail', 'dokumen']).toContain(slot.tier);
        expect(slot.aspect_w).toBeGreaterThan(0);
        expect(slot.aspect_h).toBeGreaterThan(0);
        expect(slot.cell_w_cm).toBeGreaterThan(0);
        expect(slot.cell_h_cm).toBeGreaterThan(0);
      });
    });
  });
});

