'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  Camera, 
  FileText, 
  AlertCircle, 
  Download, 
  Lock, 
  Unlock, 
  Eye, 
  XCircle, 
  MapPin, 
  RefreshCw,
  ExternalLink,
  Clock
} from 'lucide-react';
import { PHOTO_SLOTS, GROUPS } from '@/types/slot';
import { formatTanggalIndonesia, formatTanggalJamWIB, getStatusBadgeConfig } from '@/lib/utils';
import { Report, ReportData, JenisPekerjaan } from '@/types/database';

export default function SupervisorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState<'data' | 'foto' | 'dokumen'>('data');
  const [activeDataSection, setActiveDataSection] = useState('identitas');
  const [formData, setFormData] = useState<ReportData>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [rejectDialogSlot, setRejectDialogSlot] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [photoReviews, setPhotoReviews] = useState<Record<string, { status: string; note?: string }>>({});
  const [photosMap, setPhotosMap] = useState<Record<string, any>>({});
  const [selectedPreviewPhoto, setSelectedPreviewPhoto] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReport = () => {
    fetch(`/api/reports/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setReport(json.data);
          setFormData(json.data.data || {});
        }
      });
  };

  const fetchPhotos = () => {
    fetch(`/api/photos?reportId=${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.photos) {
          const map: Record<string, any> = {};
          const revMap: Record<string, { status: string; note?: string }> = {};
          json.photos.forEach((p: any) => {
            map[p.slotKey] = p;
            revMap[p.slotKey] = { status: p.review, note: p.review_note };
          });
          setPhotosMap(map);
          setPhotoReviews(revMap);
        }
      });
  };

  useEffect(() => {
    fetchReport();
    fetchPhotos();
  }, [id]);

  // Debounced Autosave (800ms)
  useEffect(() => {
    if (!report || report.status === 'final' || report.status === 'terarsip') return;
    setSaveStatus('saving');

    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/reports/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: formData }),
        });
        setSaveStatus('saved');
      } catch {
        setSaveStatus('idle');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData, id, report?.status]);

  const handleFieldChange = (key: keyof ReportData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleNestedFieldChange = (parent: keyof ReportData, child: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...((prev[parent] as any) || {}),
        [child]: value,
      },
    }));
  };

  const handleReviewPhoto = async (slotKey: string, status: 'diterima' | 'ditolak', note?: string) => {
    try {
      const res = await fetch('/api/photos/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: id,
          slotKey,
          review: status,
          note,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPhotoReviews((prev) => ({
          ...prev,
          [slotKey]: { status, note },
        }));
        fetchReport();
      } else {
        alert(`Gagal mereview foto: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setRejectDialogSlot(null);
      setRejectNote('');
    }
  };

  const handleGenerateDocx = async () => {
    setIsGenerating(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/laporan/${id}/generate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Gagal generate berkas Word');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BERITA_ACARA_${(report?.jenis_pekerjaan || 'TRADE_IN').toUpperCase()}_WSID_${report?.wsid}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setActionMessage({ type: 'success', text: 'Dokumen Word berhasil di-generate dan diunduh.' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Apakah Anda yakin ingin menandai laporan ini sebagai FINAL? Pengeditan di sisi tim lapangan akan dikunci.')) return;
    setIsFinalizing(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/reports/${id}/finalize`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setReport(json.data);
        setActionMessage({ type: 'success', text: 'Laporan berhasil ditandai Final dan dikunci.' });
      } else {
        setActionMessage({ type: 'error', text: json.error });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleReopen = async () => {
    if (!confirm('Buka kembali kunci laporan untuk memungkinkan perbaikan foto/data?')) return;
    setActionMessage(null);
    try {
      const res = await fetch(`/api/reports/${id}/reopen`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setReport(json.data);
        setActionMessage({ type: 'success', text: 'Kunci laporan berhasil dibuka kembali.' });
      } else {
        alert(`Gagal membuka kunci: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/reports/${id}/archive`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setReport(json.data);
        setActionMessage({ type: 'success', text: 'Dokumen berhasil diarsipkan ke Google Drive!' });
      } else {
        setActionMessage({ type: 'error', text: json.error });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsArchiving(false);
    }
  };

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span>Memuat data laporan...</span>
        </div>
      </div>
    );
  }

  const badge = getStatusBadgeConfig(report.status);

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/supervisor/laporan"
            className="p-2 text-text-muted hover:text-text rounded-btn bg-white border border-border hover:bg-bg-subtle transition-colors"
          >
            <ArrowLeft className="w-4 h-4 stroke-[1.75]" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text">
                {report.wsid} &middot; {report.lokasi}
              </h1>
              <span className={`status-chip ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {report.jenis_pekerjaan} &middot; {formatTanggalIndonesia(report.tanggal)}
            </p>
          </div>
        </div>

        {/* Autosave Status Indicator */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Menyimpan perubahan...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-status-success-text bg-[#E3F6EC] px-2.5 py-1 rounded-full font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tersimpan otomatis</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Tabs Header */}
      <div className="flex border-b border-border bg-white rounded-t-card px-4 pt-2">
        <button
          onClick={() => setActiveTab('data')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'data'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Isian Data Teks</span>
        </button>

        <button
          onClick={() => setActiveTab('foto')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'foto'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Review Foto (34 Slot)</span>
        </button>

        <button
          onClick={() => setActiveTab('dokumen')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'dokumen'
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Generate & Finalisasi</span>
        </button>
      </div>

      {/* TAB 1: FORM DATA TEKS */}
      {activeTab === 'data' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sub-nav Sections */}
          <div className="app-card p-3 bg-white h-fit space-y-1">
            {[
              { id: 'identitas', label: '1. Identitas Mesin' },
              { id: 'kelistrikan', label: '2. Kelistrikan UPS-IT' },
              { id: 'jaringan', label: '3. Jaringan & IP' },
              { id: 'isi_mesin', label: '4. Isi Mesin ATM' },
              { id: 'perangkat', label: '5. Status Perangkat' },
              { id: 'indoor_outdoor', label: '6. Indoor & Outdoor' },
              { id: 'pengaman', label: '7. Letak & Pengaman' },
              { id: 'penandatangan', label: '8. Penandatangan' },
              { id: 'vendor', label: '9. BA Waktu Hadir Vendor' },
              { id: 'dynabolt', label: '10. BA Dynabolt & HDD' },
            ].map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveDataSection(sec.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-btn text-xs font-medium transition-colors ${
                  activeDataSection === sec.id
                    ? 'bg-bg-tint text-primary font-semibold'
                    : 'text-text-muted hover:bg-bg-subtle hover:text-text'
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>

          {/* Section Form Content */}
          <div className="lg:col-span-3 app-card p-6 bg-white space-y-5">
            {activeDataSection === 'identitas' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-text pb-2 border-b border-border">
                  1. Identitas & Informasi Umum
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">WSID</label>
                    <input
                      type="text"
                      value={formData.wsid || ''}
                      onChange={(e) => handleFieldChange('wsid', e.target.value.toUpperCase())}
                      className="form-input uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Nama Lokasi</label>
                    <input
                      type="text"
                      value={formData.lokasi || ''}
                      onChange={(e) => handleFieldChange('lokasi', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-text mb-1">Alamat Penempatan</label>
                    <input
                      type="text"
                      value={formData.alamat || ''}
                      onChange={(e) => handleFieldChange('alamat', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Tipe Mesin (Baru)</label>
                    <input
                      type="text"
                      value={formData.type_mesin_baru || ''}
                      onChange={(e) => handleFieldChange('type_mesin_baru', e.target.value)}
                      placeholder="Contoh: NCR 6625"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Serial Nomor (Baru)</label>
                    <input
                      type="text"
                      value={formData.serial_nomor || ''}
                      onChange={(e) => handleFieldChange('serial_nomor', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">WSID Lama (Jika Ada)</label>
                    <input
                      type="text"
                      value={formData.wsid_lama || ''}
                      onChange={(e) => handleFieldChange('wsid_lama', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Lokasi Lama (Jika Ada)</label>
                    <input
                      type="text"
                      value={formData.lokasi_lama || ''}
                      onChange={(e) => handleFieldChange('lokasi_lama', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeDataSection === 'kelistrikan' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-text pb-2 border-b border-border">
                  2. Pengukuran Kelistrikan UPS-IT
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Tegangan UPS-IT (Volt)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.tegangan_ups_it || ''}
                      onChange={(e) => handleFieldChange('tegangan_ups_it', e.target.value)}
                      placeholder="Contoh: 220"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Grounding UPS-IT (Volt)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.grounding_ups_it || ''}
                      onChange={(e) => handleFieldChange('grounding_ups_it', e.target.value)}
                      placeholder="Contoh: 1.2"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeDataSection === 'jaringan' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-text pb-2 border-b border-border">
                  3. Jaringan Komunikasi & IP
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Initial VSAT</label>
                    <input
                      type="text"
                      value={formData.initial_vsat || ''}
                      onChange={(e) => handleFieldChange('initial_vsat', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Konfigurasi</label>
                    <input
                      type="text"
                      value={formData.konfigurasi || 'TCP/IP'}
                      onChange={(e) => handleFieldChange('konfigurasi', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">IP Address</label>
                    <input
                      type="text"
                      value={formData.ip_address || ''}
                      onChange={(e) => handleFieldChange('ip_address', e.target.value)}
                      placeholder="10.x.x.x"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeDataSection === 'isi_mesin' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-text pb-2 border-b border-border">
                  4. Isi Mesin ATM
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Cartridge / Kaset</label>
                    <input
                      type="text"
                      value={formData.cartridge || ''}
                      onChange={(e) => handleFieldChange('cartridge', e.target.value)}
                      placeholder="Contoh: 4 Kaset"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Reject Bin</label>
                    <input
                      type="text"
                      value={formData.reject || ''}
                      onChange={(e) => handleFieldChange('reject', e.target.value)}
                      placeholder="Contoh: 1 Kaset"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Kunci Mesin</label>
                    <input
                      type="text"
                      value={formData.kunci || ''}
                      onChange={(e) => handleFieldChange('kunci', e.target.value)}
                      placeholder="Posisi atau pihak ke-3"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeDataSection === 'perangkat' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-text pb-2 border-b border-border">
                  5. Status Perangkat Mesin
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['cencon', 'kamera', 'perekam', 'pin_cover', 'fdi', 'ac'].map((key) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-text mb-1 uppercase">
                        {key.replace('_', ' ')}
                      </label>
                      <select
                        value={(formData as any)[key] || 'Terpasang'}
                        onChange={(e) => handleFieldChange(key as any, e.target.value)}
                        className="form-input text-xs"
                      >
                        <option value="Terpasang">Terpasang</option>
                        <option value="Tidak terpasang">Tidak terpasang</option>
                        <option value="Tidak ada">Tidak ada</option>
                      </select>
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">MasterKey Triple DES</label>
                    <select
                      value={formData.masterkey_triple_des || 'Ya'}
                      onChange={(e) => handleFieldChange('masterkey_triple_des', e.target.value)}
                      className="form-input text-xs"
                    >
                      <option value="Ya">Ya</option>
                      <option value="Tidak">Tidak</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeDataSection === 'indoor_outdoor' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-text pb-2 border-b border-border">
                  6. Kondisi Indoor & Outdoor
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Neon Sign</label>
                    <select
                      value={formData.neon_sign || 'Terpasang'}
                      onChange={(e) => handleFieldChange('neon_sign', e.target.value)}
                      className="form-input text-xs"
                    >
                      <option value="Terpasang">Terpasang</option>
                      <option value="Tidak terpasang">Tidak terpasang</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Stiker Mesin</label>
                    <select
                      value={formData.stiker_mesin || 'Terpasang'}
                      onChange={(e) => handleFieldChange('stiker_mesin', e.target.value)}
                      className="form-input text-xs"
                    >
                      <option value="Terpasang">Terpasang</option>
                      <option value="Tidak terpasang">Tidak terpasang</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Kabel Jalur</label>
                    <input
                      type="text"
                      value={formData.kabel_jalur || 'Terproteksi pipa PVC'}
                      onChange={(e) => handleFieldChange('kabel_jalur', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Colokan Listrik</label>
                    <input
                      type="text"
                      value={formData.colokan_listrik || 'Standar SNI'}
                      onChange={(e) => handleFieldChange('colokan_listrik', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeDataSection === 'pengaman' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-text pb-2 border-b border-border">
                  7. Letak & Sistem Pengaman
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Letak Mesin</label>
                    <select
                      value={formData.letak_mesin || 'Lobby / Ruang ATM'}
                      onChange={(e) => handleFieldChange('letak_mesin', e.target.value)}
                      className="form-input text-xs"
                    >
                      <option value="Lobby / Ruang ATM">Lobby / Ruang ATM</option>
                      <option value="Drive Thru">Drive Thru</option>
                      <option value="Outdoor Kios">Outdoor Kios</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Pengaman Angkur</label>
                    <select
                      value={formData.angkur || 'Ya'}
                      onChange={(e) => handleFieldChange('angkur', e.target.value)}
                      className="form-input text-xs"
                    >
                      <option value="Ya">Ya (Dynabolt Terpasang)</option>
                      <option value="Tidak">Tidak</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Vendor Angkur</label>
                    <input
                      type="text"
                      value={formData.angkur_vendor || 'PT TAG'}
                      onChange={(e) => handleFieldChange('angkur_vendor', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Supersite</label>
                    <select
                      value={formData.supersite || 'Tidak'}
                      onChange={(e) => handleFieldChange('supersite', e.target.value)}
                      className="form-input text-xs"
                    >
                      <option value="Tidak">Tidak</option>
                      <option value="Ya">Ya</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeDataSection === 'penandatangan' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-text pb-2 border-b border-border">
                  8. Penandatangan Berita Acara
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Kota Penandatanganan</label>
                    <input
                      type="text"
                      value={formData.kota || 'Jakarta'}
                      onChange={(e) => handleFieldChange('kota', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Yang Melakukan (Teknisi/Vendor)</label>
                    <input
                      type="text"
                      value={formData.yang_melakukan || 'Budi Santoso'}
                      onChange={(e) => handleFieldChange('yang_melakukan', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Mengetahui (Supervisor/BCA)</label>
                    <input
                      type="text"
                      value={formData.mengetahui || 'Ahmad Fauzi'}
                      onChange={(e) => handleFieldChange('mengetahui', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeDataSection === 'vendor' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-text pb-2 border-b border-border">
                  9. BA Waktu Hadir Vendor (Halaman 4)
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'mesin_online', label: '1. Mesin Online' },
                    { key: 'vendor_instalasi', label: '2. Vendor Instalasi' },
                    { key: 'vendor_mover', label: '3. Vendor Mover' },
                    { key: 'vendor_cctv', label: '4. Vendor CCTV' },
                    { key: 'vendor_mesin', label: '5. Vendor Mesin' },
                    { key: 'pkt1', label: '6. PKT (1)' },
                    { key: 'pkt2', label: '7. PKT (2)' },
                    { key: 'vendor_nb', label: '8. Vendor NB' },
                  ].map((v) => (
                    <div key={v.key} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-bg-subtle rounded-btn">
                      <span className="text-xs font-semibold text-text flex items-center">
                        {v.label}
                      </span>
                      <input
                        type="text"
                        placeholder="Nama Vendor"
                        value={(formData.vendor_hadir as any)?.[v.key]?.nama || ''}
                        onChange={(e) => handleNestedFieldChange('vendor_hadir', `${v.key}.nama`, e.target.value)}
                        className="form-input text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Tanggal & Jam WIB"
                        value={(formData.vendor_hadir as any)?.[v.key]?.waktu || ''}
                        onChange={(e) => handleNestedFieldChange('vendor_hadir', `${v.key}.waktu`, e.target.value)}
                        className="form-input text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeDataSection === 'dynabolt' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-text pb-2 border-b border-border">
                  10. BA Dynabolt & Penghancuran HDD (Halaman 5 & 6)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Tipe Mesin Lama (Dynabolt)</label>
                    <input
                      type="text"
                      value={formData.type_mesin_lama || ''}
                      onChange={(e) => handleFieldChange('type_mesin_lama', e.target.value)}
                      placeholder="Contoh: Diebold 5500"
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Serial Nomor Mesin Lama</label>
                    <input
                      type="text"
                      value={formData.sn_mesin_lama || ''}
                      onChange={(e) => handleFieldChange('sn_mesin_lama', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REVIEW FOTO (34 SLOT) */}
      {activeTab === 'foto' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white rounded-card border border-border">
            <div>
              <h2 className="text-sm font-bold text-text">
                Kisi Peninjauan 34 Slot Foto
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Periksa kesesuaian rasio, ketajaman angka multimeter, dan nomor seri
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary bg-bg-tint px-3 py-1.5 rounded-full">
                {Object.keys(photosMap).length} / 34 Slot Terunggah
              </span>
            </div>
          </div>

          {GROUPS.map((grp) => {
            const groupSlots = PHOTO_SLOTS.filter((s) => s.grp === grp);
            if (groupSlots.length === 0) return null;

            return (
              <div key={grp} className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {grp} ({groupSlots.length} Slot)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {groupSlots.map((slot) => {
                    const actualSlotKey = slot.reuse_of || slot.key;
                    const photo = photosMap[actualSlotKey];
                    const review = photoReviews[slot.key] || (photo ? { status: photo.review, note: photo.review_note } : undefined);
                    const isRejected = review?.status === 'ditolak';
                    const isAccepted = review?.status === 'diterima';

                    return (
                      <div
                        key={slot.key}
                        className={`app-card p-2.5 flex flex-col justify-between bg-white border transition-all ${
                          isRejected
                            ? 'border-status-danger-text bg-status-danger-bg/20'
                            : isAccepted
                            ? 'border-status-success-text bg-status-success-bg/20'
                            : 'border-border'
                        }`}
                      >
                        {/* Thumbnail Container */}
                        <div className="relative aspect-4/3 w-full bg-bg-subtle rounded-md flex flex-col items-center justify-center border border-border overflow-hidden group">
                          {photo?.thumbBase64 ? (
                            <img
                              src={photo.thumbBase64}
                              alt={slot.label}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => setSelectedPreviewPhoto({ ...photo, label: slot.label, slot })}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-2 text-center">
                              <Camera className="w-5 h-5 text-text-muted opacity-40 mb-1" />
                              <span className="text-[10px] text-text-muted font-medium">
                                {slot.aspect_w}:{slot.aspect_h} &middot; {slot.tier}
                              </span>
                            </div>
                          )}

                          {photo?.thumbBase64 && (
                            <button
                              onClick={() => setSelectedPreviewPhoto({ ...photo, label: slot.label, slot })}
                              className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                              title="Perbesar foto"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          )}
                        </div>

                        {/* Slot Info */}
                        <div className="mt-2 min-w-0">
                          <div className="flex items-center justify-between text-[10px] text-text-muted">
                            <span>#{slot.sort}</span>
                            {slot.reuse_of && (
                              <span className="text-primary font-medium">Reuse</span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-text block truncate mt-0.5" title={slot.label}>
                            {slot.label}
                          </span>

                          {review?.status === 'diterima' && (
                            <span className="inline-block mt-1 text-[10px] font-semibold text-status-success-text bg-[#E3F6EC] px-1.5 py-0.5 rounded">
                              Diterima
                            </span>
                          )}

                          {review?.note && (
                            <p className="text-[10px] text-status-danger-text mt-1 bg-white p-1 rounded border border-red-200">
                              Catatan: {review.note}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between gap-1">
                          <button
                            onClick={() => handleReviewPhoto(slot.key, 'diterima')}
                            className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors text-center ${
                              isAccepted
                                ? 'bg-[#E3F6EC] text-[#17714A]'
                                : 'text-status-success-text hover:bg-status-success-bg'
                            }`}
                          >
                            Terima
                          </button>
                          <span className="text-border">|</span>
                          <button
                            onClick={() => setRejectDialogSlot(slot.key)}
                            className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors text-center ${
                              isRejected
                                ? 'bg-red-100 text-status-danger-text'
                                : 'text-status-danger-text hover:bg-status-danger-bg'
                            }`}
                          >
                            Tolak
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: DOKUMEN & FINALISASI */}
      {activeTab === 'dokumen' && (
        <div className="space-y-6">
          <div className="app-card p-6 bg-white space-y-6">
            <div>
              <h2 className="text-base font-semibold text-text">
                Pembuatan Dokumen Berita Acara Word (.docx)
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Dokumen 6 halaman dihasilkan persis dengan format BA_SAMPLE.docx
              </p>
            </div>

            {/* Notification alert banner */}
            {actionMessage && (
              <div
                className={`p-3.5 rounded-btn text-xs font-medium flex items-center gap-2 border ${
                  actionMessage.type === 'success'
                    ? 'bg-[#E3F6EC] text-[#17714A] border-green-200'
                    : 'bg-[#FDE8E8] text-[#B02A2A] border-red-200'
                }`}
              >
                {actionMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{actionMessage.text}</span>
              </div>
            )}

            {/* Verification checklist */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Status Kelayakan Pembuatan Dokumen:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 p-3 rounded-btn bg-[#E3F6EC] text-[#17714A]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>WSID ({report.wsid}) & Lokasi terisi</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-btn bg-bg-tint text-primary">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    {Object.keys(photosMap).length} / 34 Slot Foto terunggah
                  </span>
                </div>
              </div>
            </div>

            {/* Status Info Card if Final or Terarsip */}
            {report.status === 'terarsip' && (
              <div className="p-4 rounded-btn bg-[#E3F6EC] border border-green-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#17714A] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Laporan Berhasil Diarsipkan ke Google Drive
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {formatTanggalJamWIB(report.archived_at)}
                  </span>
                </div>
                <div className="text-xs text-text space-y-1">
                  <p>
                    File ID: <code className="bg-white/80 px-1 py-0.5 rounded text-[11px]">{report.drive_file_id}</code>
                  </p>
                  {report.drive_url && (
                    <a
                      href={report.drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 font-semibold text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Dokumen di Google Drive</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {report.status === 'final' && (
              <div className="p-4 rounded-btn bg-bg-tint border border-[#B9D4F3] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Lock className="w-4 h-4" />
                    Status: FINAL (Dokumen Terkunci)
                  </span>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Pengeditan oleh Tim Lapangan telah dinonaktifkan. Siap diarsipkan ke Google Drive.
                  </p>
                </div>
                <button
                  onClick={handleReopen}
                  className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5 text-text-muted" />
                  <span>Buka Kembali</span>
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-4 border-t border-border flex flex-wrap items-center gap-3">
              {/* Tombol Generate Word (Selalu tersedia) */}
              <button
                disabled={isGenerating}
                onClick={handleGenerateDocx}
                className="btn-primary gap-2 text-xs font-semibold disabled:opacity-50"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isGenerating ? 'Membuat Word...' : 'Unduh Dokumen Word (.docx)'}</span>
              </button>

              {/* Tombol Tandai Final */}
              {report.status !== 'final' && report.status !== 'terarsip' && (
                <button
                  disabled={isFinalizing}
                  onClick={handleFinalize}
                  className="btn-secondary gap-2 text-xs font-semibold disabled:opacity-50"
                >
                  {isFinalizing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4 text-primary" />
                  )}
                  <span>{isFinalizing ? 'Mengunci...' : 'Tandai Final'}</span>
                </button>
              )}

              {/* Tombol Arsipkan ke Google Drive saat Final */}
              {report.status === 'final' && (
                <button
                  disabled={isArchiving}
                  onClick={handleArchive}
                  className="btn-primary gap-2 text-xs font-semibold bg-[#17714A] hover:bg-green-700 disabled:opacity-50"
                >
                  {isArchiving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  <span>{isArchiving ? 'Mengarsipkan...' : 'Arsipkan ke Google Drive'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {selectedPreviewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-card overflow-hidden shadow-2xl flex flex-col">
            <div className="p-3 bg-bg-subtle border-b border-border flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-text">
                  #{selectedPreviewPhoto.slot?.sort} {selectedPreviewPhoto.label}
                </span>
                <span className="text-[10px] text-text-muted block">
                  Rasio {selectedPreviewPhoto.slot?.aspect_w}:{selectedPreviewPhoto.slot?.aspect_h} &middot; Tier {selectedPreviewPhoto.slot?.tier} &middot; {Math.round(selectedPreviewPhoto.bytes / 1024)} KB
                </span>
              </div>
              <button
                onClick={() => setSelectedPreviewPhoto(null)}
                className="p-1 rounded-md text-text-muted hover:text-text hover:bg-border/40"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto bg-black/5">
              <img
                src={selectedPreviewPhoto.thumbBase64}
                alt={selectedPreviewPhoto.label}
                className="max-h-[60vh] object-contain rounded border border-border"
              />
            </div>
            <div className="p-3 border-t border-border flex items-center justify-between text-xs bg-white">
              <span className="text-text-muted">
                Sumber: {selectedPreviewPhoto.source} &middot; Diunggah: {formatTanggalJamWIB(selectedPreviewPhoto.uploadedAt)}
              </span>
              <button
                onClick={() => setSelectedPreviewPhoto(null)}
                className="btn-secondary h-8 px-3 text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Catatan Penolakan Foto */}
      {rejectDialogSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-card border border-border shadow-card p-5 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-semibold text-text mb-1">
              Tolak Foto Slot #{rejectDialogSlot}
            </h3>
            <p className="text-xs text-text-muted mb-3">
              Wajib memberikan alasan atau instruksi perbaikan untuk tim lapangan
            </p>
            <textarea
              rows={3}
              required
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Contoh: Foto terlalu gelap, angka pada multimeter tidak terbaca jelas..."
              className="w-full text-xs border border-border-strong rounded-input p-2.5 outline-none focus:border-primary text-text"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setRejectDialogSlot(null);
                  setRejectNote('');
                }}
                className="btn-secondary h-8 px-3 text-xs"
              >
                Batal
              </button>
              <button
                onClick={() => handleReviewPhoto(rejectDialogSlot, 'ditolak', rejectNote)}
                disabled={!rejectNote.trim()}
                className="btn-primary h-8 px-3 text-xs bg-status-danger-text hover:bg-red-700"
              >
                Kirim Penolakan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

