'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  MapPin, 
  UserCheck, 
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { Report } from '@/types/database';

export default function LapanganPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState('');
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

      {/* Location Cards - Hanya WSID, Lokasi, Teknisi */}
      <div className="space-y-3">
        {filteredLokasi.map((item) => {
          const teknisiNama = item.teknisi || item.data?.teknisi || item.data?.yang_melakukan || 'Tim Lapangan OMOV';

          return (
            <Link
              key={item.id}
              href={`/lapangan/${item.id}`}
              className="block app-card p-4 hover:border-primary transition-all active:scale-[0.99] bg-white border border-border shadow-xs"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xl font-bold text-text tracking-tight block">
                    {item.wsid}
                  </span>
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
