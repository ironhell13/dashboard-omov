'use client';

import { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { JenisPekerjaan } from '@/types/database';

interface CreateReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newReport: any) => void;
}

export function CreateReportDialog({
  isOpen,
  onClose,
  onSuccess,
}: CreateReportDialogProps) {
  const [wsid, setWsid] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [teknisi, setTeknisi] = useState('');
  const [jenisPekerjaan, setJenisPekerjaan] = useState<JenisPekerjaan>('Trade In');
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [alamat, setAlamat] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!wsid.trim() || !lokasi.trim() || !teknisi.trim()) {
      setErrorMessage('WSID, Lokasi, dan Nama Teknisi wajib diisi');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wsid: wsid.toUpperCase().trim(),
          lokasi: lokasi.trim(),
          teknisi: teknisi.trim(),
          jenis_pekerjaan: jenisPekerjaan,
          tanggal,
          alamat: alamat.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal membuat laporan');
      }

      onSuccess(json.data);
      onClose();
      // Reset form
      setWsid('');
      setLokasi('');
      setTeknisi('');
      setAlamat('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan laporan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-card border border-border shadow-card overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-subtle">
          <div>
            <h2 className="text-base font-semibold text-text">
              Buat Laporan Berita Acara Baru
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Laporan baru langsung berstatus Menunggu Foto dan muncul di tim lapangan
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text rounded-md hover:bg-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-input bg-status-danger-bg text-status-danger-text text-xs flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text mb-1.5" htmlFor="wsid">
                WSID <span className="text-red-500">*</span>
              </label>
              <input
                id="wsid"
                type="text"
                required
                value={wsid}
                onChange={(e) => setWsid(e.target.value.toUpperCase())}
                placeholder="Contoh: Z9KD"
                className="form-input uppercase font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1.5" htmlFor="jenis">
                Jenis Pekerjaan <span className="text-red-500">*</span>
              </label>
              <select
                id="jenis"
                value={jenisPekerjaan}
                onChange={(e) => setJenisPekerjaan(e.target.value as JenisPekerjaan)}
                className="form-input"
              >
                <option value="Trade In">Trade In</option>
                <option value="Replace">Replace</option>
                <option value="Aktivasi Online Baru">Aktivasi Online Baru</option>
                <option value="Relokasi">Relokasi</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5" htmlFor="lokasi">
              Nama Lokasi <span className="text-red-500">*</span>
            </label>
            <input
              id="lokasi"
              type="text"
              required
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              placeholder="Contoh: SPBU 3415143 Otista"
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5" htmlFor="teknisi">
              Nama Teknisi (Tim Lapangan) <span className="text-red-500">*</span>
            </label>
            <input
              id="teknisi"
              type="text"
              required
              value={teknisi}
              onChange={(e) => setTeknisi(e.target.value)}
              placeholder="Contoh: Ahmad Fauzi / Tim OMOV A"
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5" htmlFor="tanggal">
              Tanggal Pekerjaan <span className="text-red-500">*</span>
            </label>
            <input
              id="tanggal"
              type="date"
              required
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5" htmlFor="alamat">
              Alamat Lengkap (Opsional)
            </label>
            <textarea
              id="alamat"
              rows={2}
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Alamat penempatan mesin..."
              className="w-full text-sm border border-border-strong rounded-input p-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 text-text"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn-secondary h-10 px-4 text-xs font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary h-10 px-5 text-xs font-semibold gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isLoading ? 'Menyimpan...' : 'Simpan Laporan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

