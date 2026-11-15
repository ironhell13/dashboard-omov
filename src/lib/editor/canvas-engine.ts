import { PhotoSlotTier } from '@/types/slot';

export interface EditorConfig {
  aspectW: number;
  aspectH: number;
  tier: PhotoSlotTier;
  zoom: number; // 1 to 5
  rotation: number; // total degrees (90 deg increments + fine tune -15 to +15)
  mode: 'isi' | 'pas'; // 'isi' = cover, 'pas' = contain (white background)
  brightness: number; // -30 to +30
  contrast: number; // -30 to +30
  autoLevel: boolean;
  watermark: boolean;
  watermarkData?: {
    wibTime: string;
    wsid: string;
    lokasi: string;
    coords?: { lat: number; lng: number };
  };
}

export interface CompressionResult {
  blob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
  bytes: number;
  quality: number;
  isLowRes: boolean;
  qualityMetrics?: ImageQualityMetrics;
}

export interface ImageQualityMetrics {
  isDark: boolean;
  isBlurry: boolean;
  luminance: number; // 0 - 255
  blurScore: number; // Variance of Laplacian
}

// Deteksi Foto Buram (Variance of Laplacian) dan Foto Gelap (Rata-rata Luminans) (SPEC A.10 / A.14)
export function detectBlurAndDarkness(imageData: ImageData): ImageQualityMetrics {
  const { data, width, height } = imageData;
  const totalPixels = width * height;

  let totalLuminance = 0;
  const gray = new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLuminance += lum;
    gray[i] = lum;
  }

  const avgLuminance = totalLuminance / totalPixels;
  // Di bawah 45 dianggap terlalu gelap
  const isDark = avgLuminance < 45;

  // Hitung Variance of Laplacian dengan kernel [0,1,0; 1,-4,1; 0,1,0]
  let sumLap = 0;
  let sumLapSq = 0;
  let lapCount = 0;

  // Subsample step jika resolusi besar untuk performa instan di browser/HP
  const step = width > 800 ? 2 : 1;

  for (let y = 1; y < height - 1; y += step) {
    const rowOffset = y * width;
    const rowAbove = (y - 1) * width;
    const rowBelow = (y + 1) * width;

    for (let x = 1; x < width - 1; x += step) {
      const center = gray[rowOffset + x];
      const lap =
        gray[rowAbove + x] +
        gray[rowBelow + x] +
        gray[rowOffset + x - 1] +
        gray[rowOffset + x + 1] -
        4 * center;

      sumLap += lap;
      sumLapSq += lap * lap;
      lapCount++;
    }
  }

  const meanLap = sumLap / (lapCount || 1);
  const varianceLap = Math.max(0, sumLapSq / (lapCount || 1) - meanLap * meanLap);

  // Nilai varians di bawah 100 mengindikasikan ketidaktajaman / foto buram
  const isBlurry = varianceLap < 100;

  return {
    isDark,
    isBlurry,
    luminance: Math.round(avgLuminance),
    blurScore: Math.round(varianceLap * 100) / 100,
  };
}

// Menghitung dimensi target piksel berdasarkan rasio dan tier (SPEC A.10)
export function getTargetDimensions(
  aspectW: number,
  aspectH: number,
  tier: PhotoSlotTier
): { width: number; height: number; maxBytes: number; initialQuality: number } {
  let maxSide = 1280;
  let maxBytes = 260 * 1024; // 260 KB
  let initialQuality = 0.78;

  if (tier === 'detail') {
    maxSide = 1600;
    maxBytes = 450 * 1024; // 450 KB
    initialQuality = 0.85;
  } else if (tier === 'dokumen') {
    maxSide = 1800;
    maxBytes = 600 * 1024; // 600 KB
    initialQuality = 0.85;
  }

  let width: number;
  let height: number;

  if (aspectW >= aspectH) {
    // Landscape / Square
    width = maxSide;
    height = Math.round((maxSide * aspectH) / aspectW);
  } else {
    // Portrait
    height = maxSide;
    width = Math.round((maxSide * aspectW) / aspectH);
  }

  return { width, height, maxBytes, initialQuality };
}

