import { NextResponse } from 'next/server';
import { db } from '@/lib/store/mock-db';
import { photoStore } from '@/lib/store/photo-store';
import { PHOTO_SLOTS } from '@/types/slot';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { reportId, slotKey, review, note } = body;

    if (!reportId || !slotKey || !review) {
      return NextResponse.json(
        { success: false, error: 'reportId, slotKey, dan review wajib diisi' },
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

    const key = `${reportId}_${slotKey}`;
    let photo = photoStore.get(key);

    if (!photo) {
      // Jika belum ada di store (misal slot tersimulasi), buat entri
      photo = {
        slotKey,
        bytes: 150000,
        width: 1280,
        height: 960,
        source: 'kamera',
        uploadedAt: new Date().toISOString(),
        review: 'menunggu',
      };
      photoStore.set(key, photo);
    }

    // Perbarui status review
    photo.review = review;
    photo.review_note = review === 'ditolak' ? note.trim() : undefined;
    photoStore.set(key, photo);

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
          if (slot.reuse_of) {
            // Mengikuti slot sumber
            const sourceKey = `${reportId}_${slot.reuse_of}`;
            const sourceP = photoStore.get(sourceKey);
            if (sourceP?.review === 'diterima') approvedCount++;
            if (sourceP?.review === 'ditolak') hasRejected = true;
          } else {
            const p = photoStore.get(`${reportId}_${slot.key}`);
            if (p?.review === 'diterima') approvedCount++;
            if (p?.review === 'ditolak') hasRejected = true;
          }
        });

        if (!hasRejected && approvedCount >= 34) {
          db.updateReportData(reportId, {}, 'foto_lengkap');
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        slotKey,
        review: photo.review,
        review_note: photo.review_note,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

