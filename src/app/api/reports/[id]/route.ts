import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { db } from '@/lib/store/mock-db';

export const dynamic = 'force-dynamic';

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const hasSupabaseUrl =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
  const hasServiceKey =
    (!!process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy')) ||
    (!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('dummy'));

  if (hasSupabaseUrl && hasServiceKey && isUuid(id)) {
    try {
      const adminClient = createAdminClient();
      const { data: supaReport, error } = await adminClient
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && supaReport) {
        return NextResponse.json({ success: true, data: supaReport });
      }
    } catch (err) {
      console.error('Supabase get report by id error:', err);
    }
  }

  // Fallback Mock DB
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

    const hasSupabaseUrl =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      (!!process.env.SUPABASE_SERVICE_ROLE_KEY &&
        !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy')) ||
      (!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('dummy'));

    if (hasSupabaseUrl && hasServiceKey && isUuid(id)) {
      try {
        const adminClient = createAdminClient();
        const updates: any = { updated_at: new Date().toISOString() };

        if (body.status) updates.status = body.status;

        // Ambil data lama agar tidak menimpa field data lain jika save parsial
        const { data: currentReport } = await adminClient
          .from('reports')
          .select('data')
          .eq('id', id)
          .single();

        const mergedData = { ...(currentReport?.data || {}), ...(body.data || {}) };
        updates.data = mergedData;

        // Sinkronkan juga kolom baris utama di tabel reports
        const wsidVal = body.wsid || body.data?.wsid;
        if (wsidVal) updates.wsid = wsidVal.toUpperCase().trim();

        const lokasiVal = body.lokasi || body.data?.lokasi;
        if (lokasiVal) updates.lokasi = lokasiVal.trim();

        const teknisiVal = body.teknisi || body.data?.teknisi || body.data?.yang_melakukan;
        if (teknisiVal) updates.teknisi = teknisiVal.trim();

        const jenisVal = body.jenis_pekerjaan || body.data?.jenis_pekerjaan;
        if (jenisVal) updates.jenis_pekerjaan = jenisVal;

        const tanggalVal = body.tanggal || body.data?.tanggal;
        if (tanggalVal) updates.tanggal = tanggalVal;

        const { data: updatedReport, error } = await adminClient
          .from('reports')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (!error && updatedReport) {
          db.updateReportData(id, mergedData, body.status);
          return NextResponse.json({ success: true, data: updatedReport });
        }
      } catch (err) {
        console.error('Supabase patch report error:', err);
      }
    }

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
    const hasSupabaseUrl =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      (!!process.env.SUPABASE_SERVICE_ROLE_KEY &&
        !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy')) ||
      (!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('dummy'));

    if (hasSupabaseUrl && hasServiceKey && isUuid(id)) {
      try {
        const adminClient = createAdminClient();
        const { error } = await adminClient.from('reports').delete().eq('id', id);
        if (!error) {
          db.deleteReport(id);
          return NextResponse.json({
            success: true,
            message: 'Laporan berhasil dihapus dari database',
          });
        }
      } catch (err) {
        console.error('Supabase delete report error:', err);
      }
    }

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
