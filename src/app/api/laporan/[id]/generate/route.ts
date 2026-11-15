import { NextResponse } from 'next/server';
import path from 'path';
import { db } from '@/lib/store/mock-db';
import { photoStore } from '@/lib/store/photo-store';
import { buildDocumentData } from '@/lib/docx/data-builder';
import { generateDocx } from '@/lib/docx/docx-generator';
import { formatNamaBerkasDocx } from '@/lib/utils';
import { PHOTO_SLOTS } from '@/types/slot';
import sharp from 'sharp';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const report = db.getReportById(id);
    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Laporan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Siapkan buffer foto untuk seluruh 34 slot
    const photoBuffers: Record<string, Buffer> = {};

    for (const slot of PHOTO_SLOTS) {
      const pKey = `${id}_${slot.key}`;
      // Jika ada di memori / penyimpanan
      // Buat sample dummy foto jika belum diunggah untuk keperluan uji coba
      const slotBuf = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 232, g: 243, b: 255 },
        },
      })
        .composite([
          {
            input: Buffer.from(
              `<svg width="800" height="600">
                <rect width="800" height="600" fill="#E8F3FF"/>
                <text x="50%" y="45%" text-anchor="middle" font-family="sans-serif" font-size="28" font-weight="bold" fill="#1A73D9">OMOV BCA</text>
                <text x="50%" y="55%" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#0F2A43">Slot: ${slot.label}</text>
              </svg>`
            ),
          },
        ])
        .jpeg()
        .toBuffer();

      photoBuffers[slot.key] = slotBuf;
    }

    const docData = buildDocumentData(report, photoBuffers);
    const templatePath = path.resolve(process.cwd(), 'template/BA_TEMPLATE.docx');

    const outputBuffer = await generateDocx(templatePath, docData, photoBuffers);

    const filename = formatNamaBerkasDocx(
      report.jenis_pekerjaan,
      report.wsid,
      report.lokasi
    );

    return new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': outputBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghasilkan dokumen Word' },
      { status: 500 }
    );
  }
}
