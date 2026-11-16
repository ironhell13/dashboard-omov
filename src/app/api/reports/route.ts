import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { db } from '@/lib/store/mock-db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createReportSchema = z.object({
  wsid: z.string().min(1, 'WSID wajib diisi'),
  lokasi: z.string().min(1, 'Lokasi wajib diisi'),
  teknisi: z.string().optional(),
  jenis_pekerjaan: z.enum(['Trade In', 'Replace', 'Aktivasi Online Baru', 'Relokasi']),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  alamat: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.toLowerCase() || '';
    const status = searchParams.get('status') || '';
    const jenis = searchParams.get('jenis') || '';
    const tanggal = searchParams.get('tanggal') || '';

    const hasSupabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy');

    // 1. Ambil dari Supabase Database jika kredensial tersedia
    if (hasSupabaseUrl && hasServiceKey) {
      try {
        const adminClient = createAdminClient();
        let query = adminClient
          .from('reports')
          .select('*')
          .order('tanggal', { ascending: false })
          .order('created_at', { ascending: false });

        if (status) query = query.eq('status', status);
        if (jenis) query = query.eq('jenis_pekerjaan', jenis);
        if (tanggal) query = query.eq('tanggal', tanggal);
        if (q) {
          query = query.or(`wsid.ilike.%${q}%,lokasi.ilike.%${q}%`);
        }

        const { data: supaReports, error } = await query;

        if (!error && supaReports) {
          return NextResponse.json({ success: true, data: supaReports });
        }
        if (error) {
          console.error('Supabase get reports error:', error);
        }
      } catch (err) {
        console.error('Supabase query error:', err);
      }
    }

    // 2. Fallback: Mock DB Lokal
    let reports = db.getReports();

    if (q) {
      reports = reports.filter(
        (r) => r.wsid.toLowerCase().includes(q) || r.lokasi.toLowerCase().includes(q)
      );
    }
    if (status) {
      reports = reports.filter((r) => r.status === status);
    }
    if (jenis) {
      reports = reports.filter((r) => r.jenis_pekerjaan === jenis);
    }
    if (tanggal) {
      reports = reports.filter((r) => r.tanggal === tanggal);
    }

    return NextResponse.json({ success: true, data: reports });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = createReportSchema.parse(body);

    const cleanWsid = validated.wsid.toUpperCase().trim();
    const cleanLokasi = validated.lokasi.trim();
    const cleanTeknisi = validated.teknisi?.trim() || 'Tim Lapangan OMOV';
    const cleanAlamat = validated.alamat?.trim() || '';

    const hasSupabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy');

    // 1. Simpan permanen ke Supabase Database
    if (hasSupabaseUrl && hasServiceKey) {
      try {
        const adminClient = createAdminClient();
        const payload = {
          wsid: cleanWsid,
          lokasi: cleanLokasi,
          teknisi: cleanTeknisi,
          jenis_pekerjaan: validated.jenis_pekerjaan,
          tanggal: validated.tanggal,
          status: 'menunggu_foto',
          data: {
            wsid: cleanWsid,
            lokasi: cleanLokasi,
            teknisi: cleanTeknisi,
            yang_melakukan: cleanTeknisi,
            alamat: cleanAlamat,
          },
        };

        const { data: newReport, error } = await adminClient
          .from('reports')
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error('Supabase create report error:', error);
        } else if (newReport) {
          // Sinkronkan juga ke cache memori lokal
          db.createReport(newReport);
          return NextResponse.json({ success: true, data: newReport });
        }
      } catch (err) {
        console.error('Supabase create report catch error:', err);
      }
    }

    // 2. Fallback: Simpan ke Mock DB
    const newReport = db.createReport({
      wsid: cleanWsid,
      lokasi: cleanLokasi,
      teknisi: cleanTeknisi,
      jenis_pekerjaan: validated.jenis_pekerjaan,
      tanggal: validated.tanggal,
      data: {
        alamat: cleanAlamat,
        teknisi: cleanTeknisi,
        yang_melakukan: cleanTeknisi,
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
