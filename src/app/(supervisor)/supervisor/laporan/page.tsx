'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  ExternalLink,
  Calendar,
  FileText,
  Download,
  Trash2
} from 'lucide-react';
import { formatTanggalIndonesia, getStatusBadgeConfig } from '@/lib/utils';
import { Report, ReportStatus, JenisPekerjaan } from '@/types/database';
import { CreateReportDialog } from '@/components/supervisor/create-report-dialog';
import { downloadCsv, generateReportsCsv } from '@/lib/export/csv-exporter';

export default function SupervisorLaporanPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jenisFilter, setJenisFilter] = useState('');
  const [tanggalFilter, setTanggalFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      if (jenisFilter) params.set('jenis', jenisFilter);
      if (tanggalFilter) params.set('tanggal', tanggalFilter);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
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
  }, [search, statusFilter, jenisFilter, tanggalFilter]);

  const handleCreated = (newReport: Report) => {
    setReports((prev) => [newReport, ...prev]);
  };

  const handleDeleteReport = async (id: string, wsid: string, lokasi: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus Berita Acara WSID ${wsid} (${lokasi})? Seluruh data dan foto terkait akan dihapus secara permanen.`)) {
      return;
    }
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setReports((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert(`Gagal menghapus laporan: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Daftar Berita Acara
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Kelola dan pantau seluruh pengerjaan Berita Acara ATM BCA
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              const csv = generateReportsCsv(reports);
              const dateTag = new Date().toISOString().split('T')[0];
              downloadCsv(csv, `DAFTAR_LAPORAN_OMOV_${dateTag}.csv`);
            }}
            disabled={reports.length === 0}
            className="btn-secondary h-9 px-3 text-xs font-semibold gap-1.5"
            title="Ekspor daftar laporan yang tampil ke file CSV"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => setIsDialogOpen(true)}
            className="btn-primary h-9 gap-1.5 text-xs font-semibold shadow-subtle shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Laporan Baru</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="app-card p-4 space-y-3 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari WSID atau Lokasi..."
              className="form-input pl-10"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
            >
              <option value="">Semua Status</option>
              <option value="menunggu_foto">Menunggu Foto</option>
              <option value="foto_lengkap">Foto Lengkap</option>
              <option value="perlu_perbaikan">Perlu Perbaikan</option>
              <option value="final">Final</option>
              <option value="terarsip">Terarsip</option>
              <option value="dibatalkan">Dibatalkan</option>
            </select>
          </div>

          {/* Jenis Pekerjaan Filter */}
          <div>
            <select
              value={jenisFilter}
              onChange={(e) => setJenisFilter(e.target.value)}
              className="form-input"
            >
              <option value="">Semua Jenis Pekerjaan</option>
              <option value="Trade In">Trade In</option>
              <option value="Replace">Replace</option>
              <option value="Aktivasi Online Baru">Aktivasi Online Baru</option>
              <option value="Relokasi">Relokasi</option>
            </select>
          </div>

          {/* Tanggal Filter */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={tanggalFilter}
              onChange={(e) => setTanggalFilter(e.target.value)}
              className="form-input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="app-card overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-subtle text-text-muted text-xs font-medium border-b border-border">
              <tr>
                <th className="px-5 py-3.5">WSID</th>
                <th className="px-5 py-3.5">Lokasi</th>
                <th className="px-5 py-3.5">Jenis Pekerjaan</th>
                <th className="px-5 py-3.5">Tanggal</th>
                <th className="px-5 py-3.5">Progres Foto</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Teknisi (Tim Lapangan)</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.map((rep) => {
                const badge = getStatusBadgeConfig(rep.status);
                // Hitung progres simulasi
                const progres = rep.status === 'foto_lengkap' || rep.status === 'final' ? 34 : (rep.claimed_by ? 14 : 0);

                return (
                  <tr key={rep.id} className="hover:bg-bg-subtle transition-colors">
                    <td className="px-5 py-4 font-semibold text-text">
                      {rep.wsid}
                    </td>
                    <td className="px-5 py-4 text-text font-medium">
                      {rep.lokasi}
                    </td>
                    <td className="px-5 py-4 text-text-muted text-xs">
                      {rep.jenis_pekerjaan}
                    </td>
                    <td className="px-5 py-4 text-text-muted text-xs whitespace-nowrap">
                      {formatTanggalIndonesia(rep.tanggal)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-bg-tint rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${(progres / 34) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-text-muted">
                          {progres}/34
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`status-chip ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-text">
                      {rep.teknisi || rep.data?.teknisi || rep.data?.yang_melakukan || '-'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/supervisor/laporan/${rep.id}`}
                          className="btn-secondary h-8 px-3 text-xs inline-flex items-center gap-1.5"
                        >
                          <span>Kelola</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDeleteReport(rep.id, rep.wsid, rep.lokasi)}
                          disabled={isDeletingId === rep.id}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-btn border border-border bg-white text-text-muted hover:text-danger hover:border-danger/30 hover:bg-status-danger-bg/40 transition-colors"
                          title={`Hapus Laporan WSID ${rep.wsid}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {reports.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-text-muted text-xs">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Tidak ada laporan yang sesuai kriteria pencarian
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog Buat Laporan Cepat */}
      <CreateReportDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleCreated}
      />
    </div>
  );
}

