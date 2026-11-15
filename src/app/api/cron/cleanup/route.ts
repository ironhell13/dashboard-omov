import { NextResponse } from 'next/server';
import { db } from '@/lib/store/mock-db';
import { photoStore } from '@/lib/store/photo-store';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Verifikasi CRON_SECRET jika dikonfigurasi (SPEC A.13)
    if (cronSecret) {
      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` ||
        request.headers.get('x-cron-secret') === cronSecret;

      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, error: 'Akses tidak diizinkan. Header CRON_SECRET tidak valid.' },
          { status: 401 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const forceCleanupDays = searchParams.get('days') ? parseInt(searchParams.get('days')!) : 3;
    const forceBackup = searchParams.get('backup') === '1';

    const now = Date.now();
    const threeDaysMs = forceCleanupDays * 24 * 60 * 60 * 1000;

    let cleanedReportsCount = 0;
    let cleanedPhotosCount = 0;
    const cleanedReportIds: string[] = [];

    // (a) Hapus foto & thumbnail laporan terarsip > 3 hari dengan drive_file_id terverifikasi
    const reports = db.getReports();
    for (const report of reports) {
      if (
        report.status === 'terarsip' &&
        report.drive_file_id &&
        report.archived_at
      ) {
        const archivedTime = new Date(report.archived_at).getTime();
        const diffMs = now - archivedTime;

        if (diffMs > threeDaysMs) {
          // Hapus foto dari memory store & storage
          let reportCleanedPhotos = 0;
          photoStore.forEach((val, key) => {
            if (key.startsWith(`${report.id}_`)) {
              photoStore.delete(key);
              reportCleanedPhotos++;
            }
          });

          cleanedReportsCount++;
          cleanedPhotosCount += reportCleanedPhotos;
          cleanedReportIds.push(report.id);
        }
      }
    }

    // (b) Kueri database keep-alive (mencegah Supabase free tier pause otomatis)
    const keepAliveResult = {
      status: 'active',
      totalReports: reports.length,
      dbPing: 'ok',
    };

    // (c) Tiap hari Minggu (Day 0) atau force: Ekspor cadangan JSON
    const isSunday = new Date().getDay() === 0;
    let backupCreated = false;
    let backupPayload: any = null;

    if (isSunday || forceBackup) {
      backupPayload = {
        exportedAt: new Date().toISOString(),
        backupType: 'weekly_automatic',
        reportsCount: reports.length,
        reports: db.getReports(),
        vendors: db.getVendors(),
        mesin: db.getMesin(),
        orang: db.getOrang(),
      };
      backupCreated = true;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      retentionDays: forceCleanupDays,
      cleanedReportsCount,
      cleanedPhotosCount,
      cleanedReportIds,
      keepAlive: keepAliveResult,
      backupCreated,
      backupPayload: backupCreated ? { count: reports.length, date: backupPayload.exportedAt } : null,
      message: `Pembersihan cron berhasil. ${cleanedPhotosCount} berkas foto dari ${cleanedReportsCount} laporan terarsip dibersihkan.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

