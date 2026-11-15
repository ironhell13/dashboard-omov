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
  UploadCloud
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
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const batchFileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPhotos = () => {
    fetch(`/api/photos?reportId=${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.photos) {
          const keys = new Set<string>(json.photos.map((p: any) => p.slotKey));
          setUploadedSlots(keys);
        }
      });
  };

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setReport(json.data);
          setClaimed(!!json.data.claimed_by);
        }
      });

    fetchPhotos();
  }, [id]);

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
                    const isFilled = slot.reuse_of
                      ? uploadedSlots.has(slot.reuse_of)
                      : uploadedSlots.has(slot.key);

                    return (
                      <div
                        key={slot.key}
                        className="pt-3 first:pt-0 flex items-center justify-between gap-3"
                      >
                        {/* Left: Thumbnail & Details */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Thumbnail / Ratio Icon */}
                          <div className="w-12 h-12 rounded-input bg-bg-subtle border border-border flex flex-col items-center justify-center shrink-0 overflow-hidden relative">
                            {isFilled ? (
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

                            <div className="mt-1">
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
    </div>
  );
}

