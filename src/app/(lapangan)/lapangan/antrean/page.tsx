'use client';

import { useState, useEffect } from 'react';
import { 
  CloudUpload, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { queueManager } from '@/lib/offline/queue-manager';
import { OfflinePhotoItem } from '@/lib/offline/db';
import { PHOTO_SLOTS } from '@/types/slot';

export default function AntreanPage() {
  const [queue, setQueue] = useState<OfflinePhotoItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const loadQueue = async () => {
    try {
      const items = await queueManager.getQueue();
      setQueue(items);
    } catch {
      setQueue([]);
    }
  };

  useEffect(() => {
    loadQueue();
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Sinkronisasi otomatis saat kembali online
      handleSyncNow();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(loadQueue, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSyncNow = async () => {
    if (!navigator.onLine) {
      alert('Anda sedang offline. Sinkronisasi akan berjalan otomatis setelah tersambung internet.');
      return;
    }

    setIsSyncing(true);
    try {
      await queueManager.processQueue();
      await loadQueue();
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (confirm('Hapus foto ini dari antrean?')) {
      await queueManager.removeItem(id);
      await loadQueue();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">
            Antrean Foto Offline
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Foto disimpan di memori HP dan otomatis terkirim saat online
          </p>
        </div>

        {queue.length > 0 && (
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="btn-primary h-10 px-3.5 text-xs font-semibold gap-1.5 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Mengirim...' : 'Kirim Sekarang'}</span>
          </button>
        )}
      </div>

      {/* Connection Banner */}
      <div
        className={`p-3 rounded-card text-xs flex items-center justify-between border ${
          isOnline
            ? 'bg-[#E3F6EC] text-[#17714A] border-green-200'
            : 'bg-[#FFF3DC] text-[#8A5300] border-amber-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span className="font-semibold">
            {isOnline
              ? 'Terhubung ke Internet (Siap Unggah)'
              : 'Mode Offline (Foto Tersimpan di Penyimpanan Lokal HP)'}
          </span>
        </div>
      </div>

      {/* Info Notice iOS & Offline (SPEC A.11) */}
      <div className="p-3.5 bg-bg-tint border border-[#B9D4F3] rounded-card flex items-start gap-2.5 text-xs text-text leading-relaxed">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-primary block mb-0.5">
            Tips Pengiriman Tanpa Sinyal (SPEC A.11)
          </span>
          Jika Anda berada di lokasi tanpa sinyal, foto tetap aman tersimpan di HP. Begitu mendapatkan sinyal, buka aplikasi ini dan tekan <strong>Kirim Sekarang</strong>. Di iPhone, biarkan aplikasi tetap terbuka selama proses unggah.
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-2.5">
        {queue.map((item) => {
          const slotMeta = PHOTO_SLOTS.find((s) => s.key === item.slotKey);
          const sizeKb = Math.round(item.meta.bytes / 1024);

          return (
            <div
              key={item.id}
              className="app-card p-3.5 flex items-center justify-between gap-3 bg-white"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-bold text-xs text-text">
                    Slot #{slotMeta?.sort}
                  </span>
                  <span className="text-text-muted text-[10px]">&middot;</span>
                  <span className="text-xs font-semibold text-text truncate">
                    {slotMeta?.label || item.slotKey}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted truncate">
                  Laporan ID: {item.reportId}
                </p>

                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-text-muted">
                  <span className="font-medium text-text">{sizeKb} KB</span>
                  <span>&middot;</span>
                  <span className="capitalize">{item.meta.tier}</span>
                  <span>&middot;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                  {item.status === 'failed' && (
                    <span className="text-status-danger-text font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Gagal ({item.attempts}x)
                    </span>
                  )}
                  {item.status === 'uploading' && (
                    <span className="text-primary font-medium flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Sedang Mengunggah
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-2 text-text-muted hover:text-status-danger-text rounded-btn active:bg-bg-subtle transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Hapus dari antrean"
                >
                  <Trash2 className="w-4 h-4 stroke-[1.75]" />
                </button>
              </div>
            </div>
          );
        })}

        {queue.length === 0 && (
          <div className="text-center py-12 bg-white rounded-card border border-border p-6">
            <CheckCircle2 className="w-10 h-10 text-status-success-text mx-auto mb-2" />
            <p className="text-sm font-semibold text-text">Antrean Kosong</p>
            <p className="text-xs text-text-muted mt-0.5">
              Semua foto telah berhasil terkirim ke server.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