// Manipulasi piksel: Kecerahan, Kontras, dan Auto-Level Histogram (1-99 persentil)
export function applyPixelAdjustments(
  imageData: ImageData,
  brightness: number,
  contrast: number,
  autoLevel: boolean
) {
  const data = imageData.data;
  const len = data.length;

  // 1. Auto-level: cari persentil 1 dan 99 per kanal jika diaktifkan
  let minR = 0, maxR = 255;
  let minG = 0, maxG = 255;
  let minB = 0, maxB = 255;

  if (autoLevel) {
    const histR = new Uint32Array(256);
    const histG = new Uint32Array(256);
    const histB = new Uint32Array(256);
    const totalPixels = len / 4;

    for (let i = 0; i < len; i += 4) {
      histR[data[i]]++;
      histG[data[i + 1]]++;
      histB[data[i + 2]]++;
    }

    const p1 = Math.floor(totalPixels * 0.01);
    const p99 = Math.floor(totalPixels * 0.99);

    const getBounds = (hist: Uint32Array) => {
      let count = 0;
      let min = 0;
      let max = 255;
      for (let i = 0; i < 256; i++) {
        count += hist[i];
        if (count >= p1 && min === 0) min = i;
        if (count >= p99) {
          max = i;
          break;
        }
      }
      return { min, max: Math.max(max, min + 1) };
    };

    const bR = getBounds(histR);
    const bG = getBounds(histG);
    const bB = getBounds(histB);
    minR = bR.min; maxR = bR.max;
    minG = bG.min; maxG = bG.max;
    minB = bB.min; maxB = bB.max;
  }

  // Faktor kontras (-30 sampai +30 dikonversi ke faktor perkalian)
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const brightnessOffset = brightness * 2.5;

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Auto level stretch
    if (autoLevel) {
      r = Math.min(255, Math.max(0, ((r - minR) * 255) / (maxR - minR)));
      g = Math.min(255, Math.max(0, ((g - minG) * 255) / (maxG - minG)));
      b = Math.min(255, Math.max(0, ((b - minB) * 255) / (maxB - minB)));
    }

    // Brightness & Contrast
    if (brightness !== 0 || contrast !== 0) {
      r = contrastFactor * (r - 128) + 128 + brightnessOffset;
      g = contrastFactor * (g - 128) + 128 + brightnessOffset;
      b = contrastFactor * (b - 128) + 128 + brightnessOffset;
    }

    data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
}

// Render watermark resmi BCA OMOV di pojok kiri bawah (SPEC A.10)
export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: EditorConfig['watermarkData']
) {
  if (!data) return;

  const fontSize = Math.max(14, Math.round(height * 0.024));
  const paddingX = Math.round(fontSize * 0.8);
  const paddingY = Math.round(fontSize * 0.6);

  const lines: string[] = [
    data.wibTime,
    `${data.wsid} · ${data.lokasi}`,
  ];

  if (data.coords) {
    lines.push(`GPS: ${data.coords.lat.toFixed(6)}, ${data.coords.lng.toFixed(6)}`);
  }

  ctx.font = `600 ${fontSize}px Inter, sans-serif`;

  // Hitung lebar pita berdasarkan teks terpanjang
  let maxTextWidth = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxTextWidth) maxTextWidth = w;
  }

  const ribbonWidth = maxTextWidth + paddingX * 2;
  const ribbonHeight = lines.length * (fontSize * 1.35) + paddingY * 2;
  const startX = 0;
  const startY = height - ribbonHeight;

  // Pita gelap transparan 55%
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(startX, startY, ribbonWidth, ribbonHeight);

  // Garis aksen kiri biru primary
  ctx.fillStyle = '#1A73D9';
  ctx.fillRect(startX, startY, 4, ribbonHeight);

  // Teks putih
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'top';
  lines.forEach((line, idx) => {
    ctx.fillText(
      line,
      startX + paddingX + 4,
      startY + paddingY + idx * (fontSize * 1.35)
    );
  });
}

