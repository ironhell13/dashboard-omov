import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { db } from '@/lib/store/mock-db';
import { photoStore } from '@/lib/store/photo-store';
import { PHOTO_SLOTS } from '@/types/slot';

export const dynamic = 'force-dynamic';

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { reportId, slotKey, slotKeys: rawSlotKeys, review, note } = body;

    const keysToProcess: string[] = Array.isArray(rawSlotKeys)
      ? rawSlotKeys
      : slotKey
      ? [slotKey]
      : [];

    if (!reportId || keysToProcess.length === 0 || !review) {
      return NextResponse.json(
        { success: false, error: 'reportId, slotKey/slotKeys, dan review wajib diisi' },
        { status: 400 }
      );
    }

    if (review !== 'diterima' && review !== 'ditolak') {
      return NextResponse.json(
        { success: false, error: 'Status review harus "diterima" atau "ditolak"' },
        { status: 400 }
      );
    }

    if (review === 'ditolak' && (!note || !note.trim())) {
      return NextResponse.json(
        { success: false, error: 'Catatan wajib diisi saat menolak foto' },
        { status: 400 }
      );
    }

    for (const sKey of keysToProcess) {
      const key = `${reportId}_${sKey}`;
      let photo = photoStore.get(key);

      if (!photo) {
        photo = {
          slotKey: sKey,
          bytes: 150000,
          width: 1280,
          height: 960,
          source: 'kamera',
          uploadedAt: new Date().toISOString(),
          review: 'menunggu',
        };
      }

      photo.review = review;
      photo.review_note = review === 'ditolak' ? note.trim() : undefined;
      photoStore.set(key, photo);
    }

    const hasSupabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy');

    if (hasSupabaseUrl && hasServiceKey && isUuid(reportId)) {
      try {
        const adminClient = createAdminClient();
        for (const sKey of keysToProcess) {
          await adminClient
            .from('report_photos')
            .update({
              review,
              review_note: review === 'ditolak' ? note.trim() : null,
            })
            .match({ report_id: reportId, slot_key: sKey });
        }

        if (review === 'ditolak') {
          await adminClient.from('reports').update({ status: 'perlu_perbaikan' }).eq('id', reportId);
        }
      } catch (e) {
        console.error('Supabase review photo error:', e);
      }
    }

    // Dapatkan data laporan saat ini
    const report = db.getReportById(reportId);

    if (report) {
      if (review === 'ditolak') {
        // Otomatis ubah status laporan menjadi perlu_perbaikan (SPEC A.14)
        db.updateReportData(reportId, {}, 'perlu_perbaikan');
      } else if (review === 'diterima') {
        // Cek apakah ada foto lain yang masih ditolak
        let hasRejected = false;
        let approvedCount = 0;

        PHOTO_SLOTS.forEach((slot) => {
          const targetSlot = slot.reuse_of || slot.key;
          const p = photoStore.get(`${reportId}_${targetSlot}`);
          if (p?.review === 'diterima') approvedCount++;
          if (p?.review === 'ditolak') hasRejected = true;
        });

        if (!hasRejected && approvedCount >= 34) {
          db.updateReportData(reportId, {}, 'foto_lengkap');
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processedCount: keysToProcess.length,
        slotKeys: keysToProcess,
        review,
        note: review === 'ditolak' ? note.trim() : undefined,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

