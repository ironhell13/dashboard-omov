import { NextResponse } from 'next/server';
import { db } from '@/lib/store/mock-db';
import { z } from 'zod';

const createReportSchema = z.object({
  wsid: z.string().min(1, 'WSID wajib diisi'),
  lokasi: z.string().min(1, 'Lokasi wajib diisi'),
  jenis_pekerjaan: z.enum(['Trade In', 'Replace', 'Aktivasi Online Baru', 'Relokasi']),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  alamat: z.string().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.toLowerCase() || '';
  const status = searchParams.get('status') || '';
  const jenis = searchParams.get('jenis') || '';
  const tanggal = searchParams.get('tanggal') || '';

  let reports = db.getReports();

  if (q) {
    reports = reports.filter(
      r => r.wsid.toLowerCase().includes(q) || r.lokasi.toLowerCase().includes(q)
    );
  }

  if (status) {
    reports = reports.filter(r => r.status === status);
  }

  if (jenis) {
    reports = reports.filter(r => r.jenis_pekerjaan === jenis);
  }

  if (tanggal) {
    reports = reports.filter(r => r.tanggal === tanggal);
  }

  return NextResponse.json({ success: true, data: reports });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = createReportSchema.parse(body);

    const newReport = db.createReport({
      wsid: validated.wsid,
      lokasi: validated.lokasi,
      jenis_pekerjaan: validated.jenis_pekerjaan,
      tanggal: validated.tanggal,
      data: {
        alamat: validated.alamat,
      },
    });

    return NextResponse.json({ success: true, data: newReport });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.errors || error.message },
      { status: 400 }
    );
  }
}

