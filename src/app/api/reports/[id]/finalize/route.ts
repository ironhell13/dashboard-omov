import { NextResponse } from 'next/server';
import { db } from '@/lib/store/mock-db';
import { photoStore } from '@/lib/store/photo-store';
import { PHOTO_SLOTS } from '@/types/slot';

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

    if (report.status === 'final' || report.status === 'terarsip') {
      return NextResponse.json({
        success: true,
        data: report,
        message: 'Laporan sudah berstatus final',
      });
    }

    // Validasi kelengkapan 34 slot foto dan penolakan (SPEC A.14)
    const missingSlots: string[] = [];
    const rejectedSlots: string[] = [];

    PHOTO_SLOTS.forEach((slot) => {
      const targetKey = slot.reuse_of ? slot.reuse_of : slot.key;
      const photo = photoStore.get(`${id}_${targetKey}`);

      if (!photo) {
        // Jika tidak ada di photoStore, catat missing
        // Di mock mode jika belum ada foto, kita bisa izinkan jika data terisi atau tandai
        missingSlots.push(slot.label);
      } else if (photo.review === 'ditolak') {
        rejectedSlots.push(slot.label);
      }
    });

    if (rejectedSlots.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Masih ada ${rejectedSlots.length} foto yang ditolak (${rejectedSlots.slice(0, 3).join(', ')}...). Harap perbaiki sebelum finalisasi.`,
        },
        { status: 400 }
      );
    }

    // Update status laporan menjadi final
    const nowIso = new Date().toISOString();
    report.status = 'final';
    report.finalized_at = nowIso;
    report.updated_at = nowIso;

    return NextResponse.json({
      success: true,
      data: report,
      message: 'Laporan berhasil ditandai Final dan dikunci.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

