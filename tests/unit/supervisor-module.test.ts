import { describe, it, expect } from 'vitest';
import { db } from '@/lib/store/mock-db';

describe('Tahap 2: Supervisor Module & Data Flow', () => {
  it('dapat membuat laporan baru dengan WSID otomatis huruf kapital', () => {
    const report = db.createReport({
      wsid: 'z9kd-test',
      lokasi: 'SPBU Otista Test',
      jenis_pekerjaan: 'Trade In',
      tanggal: '2026-11-15',
    });

    expect(report.id).toBeDefined();
    expect(report.wsid).toBe('Z9KD-TEST');
    expect(report.lokasi).toBe('SPBU Otista Test');
    expect(report.status).toBe('menunggu_foto');
    expect(report.data.wsid).toBe('Z9KD-TEST');
  });

  it('laporan baru yang dibuat supervisor langsung muncul di daftar laporan', () => {
    const allReports = db.getReports();
    const found = allReports.find(r => r.wsid === 'Z9KD-TEST');
    expect(found).toBeDefined();
    expect(found?.lokasi).toBe('SPBU Otista Test');
  });

  it('dapat memperbarui data teks laporan secara parsial (Autosave)', () => {
    const reports = db.getReports();
    const targetReport = reports[0];

    const updated = db.updateReportData(targetReport.id, {
      tegangan_ups_it: 221.5,
      grounding_ups_it: 0.95,
      ip_address: '10.10.10.10',
    });

    expect(updated).not.toBeNull();
    expect(updated?.data.tegangan_ups_it).toBe(221.5);
    expect(updated?.data.grounding_ups_it).toBe(0.95);
    expect(updated?.data.ip_address).toBe('10.10.10.10');
  });

  it('dapat menambah dan menghapus data Master Vendor', () => {
    const newVendor = db.addVendor('PT Solusi ATM', 'Vendor Perawatan');
    expect(newVendor.nama).toBe('PT Solusi ATM');

    const vendorsAfter = db.getVendors();
    expect(vendorsAfter.some(v => v.nama === 'PT Solusi ATM')).toBe(true);

    db.deleteVendor(newVendor.id);
    const vendorsFinal = db.getVendors();
    expect(vendorsFinal.some(v => v.nama === 'PT Solusi ATM')).toBe(false);
  });

  it('dapat menambah akun pengguna baru dan mengubah status keaktifan', () => {
    const newUser = db.addUser('Rian Pratama', 'rian@omov.com', 'lapangan');
    expect(newUser.id).toBeDefined();
    expect(newUser.aktif).toBe(true);

    const toggled = db.toggleUserActive(newUser.id);
    expect(toggled?.aktif).toBe(false);

    const reToggled = db.toggleUserActive(newUser.id);
    expect(reToggled?.aktif).toBe(true);
  });
});

