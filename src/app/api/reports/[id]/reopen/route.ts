import { NextResponse } from 'next/server';
import { db } from '@/lib/store/mock-db';

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

    if (report.status === 'terarsip') {
      return NextResponse.json(
        { success: false, error: 'Laporan yang telah terarsip di Google Drive tidak dapat dibuka kembali.' },
        { status: 400 }
      );
    }

    if (report.status !== 'final') {
      return NextResponse.json(
        { success: false, error: 'Hanya laporan berstatus Final yang dapat dibuka kembali.' },
        { status: 400 }
      );
    }

    // Buka kembali laporan
    report.status = 'foto_lengkap';
    report.finalized_at = undefined;
    report.updated_at = new Date().toISOString();

    return NextResponse.json({
      success: true,
      data: report,
      message: 'Kunci laporan berhasil dibuka kembali.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

