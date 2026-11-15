import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ReportStatus, JenisPekerjaan } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const NAMA_HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

export const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/**
 * Mendapatkan nama hari bahasa Indonesia dari tanggal ISO (YYYY-MM-DD)
 */
export function getNamaHariIndonesia(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr + "T00:00:00+07:00");
  return NAMA_HARI[date.getDay()] || "-";
}

/**
 * Format tanggal Indonesia: contoh "12 November 2026"
 */
export function formatTanggalIndonesia(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return "-";

  // Waktu WIB (+7)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const wibDate = new Date(utc + 3600000 * 7);

  const tgl = wibDate.getDate();
  const bln = NAMA_BULAN[wibDate.getMonth()];
  const thn = wibDate.getFullYear();

  return `${tgl} ${bln} ${thn}`;
}

/**
 * Format tanggal & jam Indonesia WIB: contoh "12 November 2026 14:44 WIB"
 */
export function formatTanggalJamWIB(dateStr?: string | Date | null): string {
  if (!dateStr) return "-";
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return "-";

  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const wibDate = new Date(utc + 3600000 * 7);

  const tgl = wibDate.getDate();
  const bln = NAMA_BULAN[wibDate.getMonth()];
  const thn = wibDate.getFullYear();
  const jam = String(wibDate.getHours()).padStart(2, "0");
  const menit = String(wibDate.getMinutes()).padStart(2, "0");

  return `${tgl} ${bln} ${thn} ${jam}:${menit} WIB`;
}

/**
 * Sanitasi nama berkas docx sesuai pola:
 * BERITA_ACARA_TRADE_IN_WSID_Z9KD_SPBU_3415143_Otista.docx
 */
export function formatNamaBerkasDocx(
  jenisPekerjaan: JenisPekerjaan | string,
  wsid: string,
  lokasi: string
): string {
  const sanitize = (str: string) =>
    (str || "").toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");

  const cleanJenis = sanitize(jenisPekerjaan);
  const cleanWsid = sanitize(wsid);
  const cleanLokasi = sanitize(lokasi);

  return `BERITA_ACARA_${cleanJenis}_WSID_${cleanWsid}_${cleanLokasi}.docx`;
}

/**
 * Metadata dan styling chip status laporan sesuai A.4
 */
export function getStatusBadgeConfig(status: ReportStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case "menunggu_foto":
      return {
        label: "Menunggu Foto",
        className: "bg-[#DCEBFF] text-[#1A73D9] border-transparent",
      };
    case "foto_lengkap":
      return {
        label: "Foto Lengkap",
        className: "bg-[#E3F6EC] text-[#17714A] border-transparent",
      };
    case "perlu_perbaikan":
      return {
        label: "Perlu Perbaikan",
        className: "bg-[#FFF3DC] text-[#8A5300] border-transparent",
      };
    case "final":
      return {
        label: "Final",
        className: "bg-white text-[#1A73D9] border-[#1A73D9] border",
      };
    case "terarsip":
      return {
        label: "Terarsip",
        className: "bg-[#F4F9FF] text-[#5B7189] border-transparent",
      };
    case "dibatalkan":
      return {
        label: "Dibatalkan",
        className: "bg-[#FDE8E8] text-[#B02A2A] border-transparent",
      };
    default:
      return {
        label: status,
        className: "bg-[#F4F9FF] text-[#0F2A43] border-transparent",
      };
  }
}

