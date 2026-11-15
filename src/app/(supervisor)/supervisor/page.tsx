'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Target, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck, 
  Plus, 
  ArrowRight,
  Download,
  Database,
  Calendar,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { formatTanggalIndonesia, formatTanggalJamWIB, getStatusBadgeConfig } from '@/lib/utils';
import { Report, ReportStatus, JenisPekerjaan } from '@/types/database';
import { CreateReportDialog } from '@/components/supervisor/create-report-dialog';
import { downloadCsv, generateReportsCsv } from '@/lib/export/csv-exporter';

export default function SupervisorDashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'hari_ini' | 'bulan_ini' | 'semua'>('hari_ini');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/reports');
      const json = await res.json();
      if (json.success && json.data) {
        setReports(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filter laporan berdasarkan periode terpilih
  const filteredReports = reports.filter((r) => {
    if (period === 'hari_ini') return r.tanggal === todayStr;
    if (period === 'bulan_ini') return (r.tanggal || '').startsWith(currentMonthStr);
    return true;
  });

  const targetHariIni = 13;
  const dibuatHariIni = reports.filter((r) => r.tanggal === todayStr).length;

  const countMenungguFoto = filteredReports.filter((r) => r.status === 'menunggu_foto').length;
  const countFotoLengkap = filteredReports.filter((r) => r.status === 'foto_lengkap').length;
  const countPerluPerbaikan = filteredReports.filter((r) => r.status === 'perlu_perbaikan').length;
  const countFinalDanArsip = filteredReports.filter((r) => r.status === 'final' || r.status === 'terarsip').length;

  const handleExportCsv = () => {
    setIsExporting(true);
    try {
      const csv = generateReportsCsv(filteredReports);
      const filename = `REKAP_LAPORAN_OMOV_${period.toUpperCase()}_${todayStr}.csv`;
      downloadCsv(csv, filename);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/backup');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BACKUP_LAPORAN_OMOV_${todayStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Gagal mengunduh cadangan: ${err.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Beranda Rekap OMOV
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {formatTanggalIndonesia(new Date())} &middot; Pemantauan Berita Acara ATM BCA (Target {targetHariIni} Lokasi/Hari)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Ekspor CSV */}
          <button
            onClick={handleExportCsv}
            disabled={isExporting || filteredReports.length === 0}
            className="btn-secondary h-9 px-3 text-xs font-semibold gap-1.5"
            title="Ekspor rekap data ke format CSV / Excel"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Ekspor CSV</span>
          </button>

          {/* Tombol Cadangan JSON */}
          <button
            onClick={handleDownloadBackup}
            disabled={isBackingUp}
            className="btn-secondary h-9 px-3 text-xs font-semibold gap-1.5"
            title="Unduh cadangan data lengkap JSON"
          >
            <Database className="w-3.5 h-3.5 text-text-muted" />
            <span>Cadangan JSON</span>
          </button>

          {/* Tombol Buat Laporan Cepat */}
          <button
            onClick={() => setIsDialogOpen(true)}
            className="btn-primary h-9 px-3.5 text-xs font-semibold gap-1.5 shadow-subtle"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Laporan Cepat</span>
          </button>
        </div>
      </div>

      {/* Filter Periode Rekap Tab Buttons */}
      <div className="flex items-center justify-between p-2.5 bg-white rounded-card border border-border">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-text-muted text-[11px] font-medium mr-2">Periode Rekap:</span>
          <button
            onClick={() => setPeriod('hari_ini')}
            className={`px-3 py-1.5 rounded-btn font-semibold transition-colors ${
              period === 'hari_ini'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-bg-subtle text-text hover:bg-bg-tint'
            }`}
          >
            Hari Ini ({dibuatHariIni})
          </button>
          <button
            onClick={() => setPeriod('bulan_ini')}
            className={`px-3 py-1.5 rounded-btn font-semibold transition-colors ${
              period === 'bulan_ini'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-bg-subtle text-text hover:bg-bg-tint'
            }`}
          >
            Bulan Ini
          </button>
          <button
            onClick={() => setPeriod('semua')}
            className={`px-3 py-1.5 rounded-btn font-semibold transition-colors ${
              period === 'semua'
                ? 'bg-primary text-white shadow-xs'
                : 'bg-bg-subtle text-text hover:bg-bg-tint'
            }`}
          >
            Semua ({reports.length})
          </button>
        </div>

        <button
          onClick={fetchReports}
          disabled={isLoading}
          className="p-1.5 text-text-muted hover:text-text rounded-btn bg-bg-subtle border border-border"
          title="Segarkan data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 5 KPI Stat Cards per SPEC A.8 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Target Hari Ini */}
        <div className="app-card p-4 flex flex-col justify-between bg-white border border-border">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Target Hari Ini</span>
            <div className="w-7 h-7 rounded-btn bg-bg-tint text-primary flex items-center justify-center">
              <Target className="w-4 h-4 stroke-[1.75]" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-text">
              {dibuatHariIni} <span className="text-sm font-normal text-text-muted">/ {targetHariIni}</span>
            </div>
            <div className="w-full bg-bg-tint rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, (dibuatHariIni / targetHariIni) * 100)}%` }} 
              />
            </div>
            <span className="text-[10px] text-text-muted mt-1 block">
              {Math.round((dibuatHariIni / targetHariIni) * 100)}% tercapai
            </span>
          </div>
        </div>

        {/* Card 2: Menunggu Foto */}
        <div className="app-card p-4 flex flex-col justify-between bg-white border border-border">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Menunggu Foto</span>
            <div className="w-7 h-7 rounded-btn bg-[#DCEBFF] text-primary flex items-center justify-center">
              <Camera className="w-4 h-4 stroke-[1.75]" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-text">
              {countMenungguFoto}
            </div>
            <p className="text-[11px] text-text-muted mt-1">Belum lengkap 34 foto</p>
          </div>
        </div>

        {/* Card 3: Foto Lengkap */}
        <div className="app-card p-4 flex flex-col justify-between bg-white border border-border">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Foto Lengkap</span>
            <div className="w-7 h-7 rounded-btn bg-[#E3F6EC] text-[#17714A] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 stroke-[1.75]" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[#17714A]">
              {countFotoLengkap}
            </div>
            <p className="text-[11px] text-text-muted mt-1">Siap ditinjau & di-generate</p>
          </div>
        </div>

        {/* Card 4: Perlu Perbaikan */}
        <div className="app-card p-4 flex flex-col justify-between bg-white border border-border">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Perlu Perbaikan</span>
            <div className="w-7 h-7 rounded-btn bg-[#FFF3DC] text-[#8A5300] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 stroke-[1.75]" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-[#8A5300]">
              {countPerluPerbaikan}
            </div>
            <p className="text-[11px] text-text-muted mt-1">Ada foto ditolak</p>
          </div>
        </div>

        {/* Card 5: Final & Terarsip */}
        <div className="app-card p-4 flex flex-col justify-between bg-white border border-border col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-medium">Final & Terarsip</span>
            <div className="w-7 h-7 rounded-btn bg-bg-tint text-primary flex items-center justify-center">
              <FileCheck className="w-4 h-4 stroke-[1.75]" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-primary">
              {countFinalDanArsip}
            </div>
            <p className="text-[11px] text-text-muted mt-1">Selesai & tersimpan aman</p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="app-card bg-white overflow-hidden border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text">
              Daftar Laporan Berita Acara ({filteredReports.length})
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Klik laporan untuk meninjau data teknis dan foto lapangan
            </p>
          </div>
          <Link
            href="/supervisor/laporan"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>Lihat Semua</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-subtle text-text-muted font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-3">WSID</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Jenis Pekerjaan</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Teknisi (Tim Lapangan)</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                    Tidak ada laporan pada periode ini.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const badge = getStatusBadgeConfig(report.status);

                  return (
                    <tr
                      key={report.id}
                      className="hover:bg-bg-subtle transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-3.5 font-bold text-text">
                        <Link href={`/supervisor/laporan/${report.id}`} className="hover:text-primary">
                          {report.wsid}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-text max-w-[200px] truncate">
                        {report.lokasi}
                      </td>
                      <td className="px-4 py-3.5 text-text-muted">
                        {report.jenis_pekerjaan}
                      </td>
                      <td className="px-4 py-3.5 text-text-muted">
                        {report.tanggal}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`status-chip ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-text">
                        {report.teknisi || report.data?.teknisi || report.data?.yang_melakukan || '-'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/supervisor/laporan/${report.id}`}
                          className="text-primary hover:underline font-semibold inline-flex items-center gap-1"
                        >
                          <span>Buka</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog Buat Laporan */}
      <CreateReportDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={(newReport) => {
          setReports((prev) => [newReport, ...prev]);
        }}
      />
    </div>
  );
}
