'use client';

import { useState, useRef, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Camera, 
  Image as ImageIcon,
  RotateCw, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Sun, 
  Contrast, 
  Wand2, 
  Check, 
  RefreshCw, 
  AlertTriangle,
  MapPin,
  Eye,
  Sliders,
  Sparkles,
  UploadCloud,
  Lock
} from 'lucide-react';
import { PHOTO_SLOTS, PhotoSlot } from '@/types/slot';
import { 
  exportAndCompress, 
  getTargetDimensions, 
  detectBlurAndDarkness,
  ImageQualityMetrics,
  EditorConfig 
} from '@/lib/editor/canvas-engine';
import { queueManager } from '@/lib/offline/queue-manager';
import { formatTanggalJamWIB } from '@/lib/utils';

export default function PhotoStudioPage({
  params,
}: {
  params: Promise<{ id: string; slot: string }>;
}) {
  const { id: reportId, slot: slotKey } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') || 'kamera';

  const slot = PHOTO_SLOTS.find((s) => s.key === slotKey);
  const [reportInfo, setReportInfo] = useState<{ wsid: string; lokasi: string }>({
    wsid: '',
    lokasi: '',
  });

  // State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [viewfinderActive, setViewfinderActive] = useState(initialMode === 'kamera');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fineRotation, setFineRotation] = useState(0);
  const [mode, setMode] = useState<'isi' | 'pas'>('isi');
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [autoLevel, setAutoLevel] = useState(false);
  const [watermark, setWatermark] = useState(initialMode === 'kamera');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [estimatedKb, setEstimatedKb] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [qualityWarning, setQualityWarning] = useState<ImageQualityMetrics | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const canvasPreviewRef = useRef<HTMLCanvasElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Auto trigger input file jika masuk dengan mode galeri
  useEffect(() => {
    if (initialMode === 'galeri' && !imageSrc) {
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [initialMode, imageSrc]);

  // Ambil info laporan & GPS
  useEffect(() => {
    fetch(`/api/reports/${reportId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setReportInfo({
            wsid: json.data.wsid,
            lokasi: json.data.lokasi,
          });
          if (json.data.status === 'final' || json.data.status === 'terarsip') {
            setIsLocked(true);
            setViewfinderActive(false);
          }
        }
      });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {}
      );
    }
  }, [reportId]);

  // Viewfinder camera stream
  useEffect(() => {
    if (viewfinderActive && !imageSrc) {
      navigator.mediaDevices
        ?.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          setViewfinderActive(false);
        });
    }

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [viewfinderActive, imageSrc]);

  // Handle capture from camera viewfinder
  const handleSnap = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const c = document.createElement('canvas');
    c.width = v.videoWidth || 1920;
    c.height = v.videoHeight || 1080;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(v, 0, 0, c.width, c.height);

    const dataUrl = c.toDataURL('image/jpeg', 0.95);
    setImageSrc(dataUrl);
    setViewfinderActive(false);

    // Matikan stream kamera
    if (v.srcObject) {
      const stream = v.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
    }
  };

  // Handle file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
      setViewfinderActive(false);
    };
    reader.readAsDataURL(file);
  };

  // Live Canvas Preview update
  useEffect(() => {
    if (!imageSrc || !slot || !canvasPreviewRef.current) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imageElementRef.current = img;
      renderPreview(img);
    };
  }, [imageSrc, zoom, rotation, fineRotation, mode, brightness, contrast, autoLevel, watermark, coords]);

  const renderPreview = (img: HTMLImageElement) => {
    const canvas = canvasPreviewRef.current;
    if (!canvas || !slot) return;

    const { width, height } = getTargetDimensions(slot.aspect_w, slot.aspect_h, slot.tier);
    canvas.width = 400;
    canvas.height = Math.round((400 * height) / width);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(((rotation + fineRotation) * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Gambar preview
    const imgRatio = img.width / img.height;
    const canvasRatio = canvas.width / canvas.height;
    let dw = canvas.width;
    let dh = canvas.height;

    if (mode === 'pas') {
      if (imgRatio > canvasRatio) {
        dw = canvas.width;
        dh = canvas.width / imgRatio;
      } else {
        dh = canvas.height;
        dw = canvas.height * imgRatio;
      }
    } else {
      if (imgRatio > canvasRatio) {
        dh = canvas.height;
        dw = canvas.height * imgRatio;
      } else {
        dw = canvas.width;
        dh = canvas.width / imgRatio;
      }
    }

    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();

    // Watermark preview
    if (watermark) {
      const fSize = Math.max(10, Math.round(canvas.height * 0.035));
      ctx.font = `600 ${fSize}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, canvas.height - fSize * 3, canvas.width * 0.8, fSize * 3);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(formatTanggalJamWIB(new Date()), 8, canvas.height - fSize * 2.5);
      ctx.fillText(`${reportInfo.wsid} · ${reportInfo.lokasi}`, 8, canvas.height - fSize * 1.3);
    }

    // Deteksi kualitas (gelap & buram) untuk warning non-blocking
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const metrics = detectBlurAndDarkness(imgData);
      setQualityWarning(metrics);
    } catch {
      // Ignore
    }
  };

  // Simpan foto: Kompresi sesuai tier -> Upload Langsung ke Cloud -> Backup Antrean Offline
  const handleSave = async () => {
    if (!imageElementRef.current || !slot) return;
    setIsProcessing(true);
    setIsUploading(true);
    setUploadSuccess(false);
    setUploadMessage('Mengompresi dan menyiapkan gambar...');

    try {
      const img = imageElementRef.current;
      const editorConfig: EditorConfig = {
        aspectW: slot.aspect_w,
        aspectH: slot.aspect_h,
        tier: slot.tier,
        zoom,
        rotation: rotation + fineRotation,
        mode,
        brightness,
        contrast,
        autoLevel,
        watermark,
        watermarkData: {
          wibTime: formatTanggalJamWIB(new Date()),
          wsid: reportInfo.wsid,
          lokasi: reportInfo.lokasi,
          coords,
        },
      };

      const result = await exportAndCompress(
        img,
        { x: 0, y: 0, width: img.width, height: img.height },
        editorConfig
      );

      // Simpan salinan ke antrean IndexedDB lokal sebagai cadangan
      await queueManager.enqueuePhoto({
        id: `${reportId}_${slotKey}`,
        reportId,
        slotKey,
        blob: result.blob,
        thumbBlob: result.thumbBlob,
        meta: {
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          tier: slot.tier,
          takenAt: new Date().toISOString(),
          source: initialMode === 'kamera' ? 'kamera' : 'galeri',
          watermark,
        },
        status: 'pending',
        attempts: 0,
        createdAt: new Date().toISOString(),
      });

      // Jika online, langsung upload ke server dengan feedback jelas
      if (navigator.onLine) {
        setUploadMessage('Menyimpan ke server cloud OMOV...');

        const formData = new FormData();
        formData.append('reportId', reportId);
        formData.append('slotKey', slotKey);
        formData.append('file', result.blob, `${slotKey}.jpg`);
        if (result.thumbBlob) {
          formData.append('thumb', result.thumbBlob, `thumb_${slotKey}.jpg`);
        }
        formData.append(
          'meta',
          JSON.stringify({
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            tier: slot.tier,
            takenAt: new Date().toISOString(),
            source: initialMode === 'kamera' ? 'kamera' : 'galeri',
            watermark,
          })
        );

        const res = await fetch('/api/photos', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          await queueManager.removeItem(`${reportId}_${slotKey}`);
          setUploadSuccess(true);
          setUploadMessage('Foto berhasil disimpan & diunggah!');
          setTimeout(() => {
            router.push(`/lapangan/${reportId}`);
          }, 600);
          return;
        }
      }

      // Jika offline atau jaringan lambat, tersimpan di antrean perangkat
      setUploadSuccess(true);
      setUploadMessage('Tersimpan di antrean offline (akan otomatis terunggah)');
      setTimeout(() => {
        router.push(`/lapangan/${reportId}`);
      }, 900);
    } catch (e: any) {
      alert(`Gagal menyimpan foto: ${e.message}`);
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  if (!slot) {
    return <div className="p-4 text-center">Slot tidak valid.</div>;
  }

  if (isLocked) {
    return (
      <div className="fixed inset-0 z-50 bg-white text-text flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-base font-bold text-text">Laporan Berstatus FINAL & Dikunci</h2>
          <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
            Laporan untuk WSID <strong>{reportInfo.wsid || 'ini'}</strong> telah difinalisasi oleh Supervisor. Penambahan atau perubahan foto dinonaktifkan.
          </p>
        </div>
        <Link
          href={`/lapangan/${reportId}`}
          className="btn-primary h-10 px-5 text-xs font-semibold gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Detail Lokasi</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between p-4 bg-black/60 backdrop-blur-md z-20">
        <button
          onClick={() => router.push(`/lapangan/${reportId}`)}
          className="p-2 text-white/80 hover:text-white rounded-full bg-white/10"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2]" />
        </button>

        <div className="text-center">
          <span className="text-xs font-bold block truncate max-w-[200px]">
            #{slot.sort} {slot.label}
          </span>
          <span className="text-[10px] text-white/70">
            Rasio {slot.aspect_w}:{slot.aspect_h} &middot; Tier {slot.tier}
          </span>
        </div>

        <button
          onClick={handleSave}
          disabled={!imageSrc || isProcessing}
          className="btn-primary h-9 px-4 text-xs font-semibold gap-1.5 disabled:opacity-40"
        >
          <Check className="w-4 h-4" />
          <span>{isProcessing ? 'Menyimpan...' : 'Simpan'}</span>
        </button>
      </div>

      {/* Main View Area: Viewfinder ATAU Canvas Editor */}
      <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
        {/* VIEW 1: KAMERA DALAM APLIKASI (Viewfinder dengan bingkai rasio terkunci) */}
        {viewfinderActive && !imageSrc && (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Locked Aspect Ratio Cutout Overlay */}
            <div
              className="relative z-10 border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-none"
              style={{
                aspectRatio: `${slot.aspect_w} / ${slot.aspect_h}`,
                maxWidth: '92vw',
                maxHeight: '65vh',
                width: slot.aspect_w >= slot.aspect_h ? '90%' : 'auto',
                height: slot.aspect_h > slot.aspect_w ? '65vh' : 'auto',
              }}
            >
              <div className="absolute top-2 left-2 text-[10px] bg-primary text-white px-2 py-0.5 rounded font-bold">
                {slot.aspect_w}:{slot.aspect_h}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: CANVAS EDITOR */}
        {imageSrc && (
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div
              className="rounded-lg overflow-hidden border border-white/20 bg-black/40 shadow-2xl relative"
              style={{
                aspectRatio: `${slot.aspect_w} / ${slot.aspect_h}`,
                maxWidth: '92vw',
                maxHeight: '55vh',
              }}
            >
              <canvas ref={canvasPreviewRef} className="max-w-full max-h-full object-contain" />
            </div>

            {/* Estimated file size & tier limit pill */}
            <div className="mt-2 text-[11px] text-white/80 bg-white/10 px-3 py-1 rounded-full flex items-center gap-2">
              <span>Batas Tier: {slot.tier === 'standar' ? '≤260 KB' : slot.tier === 'detail' ? '≤450 KB' : '≤600 KB'}</span>
              <span>&middot;</span>
              <span className="text-[#8EC5FF] font-semibold">Mode {mode.toUpperCase()}</span>
            </div>

            {/* Peringatan non-blocking kualitas foto (SPEC A.10 / A.14) */}
            {qualityWarning && (qualityWarning.isDark || qualityWarning.isBlurry) && (
              <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                {qualityWarning.isDark && (
                  <span className="text-[10px] font-semibold bg-[#FFF3DC] text-[#8A5300] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Foto Terlalu Gelap
                  </span>
                )}
                {qualityWarning.isBlurry && (
                  <span className="text-[10px] font-semibold bg-[#FFF3DC] text-[#8A5300] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Kemungkinan Buram
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: PEMILIH GALERI KETIKA BELUM ADA GAMBAR & KAMERA NONAKTIF */}
        {!viewfinderActive && !imageSrc && (
          <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center max-w-sm animate-in fade-in">
            <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mb-4 text-white shadow-xl">
              <ImageIcon className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Unggah Foto #{slot.sort}
            </h3>
            <p className="text-xs text-white/70 mb-5 leading-relaxed">
              {slot.label} (Rasio {slot.aspect_w}:{slot.aspect_h})
            </p>
            <div className="flex flex-col gap-2.5 w-full">
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-btn font-semibold text-xs bg-primary hover:bg-primary-hover text-white transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <Camera className="w-4 h-4" />
                <span>Ambil Foto Tajam (Kamera HP)</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-btn font-semibold text-xs bg-white/15 hover:bg-white/25 text-white transition-colors flex items-center justify-center gap-2 border border-white/20"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Pilih Foto dari Galeri HP</span>
              </button>
              <button
                type="button"
                onClick={() => setViewfinderActive(true)}
                className="w-full py-2 px-4 rounded-btn font-medium text-xs bg-transparent hover:bg-white/10 text-white/80 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Buka Viewfinder Kamera Layar</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Toolbars */}
      <div className="p-4 bg-black/80 backdrop-blur-md space-y-3 z-20">
        {/* If Viewfinder active: Snap Buttons */}
        {viewfinderActive && !imageSrc && (
          <div className="flex items-center justify-around py-2">
            <button
              onClick={() => nativeCameraInputRef.current?.click()}
              className="flex flex-col items-center gap-1 text-white/80 hover:text-white text-[10px]"
            >
              <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
                <Camera className="w-5 h-5 text-emerald-400" />
              </div>
              <span>Kamera HP (Tajam)</span>
            </button>

            {/* Big Shutter Button */}
            <button
              onClick={handleSnap}
              className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-95 transition-transform"
            >
              <div className="w-full h-full rounded-full bg-white" />
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 text-white/80 hover:text-white text-[10px]"
            >
              <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <span>Galeri HP</span>
            </button>
          </div>
        )}

        {/* If Not Viewfinder and No Image: Simple Info Bar */}
        {!viewfinderActive && !imageSrc && (
          <div className="flex items-center justify-center py-2 text-xs text-white/70">
            <span>Pilih foto dari galeri HP atau aktifkan kamera langsung di atas.</span>
          </div>
        )}

        {/* If Image Loaded: Full Editor Controls */}
        {imageSrc && (
          <div className="space-y-3 text-xs">
            {/* Control Row 1: Zoom & Rotation */}
            <div className="flex items-center justify-between gap-3 text-white/90">
              <div className="flex items-center gap-2 flex-1">
                <ZoomOut className="w-4 h-4 text-white/70 shrink-0" />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-white/20 rounded-full"
                />
                <ZoomIn className="w-4 h-4 text-white/70 shrink-0" />
                <span className="text-[10px] w-8 text-right font-mono">{zoom.toFixed(1)}x</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRotation((r) => (r - 90) % 360)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                  title="Putar 90° Kiri"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                  title="Putar 90° Kanan"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Control Row 2: Fine tune rotation slider (-15 to +15) */}
            <div className="flex items-center gap-2 text-white/90">
              <span className="text-[10px] text-white/70 w-16 shrink-0">Luruskan</span>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={fineRotation}
                onChange={(e) => setFineRotation(parseFloat(e.target.value))}
                className="w-full accent-[#8EC5FF] h-1.5 bg-white/20 rounded-full"
              />
              <span className="text-[10px] w-10 text-right font-mono">{fineRotation}°</span>
            </div>

            {/* Control Row 3: Toggles (Mode Isi/Pas, Auto-level, Watermark) */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
              {/* Mode Isi / Pas */}
              <div className="flex rounded-btn bg-white/10 p-0.5 text-[11px]">
                <button
                  onClick={() => setMode('isi')}
                  className={`px-3 py-1 rounded-btn font-medium transition-colors ${
                    mode === 'isi' ? 'bg-primary text-white' : 'text-white/70'
                  }`}
                >
                  Isi (Cover)
                </button>
                <button
                  onClick={() => setMode('pas')}
                  className={`px-3 py-1 rounded-btn font-medium transition-colors ${
                    mode === 'pas' ? 'bg-primary text-white' : 'text-white/70'
                  }`}
                >
                  Pas (Contain)
                </button>
              </div>

              {/* Auto Level Histogram */}
              <button
                onClick={() => setAutoLevel(!autoLevel)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-btn text-[11px] font-medium border ${
                  autoLevel
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-white/10 border-transparent text-white/80'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto Level</span>
              </button>

              {/* Watermark Toggle */}
              <button
                onClick={() => setWatermark(!watermark)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-btn text-[11px] font-medium border ${
                  watermark
                    ? 'bg-status-success-bg/20 border-status-success-text text-status-success-text'
                    : 'bg-white/10 border-transparent text-white/80'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Watermark</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input for Native Camera (Tajam & Hardware Autofocus) */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hidden File Input for Gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Uploading Progress Modal Feedback */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in">
          {uploadSuccess ? (
            <div className="flex flex-col items-center animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/30">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                {uploadMessage}
              </h3>
              <p className="text-xs text-white/70">
                Mengalihkan kembali ke daftar slot...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-3 border border-primary/30">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                {uploadMessage}
              </h3>
              <p className="text-xs text-white/70 max-w-xs">
                Mohon tunggu sebentar, foto sedang diproses dan diunggah...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

