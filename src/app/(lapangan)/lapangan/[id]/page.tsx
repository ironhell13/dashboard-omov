'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Camera, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Share2,
  UserCheck,
  RefreshCw,
  Info,
  UploadCloud,
  FileText,
  Edit3,
  Save,
  X,
  Eye
} from 'lucide-react';
import { PHOTO_SLOTS, GROUPS, PhotoSlot } from '@/types/slot';
import { getStatusBadgeConfig } from '@/lib/utils';
import { Report } from '@/types/database';
import { BatchImportModal } from '@/components/lapangan/BatchImportModal';

export default function LapanganDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Kelistrikan': true,
    'Tampak dan Perangkat': true,
    'Nomor Seri': false,
    'Destroy HDD': false,
    'Waktu Hadir Vendor': false,
    'BA Dynabolt': false,
    'Otomatis': false,
  });
  const [claimed, setClaimed] = useState(true);
  const [uploadedSlots, setUploadedSlots] = useState<Set<string>>(new Set());
  const [photosMap, setPhotosMap] = useState<Record<string, any>>({});
  const [selectedPreviewPhoto, setSelectedPreviewPhoto] = useState<any | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const batchFileInputRef = useRef<HTMLInputElement | null>(null);

  // State untuk Isian Data Teknis Lapangan
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [fieldData, setFieldData] = useState<{
    wsid?: string;
    lokasi?: string;
    teknisi?: string;
    tegangan_ups_it?: string | number;
    grounding_ups_it?: string | number;
    type_mesin_baru?: string;
    serial_nomor?: string;
    alamat?: string;
  }>({});
  const [isSavingFieldData, setIsSavingFieldData] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const fetchPhotos = () => {
    fetch(`/api/photos?reportId=${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.photos) {
          const keys = new Set<string>(json.photos.map((p: any) => p.slotKey));
          setUploadedSlots(keys);
          const map: Record<string, any> = {};
          json.photos.forEach((p: any) => {
            map[p.slotKey] = p;
          });
          setPhotosMap(map);
        }
      });
  };

  const fetchReport = () => {
    fetch(`/api/reports/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const rep = json.data;
          setReport(rep);
          setClaimed(!!rep.claimed_by);
          setFieldData({
            wsid: rep.wsid,
            lokasi: rep.lokasi,
            teknisi: rep.teknisi || rep.data?.teknisi || rep.data?.yang_melakukan || '',
            tegangan_ups_it: rep.data?.tegangan_ups_it || '',
            grounding_ups_it: rep.data?.grounding_ups_it || '',
            type_mesin_baru: rep.data?.type_mesin_baru || '',
            serial_nomor: rep.data?.serial_nomor || '',
            alamat: rep.data?.alamat || '',
          });
        }
      });
  };

  useEffect(() => {
    fetchReport();
    fetchPhotos();
  }, [id]);

  const handleSaveFieldData = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFieldData(true);
    setSaveSuccessMsg('');
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            ...report?.data,
            ...fieldData,
          },
          teknisi: fieldData.teknisi,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccessMsg('Data teknis lapangan berhasil disimpan!');
        setTimeout(() => {
          setIsDataModalOpen(false);
          setSaveSuccessMsg('');
        }, 1200);
        if (json.data) {
          setReport(json.data);
        }
      } else {
        alert(`Gagal menyimpan: ${json.error}`);
      }
    } catch (err: any) {
      alert(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setIsSavingFieldData(false);
    }
  };

  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBatchFiles(Array.from(e.target.files));
    }
  };

  const toggleGroup = (grp: string) => {
    setOpenGroups((prev) => ({ ...prev, [grp]: !prev[grp] }));
  };

  const handleToggleClaim = async () => {
    const action = claimed ? 'release' : 'claim';
    await fetch(`/api/reports/${id}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setClaimed(!claimed);
  };

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span>Memuat data lokasi...</span>
        </div>
      </div>
    );
  }

  const badge = getStatusBadgeConfig(report.status);
  const terisiCount = uploadedSlots.size + (uploadedSlots.has('ba_hdd') ? 1 : 0);
  const totalSlots = 34;
  const percent = Math.round((terisiCount / totalSlots) * 100);

  return (
    <div className="space-y-4">
      {/* Top Header - WSID, Lokasi, Teknisi */}
      <div className="bg-white p-4 rounded-card border border-border space-y-3">
        <div className="flex items-start gap-2.5">
          <Link
            href="/lapangan"
            className="p-1.5 text-text-muted hover:text-text rounded-btn bg-bg-subtle border border-border mt-0.5"
            aria-label="Kembali ke daftar lokasi"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
          </Link>
          <div className="min-w-0 flex-1">
            <span className="text-xl font-bold tracking-tight text-text block">
              {report.wsid}
            </span>
            <h1 className="text-sm font-semibold text-text mt-0.5 leading-snug">
              {report.lokasi}
            </h1>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-text-muted">
              <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-semibold text-text">
                Teknisi: {report.teknisi || report.data?.teknisi || report.data?.yang_melakukan || 'Tim Lapangan OMOV'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Field Technical Data Card */}
      <div className="bg-white p-3.5 rounded-card border border-border flex items-center justify-between gap-3 shadow-xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-text">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>Data Teknis & Pengukuran Lapangan</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-text-muted">
            <span>
              UPS:{' '}
              <strong className="text-text font-semibold">
                {report.data?.tegangan_ups_it ? `${report.data.tegangan_ups_it}V` : '-'}
              </strong>
            </span>
            <span>&middot;</span>
            <span>
              Ground:{' '}
              <strong className="text-text font-semibold">
                {report.data?.grounding_ups_it ? `${report.data.grounding_ups_it}V` : '-'}
              </strong>
            </span>
            <span>&middot;</span>
            <span>
              SN:{' '}
              <strong className="text-text font-semibold">
                {report.data?.serial_nomor || '-'}
              </strong>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsDataModalOpen(true)}
          className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5 shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5 text-primary" />
          <span>Isi / Edit Data</span>
        </button>
      </div>

      {/* Progress Bar & Batch Import */}
      <div className="app-card p-4 bg-white space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-text">Foto yang Harus Diunggah</span>
          <span className="text-primary font-bold">
            {terisiCount} / {totalSlots} Slot ({percent}%)
          </span>
        </div>
        <div className="w-full bg-bg-tint rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Batch Gallery Import Button */}
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <input
            type="file"
            ref={batchFileInputRef}
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleBatchFileSelect}
          />
          <span className="text-[11px] text-text-muted">
            Punya banyak foto di galeri HP?
          </span>
          <button
            type="button"
            onClick={() => batchFileInputRef.current?.click()}
            className="btn-secondary h-8 px-3 text-xs font-semibold gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5 text-primary" />
            <span>Impor Banyak Sekaligus</span>
          </button>
        </div>
      </div>

      {/* Accordion Slot Groups */}
      <div className="space-y-3">
        {GROUPS.map((grp) => {
          const groupSlots = PHOTO_SLOTS.filter((s) => s.grp === grp);
          const isOpen = openGroups[grp] ?? true;
          const filledInGroup = groupSlots.filter((s) =>
            s.reuse_of ? uploadedSlots.has(s.reuse_of) : uploadedSlots.has(s.key)
          ).length;

          return (
            <div key={grp} className="app-card bg-white overflow-hidden">
              {/* Group Accordion Header */}
              <button
                type="button"
                onClick={() => toggleGroup(grp)}
                className="w-full flex items-center justify-between p-3.5 bg-bg-subtle border-b border-border text-left select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text">
                    {grp}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-tint text-primary font-semibold">
                    {filledInGroup} / {groupSlots.length}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </button>

              {/* Slot Cards List */}
              {isOpen && (
                <div className="p-3 divide-y divide-border space-y-3">
                  {groupSlots.map((slot) => {
                    const actualSlotKey = slot.reuse_of || slot.key;
                    const isFilled = slot.reuse_of
                      ? uploadedSlots.has(slot.reuse_of)
                      : uploadedSlots.has(slot.key);
                    const photo = photosMap[actualSlotKey];

                    return (
                      <div
                        key={slot.key}
                        className="pt-3 first:pt-0 flex items-center justify-between gap-3"
                      >
                        {/* Left: Thumbnail & Details */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Thumbnail / Ratio Icon with Preview trigger */}
                          <div
                            onClick={() => {
                              if (isFilled && photo) {
                                setSelectedPreviewPhoto({
                                  ...photo,
                                  label: slot.label,
                                  slot,
                                  previewUrl: photo.url || photo.thumbBase64 || `/api/photos/view?reportId=${id}&slotKey=${actualSlotKey}`,
                                });
                              }
                            }}
                            className={`w-13 h-13 rounded-input bg-bg-subtle border border-border flex flex-col items-center justify-center shrink-0 overflow-hidden relative select-none ${
                              isFilled && photo ? 'cursor-pointer hover:ring-2 hover:ring-primary/40 group' : ''
                            }`}
                            title={isFilled && photo ? 'Klik untuk memperbesar pratinjau foto' : undefined}
                          >
                            {isFilled && photo ? (
                              <>
                                <img
                                  src={photo.thumbBase64 || photo.url || `/api/photos/view?reportId=${id}&slotKey=${actualSlotKey}`}
                                  alt={slot.label}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    const fallback = `/api/photos/view?reportId=${id}&slotKey=${actualSlotKey}`;
                                    if (!target.src.includes('/api/photos/view')) {
                                      target.src = fallback;
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                  <Eye className="w-4 h-4" />
                                </div>
                              </>
                            ) : isFilled ? (
                              <CheckCircle2 className="w-6 h-6 text-status-success-text" />
                            ) : (
                              <>
                                <Camera className="w-4 h-4 text-text-muted opacity-50" />
                                <span className="text-[9px] text-text-muted font-bold mt-0.5">
                                  {slot.aspect_w}:{slot.aspect_h}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[11px] text-text-muted mb-0.5">
                              <span className="font-semibold text-text">#{slot.sort}</span>
                              <span>&middot;</span>
                              <span className="capitalize">{slot.tier}</span>
                              {slot.reuse_of && (
                                <>
                                  <span>&middot;</span>
                                  <span className="text-primary font-medium">Otomatis</span>
                                </>
                              )}
                            </div>
                            <h3 className="text-xs font-bold text-text truncate" title={slot.label}>
                              {slot.label}
                            </h3>

                            <div className="mt-1 flex items-center gap-2">
                              {isFilled ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-status-success-text font-semibold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Tersimpan
                                </span>
                              ) : slot.reuse_of ? (
                                <span className="text-[10px] text-text-muted">
                                  Memakai foto dari slot #{PHOTO_SLOTS.find(s => s.key === slot.reuse_of)?.sort}
                                </span>
                              ) : (
                                <span className="text-[10px] text-text-muted">
                                  Belum ada foto
                                </span>
                              )}

                              {isFilled && photo && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPreviewPhoto({
                                    ...photo,
                                    label: slot.label,
                                    slot,
                                    previewUrl: photo.url || photo.thumbBase64 || `/api/photos/view?reportId=${id}&slotKey=${actualSlotKey}`,
                                  })}
                                  className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Lihat</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Action Buttons */}
                        {!slot.reuse_of && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Tombol Kamera */}
                            <Link
                              href={`/lapangan/${id}/foto/${slot.key}?mode=kamera`}
                              className="btn-primary h-9 px-2.5 text-xs font-medium gap-1 min-w-[40px] flex items-center justify-center"
                              title="Buka Kamera"
                            >
                              <Camera className="w-4 h-4" />
                              <span className="hidden sm:inline">Kamera</span>
                            </Link>

                            {/* Tombol Galeri */}
                            <Link
                              href={`/lapangan/${id}/foto/${slot.key}?mode=galeri`}
                              className="btn-secondary h-9 px-2.5 text-xs font-medium gap-1 min-w-[40px] flex items-center justify-center"
                              title="Pilih dari Galeri"
                            >
                              <ImageIcon className="w-4 h-4" />
                              <span className="hidden sm:inline">Galeri</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Batch Import Modal */}
      {batchFiles.length > 0 && (
        <BatchImportModal
          reportId={id}
          wsid={report.wsid}
          lokasi={report.lokasi}
          uploadedSlots={uploadedSlots}
          files={batchFiles}
          onClose={() => setBatchFiles([])}
          onSuccess={() => {
            setBatchFiles([]);
            fetchPhotos();
          }}
        />
      )}

      {/* Modal Isian Data Teknis Lapangan */}
      {isDataModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-card max-w-lg w-full p-5 space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-text">Isian Data Teknis Lapangan</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDataModalOpen(false)}
                className="p-1 rounded-btn hover:bg-bg-subtle text-text-muted hover:text-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-btn text-xs font-semibold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveFieldData} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-text mb-1">
                    Nama Teknisi (Yang Melakukan)
                  </label>
                  <input
                    type="text"
                    value={fieldData.teknisi || ''}
                    onChange={(e) => setFieldData({ ...fieldData, teknisi: e.target.value })}
                    placeholder="Contoh: Ahmad Fauzi / Tim OMOV"
                    className="form-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Tegangan UPS-IT (Volt)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={fieldData.tegangan_ups_it || ''}
                    onChange={(e) => setFieldData({ ...fieldData, tegangan_ups_it: e.target.value })}
                    placeholder="Contoh: 220"
                    className="form-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Grounding UPS-IT (Volt)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fieldData.grounding_ups_it || ''}
                    onChange={(e) => setFieldData({ ...fieldData, grounding_ups_it: e.target.value })}
                    placeholder="Contoh: 1.2"
                    className="form-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Tipe Mesin Baru
                  </label>
                  <input
                    type="text"
                    value={fieldData.type_mesin_baru || ''}
                    onChange={(e) => setFieldData({ ...fieldData, type_mesin_baru: e.target.value })}
                    placeholder="Contoh: NCR 6625"
                    className="form-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Serial Nomor (SN) Baru
                  </label>
                  <input
                    type="text"
                    value={fieldData.serial_nomor || ''}
                    onChange={(e) => setFieldData({ ...fieldData, serial_nomor: e.target.value })}
                    placeholder="Contoh: SN-88992211"
                    className="form-input text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-text mb-1">
                    Alamat Lengkap Penempatan
                  </label>
                  <textarea
                    rows={2}
                    value={fieldData.alamat || ''}
                    onChange={(e) => setFieldData({ ...fieldData, alamat: e.target.value })}
                    placeholder="Alamat penempatan ATM..."
                    className="form-input text-xs resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsDataModalOpen(false)}
                  className="btn-secondary h-9 px-4 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingFieldData}
                  className="btn-primary h-9 px-4 text-xs font-semibold gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSavingFieldData ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSavingFieldData ? 'Menyimpan...' : 'Simpan Data Teknis'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Foto untuk Tim Lapangan */}
      {selectedPreviewPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-card border border-border shadow-card w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-3.5 border-b border-border flex items-center justify-between bg-bg-subtle">
              <div className="min-w-0 pr-2">
                <span className="text-[11px] font-bold text-primary block">
                  #{selectedPreviewPhoto.slot?.sort} {selectedPreviewPhoto.slot?.grp}
                </span>
                <h3 className="text-sm font-bold text-text truncate">
                  {selectedPreviewPhoto.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPreviewPhoto(null)}
                className="p-1 rounded-md text-text-muted hover:text-text hover:bg-border/40 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Preview Container */}
            <div className="p-3 bg-black/5 flex items-center justify-center overflow-auto flex-1 min-h-[260px] max-h-[60vh]">
              <img
                src={selectedPreviewPhoto.previewUrl || selectedPreviewPhoto.url || selectedPreviewPhoto.thumbBase64 || `/api/photos/view?reportId=${id}&slotKey=${selectedPreviewPhoto.slotKey || selectedPreviewPhoto.slot?.key}`}
                alt={selectedPreviewPhoto.label}
                className="max-h-[55vh] w-auto max-w-full object-contain rounded border border-border shadow-xs"
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

            {/* Meta & Footer Actions */}
            <div className="p-3 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-white text-xs">
              <div className="text-[11px] text-text-muted">
                <span>Rasio: {selectedPreviewPhoto.slot?.aspect_w}:{selectedPreviewPhoto.slot?.aspect_h}</span>
                {selectedPreviewPhoto.bytes && (
                  <span> &middot; {Math.round(selectedPreviewPhoto.bytes / 1024)} KB</span>
                )}
                {selectedPreviewPhoto.uploadedAt && (
                  <span> &middot; {new Date(selectedPreviewPhoto.uploadedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                )}
              </div>

              <div className="flex items-center gap-2 justify-end">
                {!selectedPreviewPhoto.slot?.reuse_of && (
                  <Link
                    href={`/lapangan/${id}/foto/${selectedPreviewPhoto.slot?.key}?mode=kamera`}
                    className="btn-primary h-8 px-3 text-xs font-semibold gap-1"
                    onClick={() => setSelectedPreviewPhoto(null)}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ambil Ulang</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPreviewPhoto(null)}
                  className="btn-secondary h-8 px-3 text-xs font-medium"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

