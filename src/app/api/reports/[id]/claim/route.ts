import { NextResponse } from 'next/server';
import { db } from '@/lib/store/mock-db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { action, userName } = body;

  const report = db.getReportById(id);
  if (!report) {
    return NextResponse.json({ success: false, error: 'Laporan tidak ditemukan' }, { status: 404 });
  }

  if (action === 'claim') {
    report.claimed_by = 'user-lapangan-1';
    report.claimed_at = new Date().toISOString();
  } else if (action === 'release') {
    report.claimed_by = null;
    report.claimed_at = null;
  }

  return NextResponse.json({
    success: true,
    data: {
      claimed_by: report.claimed_by,
      claimed_at: report.claimed_at,
    },
  });
}