// Pipeline Ekspor & Kompresi Berjenjang di Browser
export async function exportAndCompress(
  img: HTMLImageElement | ImageBitmap,
  cropArea: { x: number; y: number; width: number; height: number },
  config: EditorConfig
): Promise<CompressionResult> {
  const { width, height, maxBytes, initialQuality } = getTargetDimensions(
    config.aspectW,
    config.aspectH,
    config.tier
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context tidak tersedia');

  // Latar putih (wajib untuk mode 'pas' / contain)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  ctx.save();

  // Mode Isi (Cover) vs Pas (Contain)
  if (config.mode === 'pas') {
    // Foto utuh di tengah canvas dengan margin putih
    const imgRatio = cropArea.width / cropArea.height;
    const canvasRatio = width / height;

    let drawW: number;
    let drawH: number;

    if (imgRatio > canvasRatio) {
      drawW = width;
      drawH = width / imgRatio;
    } else {
      drawH = height;
      drawW = height * imgRatio;
    }

    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2;

    ctx.drawImage(
      img,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      drawX,
      drawY,
      drawW,
      drawH
    );
  } else {
    // Mode Isi (Cover): isi seluruh bingkai canvas
    ctx.drawImage(
      img,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      0,
      0,
      width,
      height
    );
  }

  ctx.restore();

  // Terapkan penyesuaian piksel kecerahan / kontras / autolevel
  if (config.brightness !== 0 || config.contrast !== 0 || config.autoLevel) {
    const imgData = ctx.getImageData(0, 0, width, height);
    applyPixelAdjustments(imgData, config.brightness, config.contrast, config.autoLevel);
    ctx.putImageData(imgData, 0, 0);
  }

  // Gambar watermark jika aktif
  if (config.watermark && config.watermarkData) {
    drawWatermark(ctx, width, height, config.watermarkData);
  }

  // Kompresi berjenjang (step-down quality -0.03 hingga <= maxBytes atau min 0.70)
  let quality = initialQuality;
  let blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality)
  );

  while (blob.size > maxBytes && quality > 0.70) {
    quality = Math.max(0.70, quality - 0.03);
    blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality)
    );
  }

  // Buat thumbnail 400 px sisi terpanjang
  const thumbCanvas = document.createElement('canvas');
  let thumbW = 400;
  let thumbH = Math.round((400 * height) / width);
  if (height > width) {
    thumbH = 400;
    thumbW = Math.round((400 * width) / height);
  }
  thumbCanvas.width = thumbW;
  thumbCanvas.height = thumbH;
  const thumbCtx = thumbCanvas.getContext('2d');
  if (thumbCtx) {
    thumbCtx.drawImage(canvas, 0, 0, thumbW, thumbH);
  }
  const thumbBlob: Blob = await new Promise((resolve) =>
    thumbCanvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.70)
  );

  // Hitung metrik kualitas gambar (gelap & buram) untuk informasi non-blocking
  let qualityMetrics: ImageQualityMetrics | undefined;
  try {
    const rawData = ctx.getImageData(0, 0, width, height);
    qualityMetrics = detectBlurAndDarkness(rawData);
  } catch {
    // Ignore canvas security errors if any
  }

  // Cek apakah resolusi sumber < 85% dimensi target
  const isLowRes = cropArea.width < width * 0.85 || cropArea.height < height * 0.85;

  return {
    blob,
    thumbBlob,
    width,
    height,
    bytes: blob.size,
    quality,
    isLowRes,
    qualityMetrics,
  };
}

