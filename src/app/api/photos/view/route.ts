import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { photoStore } from '@/lib/store/photo-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('reportId');
    const slotKey = searchParams.get('slotKey');
    const pathParam = searchParams.get('path');

    let targetReportId = reportId;
    let targetSlotKey = slotKey;

    if (pathParam && (!targetReportId || !targetSlotKey)) {
      const parts = pathParam.split('/');
      if (parts.length >= 2) {
        targetReportId = parts[0];
        targetSlotKey = parts[1].replace('.jpg', '').replace('thumb_', '');
      }
    }

    if (!targetReportId || !targetSlotKey) {
      return new Response('Parameter reportId dan slotKey wajib disertakan', { status: 400 });
    }

    const key = `${targetReportId}_${targetSlotKey}`;

    // 1. Cek photoStore memory
    const stored = photoStore.get(key);
    if (stored?.buffer && stored.buffer.length > 0) {
      return new Response(new Uint8Array(stored.buffer), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        },
      });
    }

    if (stored?.thumbBase64 && stored.thumbBase64.startsWith('data:image')) {
      const base64Data = stored.thumbBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const buf = Buffer.from(base64Data, 'base64');
      return new Response(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 2. Ambil dari Supabase Storage jika konfigurasi ada
    const hasSupabaseUrl =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      (!!process.env.SUPABASE_SERVICE_ROLE_KEY &&
        !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy')) ||
      (!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('dummy'));

    if (hasSupabaseUrl && hasServiceKey) {
      try {
        const adminClient = createAdminClient();
        const filePath = `${targetReportId}/${targetSlotKey}.jpg`;
        const { data: blob, error } = await adminClient.storage
          .from('laporan-foto')
          .download(filePath);

        if (!error && blob) {
          const arrayBuffer = await blob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Simpan ke cache memory
          photoStore.set(key, {
            slotKey: targetSlotKey,
            bytes: buffer.length,
            width: 1280,
            height: 960,
            source: 'kamera',
            uploadedAt: new Date().toISOString(),
            review: 'menunggu',
            buffer,
          });

          return new Response(new Uint8Array(buffer), {
            headers: {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'public, max-age=86400',
            },
          });
        }
      } catch (err: any) {
        console.error('Error downloading photo from Supabase:', err.message);
      }
    }

    return new Response('Foto tidak ditemukan', { status: 404 });
  } catch (error: any) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}
