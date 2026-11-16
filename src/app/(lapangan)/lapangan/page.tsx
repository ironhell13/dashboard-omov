'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  MapPin, 
  UserCheck, 
  RefreshCw,
  ChevronRight,
  Lock,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Report } from '@/types/database';
import { cn } from '@/lib/utils';

export default function LapanganPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'aktif' | 'selesai'>('aktif');

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

  const aktifCount = reports.filter(
    (r) => r.status !== 'final' && r.status !== 'terarsip'
  ).length;

  const selesaiCount = reports.filter(
    (r) => r.status === 'final' || r.status === 'terarsip'
  ).length;

  const filteredLokasi = reports.filter((item) => {
    const isCompleted = item.status === 'final' || item.status === 'terarsip';

    // Filter berdasarkan tab aktif
    if (activeTab === 'aktif' && isCompleted) return false;
    if (activeTab === 'selesai' && !isCompleted) return false;

    const q = search.toLowerCase();
    const teknisi = (item.teknisi || item.data?.teknisi || item.data?.yang_melakukan || '').toLowerCase();
    return (
      item.wsid.toLowerCase().includes(q) ||
      item.lokasi.toLowerCase().includes(q) ||
      teknisi.includes(q)
    );
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
            placeholder="Cari WSID, Lokasi, atau Teknisi..."
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

      {/* Tab Filter: Tugas Aktif vs Selesai */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-card border border-border shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('aktif')}
          className={cn(
            "flex-1 py-2 text-xs font-semibold rounded-btn transition-all text-center flex items-center justify-center gap-1.5",
            activeTab === 'aktif'
              ? "bg-primary text-white shadow-xs font-bold"
              : "text-text-muted hover:text-text hover:bg-bg-subtle"
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Tugas Aktif</span>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
              activeTab === 'aktif'
                ? "bg-white/20 text-white"
                : "bg-bg-subtle text-text-muted"
            )}
          >
            {aktifCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('selesai')}
          className={cn(
            "flex-1 py-2 text-xs font-semibold rounded-btn transition-all text-center flex items-center justify-center gap-1.5",
            activeTab === 'selesai'
              ? "bg-emerald-600 text-white shadow-xs font-bold"
              : "text-text-muted hover:text-text hover:bg-bg-subtle"
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Selesai (Final)</span>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
              activeTab === 'selesai'
                ? "bg-white/20 text-white"
                : "bg-bg-subtle text-text-muted"
            )}
          >
            {selesaiCount}
          </span>
        </button>
      </div>

      {/* Location Cards */}
      <div className="space-y-3">
        {filteredLokasi.map((item) => {
          const teknisiNama = item.teknisi || item.data?.teknisi || item.data?.yang_melakukan || 'Tim Lapangan OMOV';
          const isCompleted = item.status === 'final' || item.status === 'terarsip';

          return (
            <Link
              key={item.id}
              href={`/lapangan/${item.id}`}
              className="block app-card p-4 hover:border-primary transition-all active:scale-[0.99] bg-white border border-border shadow-xs"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-text tracking-tight block">
                      {item.wsid}
                    </span>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Lock className="w-2.5 h-2.5" />
                        Final
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-text mt-1 leading-snug truncate">
                    {item.lokasi}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-text-muted">
                    <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-medium text-text truncate">
                      Teknisi: {teknisiNama}
                    </span>
                  </div>
                </div>

                <div className="w-9 h-9 rounded-full bg-bg-subtle border border-border flex items-center justify-center shrink-0 text-text-muted">
                  <ChevronRight className="w-5 h-5 text-primary" />
                </div>
              </div>
            </Link>
          );
        })}

        {filteredLokasi.length === 0 && (
          <div className="text-center py-12 bg-white rounded-card border border-border p-6 space-y-2">
            <MapPin className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-text">
              {activeTab === 'aktif'
                ? 'Tidak ada tugas aktif'
                : 'Belum ada laporan yang selesai'}
            </p>
            <p className="text-xs text-text-muted max-w-xs mx-auto">
              {activeTab === 'aktif'
                ? 'Semua tugas telah selesai difinalisasi oleh Supervisor, atau belum ada lokasi baru yang ditugaskan.'
                : 'Laporan yang telah ditandai Final oleh Supervisor akan tersimpan di sini sebagai riwayat.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
