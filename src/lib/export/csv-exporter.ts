import { Report } from '@/types/database';
import { formatTanggalIndonesia, formatTanggalJamWIB } from '@/lib/utils';

/**
 * Mengonversi daftar laporan ke format CSV berstandar RFC 4180 dengan UTF-8 BOM
 * agar dapat langsung dibuka secara rapi di Microsoft Excel.
 */
export function generateReportsCsv(reports: Report[]): string {
  const headers = [
    'No',
    'Tanggal',
    'WSID',
    'Lokasi',
    'Jenis Pekerjaan',
    'Status',
    'Dikerjakan Oleh',
    'Tipe Mesin Baru',
    'Serial Nomor Baru',
    'Tipe Mesin Lama',
    'Serial Nomor Lama',
    'Waktu Final',
    'Waktu Arsip',
    'ID File Drive',
    'Tautan Google Drive',
  ];

  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = reports.map((r, index) => {
    const data = r.data || {};
    return [
      escapeCsv(index + 1),
      escapeCsv(r.tanggal || '-'),
      escapeCsv(r.wsid || '-'),
      escapeCsv(r.lokasi || '-'),
      escapeCsv(r.jenis_pekerjaan || '-'),
      escapeCsv(r.status || '-'),
      escapeCsv(r.teknisi || data.teknisi || data.yang_melakukan || r.claimed_by || '-'),
      escapeCsv(data.type_mesin_baru || '-'),
      escapeCsv(data.serial_nomor || '-'),
      escapeCsv(data.type_mesin_lama || '-'),
      escapeCsv(data.sn_mesin_lama || '-'),
      escapeCsv(r.finalized_at ? formatTanggalJamWIB(r.finalized_at) : '-'),
      escapeCsv(r.archived_at ? formatTanggalJamWIB(r.archived_at) : '-'),
      escapeCsv(r.drive_file_id || '-'),
      escapeCsv(r.drive_url || '-'),
    ].join(',');
  });

  // Tambahkan UTF-8 BOM (\uFEFF) untuk kompatibilitas Excel
  return '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
}

/**
 * Pemicu unduh file CSV di sisi peramban klien
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

