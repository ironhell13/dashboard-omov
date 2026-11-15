import { NextResponse } from 'next/server';
import path from 'path';
import { db } from '@/lib/store/mock-db';
import { photoStore } from '@/lib/store/photo-store';
import { GoogleDriveService } from '@/lib/drive/drive-service';
import { buildDocumentData } from '@/lib/docx/data-builder';
import { generateDocx } from '@/lib/docx/docx-generator';
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

    // 1. Siapkan photoBuffers untuk pembuatan dokumen
    const photoBuffers: Record<string, Buffer> = {};
    for (const slot of PHOTO_SLOTS) {
      const targetKey = slot.reuse_of ? slot.reuse_of : slot.key;
      const stored = photoStore.get(`${id}_${targetKey}`);

      if (stored?.buffer) {
        photoBuffers[slot.key] = stored.buffer;
      } else {
        // Fallback placeholder image jika foto riil belum ada di photoStore
        photoBuffers[slot.key] = await sharp({
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
      }
    }

    // 2. Generate dokumen .docx
    const docData = buildDocumentData(report, photoBuffers);
    const templatePath = path.resolve(process.cwd(), 'template/BA_TEMPLATE.docx');
    const docxBuffer = await generateDocx(templatePath, docData, photoBuffers);

    // 3. Unggah ke Google Drive (Struktur LAPORAN OMOV/{tahun}/{bulan}/)
    const driveResult = await GoogleDriveService.uploadReportDocx(report, docxBuffer);

    // 4. Update status laporan menjadi terarsip (SPEC A.13)
    const nowIso = new Date().toISOString();
    report.status = 'terarsip';
    report.archived_at = nowIso;
    report.drive_file_id = driveResult.fileId;
    report.drive_url = driveResult.driveUrl;
    report.updated_at = nowIso;

    return NextResponse.json({
      success: true,
      data: report,
      driveResult,
      message: 'Laporan berhasil diarsipkan ke Google Drive.',
    });
  } catch (err: any) {
    // Jika gagal, status tetap final agar supervisor dapat mencoba arsip lagi (SPEC A.13)
    return NextResponse.json(
      {
        success: false,
        error: `Gagal mengarsipkan ke Google Drive: ${err.message}. Silakan coba lagi.`,
      },
      { status: 500 }
    );
  }
}

