import { NextResponse } from 'next/server';
import { db } from '@/lib/store/mock-db';

export async function GET() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `BACKUP_LAPORAN_OMOV_${timestamp}.json`;

    const backupPayload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      metadata: {
        totalReports: db.getReports().length,
        totalVendors: db.getVendors().length,
        totalMesin: db.getMesin().length,
        totalOrang: db.getOrang().length,
      },
      data: {
        reports: db.getReports(),
        master_vendor: db.getVendors(),
        master_mesin: db.getMesin(),
        master_orang: db.getOrang(),
        users: db.getUsers().map((u) => ({
          id: u.id,
          nama: u.nama,
          email: u.email,
          role: u.role,
          aktif: u.aktif,
          createdAt: u.createdAt,
        })),
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
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

