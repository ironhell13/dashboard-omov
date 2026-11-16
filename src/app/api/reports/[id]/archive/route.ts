import { NextResponse } from 'next/server';
import path from 'path';
import { db } from '@/lib/store/mock-db';
import { photoStore } from '@/lib/store/photo-store';
import { GoogleDriveService } from '@/lib/drive/drive-service';
import { buildDocumentData } from '@/lib/docx/data-builder';
import { generateDocx } from '@/lib/docx/docx-generator';
import { PHOTO_SLOTS } from '@/types/slot';
import { createAdminClient } from '@/lib/supabase/admin';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    let report: any = null;

    const hasSupabaseUrl =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      (!!process.env.SUPABASE_SERVICE_ROLE_KEY &&
        !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy')) ||
      (!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('dummy'));

    let adminClient: any = null;
    if (hasSupabaseUrl && hasServiceKey) {
      adminClient = createAdminClient();
    }

    if (adminClient && isUuid(id)) {
      try {
        const { data: supaReport, error } = await adminClient
          .from('reports')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && supaReport) {
          report = supaReport;
        }
      } catch (err) {
        console.error('Supabase get report in archive error:', err);
      }
    }

    if (!report) {
      report = db.getReportById(id);
    }

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Laporan tidak ditemukan' },
        { status: 404 }
      );
    }

    // 1. Siapkan photoBuffers untuk pembuatan dokumen
    const photoBuffers: Record<string, Buffer> = {};

    // 1a. Cek Supabase Storage untuk foto-foto yang diunggah
    if (adminClient && isUuid(id)) {
      try {
        const { data: dbPhotos } = await adminClient
          .from('report_photos')
          .select('slot_key, storage_path')
          .eq('report_id', id);

        const photoPathMap = new Map<string, string>();
        if (dbPhotos && dbPhotos.length > 0) {
          dbPhotos.forEach((p: any) => photoPathMap.set(p.slot_key, p.storage_path));
        }

        for (const slot of PHOTO_SLOTS) {
          const directMemory = photoStore.get(`${id}_${slot.key}`);
          if (directMemory?.buffer) {
            photoBuffers[slot.key] = directMemory.buffer;
            continue;
          }

          const storagePath = photoPathMap.get(slot.key) || `${id}/${slot.key}.jpg`;
          const { data: fileBlob, error: downloadErr } = await adminClient.storage
            .from('laporan-foto')
            .download(storagePath);

          if (!downloadErr && fileBlob) {
            const arrBuf = await fileBlob.arrayBuffer();
            const buf = Buffer.from(arrBuf);
            photoBuffers[slot.key] = buf;
            photoStore.set(`${id}_${slot.key}`, {
              slotKey: slot.key,
              bytes: buf.length,
              width: 1600,
              height: 1200,
              source: 'kamera',
              uploadedAt: new Date().toISOString(),
              review: 'diterima',
              buffer: buf,
            });
          }
        }
      } catch (storageErr) {
        console.error('Error fetching photos in archive from Supabase:', storageErr);
      }
    }

    // 1b. Fallback foto dari memory store atau placeholder
    for (const slot of PHOTO_SLOTS) {
      if (photoBuffers[slot.key]) continue;

      const targetKey = slot.reuse_of ? slot.reuse_of : slot.key;
      const stored = photoStore.get(`${id}_${targetKey}`);

      if (stored?.buffer) {
        photoBuffers[slot.key] = stored.buffer;
      } else {
        // Fallback placeholder image jika foto riil belum ada
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

    if (adminClient && isUuid(id)) {
      try {
        const { data: updatedReport } = await adminClient
          .from('reports')
          .update({
            status: 'terarsip',
            archived_at: nowIso,
            drive_file_id: driveResult.fileId,
            drive_url: driveResult.driveUrl,
            updated_at: nowIso,
          })
          .eq('id', id)
          .select()
          .single();

        if (updatedReport) {
          report = updatedReport;
        } else {
          report.status = 'terarsip';
          report.archived_at = nowIso;
          report.drive_file_id = driveResult.fileId;
          report.drive_url = driveResult.driveUrl;
          report.updated_at = nowIso;
        }
      } catch (err) {
        console.error('Supabase update archive error:', err);
        report.status = 'terarsip';
        report.archived_at = nowIso;
        report.drive_file_id = driveResult.fileId;
        report.drive_url = driveResult.driveUrl;
        report.updated_at = nowIso;
      }
    } else {
      report.status = 'terarsip';
      report.archived_at = nowIso;
      report.drive_file_id = driveResult.fileId;
      report.drive_url = driveResult.driveUrl;
      report.updated_at = nowIso;
    }

    const mockRep = db.getReportById(id);
    if (mockRep) {
      mockRep.status = 'terarsip';
      mockRep.archived_at = nowIso;
      mockRep.drive_file_id = driveResult.fileId;
      mockRep.drive_url = driveResult.driveUrl;
      mockRep.updated_at = nowIso;
    }

    return NextResponse.json({
      success: true,
      data: report,
      driveResult,
      message: 'Laporan berhasil diarsipkan ke Google Drive.',
    });
  } catch (err: any) {
    console.error('Archive to Google Drive error:', err);
    return NextResponse.json(
      {
        success: false,
        error: `Gagal mengarsipkan ke Google Drive: ${err.message}. Silakan coba lagi.`,
      },
      { status: 500 }
    );
  }
}
