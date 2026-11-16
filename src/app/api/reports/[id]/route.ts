import { NextResponse } from 'next/server';
import { db } from '@/lib/store/mock-db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = db.getReportById(id);

  if (!report) {
    return NextResponse.json(
      { success: false, error: 'Laporan tidak ditemukan' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: report });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const updated = db.updateReportData(id, body.data || {}, body.status);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Laporan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const deleted = db.deleteReport(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Laporan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Laporan berhasil dihapus',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

