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
  Eye,
  Lock,
  MapPin
} from 'lucide-react';
import { PHOTO_SLOTS, GROUPS, PhotoSlot } from '@/types/slot';
import { getStatusBadgeConfig } from '@/lib/utils';
import { Report, ReportData } from '@/types/database';
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
  const [activeModalTab, setActiveModalTab] = useState<'mesin' | 'kelistrikan' | 'pengaman' | 'perangkat'>('mesin');
  const [fieldData, setFieldData] = useState<ReportData>({});
  const [isSavingFieldData, setIsSavingFieldData] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const handleNestedFieldChange = (parent: keyof ReportData, childPath: string, value: any) => {
    setFieldData((prev) => {
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
            ...(rep.data || {}),
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
    if (isLocked) {
      alert('Laporan ini telah berstatus FINAL dan dikunci oleh Supervisor. Data tidak dapat diubah.');
      return;
    }
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
          teknisi: fieldData.teknisi || fieldData.yang_melakukan,
          wsid: fieldData.wsid,
          lokasi: fieldData.lokasi,
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
  const isLocked = report.status === 'final' || report.status === 'terarsip';

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

      {/* Locked Notification Banner */}
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-3.5 flex items-start gap-3 text-amber-900 shadow-xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold flex items-center gap-2">
              <span>Laporan Berstatus FINAL & Dikunci</span>
              <span className="bg-amber-200/80 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                {report.status}
              </span>
            </div>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              Laporan ini telah disetujui dan difinalisasi oleh Supervisor. Penambahan foto dan pengubahan data teknis dinonaktifkan.
            </p>
          </div>
        </div>
      )}

      {/* Quick Field Technical Data Card */}
      <div className="bg-white p-3.5 rounded-card border border-border flex items-center justify-between gap-3 shadow-xs">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-text">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>Data Teknis & Pengukuran Lapangan</span>
            {isLocked && (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                Terkunci
              </span>
            )}
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
          {isLocked ? <Eye className="w-3.5 h-3.5 text-primary" /> : <Edit3 className="w-3.5 h-3.5 text-primary" />}
          <span>{isLocked ? 'Lihat Data' : 'Isi / Edit Data'}</span>
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

        {/* Batch Gallery Import Button - Hanya jika belum final */}
        {!isLocked && (
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
        )}
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
                            className={`w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-input bg-bg-subtle border border-border flex flex-col items-center justify-center shrink-0 overflow-hidden relative select-none ${
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
                              <CheckCircle2 className="w-5 h-5 text-status-success-text" />
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
                            {isLocked ? (
                              isFilled && photo ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPreviewPhoto({
                                    ...photo,
                                    label: slot.label,
                                    slot,
                                    previewUrl: photo.url || photo.thumbBase64 || `/api/photos/view?reportId=${id}&slotKey=${actualSlotKey}`,
                                  })}
                                  className="btn-secondary h-8 px-2.5 text-xs font-semibold gap-1 flex items-center justify-center text-primary"
                                  title="Pratinjau Foto"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Lihat</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-text-muted italic px-2">Terkunci</span>
                              )
                            ) : (
                              <>
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
                              </>
                            )}
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
                {isLocked && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Terkunci
                  </span>
                )}
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

            {/* Tabs Navigasi Modal */}
            <div className="flex border-b border-border gap-1 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'mesin', label: '1. Mesin & Lokasi' },
                { id: 'kelistrikan', label: '2. Listrik & Net' },
                { id: 'pengaman', label: '3. Letak & GPS' },
                { id: 'perangkat', label: '4. Perangkat' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveModalTab(t.id as any)}
                  className={`px-3 py-1.5 rounded-t-btn font-semibold whitespace-nowrap transition-colors ${
                    activeModalTab === t.id
                      ? 'border-b-2 border-primary text-primary bg-bg-tint/50'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveFieldData} className="space-y-4">
              {/* Tab 1: Mesin & Lokasi */}
              {activeModalTab === 'mesin' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      Nama Teknisi (Yang Melakukan)
                    </label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={fieldData.teknisi || fieldData.yang_melakukan || ''}
                      onChange={(e) => setFieldData({ ...fieldData, teknisi: e.target.value, yang_melakukan: e.target.value })}
                      placeholder="Nama Teknisi"
                      className="form-input text-xs disabled:bg-bg-subtle disabled:text-text-muted"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Tipe Mesin Baru</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={fieldData.type_mesin_baru || ''}
                        onChange={(e) => setFieldData({ ...fieldData, type_mesin_baru: e.target.value })}
                        placeholder="Contoh: NCR 6625"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">SN Baru</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={fieldData.serial_nomor || ''}
                        onChange={(e) => setFieldData({ ...fieldData, serial_nomor: e.target.value })}
                        placeholder="SN Baru"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Tipe Mesin Lama</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={fieldData.type_mesin_lama || ''}
                        onChange={(e) => setFieldData({ ...fieldData, type_mesin_lama: e.target.value })}
                        placeholder="Contoh: Diebold 5500"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">SN Lama</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={fieldData.sn_mesin_lama || ''}
                        onChange={(e) => setFieldData({ ...fieldData, sn_mesin_lama: e.target.value })}
                        placeholder="SN Lama"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">WSID Lama</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={fieldData.wsid_lama || ''}
                        onChange={(e) => setFieldData({ ...fieldData, wsid_lama: e.target.value })}
                        placeholder="WSID Lama"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Lokasi Lama</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={fieldData.lokasi_lama || ''}
                        onChange={(e) => setFieldData({ ...fieldData, lokasi_lama: e.target.value })}
                        placeholder="Lokasi Lama"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Alamat Penempatan ATM</label>
                    <textarea
                      rows={2}
                      disabled={isLocked}
                      value={fieldData.alamat || ''}
                      onChange={(e) => setFieldData({ ...fieldData, alamat: e.target.value })}
                      placeholder="Alamat penempatan ATM..."
                      className="form-input text-xs resize-none disabled:bg-bg-subtle"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Listrik & Net */}
              {activeModalTab === 'kelistrikan' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Tegangan UPS (Volt)</label>
                      <input
                        type="number"
                        step="0.1"
                        disabled={isLocked}
                        value={fieldData.tegangan_ups_it || ''}
                        onChange={(e) => setFieldData({ ...fieldData, tegangan_ups_it: e.target.value })}
                        placeholder="Contoh: 220"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Grounding (Volt)</label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={isLocked}
                        value={fieldData.grounding_ups_it || ''}
                        onChange={(e) => setFieldData({ ...fieldData, grounding_ups_it: e.target.value })}
                        placeholder="Contoh: 1.2"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Initial VSAT</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={fieldData.initial_vsat || ''}
                      onChange={(e) => setFieldData({ ...fieldData, initial_vsat: e.target.value })}
                      placeholder="Initial VSAT"
                      className="form-input text-xs disabled:bg-bg-subtle"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">IP Address</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={fieldData.ip_address || ''}
                        onChange={(e) => setFieldData({ ...fieldData, ip_address: e.target.value })}
                        placeholder="10.x.x.x"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Konfigurasi</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={fieldData.konfigurasi || ''}
                        onChange={(e) => setFieldData({ ...fieldData, konfigurasi: e.target.value })}
                        placeholder="Contoh: TCP/IP"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Letak & GPS */}
              {activeModalTab === 'pengaman' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Letak Mesin</label>
                    <input
                      type="text"
                      list="letak_mesin_lapangan_list"
                      disabled={isLocked}
                      value={fieldData.letak_mesin || ''}
                      onChange={(e) => setFieldData({ ...fieldData, letak_mesin: e.target.value })}
                      placeholder="Contoh: Lobby / Indomaret / SPBU / Alfamart"
                      className="form-input text-xs disabled:bg-bg-subtle"
                    />
                    <datalist id="letak_mesin_lapangan_list">
                      <option value="Lobby / Ruang ATM" />
                      <option value="Indomaret" />
                      <option value="Alfamart" />
                      <option value="SPBU" />
                      <option value="Drive Thru" />
                      <option value="Outdoor Kios" />
                      <option value="Cabang BCA" />
                    </datalist>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Pengaman Angkur</label>
                      <select
                        disabled={isLocked}
                        value={fieldData.angkur || ''}
                        onChange={(e) => setFieldData({ ...fieldData, angkur: e.target.value as any })}
                        className="form-input text-xs disabled:bg-bg-subtle"
                      >
                        <option value="">-- Pilih --</option>
                        <option value="Ya">Ya (Dynabolt Terpasang)</option>
                        <option value="Tidak">Tidak</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Vendor Angkur</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={fieldData.angkur_vendor || ''}
                        onChange={(e) => setFieldData({ ...fieldData, angkur_vendor: e.target.value })}
                        placeholder="Contoh: PT TAG"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">Alasan Tidak Diangkur (Jika Tidak)</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={fieldData.angkur_alasan || ''}
                      onChange={(e) => setFieldData({ ...fieldData, angkur_alasan: e.target.value })}
                      placeholder="Contoh: Lokasi sewa tidak mengizinkan bor"
                      className="form-input text-xs disabled:bg-bg-subtle"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Exhaust Fan (Jumlah)</label>
                      <input
                        type="number"
                        min="0"
                        disabled={isLocked}
                        value={fieldData.exhaust_fan_jumlah || ''}
                        onChange={(e) => setFieldData({ ...fieldData, exhaust_fan_jumlah: e.target.value })}
                        placeholder="Jumlah (misal: 1)"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Status Fan</label>
                      <select
                        disabled={isLocked}
                        value={fieldData.exhaust_fan_status || ''}
                        onChange={(e) => setFieldData({ ...fieldData, exhaust_fan_status: e.target.value as any })}
                        className="form-input text-xs disabled:bg-bg-subtle"
                      >
                        <option value="">- Status -</option>
                        <option value="Nyala">Nyala</option>
                        <option value="Mati">Mati</option>
                      </select>
                    </div>
                  </div>

                  {/* Koordinat GPS */}
                  <div className="p-3 bg-bg-subtle rounded-btn space-y-2 border border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text">Koordinat GPS Lokasi</span>
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                  handleNestedFieldChange('koordinat', 'lat', pos.coords.latitude);
                                  handleNestedFieldChange('koordinat', 'lng', pos.coords.longitude);
                                },
                                (err) => alert('Gagal membaca GPS: ' + err.message)
                              );
                            } else {
                              alert('Browser tidak mendukung GPS');
                            }
                          }}
                          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Ambil GPS HP
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="any"
                        placeholder="Latitude"
                        disabled={isLocked}
                        value={fieldData.koordinat?.lat ?? ''}
                        onChange={(e) => handleNestedFieldChange('koordinat', 'lat', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Longitude"
                        disabled={isLocked}
                        value={fieldData.koordinat?.lng ?? ''}
                        onChange={(e) => handleNestedFieldChange('koordinat', 'lng', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Perangkat & Eksternal */}
              {activeModalTab === 'perangkat' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Cartridge</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={fieldData.cartridge || ''}
                        onChange={(e) => setFieldData({ ...fieldData, cartridge: e.target.value })}
                        placeholder="4 Kaset"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Reject Bin</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={fieldData.reject || ''}
                        onChange={(e) => setFieldData({ ...fieldData, reject: e.target.value })}
                        placeholder="1 Kaset"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">Kunci</label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={fieldData.kunci || ''}
                        onChange={(e) => setFieldData({ ...fieldData, kunci: e.target.value })}
                        placeholder="Posisi"
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                  </div>

                  {/* DVR / Perekam Eksternal */}
                  <div className="p-2.5 bg-bg-subtle rounded-btn border border-border/50">
                    <span className="text-[11px] font-bold text-text block mb-1">Perekam Eksternal / DVR</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Merk DVR"
                        disabled={isLocked}
                        value={fieldData.perekam_eksternal?.merk || ''}
                        onChange={(e) => handleNestedFieldChange('perekam_eksternal', 'merk', e.target.value)}
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                      <input
                        type="text"
                        placeholder="Serial Number DVR"
                        disabled={isLocked}
                        value={fieldData.perekam_eksternal?.sn || ''}
                        onChange={(e) => handleNestedFieldChange('perekam_eksternal', 'sn', e.target.value)}
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                  </div>

                  {/* Kamera Eksternal */}
                  <div className="p-2.5 bg-bg-subtle rounded-btn border border-border/50">
                    <span className="text-[11px] font-bold text-text block mb-1">Kamera Eksternal</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Merk Kamera"
                        disabled={isLocked}
                        value={fieldData.kamera_eksternal?.merk || ''}
                        onChange={(e) => handleNestedFieldChange('kamera_eksternal', 'merk', e.target.value)}
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                      <input
                        type="text"
                        placeholder="Serial Number Kamera"
                        disabled={isLocked}
                        value={fieldData.kamera_eksternal?.sn || ''}
                        onChange={(e) => handleNestedFieldChange('kamera_eksternal', 'sn', e.target.value)}
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                  </div>

                  {/* UPS Eksternal */}
                  <div className="p-2.5 bg-bg-subtle rounded-btn border border-border/50">
                    <span className="text-[11px] font-bold text-text block mb-1">UPS Eksternal</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Merk UPS"
                        disabled={isLocked}
                        value={fieldData.ups?.merk || ''}
                        onChange={(e) => handleNestedFieldChange('ups', 'merk', e.target.value)}
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                      <input
                        type="text"
                        placeholder="Serial Number UPS"
                        disabled={isLocked}
                        value={fieldData.ups?.sn || ''}
                        onChange={(e) => handleNestedFieldChange('ups', 'sn', e.target.value)}
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                  </div>

                  {/* LED Eksternal */}
                  <div className="p-2.5 bg-bg-subtle rounded-btn border border-border/50">
                    <span className="text-[11px] font-bold text-text block mb-1">Lampu / LED Eksternal</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Merk LED"
                        disabled={isLocked}
                        value={fieldData.led?.merk || ''}
                        onChange={(e) => handleNestedFieldChange('led', 'merk', e.target.value)}
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                      <input
                        type="text"
                        placeholder="Serial Number LED"
                        disabled={isLocked}
                        value={fieldData.led?.sn || ''}
                        onChange={(e) => handleNestedFieldChange('led', 'sn', e.target.value)}
                        className="form-input text-xs disabled:bg-bg-subtle"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsDataModalOpen(false)}
                  className="btn-secondary h-9 px-4 text-xs font-semibold"
                >
                  {isLocked ? 'Tutup' : 'Batal'}
                </button>
                {!isLocked && (
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
                )}
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

