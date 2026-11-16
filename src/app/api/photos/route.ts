import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { photoStore } from '@/lib/store/photo-store';
import { PHOTO_SLOTS } from '@/types/slot';

export const dynamic = 'force-dynamic';

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const reportId = formData.get('reportId') as string;
    const slotKey = formData.get('slotKey') as string;
    const file = formData.get('file') as Blob | null;
    const thumb = formData.get('thumb') as Blob | null;
    const metaStr = formData.get('meta') as string | null;

    if (!reportId || !slotKey || !file) {
      return NextResponse.json(
        { success: false, error: 'Data laporan, slot, dan berkas foto wajib dikirim' },
        { status: 400 }
      );
    }

    const meta = metaStr ? JSON.parse(metaStr) : {};
    const key = `${reportId}_${slotKey}`;

    // Baca buffer untuk penyimpanan
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let thumbBase64: string | undefined;
    if (thumb) {
      const thumbArrayBuffer = await thumb.arrayBuffer();
      thumbBase64 = `data:image/jpeg;base64,${Buffer.from(thumbArrayBuffer).toString('base64')}`;
    }

    const hasSupabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy');

    let storagePath = `laporan-foto/${reportId}/${slotKey}.jpg`;
    let publicUrl: string | undefined;

    // 1. Simpan permanen ke Supabase Storage & Database
    if (hasSupabaseUrl && hasServiceKey) {
      try {
        const adminClient = createAdminClient();
        const filePath = `${reportId}/${slotKey}.jpg`;

        // Upload berkas foto utama ke bucket 'laporan-foto'
        const { error: uploadErr } = await adminClient.storage
          .from('laporan-foto')
          .upload(filePath, buffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadErr) {
          // Jika bucket belum ada, buat otomatis
          if (uploadErr.message?.toLowerCase().includes('bucket not found')) {
            await adminClient.storage.createBucket('laporan-foto', { public: true });
            await adminClient.storage
              .from('laporan-foto')
              .upload(filePath, buffer, { contentType: 'image/jpeg', upsert: true });
          } else {
            console.error('Storage upload error:', uploadErr);
          }
        }

        // Upload thumbnail jika ada
        if (thumb) {
          const thumbBuffer = Buffer.from(await thumb.arrayBuffer());
          await adminClient.storage
            .from('laporan-foto')
            .upload(`${reportId}/thumb_${slotKey}.jpg`, thumbBuffer, {
              contentType: 'image/jpeg',
              upsert: true,
            });
        }

        const { data: urlData } = adminClient.storage.from('laporan-foto').getPublicUrl(filePath);
        publicUrl = urlData?.publicUrl;
        storagePath = filePath;

        // Jika reportId adalah UUID valid, simpan juga ke tabel report_photos
        if (isUuid(reportId)) {
          // Pastikan photo_slots master terisi di database
          const { data: existingSlots } = await adminClient
            .from('photo_slots')
            .select('key')
            .limit(1);

          if (!existingSlots || existingSlots.length === 0) {
            await adminClient.from('photo_slots').upsert(
              PHOTO_SLOTS.map((s) => ({
                key: s.key,
                label: s.label,
                grp: s.grp,
                sort: s.sort,
                aspect_w: s.aspect_w,
                aspect_h: s.aspect_h,
                tier: s.tier,
                cell_w_cm: s.cell_w_cm,
                cell_h_cm: s.cell_h_cm,
                reuse_of: s.reuse_of || null,
              }))
            );
          }

          // Upsert ke tabel report_photos
          const { error: photoDbErr } = await adminClient.from('report_photos').upsert(
            {
              report_id: reportId,
              slot_key: slotKey,
              storage_path: filePath,
              thumb_path: thumb ? `${reportId}/thumb_${slotKey}.jpg` : null,
              width: meta.width || 1280,
              height: meta.height || 960,
              bytes: file.size,
              source: meta.source || 'kamera',
              review: 'menunggu',
              uploaded_at: new Date().toISOString(),
            },
            { onConflict: 'report_id,slot_key' }
          );

          if (photoDbErr) {
            console.error('Insert report_photos DB error:', photoDbErr);
          }
        }
      } catch (err) {
        console.error('Supabase photo upload error:', err);
      }
    }

    // 2. Simpan juga ke cache memori lokal
    photoStore.set(key, {
      slotKey,
      bytes: file.size,
      width: meta.width || 1280,
      height: meta.height || 960,
      source: meta.source || 'kamera',
      uploadedAt: new Date().toISOString(),
      review: 'menunggu',
      buffer,
      thumbBase64,
    });

    return NextResponse.json({
      success: true,
      data: {
        slotKey,
        bytes: file.size,
        path: storagePath,
        url: publicUrl,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get('reportId');

  if (!reportId) {
    return NextResponse.json({ success: true, photos: [] });
  }

  const hasSupabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
  const hasServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy');

  // 1. Coba ambil dari database Supabase jika reportId adalah UUID
  if (hasSupabaseUrl && hasServiceKey && isUuid(reportId)) {
    try {
      const adminClient = createAdminClient();
      const { data: dbPhotos, error } = await adminClient
        .from('report_photos')
        .select('*')
        .eq('report_id', reportId);

      if (!error && dbPhotos && dbPhotos.length > 0) {
        const formatted = dbPhotos.map((p) => {
          const { data: urlData } = adminClient.storage
            .from('laporan-foto')
            .getPublicUrl(p.storage_path);

          const thumbUrl = p.thumb_path
            ? adminClient.storage.from('laporan-foto').getPublicUrl(p.thumb_path).data.publicUrl
            : urlData?.publicUrl;

          return {
            slotKey: p.slot_key,
            bytes: p.bytes,
            width: p.width,
            height: p.height,
            source: p.source,
            uploadedAt: p.uploaded_at,
            review: p.review,
            review_note: p.review_note,
            url: urlData?.publicUrl,
            thumbBase64: thumbUrl,
          };
        });

        return NextResponse.json({ success: true, photos: formatted });
      }
    } catch (err) {
      console.error('Supabase get photos error:', err);
    }
  }

  // 2. Fallback: Ambil dari photoStore memori
  const photos: any[] = [];
  photoStore.forEach((val, key) => {
    if (key.startsWith(`${reportId}_`)) {
      const slotKey = key.replace(`${reportId}_`, '');
      photos.push({
        slotKey,
        bytes: val.bytes,
        width: val.width,
        height: val.height,
        source: val.source,
        uploadedAt: val.uploadedAt,
        review: val.review,
        review_note: val.review_note,
        thumbBase64: val.thumbBase64,
      });
    }
  });

  return NextResponse.json({ success: true, photos });
}
