import { NextResponse } from 'next/server';
import { db } from '@/lib/store/mock-db';
import { photoStore, StoredPhoto } from '@/lib/store/photo-store';

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
        path: `laporan-foto/${reportId}/${slotKey}.jpg`,
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
