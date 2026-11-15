import { NextResponse } from 'next/server';
import { db } from '@/lib/store/mock-db';
import { generateReportsCsv } from '@/lib/export/csv-exporter';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all'; // 'daily' | 'monthly' | 'all'
    const dateParam = searchParams.get('date'); // YYYY-MM-DD
    const monthParam = searchParams.get('month'); // YYYY-MM

    let reports = db.getReports();

    if (period === 'daily') {
      const targetDate = dateParam || new Date().toISOString().split('T')[0];
      reports = reports.filter((r) => r.tanggal === targetDate);
    } else if (period === 'monthly') {
      const targetMonth = monthParam || new Date().toISOString().substring(0, 7);
      reports = reports.filter((r) => (r.tanggal || '').startsWith(targetMonth));
    }

    const csvContent = generateReportsCsv(reports);
    const dateTag = dateParam || monthParam || new Date().toISOString().split('T')[0];
    const filename = `REKAP_LAPORAN_OMOV_${period.toUpperCase()}_${dateTag}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

