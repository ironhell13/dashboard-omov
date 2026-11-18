import { describe, it, expect } from 'vitest';
import { 
  getNamaHariIndonesia, 
  formatTanggalIndonesia, 
  formatTanggalJamWIB, 
  formatNamaBerkasDocx,
  getStatusBadgeConfig
} from '@/lib/utils';

describe('Data Builder & Utils (SPEC A.4, A.8, A.12)', () => {
  it('menghitung nama hari bahasa Indonesia dengan benar', () => {
    // 2026-11-15 adalah hari Minggu
    expect(getNamaHariIndonesia('2026-11-15')).toBe('Minggu');
    // 2026-11-16 adalah hari Senin
    expect(getNamaHariIndonesia('2026-11-16')).toBe('Senin');
    // 2026-11-17 adalah hari Selasa
    expect(getNamaHariIndonesia('2026-11-17')).toBe('Selasa');
    // Input kosong mengembalikan '-'
    expect(getNamaHariIndonesia('')).toBe('-');
  });

  it('memformat tanggal Indonesia sesuai standar template', () => {
    const formatted = formatTanggalIndonesia('2026-11-15');
    expect(formatted).toBe('15 November 2026');
    expect(formatTanggalIndonesia(null)).toBe('-');
  });

  it('memformat tanggal dan jam Indonesia dalam WIB', () => {
    const formatted = formatTanggalJamWIB('2026-11-15T07:44:00Z'); // 07:44 UTC = 14:44 WIB
    expect(formatted).toBe('15 November 2026 14:44 WIB');
  });

  it('memformat nama berkas Word sesuai konvensi SPEC A.12', () => {
    const filename = formatNamaBerkasDocx('Trade In', 'Z9KD', 'SPBU 3415143 Otista');
    expect(filename).toBe('BERITA_ACARA_TRADE_IN_WSID_Z9KD_SPBU_3415143_OTISTA.docx');

    const filenameReplace = formatNamaBerkasDocx('Replace', 'B482', 'KCP Daan Mogot Mall');
    expect(filenameReplace).toBe('BERITA_ACARA_REPLACE_WSID_B482_KCP_DAAN_MOGOT_MALL.docx');
  });

  it('memberikan token warna dan label status chip yang tepat', () => {
    const waiting = getStatusBadgeConfig('menunggu_foto');
    expect(waiting.label).toBe('Menunggu Foto');

    const complete = getStatusBadgeConfig('foto_lengkap');
    expect(complete.label).toBe('Foto Lengkap');

    const needFix = getStatusBadgeConfig('perlu_perbaikan');
    expect(needFix.label).toBe('Perlu Perbaikan');

    const finalStatus = getStatusBadgeConfig('final');
    expect(finalStatus.label).toBe('Final');

    const archived = getStatusBadgeConfig('terarsip');
    expect(archived.label).toBe('Terarsip');

    const cancelled = getStatusBadgeConfig('dibatalkan');
    expect(cancelled.label).toBe('Dibatalkan');
  });

  it('memproses data MasterKey, Angkur strikethrough dan Dynabolt/Alarm box dengan benar', async () => {
    const { buildDocumentData } = await import('@/lib/docx/data-builder');
    const mockReport: any = {
      id: 'test-1',
      wsid: 'Z9KD',
      lokasi: 'SPBU Otista',
      jenis_pekerjaan: 'Trade In',
      tanggal: '2026-11-15',
      data: {
        masterkey_triple_des: 'Ya Digit',
        masterkey_alasan: '',
        angkur: 'Tidak',
        pengaman_pengganti: { dynabolt: true, alarm: false },
        angkur_alasan: 'Lantai granit',
        letak_mesin: 'Di dalam Indomaret'
      }
    };

    const docData = buildDocumentData(mockReport);
    // MasterKey: Ya Digit -> Tidak dicoret (mk_tidak_struck = true, mk_ya_struck = false)
    expect(docData.mk_ya_struck).toBe(false);
    expect(docData.mk_tidak_struck).toBe(true);
    expect(docData.masterkey_alasan).toBe('-');

    // Angkur: Tidak -> Ya dicoret (angkur_ya_struck = true, angkur_tidak_struck = false)
    expect(docData.angkur_ya_struck).toBe(true);
    expect(docData.angkur_tidak_struck).toBe(false);

    // Pengaman pengganti box
    expect(docData.pengaman_dynabolt_box).toBe('[X]');
    expect(docData.pengaman_alarm_box).toBe('[  ]');
    expect(docData.angkur_alasan).toBe('Lantai granit');

    // Letak mesin
    expect(docData.letak_mesin).toBe('Di dalam Indomaret');

    // Waktu vendor otomatis tanggal pengerjaan jika kosong
    expect(docData.v_mesin_online_waktu).toBe('15 November 2026');
  });
});

