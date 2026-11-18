'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Clock,
  Trash2,
  CheckCheck,
  CheckSquare,
  Square
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
  const router = useRouter();
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
  const [isDeletingReport, setIsDeletingReport] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Batch review & checklist state
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isBatchReviewing, setIsBatchReviewing] = useState(false);
  const [isBatchRejectModalOpen, setIsBatchRejectModalOpen] = useState(false);
  const [batchRejectNote, setBatchRejectNote] = useState('');

  const [isManualSaving, setIsManualSaving] = useState(false);
  const [manualSaveMessage, setManualSaveMessage] = useState<string | null>(null);

  const fetchReport = () => {
    fetch(`/api/reports/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const rep = json.data;
          setReport(rep);
          const initialData: ReportData = {
            wsid: rep.wsid,
            lokasi: rep.lokasi,
            teknisi: rep.teknisi,
            jenis_pekerjaan: rep.jenis_pekerjaan,
            tanggal: rep.tanggal,
            ...(rep.data || {}),
          };
          if (!initialData.wsid) initialData.wsid = rep.wsid;
          if (!initialData.lokasi) initialData.lokasi = rep.lokasi;
          if (!initialData.teknisi) initialData.teknisi = rep.teknisi;
          if (!initialData.yang_melakukan) initialData.yang_melakukan = rep.teknisi;
          if (!initialData.jenis_pekerjaan) initialData.jenis_pekerjaan = rep.jenis_pekerjaan;
          if (!initialData.tanggal) initialData.tanggal = rep.tanggal;
          setFormData(initialData);
        }
      });
  };

  const handleManualSave = async () => {
    setIsManualSaving(true);
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: formData,
          wsid: formData.wsid,
          lokasi: formData.lokasi,
          teknisi: formData.teknisi || formData.yang_melakukan,
          jenis_pekerjaan: formData.jenis_pekerjaan,
          tanggal: formData.tanggal,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSaveStatus('saved');
        setManualSaveMessage('Data teks laporan berhasil disimpan ke database!');
        setTimeout(() => setManualSaveMessage(null), 3500);
        fetchReport();
      } else {
        setSaveStatus('idle');
        alert(`Gagal menyimpan data teks: ${json.error}`);
      }
    } catch (err: any) {
      setSaveStatus('idle');
      alert(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setIsManualSaving(false);
    }
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

          // Auto-centang seluruh slot yang fotonya sudah terunggah
          const uploadedSlots = PHOTO_SLOTS.filter((s) => !!map[s.reuse_of || s.key]).map((s) => s.key);
          setSelectedSlots(uploadedSlots);
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
          body: JSON.stringify({
            data: formData,
            wsid: formData.wsid,
            lokasi: formData.lokasi,
            teknisi: formData.teknisi || formData.yang_melakukan,
            jenis_pekerjaan: formData.jenis_pekerjaan,
            tanggal: formData.tanggal,
          }),
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

  const handleNestedFieldChange = (parent: keyof ReportData, childPath: string, value: any) => {
    setFormData((prev) => {
      const parentObj = { ...((prev[parent] as any) || {}) };
      const parts = childPath.split('.');
      if (parts.length === 1) {
        parentObj[parts[0]] = value;
      } else if (parts.length === 2) {
        parentObj[parts[0]] = {
          ...(parentObj[parts[0]] || {}),
          [parts[1]]: value,
        };
      }
      return {
        ...prev,
        [parent]: parentObj,
      };
    });
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

  const handleSelectAll = () => {
    const uploadedKeys = PHOTO_SLOTS.filter((s) => !!photosMap[s.reuse_of || s.key]).map((s) => s.key);
    if (selectedSlots.length === uploadedKeys.length && uploadedKeys.length > 0) {
      setSelectedSlots([]);
    } else {
      setSelectedSlots(uploadedKeys);
    }
  };

  const toggleSlotSelected = (slotKey: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slotKey)
        ? prev.filter((k) => k !== slotKey)
        : [...prev, slotKey]
    );
  };

  const handleBatchApprove = async () => {
    if (selectedSlots.length === 0) {
      alert('Silakan centang setidaknya satu foto untuk diterima.');
      return;
    }
    setIsBatchReviewing(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/photos/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: id,
          slotKeys: selectedSlots,
          review: 'diterima',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPhotoReviews((prev) => {
          const next = { ...prev };
          selectedSlots.forEach((k) => {
            next[k] = { status: 'diterima' };
          });
          return next;
        });
        fetchReport();
        setActionMessage({
          type: 'success',
          text: `Berhasil menerima ${selectedSlots.length} foto sekaligus!`,
        });
      } else {
        alert(`Gagal menerima foto: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsBatchReviewing(false);
    }
  };

  const handleBatchReject = async () => {
    if (!batchRejectNote.trim()) {
      alert('Catatan penolakan wajib diisi.');
      return;
    }
    setIsBatchReviewing(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/photos/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: id,
          slotKeys: selectedSlots,
          review: 'ditolak',
          note: batchRejectNote.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPhotoReviews((prev) => {
          const next = { ...prev };
          selectedSlots.forEach((k) => {
            next[k] = { status: 'ditolak', note: batchRejectNote.trim() };
          });
          return next;
        });
        fetchReport();
        setIsBatchRejectModalOpen(false);
        setBatchRejectNote('');
        setActionMessage({
          type: 'error',
          text: `${selectedSlots.length} foto ditolak. Status laporan kini Perlu Perbaikan.`,
        });
      } else {
        alert(`Gagal menolak foto: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsBatchReviewing(false);
    }
  };

  const handleDeleteThisReport = async () => {
    if (!report) return;
    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus Berita Acara WSID ${report.wsid} (${report.lokasi})? Seluruh foto dan data laporan akan dihapus secara permanen.`
      )
    ) {
      return;
    }

    setIsDeletingReport(true);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        router.push('/supervisor/laporan');
      } else {
        alert(`Gagal menghapus laporan: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsDeletingReport(false);
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

        {/* Header Actions: Autosave & Hapus Laporan */}
        <div className="flex items-center gap-3">
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

          <button
            onClick={handleDeleteThisReport}
            disabled={isDeletingReport}
            className="btn-secondary h-8 px-2.5 text-xs text-danger hover:bg-status-danger-bg hover:border-danger/30 inline-flex items-center gap-1.5 transition-colors"
            title="Hapus laporan ini secara permanen"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hapus Laporan</span>
          </button>
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
        <div className="space-y-4">
          {/* Header Action Bar for Manual Text Data Saving */}
          <div className="app-card p-4 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-border shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-text">Isian Data Teks Berita Acara (BA)</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Isi data teks secara manual dan klik tombol simpan untuk memperbarui laporan dan data Word (.docx).
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {manualSaveMessage && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  {manualSaveMessage}
                </span>
              )}
              <button
                type="button"
                onClick={handleManualSave}
                disabled={isManualSaving}
                className="btn-primary w-full sm:w-auto h-9 px-4 text-xs font-semibold gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isManualSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isManualSaving ? 'Menyimpan...' : 'Simpan Perubahan Data'}</span>
              </button>
            </div>
          </div>

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
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Jenis Pekerjaan</label>
                      <select
                        value={formData.jenis_pekerjaan || report.jenis_pekerjaan || 'Trade In'}
                        onChange={(e) => handleFieldChange('jenis_pekerjaan', e.target.value)}
                        className="form-input text-xs"
                      >
                        <option value="Trade In">Trade In</option>
                        <option value="Replace">Replace</option>
                        <option value="Aktivasi Online Baru">Aktivasi Online Baru</option>
                        <option value="Relokasi">Relokasi</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Tanggal Pekerjaan</label>
                      <input
                        type="date"
                        value={formData.tanggal || report.tanggal || ''}
                        onChange={(e) => handleFieldChange('tanggal', e.target.value)}
                        className="form-input text-xs"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-text mb-1">Nama Teknisi (Tim Lapangan)</label>
                      <input
                        type="text"
                        value={formData.teknisi || report.teknisi || ''}
                        onChange={(e) => {
                          handleFieldChange('teknisi', e.target.value);
                          handleFieldChange('yang_melakukan', e.target.value);
                        }}
                        placeholder="Contoh: Ahmad Fauzi / Tim OMOV"
                        className="form-input font-medium"
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
                      list="konfigurasi_list_supervisor"
                      value={formData.konfigurasi ?? ''}
                      onChange={(e) => handleFieldChange('konfigurasi', e.target.value)}
                      placeholder="Contoh: TCP/IP"
                      className="form-input"
                    />
                    <datalist id="konfigurasi_list_supervisor">
                      <option value="TCP/IP" />
                      <option value="VSAT" />
                      <option value="Dial Up" />
                      <option value="4G / GSM" />
                    </datalist>
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
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1 uppercase">
                      Kamera
                    </label>
                    <input
                      type="text"
                      list="kamera_list_supervisor"
                      value={formData.kamera || ''}
                      onChange={(e) => handleFieldChange('kamera', e.target.value)}
                      placeholder="Contoh: Internal & Eksternal (Terpasang)"
                      className="form-input text-xs"
                    />
                    <datalist id="kamera_list_supervisor">
                      <option value="Internal & Eksternal (Terpasang)" />
                      <option value="Terpasang" />
                      <option value="Internal Saja" />
                      <option value="Eksternal Saja" />
                      <option value="Tidak terpasang" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1 uppercase">
                      Perekam
                    </label>
                    <input
                      type="text"
                      list="perekam_list_supervisor"
                      value={formData.perekam || ''}
                      onChange={(e) => handleFieldChange('perekam', e.target.value)}
                      placeholder="Contoh: Internal & Eksternal (Terpasang)"
                      className="form-input text-xs"
                    />
                    <datalist id="perekam_list_supervisor">
                      <option value="Internal & Eksternal (Terpasang)" />
                      <option value="Terpasang" />
                      <option value="Internal Saja" />
                      <option value="Eksternal Saja" />
                      <option value="Tidak terpasang" />
                    </datalist>
                  </div>
                  {['cencon', 'pin_cover', 'fdi', 'ac'].map((key) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-text mb-1 uppercase">
                        {key.replace('_', ' ')}
                      </label>
                      <select
                        value={(formData as any)[key] || ''}
                        onChange={(e) => handleFieldChange(key as any, e.target.value)}
                        className="form-input text-xs"
                      >
                        <option value="">-- Pilih Status --</option>
                        <option value="Terpasang">Terpasang</option>
                        <option value="Tidak terpasang">Tidak terpasang</option>
                        <option value="Tidak ada">Tidak ada</option>
                      </select>
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">MasterKey Triple desk</label>
                    <select
                      value={formData.masterkey_triple_des || ''}
                      onChange={(e) => handleFieldChange('masterkey_triple_des', e.target.value)}
                      className="form-input text-xs"
                    >
                      <option value="">-- Pilih --</option>
                      <option value="Ya Digit">Ya Digit</option>
                      <option value="Tidak">Tidak</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-text mb-1">
                      Harap info alasan jika tidak :
                    </label>
                    <input
                      type="text"
                      value={formData.masterkey_alasan || ''}
                      onChange={(e) => handleFieldChange('masterkey_alasan', e.target.value)}
                      placeholder="Alasan jika Tidak..."
                      className="form-input text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeDataSection === 'indoor_outdoor' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-text pb-2 border-b border-border">
                    6. Kondisi Indoor & Outdoor
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Neon Sign</label>
                      <select
                        value={formData.neon_sign || ''}
                        onChange={(e) => handleFieldChange('neon_sign', e.target.value)}
                        className="form-input text-xs"
                      >
                        <option value="">-- Pilih Status --</option>
                        <option value="Terpasang">Terpasang</option>
                        <option value="Tidak terpasang">Tidak terpasang</option>
                        <option value="Tidak ada">Tidak ada</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Stiker Mesin</label>
                      <select
                        value={formData.stiker_mesin || ''}
                        onChange={(e) => handleFieldChange('stiker_mesin', e.target.value)}
                        className="form-input text-xs"
                      >
                        <option value="">-- Pilih Status --</option>
                        <option value="Terpasang">Terpasang</option>
                        <option value="Tidak terpasang">Tidak terpasang</option>
                        <option value="Tidak ada">Tidak ada</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Kabel Jalur</label>
                      <input
                        type="text"
                        value={formData.kabel_jalur || ''}
                        onChange={(e) => handleFieldChange('kabel_jalur', e.target.value)}
                        placeholder="Contoh: Terproteksi pipa PVC"
                        className="form-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Colokan Listrik</label>
                      <input
                        type="text"
                        value={formData.colokan_listrik || ''}
                        onChange={(e) => handleFieldChange('colokan_listrik', e.target.value)}
                        placeholder="Contoh: Standar SNI"
                        className="form-input text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Perangkat Eksternal */}
                <div className="pt-4 border-t border-border space-y-4">
                  <h4 className="text-sm font-semibold text-text flex items-center gap-1.5">
                    Perangkat Eksternal (Perekam/DVR, CCTV, UPS, LED)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Perekam Eksternal / DVR */}
                    <div className="p-3 bg-bg-subtle rounded-btn space-y-2 border border-border/50">
                      <span className="text-xs font-bold text-text block">Perekam Eksternal / DVR</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-text-muted block">Status</label>
                          <select
                            value={formData.perekam_eksternal?.status || ''}
                            onChange={(e) => handleNestedFieldChange('perekam_eksternal', 'status', e.target.value)}
                            className="form-input text-xs"
                          >
                            <option value="">- Status -</option>
                            <option value="Terpasang">Terpasang</option>
                            <option value="Tidak terpasang">Tidak terpasang</option>
                            <option value="Tidak ada">Tidak ada</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-text-muted block">Merk</label>
                          <input
                            type="text"
                            placeholder="Merk DVR"
                            value={formData.perekam_eksternal?.merk || ''}
                            onChange={(e) => handleNestedFieldChange('perekam_eksternal', 'merk', e.target.value)}
                            className="form-input text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-text-muted block">Serial Number</label>
                          <input
                            type="text"
                            placeholder="SN DVR"
                            value={formData.perekam_eksternal?.sn || ''}
                            onChange={(e) => handleNestedFieldChange('perekam_eksternal', 'sn', e.target.value)}
                            className="form-input text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Kamera Eksternal */}
                    <div className="p-3 bg-bg-subtle rounded-btn space-y-2 border border-border/50">
                      <span className="text-xs font-bold text-text block">Kamera Eksternal</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-text-muted block">Status</label>
                          <select
                            value={formData.kamera_eksternal?.status || ''}
                            onChange={(e) => handleNestedFieldChange('kamera_eksternal', 'status', e.target.value)}
                            className="form-input text-xs"
                          >
                            <option value="">- Status -</option>
                            <option value="Terpasang">Terpasang</option>
                            <option value="Tidak terpasang">Tidak terpasang</option>
                            <option value="Tidak ada">Tidak ada</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-text-muted block">Merk</label>
                          <input
                            type="text"
                            placeholder="Merk Kamera"
                            value={formData.kamera_eksternal?.merk || ''}
                            onChange={(e) => handleNestedFieldChange('kamera_eksternal', 'merk', e.target.value)}
                            className="form-input text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-text-muted block">Serial Number</label>
                          <input
                            type="text"
                            placeholder="SN Kamera"
                            value={formData.kamera_eksternal?.sn || ''}
                            onChange={(e) => handleNestedFieldChange('kamera_eksternal', 'sn', e.target.value)}
                            className="form-input text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* UPS Eksternal */}
                    <div className="p-3 bg-bg-subtle rounded-btn space-y-2 border border-border/50">
                      <span className="text-xs font-bold text-text block">UPS Eksternal</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-text-muted block">Status</label>
                          <select
                            value={formData.ups?.status || ''}
                            onChange={(e) => handleNestedFieldChange('ups', 'status', e.target.value)}
                            className="form-input text-xs"
                          >
                            <option value="">- Status -</option>
                            <option value="Terpasang">Terpasang</option>
                            <option value="Tidak terpasang">Tidak terpasang</option>
                            <option value="Tidak ada">Tidak ada</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-text-muted block">Merk</label>
                          <input
                            type="text"
                            placeholder="Merk UPS"
                            value={formData.ups?.merk || ''}
                            onChange={(e) => handleNestedFieldChange('ups', 'merk', e.target.value)}
                            className="form-input text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-text-muted block">Serial Number</label>
                          <input
                            type="text"
                            placeholder="SN UPS"
                            value={formData.ups?.sn || ''}
                            onChange={(e) => handleNestedFieldChange('ups', 'sn', e.target.value)}
                            className="form-input text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* LED Eksternal */}
                    <div className="p-3 bg-bg-subtle rounded-btn space-y-2 border border-border/50">
                      <span className="text-xs font-bold text-text block">Lampu / LED Eksternal</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-text-muted block">Status</label>
                          <select
                            value={formData.led?.status || ''}
                            onChange={(e) => handleNestedFieldChange('led', 'status', e.target.value)}
                            className="form-input text-xs"
                          >
                            <option value="">- Status -</option>
                            <option value="Terpasang">Terpasang</option>
                            <option value="Tidak terpasang">Tidak terpasang</option>
                            <option value="Tidak ada">Tidak ada</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-text-muted block">Merk</label>
                          <input
                            type="text"
                            placeholder="Merk LED"
                            value={formData.led?.merk || ''}
                            onChange={(e) => handleNestedFieldChange('led', 'merk', e.target.value)}
                            className="form-input text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-text-muted block">Serial Number</label>
                          <input
                            type="text"
                            placeholder="SN LED"
                            value={formData.led?.sn || ''}
                            onChange={(e) => handleNestedFieldChange('led', 'sn', e.target.value)}
                            className="form-input text-xs"
                          />
                        </div>
                      </div>
                    </div>
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
                    <input
                      type="text"
                      list="letak_mesin_options"
                      value={formData.letak_mesin || ''}
                      onChange={(e) => handleFieldChange('letak_mesin', e.target.value)}
                      placeholder="Contoh: Lobby, Indomaret, SPBU, Alfamart"
                      className="form-input text-xs"
                    />
                    <datalist id="letak_mesin_options">
                      <option value="Lobby / Ruang ATM" />
                      <option value="Indomaret" />
                      <option value="Alfamart" />
                      <option value="SPBU" />
                      <option value="Drive Thru" />
                      <option value="Outdoor Kios" />
                      <option value="Cabang BCA" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Pasang Pengaman Angkur</label>
                    <select
                      value={formData.angkur || ''}
                      onChange={(e) => handleFieldChange('angkur', e.target.value)}
                      className="form-input text-xs"
                    >
                      <option value="">-- Pilih --</option>
                      <option value="Ya Digit">Ya Digit</option>
                      <option value="Ya">Ya</option>
                      <option value="Tidak">Tidak</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Nama Vendor (Jika "YA")</label>
                    <input
                      type="text"
                      value={formData.angkur_vendor || ''}
                      onChange={(e) => handleFieldChange('angkur_vendor', e.target.value)}
                      placeholder="Contoh: PT TAG"
                      className="form-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      Jika "Tidak" harap info type pengaman pengganti :
                    </label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.pengaman_pengganti?.dynabolt || false}
                          onChange={(e) => handleNestedFieldChange('pengaman_pengganti', 'dynabolt', e.target.checked)}
                          className="rounded text-primary focus:ring-primary w-4 h-4"
                        />
                        <span>Dynabolt</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.pengaman_pengganti?.alarm || false}
                          onChange={(e) => handleNestedFieldChange('pengaman_pengganti', 'alarm', e.target.checked)}
                          className="rounded text-primary focus:ring-primary w-4 h-4"
                        />
                        <span>Alarm</span>
                      </label>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-text mb-1">
                      Harap info alasan menggunakan Dynabold/Alarm (Jika Tidak diangkur) :
                    </label>
                    <input
                      type="text"
                      value={formData.angkur_alasan || ''}
                      onChange={(e) => handleFieldChange('angkur_alasan', e.target.value)}
                      placeholder="Contoh: Lokasi sewa tidak mengizinkan pengeboran / lantai granit"
                      className="form-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Supersite</label>
                    <select
                      value={formData.supersite || ''}
                      onChange={(e) => handleFieldChange('supersite', e.target.value)}
                      className="form-input text-xs"
                    >
                      <option value="">-- Pilih Supersite --</option>
                      <option value="Tidak">Tidak</option>
                      <option value="Ya">Ya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Vendor Supersite</label>
                    <input
                      type="text"
                      value={formData.supersite_vendor || ''}
                      onChange={(e) => handleFieldChange('supersite_vendor', e.target.value)}
                      placeholder="Contoh: PT TAG"
                      className="form-input text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-text mb-1">
                      Alasan Tidak Supersite (Jika Tidak)
                    </label>
                    <input
                      type="text"
                      value={formData.supersite_alasan || ''}
                      onChange={(e) => handleFieldChange('supersite_alasan', e.target.value)}
                      placeholder="Contoh: Belum terpasang sistem supersite"
                      className="form-input text-xs"
                    />
                  </div>

                  {/* Exhaust Fan */}
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Exhaust Fan (Jumlah & Status)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        value={formData.exhaust_fan_jumlah || ''}
                        onChange={(e) => handleFieldChange('exhaust_fan_jumlah', e.target.value)}
                        placeholder="Jumlah (misal: 1)"
                        className="form-input text-xs"
                      />
                      <select
                        value={formData.exhaust_fan_status || ''}
                        onChange={(e) => handleFieldChange('exhaust_fan_status', e.target.value as any)}
                        className="form-input text-xs"
                      >
                        <option value="">- Status -</option>
                        <option value="Nyala">Nyala</option>
                        <option value="Mati">Mati</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Tanggal Email Permintaan Mesin</label>
                    <input
                      type="date"
                      value={formData.tanggal_email_permintaan || ''}
                      onChange={(e) => handleFieldChange('tanggal_email_permintaan', e.target.value)}
                      className="form-input text-xs"
                    />
                  </div>

                  {/* Koordinat GPS Lokasi */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-text mb-1">
                      Koordinat GPS Lokasi (Latitude, Longitude)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: -6.17376, 106.62497833"
                      value={formData.koordinat_manual || (typeof formData.koordinat === 'string' ? formData.koordinat : (formData.koordinat?.lat ? `${formData.koordinat.lat}, ${formData.koordinat.lng}` : ''))}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleFieldChange('koordinat_manual', val);
                        handleFieldChange('koordinat', val);
                      }}
                      className="form-input text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeDataSection === 'penandatangan' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-text pb-2 border-b border-border">
                  8. Penandatangan Berita Acara
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Kota Penandatanganan</label>
                    <input
                      type="text"
                      value={formData.kota || ''}
                      onChange={(e) => handleFieldChange('kota', e.target.value)}
                      placeholder="Contoh: Jakarta"
                      className="form-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Yang Melakukan (Teknisi Lapangan)</label>
                    <input
                      type="text"
                      value={formData.yang_melakukan || formData.teknisi || report.teknisi || ''}
                      onChange={(e) => {
                        handleFieldChange('yang_melakukan', e.target.value);
                        handleFieldChange('teknisi', e.target.value);
                      }}
                      placeholder="Nama Teknisi"
                      className="form-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Mengetahui (Supervisor / PIC BCA)</label>
                    <input
                      type="text"
                      value={formData.mengetahui || ''}
                      onChange={(e) => handleFieldChange('mengetahui', e.target.value)}
                      placeholder="Nama Supervisor / PIC"
                      className="form-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Penandatangan PIC Vendor (Hal 4)</label>
                    <input
                      type="text"
                      value={formData.penandatangan_vendor || ''}
                      onChange={(e) => handleFieldChange('penandatangan_vendor', e.target.value)}
                      placeholder="PIC Vendor Waktu Hadir"
                      className="form-input text-xs"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Jadwal Aktivasi</label>
                    <input
                      type="text"
                      value={formData.jadwal_aktivasi || ''}
                      onChange={(e) => handleFieldChange('jadwal_aktivasi', e.target.value)}
                      placeholder="Contoh: 12 November 2026 atau Jam WIB"
                      className="form-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Keterangan Tambahan Vendor</label>
                    <input
                      type="text"
                      value={formData.keterangan_vendor || ''}
                      onChange={(e) => handleFieldChange('keterangan_vendor', e.target.value)}
                      placeholder="Catatan / keterangan vendor..."
                      className="form-input text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-text-muted block">Daftar Kehadiran 8 Vendor:</span>
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
                        placeholder="Nama Vendor (Contoh: ACS, TAG)"
                        value={(formData.vendor_hadir as any)?.[v.key]?.nama || ''}
                        onChange={(e) => handleNestedFieldChange('vendor_hadir', `${v.key}.nama`, e.target.value)}
                        className="form-input text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Tanggal & Jam WIB (Contoh: 12/11/2026 14:30 WIB)"
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

            {/* Global Bottom Save Button for Section Content */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-text-muted flex items-center gap-1.5">
                {saveStatus === 'saving' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>Menyinkronkan data...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Data tersimpan di database</span>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={handleManualSave}
                disabled={isManualSaving}
                className="btn-primary h-8 px-4 text-xs font-semibold gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isManualSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Simpan Isian Data Teks</span>
              </button>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* TAB 2: REVIEW FOTO (34 SLOT) */}
      {activeTab === 'foto' && (
        <div className="space-y-6">
          {/* Bulk Review Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-white rounded-card border border-border gap-3">
            <div>
              <h2 className="text-sm font-bold text-text">
                Kisi Peninjauan 34 Slot Foto
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Centang foto untuk menerima atau menolak secara massal tanpa harus satu per satu
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="btn-secondary h-8 px-2.5 text-xs gap-1.5 font-medium"
                title="Centang semua atau lepas centang semua foto yang terunggah"
              >
                {selectedSlots.length > 0 &&
                selectedSlots.length ===
                  PHOTO_SLOTS.filter((s) => !!photosMap[s.reuse_of || s.key]).length ? (
                  <CheckSquare className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-text-muted" />
                )}
                <span>
                  {selectedSlots.length > 0 &&
                  selectedSlots.length ===
                    PHOTO_SLOTS.filter((s) => !!photosMap[s.reuse_of || s.key]).length
                    ? 'Lepas Semua'
                    : 'Centang Semua'}
                </span>
              </button>

              <button
                onClick={handleBatchApprove}
                disabled={isBatchReviewing || selectedSlots.length === 0}
                className="btn-primary h-8 px-3 text-xs gap-1.5 font-semibold bg-[#17714A] hover:bg-[#125B3B] text-white border-transparent"
                title="Terima semua foto yang dicentang sekaligus"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>
                  {isBatchReviewing ? 'Menyimpan...' : `Terima (${selectedSlots.length}) Foto`}
                </span>
              </button>

              <button
                onClick={() => {
                  if (selectedSlots.length === 0) {
                    alert('Silakan centang setidaknya satu foto yang ingin ditolak.');
                    return;
                  }
                  setIsBatchRejectModalOpen(true);
                }}
                disabled={isBatchReviewing || selectedSlots.length === 0}
                className="btn-secondary h-8 px-3 text-xs gap-1.5 font-semibold text-danger hover:bg-status-danger-bg border-border"
                title="Tolak foto yang dicentang dan kirim instruksi perbaikan"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Tolak ({selectedSlots.length})</span>
              </button>

              <span className="text-xs font-semibold text-primary bg-bg-tint px-3 py-1.5 rounded-full ml-1">
                {PHOTO_SLOTS.filter((s) => !!photosMap[s.reuse_of || s.key]).length} / 34 Slot Terunggah
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
                    const isSelected = selectedSlots.includes(slot.key);
                    const hasPhoto = !!photo;

                    return (
                      <div
                        key={slot.key}
                        className={`app-card p-2.5 flex flex-col justify-between bg-white border transition-all ${
                          isRejected
                            ? 'border-status-danger-text bg-status-danger-bg/20'
                            : isAccepted
                            ? 'border-status-success-text bg-status-success-bg/20'
                            : isSelected
                            ? 'border-primary/40 bg-bg-tint/30'
                            : 'border-border'
                        }`}
                      >
                        {/* Checkbox & Slot Index Header */}
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!hasPhoto}
                              onChange={() => toggleSlotSelected(slot.key)}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-30"
                            />
                            <span className="text-[10px] text-text font-bold">#{slot.sort}</span>
                          </label>
                          {slot.reuse_of && (
                            <span className="text-[9px] font-medium text-primary bg-bg-tint px-1 rounded">Reuse</span>
                          )}
                        </div>

                        {/* Thumbnail Container */}
                        <div className="relative aspect-4/3 w-full bg-bg-subtle rounded-md flex flex-col items-center justify-center border border-border overflow-hidden group">
                          {photo ? (
                            <img
                              src={photo.thumbBase64 || photo.url || `/api/photos/view?reportId=${id}&slotKey=${actualSlotKey}`}
                              alt={slot.label}
                              className="w-full h-full object-cover cursor-pointer"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const fallback = `/api/photos/view?reportId=${id}&slotKey=${actualSlotKey}`;
                                if (!target.src.includes('/api/photos/view')) {
                                  target.src = fallback;
                                }
                              }}
                              onClick={() => setSelectedPreviewPhoto({ ...photo, label: slot.label, slot, previewUrl: photo.url || photo.thumbBase64 || `/api/photos/view?reportId=${id}&slotKey=${actualSlotKey}` })}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-2 text-center">
                              <Camera className="w-5 h-5 text-text-muted opacity-40 mb-1" />
                              <span className="text-[10px] text-text-muted font-medium">
                                {slot.aspect_w}:{slot.aspect_h} &middot; {slot.tier}
                              </span>
                            </div>
                          )}

                          {photo && (
                            <button
                              onClick={() => setSelectedPreviewPhoto({ ...photo, label: slot.label, slot, previewUrl: photo.url || photo.thumbBase64 || `/api/photos/view?reportId=${id}&slotKey=${actualSlotKey}` })}
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
                src={selectedPreviewPhoto.previewUrl || selectedPreviewPhoto.url || selectedPreviewPhoto.thumbBase64 || `/api/photos/view?reportId=${id}&slotKey=${selectedPreviewPhoto.slotKey || selectedPreviewPhoto.slot?.key}`}
                alt={selectedPreviewPhoto.label}
                className="max-h-[60vh] object-contain rounded border border-border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const slotKey = selectedPreviewPhoto.slotKey || selectedPreviewPhoto.slot?.key;
                  const fallback = `/api/photos/view?reportId=${id}&slotKey=${slotKey}`;
                  if (!target.src.includes('/api/photos/view')) {
                    target.src = fallback;
                  }
                }}
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

      {/* Dialog Catatan Penolakan Foto Massal (Batch Reject) */}
      {isBatchRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-card border border-border shadow-card p-5 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-semibold text-text mb-1">
              Tolak {selectedSlots.length} Foto Terpilih
            </h3>
            <p className="text-xs text-text-muted mb-3">
              Masukkan alasan perbaikan untuk seluruh foto yang ditolak
            </p>
            <textarea
              rows={3}
              required
              value={batchRejectNote}
              onChange={(e) => setBatchRejectNote(e.target.value)}
              placeholder="Contoh: Foto buram atau sudut pengambilan tidak tepat, mohon foto ulang..."
              className="w-full text-xs border border-border-strong rounded-input p-2.5 outline-none focus:border-primary text-text"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setIsBatchRejectModalOpen(false);
                  setBatchRejectNote('');
                }}
                className="btn-secondary h-8 px-3 text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleBatchReject}
                disabled={!batchRejectNote.trim() || isBatchReviewing}
                className="btn-primary h-8 px-3 text-xs bg-status-danger-text hover:bg-red-700"
              >
                {isBatchReviewing ? 'Memproses...' : `Tolak (${selectedSlots.length}) Foto`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

