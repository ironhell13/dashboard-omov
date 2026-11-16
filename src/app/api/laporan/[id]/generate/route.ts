import { NextResponse } from 'next/server';
import path from 'path';
import { db } from '@/lib/store/mock-db';
import { photoStore } from '@/lib/store/photo-store';
import { buildDocumentData } from '@/lib/docx/data-builder';
import { generateDocx } from '@/lib/docx/docx-generator';
import { formatNamaBerkasDocx } from '@/lib/utils';
import { PHOTO_SLOTS } from '@/types/slot';
import { createAdminClient } from '@/lib/supabase/admin';

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
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy');

    let adminClient: any = null;
    if (hasSupabaseUrl && hasServiceKey) {
      adminClient = createAdminClient();
    }

    // 1. Ambil data laporan dari Supabase Database atau Mock DB
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
        console.error('Supabase get report error in generate:', err);
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

    // 2. Siapkan buffer foto untuk seluruh 34 slot
    const photoBuffers: Record<string, Buffer> = {};

    // 2a. Cek Supabase Storage untuk foto-foto yang diunggah
    if (adminClient) {
      try {
        // Ambil mapping file dari tabel report_photos jika ada
        const { data: dbPhotos } = await adminClient
          .from('report_photos')
          .select('slot_key, storage_path')
          .eq('report_id', id);

        const photoPathMap = new Map<string, string>();
        if (dbPhotos && dbPhotos.length > 0) {
          dbPhotos.forEach((p: any) => photoPathMap.set(p.slot_key, p.storage_path));
        }

        // Ambil buffer foto nyata dari Supabase Storage
        for (const slot of PHOTO_SLOTS) {
          // Prioritaskan memory cache jika baru diunggah
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
            // Cache ke memory agar cepat
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
        console.error('Error fetching photos from Supabase Storage:', storageErr);
      }
    }

    // 2b. Fallback ke photoStore lokal
    for (const slot of PHOTO_SLOTS) {
      if (!photoBuffers[slot.key]) {
        const inMemory = photoStore.get(`${id}_${slot.key}`);
        if (inMemory?.buffer) {
          photoBuffers[slot.key] = inMemory.buffer;
        }
      }
    }

    // 2c. Logika reuse slot (misal: ba_hdd_full menggunakan foto ba_hdd)
    for (const slot of PHOTO_SLOTS) {
      if (!photoBuffers[slot.key] && slot.reuse_of && photoBuffers[slot.reuse_of]) {
        photoBuffers[slot.key] = photoBuffers[slot.reuse_of];
      }
    }

    // 3. Bangun data Word dengan data terkini hasil editan pengguna
    const docData = buildDocumentData(report, photoBuffers);
    const templatePath = path.resolve(process.cwd(), 'template/BA_TEMPLATE.docx');

    // 4. Generate dokumen Word dengan foto asli beresolusi tajam
    const outputBuffer = await generateDocx(templatePath, docData, photoBuffers);

    const targetJenis = report.data?.jenis_pekerjaan || report.jenis_pekerjaan || 'Trade In';
    const targetWsid = report.data?.wsid || report.wsid || 'BCA';
    const targetLokasi = report.data?.lokasi || report.lokasi || 'ATM';

    const filename = formatNamaBerkasDocx(targetJenis, targetWsid, targetLokasi);

    return new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': outputBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Word generation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghasilkan dokumen Word' },
      { status: 500 }
    );
  }
}
