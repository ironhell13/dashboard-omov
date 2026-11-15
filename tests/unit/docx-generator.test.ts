import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import { generateDocx, preprocessPhoto } from '@/lib/docx/docx-generator';
import { buildDocumentData } from '@/lib/docx/data-builder';
import { Report, JenisPekerjaan } from '@/types/database';
import { PHOTO_SLOTS } from '@/types/slot';
import sharp from 'sharp';

describe('Tahap 4: Word Generation Engine & Golden Tests (SPEC A.12)', () => {
  const templatePath = path.resolve(process.cwd(), 'template/BA_TEMPLATE.docx');

  it('template/BA_TEMPLATE.docx dan template/placeholders.json harus tersedia', () => {
    expect(fs.existsSync(templatePath)).toBe(true);
    const placeholdersPath = path.resolve(process.cwd(), 'template/placeholders.json');
    expect(fs.existsSync(placeholdersPath)).toBe(true);
  });

  it('dapat melakukan preprocessing foto dengan mode contain berlatar putih (sharp)', async () => {
    const sampleInput = await sharp({
      create: {
        width: 600,
        height: 600,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    const processed = await preprocessPhoto(sampleInput, 170, 128);
    expect(Buffer.isBuffer(processed)).toBe(true);
    expect(processed.length).toBeGreaterThan(0);

    const meta = await sharp(processed).metadata();
    expect(meta.width).toBe(170);
    expect(meta.height).toBe(128);
  });

  const jenisList: JenisPekerjaan[] = [
    'Trade In',
    'Replace',
    'Aktivasi Online Baru',
    'Relokasi',
  ];

  for (const jenis of jenisList) {
    it(`berhasil menghasilkan dokumen .docx valid untuk jenis pekerjaan: ${jenis}`, async () => {
      const mockReport: Report = {
        id: `test-${jenis.toLowerCase().replace(/\s+/g, '-')}`,
        wsid: 'Z9KD',
        lokasi: 'SPBU 3415143 Otista',
        jenis_pekerjaan: jenis,
        tanggal: '2026-11-15',
        status: 'foto_lengkap',
        created_at: '2026-11-15T00:00:00Z',
        updated_at: '2026-11-15T00:00:00Z',
        data: {
          wsid: 'Z9KD',
          lokasi: 'SPBU 3415143 Otista',
          alamat: 'Jl Oto Iskandardinata No22, Gerendeng, Tangerang',
          type_mesin_baru: 'NCR 6625',
          serial_nomor: 'SN-TEST-8899',
          tegangan_ups_it: 220,
          grounding_ups_it: 1.2,
          ip_address: '10.176.58.138',
          kota: 'Jakarta',
          yang_melakukan: 'Budi Santoso',
          mengetahui: 'Ahmad Fauzi',
        },
      };

      // Siapkan sample photo buffer untuk 34 slot
      const samplePhoto = await sharp({
        create: {
          width: 400,
          height: 300,
          channels: 3,
          background: { r: 26, g: 115, b: 217 },
        },
      })
        .jpeg()
        .toBuffer();

      const photoBuffers: Record<string, Buffer> = {};
      PHOTO_SLOTS.forEach((s) => {
        photoBuffers[s.key] = samplePhoto;
      });

      const docData = buildDocumentData(mockReport, photoBuffers);
      const generatedBuf = await generateDocx(templatePath, docData, photoBuffers);

      expect(Buffer.isBuffer(generatedBuf)).toBe(true);
      expect(generatedBuf.length).toBeGreaterThan(50000); // Ukuran berkas wajar .docx

      // Validasi struktur OOXML / zip
      const zip = new PizZip(generatedBuf);
      const docXml = zip.file('word/document.xml')?.asText();
      expect(docXml).toBeDefined();

      // Periksa jenis pekerjaan tercetak di dokumen
      expect(docXml).toContain(jenis);

      // Periksa WSID tercetak di dokumen
      expect(docXml).toContain('Z9KD');

      // Periksa tidak ada tag mentah { atau } yang tersisa di teks utama
      const leftoverTags = docXml?.match(/\{[a-z0-9_]+\}/g) || [];
      expect(leftoverTags.length).toBe(0);
    });
  }
});

