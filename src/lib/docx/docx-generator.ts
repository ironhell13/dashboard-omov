import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import sharp from 'sharp';
import { PHOTO_SLOTS } from '@/types/slot';

const ImageModule = require('docxtemplater-image-module-free');

// Ukuran sel dalam piksel (96 dpi, 1 cm ≈ 37.795 px)
export const SLOT_DIMENSIONS_PX: Record<string, [number, number]> = {};

PHOTO_SLOTS.forEach((slot) => {
  const wPx = Math.round(slot.cell_w_cm * 37.795);
  const hPx = Math.round(slot.cell_h_cm * 37.795);
  SLOT_DIMENSIONS_PX[`foto_${slot.key}`] = [wPx, hPx];
});

/**
 * Preprocessing foto dengan Sharp:
 * Menyesuaikan ukuran kotak persis, dengan mode 'contain' (latar putih)
 * agar foto tidak pernah gepeng atau terdistorsi (SPEC A.10 & A.12).
 */
export async function preprocessPhoto(
  buffer: Buffer,
  targetWidthPx: number,
  targetHeightPx: number
): Promise<Buffer> {
  return await sharp(buffer)
    .resize(targetWidthPx, targetHeightPx, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/**
 * Generate dokumen Berita Acara .docx dari template bersih BA_TEMPLATE.docx
 */
export async function generateDocx(
  templatePath: string,
  data: Record<string, any>,
  photoBuffers: Record<string, Buffer>
): Promise<Buffer> {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  // Pre-process seluruh gambar ke dimensi sel yang sesuai
  const processedPhotos = new Map<string, Buffer>();

  for (const slot of PHOTO_SLOTS) {
    const key = `foto_${slot.key}`;
    let buf = photoBuffers[slot.key];

    // Reuse logic: ba_hdd_full memakai foto ba_hdd
    if (!buf && slot.reuse_of) {
      buf = photoBuffers[slot.reuse_of];
    }

    const [wPx, hPx] = SLOT_DIMENSIONS_PX[key] || [170, 128];

    if (buf) {
      // Skala 2.5x - 3x untuk ketajaman foto ekstra jernih di Word (300 DPI) tanpa gepeng
      const renderW = Math.round(wPx * 2.8);
      const renderH = Math.round(hPx * 2.8);
      const processed = await preprocessPhoto(buf, renderW, renderH);
      processedPhotos.set(key, processed);
    } else {
      // Jika kosong, sediakan placeholder putih/subtle
      const placeholder = await sharp({
        create: {
          width: wPx * 2,
          height: hPx * 2,
          channels: 3,
          background: { r: 245, g: 249, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();
      processedPhotos.set(key, placeholder);
    }
  }

  // Set nilai string untuk setiap tag foto agar modul docxtemplater mengenali tag sinkron
  const fullData: Record<string, any> = { ...data };
  PHOTO_SLOTS.forEach((slot) => {
    fullData[`foto_${slot.key}`] = slot.key;
  });

  const imageOptions = {
    centered: false,
    getImage(tagValue: string, tagName: string) {
      const buf = processedPhotos.get(tagName);
      if (buf) return buf;
      // Fallback 1x1 jpeg
      return Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    },
    getSize(img: any, tagValue: string, tagName: string) {
      return SLOT_DIMENSIONS_PX[tagName] || [170, 128];
    },
  };

  const imageModule = new ImageModule(imageOptions);

  const doc = new Docxtemplater(zip, {
    modules: [imageModule],
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(fullData);

  const outputBuf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return outputBuf;
}
