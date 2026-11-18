import { Report, ReportData } from '@/types/database';
import { formatTanggalIndonesia, getNamaHariIndonesia } from '@/lib/utils';
import { PHOTO_SLOTS } from '@/types/slot';

export function buildDocumentData(
  report: Report,
  photoBuffers?: Record<string, Buffer>
): Record<string, any> {
  const d: ReportData = report.data || {};

  const sanitizeVal = (val: any) => {
    if (val === undefined || val === null || String(val).trim() === '') return '-';
    return String(val).trim();
  };

  const targetJenis = d.jenis_pekerjaan || report.jenis_pekerjaan || 'Trade In';
  const jenisUpper = targetJenis.toUpperCase();
  const targetTanggal = d.tanggal || report.tanggal;
  const tglTeks = targetTanggal ? formatTanggalIndonesia(targetTanggal) : '-';
  const hariTeks = targetTanggal ? getNamaHariIndonesia(targetTanggal) : '-';

  // Format pengaman pengganti: jika ada dynabolt atau alarm
  let pengamanPenggantiStr = '-';
  if (d.pengaman_pengganti) {
    const list: string[] = [];
    if (d.pengaman_pengganti.dynabolt) list.push('Dynabolt');
    if (d.pengaman_pengganti.alarm) list.push('Alarm');
    if (list.length > 0) pengamanPenggantiStr = list.join(' / ');
  }

  // Format checkbox boxes untuk Dynabolt & Alarm
  const pengaman_dynabolt_box = d.pengaman_pengganti?.dynabolt ? '[X]' : '[  ]';
  const pengaman_alarm_box = d.pengaman_pengganti?.alarm ? '[X]' : '[  ]';

  // Format MasterKey Triple DES strikethrough logic (coret yang tidak dipilih)
  const mkVal = String(d.masterkey_triple_des || '').trim().toLowerCase();
  const isMkYa = mkVal === 'ya' || mkVal === 'ya digit';
  const isMkTidak = mkVal === 'tidak';
  const mk_ya_struck = isMkTidak; // Jika Tidak dipilih, Ya dicoret
  const mk_tidak_struck = isMkYa; // Jika Ya/Ya Digit dipilih, Tidak dicoret

  // Format Angkur strikethrough logic (coret yang tidak dipilih)
  const angkurVal = String(d.angkur || '').trim().toLowerCase();
  const isAngkurYa = angkurVal === 'ya' || angkurVal === 'ya digit';
  const isAngkurTidak = angkurVal === 'tidak';
  const angkur_ya_struck = isAngkurTidak; // Jika Tidak dipilih, Ya dicoret
  const angkur_tidak_struck = isAngkurYa; // Jika Ya dipilih, Tidak dicoret

  // Format Supersite strikethrough logic (coret yang tidak dipilih)
  const superVal = String(d.supersite || '').trim().toLowerCase();
  const isSuperYa = superVal === 'ya' || superVal === 'ya digit';
  const isSuperTidak = superVal === 'tidak';
  const supersite_ya_struck = isSuperTidak;
  const supersite_tidak_struck = isSuperYa;

  // Format exhaust fan
  let exhaustFanStr = '-';
  if (d.exhaust_fan_jumlah || d.exhaust_fan_status) {
    const jml = d.exhaust_fan_jumlah || '1';
    const st = d.exhaust_fan_status || 'Nyala';
    exhaustFanStr = `${jml} ${st}`;
  }

  const data: Record<string, any> = {
    // Identitas
    wsid: d.wsid || report.wsid || '-',
    lokasi: d.lokasi || report.lokasi || '-',
    alamat: sanitizeVal(d.alamat),
    wsid_lama: sanitizeVal(d.wsid_lama),
    lokasi_lama: sanitizeVal(d.lokasi_lama),
    type_mesin_baru: sanitizeVal(d.type_mesin_baru),
    serial_nomor: sanitizeVal(d.serial_nomor),
    jenis_pekerjaan: targetJenis,
    jenis_pekerjaan_upper: jenisUpper,
    tanggal_teks: tglTeks,
    hari: hariTeks,
    kota: sanitizeVal(d.kota),

    // Kelistrikan
    tegangan_ups_it: sanitizeVal(d.tegangan_ups_it),
    grounding_ups_it: sanitizeVal(d.grounding_ups_it),

    // Jaringan
    initial_vsat: sanitizeVal(d.initial_vsat),
    konfigurasi: sanitizeVal(d.konfigurasi),
    ip_address: sanitizeVal(d.ip_address),

    // Isi Mesin
    cartridge: sanitizeVal(d.cartridge),
    reject: sanitizeVal(d.reject),
    kunci: sanitizeVal(d.kunci),

    // Status Perangkat
    cencon: sanitizeVal(d.cencon),
    kamera: sanitizeVal(d.kamera),
    perekam: sanitizeVal(d.perekam),
    pin_cover: sanitizeVal(d.pin_cover),
    fdi: sanitizeVal(d.fdi),
    masterkey_triple_des: sanitizeVal(d.masterkey_triple_des),
    masterkey_alasan: sanitizeVal(d.masterkey_alasan),
    mk_ya_struck,
    mk_tidak_struck,
    ac: sanitizeVal(d.ac),

    // Outdoor & Indoor
    neon_sign: sanitizeVal(d.neon_sign),
    stiker_mesin: sanitizeVal(d.stiker_mesin),
    kabel_jalur: sanitizeVal(d.kabel_jalur),
    colokan_listrik: sanitizeVal(d.colokan_listrik),

    // Perangkat Eksternal
    perekam_eksternal_status: sanitizeVal(d.perekam_eksternal?.status),
    perekam_eksternal_merk: sanitizeVal(d.perekam_eksternal?.merk),
    perekam_eksternal_sn: sanitizeVal(d.perekam_eksternal?.sn),
    kamera_eksternal_status: sanitizeVal(d.kamera_eksternal?.status),
    kamera_eksternal_merk: sanitizeVal(d.kamera_eksternal?.merk),
    kamera_eksternal_sn: sanitizeVal(d.kamera_eksternal?.sn),
    ups_status: sanitizeVal(d.ups?.status),
    ups_merk: sanitizeVal(d.ups?.merk),
    ups_sn: sanitizeVal(d.ups?.sn),
    led_status: sanitizeVal(d.led?.status),
    led_merk: sanitizeVal(d.led?.merk),
    led_sn: sanitizeVal(d.led?.sn),

    // Pengaman & Letak
    letak_mesin: sanitizeVal(d.letak_mesin),
    angkur: sanitizeVal(d.angkur),
    angkur_ya_struck,
    angkur_tidak_struck,
    angkur_vendor: sanitizeVal(d.angkur_vendor),
    pengaman_dynabolt_box,
    pengaman_alarm_box,
    pengaman_pengganti: pengamanPenggantiStr,
    angkur_alasan: sanitizeVal(d.angkur_alasan),
    supersite: sanitizeVal(d.supersite),
    supersite_ya_struck,
    supersite_tidak_struck,
    supersite_vendor: sanitizeVal(d.supersite_vendor),
    supersite_alasan: sanitizeVal(d.supersite_alasan),
    exhaust_fan_text: exhaustFanStr,
    tanggal_email_permintaan: sanitizeVal(d.tanggal_email_permintaan),
    koordinat_text: d.koordinat && d.koordinat.lat ? `${d.koordinat.lat}, ${d.koordinat.lng}` : '-',

    // Penandatangan
    yang_melakukan: sanitizeVal(d.yang_melakukan || d.teknisi || report.teknisi),
    mengetahui: sanitizeVal(d.mengetahui),
    jadwal_aktivasi: sanitizeVal(d.jadwal_aktivasi || tglTeks),
    penandatangan_vendor: sanitizeVal(d.penandatangan_vendor || d.yang_melakukan || d.teknisi || report.teknisi),

    // BA Dynabolt
    type_mesin_lama: sanitizeVal(d.type_mesin_lama),
    sn_mesin_lama: sanitizeVal(d.sn_mesin_lama),
    keterangan_vendor: sanitizeVal(d.keterangan_vendor),
  };

  // Vendor Hadir 8 Baris
  const vHadir = d.vendor_hadir || {};
  const vendorKeys = [
    'mesin_online', 'vendor_instalasi', 'vendor_mover', 'vendor_cctv',
    'vendor_mesin', 'pkt1', 'pkt2', 'vendor_nb'
  ];
  for (const vk of vendorKeys) {
    const item = (vHadir as any)[vk] || {};
    data[`v_${vk}_nama`] = sanitizeVal(item.nama);
    data[`v_${vk}_waktu`] = sanitizeVal(item.waktu);
  }

  // Foto 34 Slot
  if (photoBuffers) {
    PHOTO_SLOTS.forEach((slot) => {
      let buf = photoBuffers[slot.key];
      // Reuse logic: ba_hdd_full pakai foto ba_hdd
      if (!buf && slot.reuse_of) {
        buf = photoBuffers[slot.reuse_of];
      }
      if (buf) {
        data[`foto_${slot.key}`] = buf;
      }
    });
  }

  return data;
}
