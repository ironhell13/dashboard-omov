'use client';

import { useState } from 'react';
import { X, Check, UploadCloud, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { PHOTO_SLOTS, PhotoSlot } from '@/types/slot';
import { exportAndCompress } from '@/lib/editor/canvas-engine';
import { queueManager } from '@/lib/offline/queue-manager';
import { formatTanggalJamWIB } from '@/lib/utils';

interface BatchImportModalProps {
  reportId: string;
  wsid: string;
  lokasi: string;
  uploadedSlots: Set<string>;
  files: File[];
  onClose: () => void;
  onSuccess: () => void;
}

interface FileMapping {
  file: File;
  previewUrl: string;
  slotKey: string;
}

export function BatchImportModal({
  reportId,
  wsid,
  lokasi,
  uploadedSlots,
  files,
  onClose,
  onSuccess,
}: BatchImportModalProps) {
  // Ambil slot yang belum terisi (kecuali slot reuse otomatis ba_hdd_full)
  const availableSlots = PHOTO_SLOTS.filter(
    (s) => !s.reuse_of && !uploadedSlots.has(s.key)
  );

  // Inisialisasi mapping berkas ke slot pertama yang kosong
  const [mappings, setMappings] = useState<FileMapping[]>(() => {
    return files.slice(0, 34).map((file, idx) => {
      const slot = availableSlots[idx] || PHOTO_SLOTS[idx % PHOTO_SLOTS.length];
      return {
        file,
        previewUrl: URL.createObjectURL(file),
        slotKey: slot ? slot.key : PHOTO_SLOTS[0].key,
      };
    });
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');

  const handleSlotChange = (index: number, newSlotKey: string) => {
    setMappings((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], slotKey: newSlotKey };
      return copy;
    });
  };

  const handleAutoMap = () => {
    setMappings((prev) =>
      prev.map((item, idx) => {
        const slot = availableSlots[idx] || PHOTO_SLOTS[idx % PHOTO_SLOTS.length];
        return {
          ...item,
          slotKey: slot ? slot.key : item.slotKey,
        };
      })
    );
  };

  const handleProcessAndQueue = async () => {
    setIsProcessing(true);
    let successCount = 0;

    try {
      for (let i = 0; i < mappings.length; i++) {
        const item = mappings[i];
        const slot = PHOTO_SLOTS.find((s) => s.key === item.slotKey);
        if (!slot) continue;

        setProgressText(`Memproses foto ${i + 1} dari ${mappings.length} (#${slot.sort} ${slot.label})...`);

        // Muat gambar ke HTMLImageElement
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.src = item.previewUrl;
          image.onload = () => resolve(image);
          image.onerror = reject;
        });

        // Ekspor dan kompresi sesuai rasio dan tier slot
        const result = await exportAndCompress(
          img,
          { x: 0, y: 0, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height },
          {
            aspectW: slot.aspect_w,
            aspectH: slot.aspect_h,
            tier: slot.tier,
            zoom: 1,
            rotation: 0,
            mode: slot.key.startsWith('ba_') ? 'pas' : 'isi',
            brightness: 0,
            contrast: 0,
            autoLevel: false,
            watermark: true,
            watermarkData: {
              wibTime: formatTanggalJamWIB(new Date()),
              wsid,
              lokasi,
            },
          }
        );

        // Masukkan ke antrean IndexedDB
        await queueManager.enqueuePhoto({
          id: `${reportId}_${slot.key}`,
          reportId,
          slotKey: slot.key,
          blob: result.blob,
          thumbBlob: result.thumbBlob,
          meta: {
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            tier: slot.tier,
            takenAt: new Date().toISOString(),
            source: 'galeri',
            watermark: true,
          },
          status: 'pending',
          attempts: 0,
          createdAt: new Date().toISOString(),
        });

        successCount++;
      }

      // Picu sinkronisasi antrean upload jika online
      if (navigator.onLine) {
        queueManager.processQueue();
      }

      onSuccess();
    } catch (err: any) {
      alert(`Terjadi kesalahan saat memproses impor: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg max-h-[85vh] bg-white rounded-card border border-border shadow-card flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-bg-subtle">
          <div>
            <h2 className="text-sm font-bold text-text flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-primary" />
              <span>Impor Banyak Foto dari Galeri</span>
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              {mappings.length} foto dipilih &middot; Sesuaikan pemetaan slot foto
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-md text-text-muted hover:text-text hover:bg-border/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar Auto Map */}
        <div className="px-4 py-2 bg-bg-tint border-b border-border flex items-center justify-between text-xs">
          <span className="text-text-muted">
            Tersisa {availableSlots.length} slot kosong
          </span>
          <button
            type="button"
            onClick={handleAutoMap}
            disabled={isProcessing}
            className="text-primary font-semibold hover:underline flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Petakan Berurutan</span>
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {mappings.map((item, index) => {
            const currentSlot = PHOTO_SLOTS.find((s) => s.key === item.slotKey);

            return (
              <div
                key={index}
                className="p-2.5 bg-white border border-border rounded-btn flex items-center gap-3"
              >
                {/* Image Preview Thumbnail */}
                <img
                  src={item.previewUrl}
                  alt={`Preview ${index + 1}`}
                  className="w-14 h-14 object-cover rounded-md border border-border shrink-0 bg-bg-subtle"
                />

                {/* Slot Selector */}
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] text-text-muted block mb-0.5">
                    Petakan ke Slot:
                  </label>
                  <select
                    value={item.slotKey}
                    onChange={(e) => handleSlotChange(index, e.target.value)}
                    disabled={isProcessing}
                    className="w-full text-xs font-semibold border border-border-strong rounded-input px-2 py-1.5 bg-white text-text focus:border-primary outline-none"
                  >
                    {PHOTO_SLOTS.filter((s) => !s.reuse_of).map((slot) => (
                      <option key={slot.key} value={slot.key}>
                        #{slot.sort} {slot.label} ({slot.aspect_w}:{slot.aspect_h} &middot; {slot.tier})
                      </option>
                    ))}
                  </select>
                  {currentSlot && (
                    <span className="text-[10px] text-text-muted mt-0.5 block truncate">
                      Grup: {currentSlot.grp} &middot; Rasio {currentSlot.aspect_w}:{currentSlot.aspect_h}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-white flex flex-col gap-2">
          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-primary font-medium animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{progressText}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="btn-secondary h-9 px-4 text-xs font-semibold"
            >
              Batal
            </button>
            <button
              onClick={handleProcessAndQueue}
              disabled={isProcessing || mappings.length === 0}
              className="btn-primary h-9 px-4 text-xs font-semibold gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'Memproses...' : 'Simpan ke Antrean'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

