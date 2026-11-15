'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  MapPin, 
  UserCheck, 
  RefreshCw,
  HardHat
} from 'lucide-react';
import { getStatusBadgeConfig, formatTanggalIndonesia } from '@/lib/utils';
import { Report } from '@/types/database';

type FilterType = 'semua' | 'belum_mulai' | 'sedang_dikerjakan' | 'perlu_perbaikan';

export default function LapanganPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('semua');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReports = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/reports');
      const json = await res.json();
      if (json.success) {
        setReports(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredLokasi = reports.filter((item) => {
    const matchesSearch =
      item.wsid.toLowerCase().includes(search.toLowerCase()) ||
      item.lokasi.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // Filter status
    const progres = item.status === 'foto_lengkap' || item.status === 'final' ? 34 : (item.claimed_by ? 14 : 0);
    if (filter === 'belum_mulai') return !item.claimed_by && progres === 0;
    if (filter === 'sedang_dikerjakan') return !!item.claimed_by && progres < 34;
    if (filter === 'perlu_perbaikan') return item.status === 'perlu_perbaikan';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Search & Refresh */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari WSID atau Lokasi..."
            className="form-input pl-10 h-11 text-sm bg-white"
          />
        </div>
        <button
          onClick={fetchReports}
          disabled={isRefreshing}
          className="btn-secondary h-11 w-11 p-0 flex items-center justify-center shrink-0"
          aria-label="Segarkan"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          onClick={() => setFilter('semua')}
          className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors min-h-[36px] flex items-center ${
            filter === 'semua'
              ? 'bg-primary text-white'
              : 'bg-white border border-border text-text-muted'
          }`}
        >
          Semua ({reports.length})
        </button>
        <button
          onClick={() => setFilter('sedang_dikerjakan')}
          className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors min-h-[36px] flex items-center ${
            filter === 'sedang_dikerjakan'
              ? 'bg-primary text-white'
              : 'bg-white border border-border text-text-muted'
          }`}
        >
          Sedang Dikerjakan
        </button>
        <button
          onClick={() => setFilter('perlu_perbaikan')}
          className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors min-h-[36px] flex items-center ${
            filter === 'perlu_perbaikan'
              ? 'bg-[#FFF3DC] text-[#8A5300] border border-[#B9D4F3]'
              : 'bg-white border border-border text-text-muted'
          }`}
        >
          Perlu Perbaikan
        </button>
      </div>

      {/* Location Cards */}
      <div className="space-y-3">
        {filteredLokasi.map((item) => {
          const badge = getStatusBadgeConfig(item.status);
          const terisi = item.status === 'foto_lengkap' || item.status === 'final' ? 34 : (item.claimed_by ? 14 : 0);
          const total = 34;
          const percent = Math.round((terisi / total) * 100);

          return (
            <Link
              key={item.id}
              href={`/lapangan/${item.id}`}
              className="block app-card p-4 hover:border-primary-hover transition-all active:scale-[0.99] bg-white select-none"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-text tracking-tight">
                      {item.wsid}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-bg-tint text-primary font-medium">
                      {item.jenis_pekerjaan}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-text mt-0.5 leading-snug">
                    {item.lokasi}
                  </h3>
                </div>
                <span className={`status-chip shrink-0 ${badge.className}`}>
                  {badge.label}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-muted font-medium">Progres Foto</span>
                  <span className="font-semibold text-text">
                    {terisi} / {total} <span className="text-text-muted font-normal">({percent}%)</span>
                  </span>
                </div>
                <div className="w-full bg-bg-tint rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* Worker marker */}
              <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs text-text-muted">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-primary stroke-[1.75]" />
                  <span>
                    {item.claimed_by
                      ? 'Sedang dikerjakan oleh Ahmad Fauzi'
                      : 'Belum ada yang mengerjakan'}
                  </span>
                </div>
                <span className="text-[11px]">{formatTanggalIndonesia(item.tanggal)}</span>
              </div>
            </Link>
          );
        })}

        {filteredLokasi.length === 0 && (
          <div className="text-center py-12 bg-white rounded-card border border-border p-6">
            <MapPin className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-text">Tidak ada lokasi ditemukan</p>
            <p className="text-xs text-text-muted mt-0.5">
              Laporan baru yang dibuat supervisor akan otomatis muncul di sini.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
