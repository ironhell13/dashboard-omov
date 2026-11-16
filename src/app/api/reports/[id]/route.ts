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
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
  const hasServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy');

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
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy');

    if (hasSupabaseUrl && hasServiceKey && isUuid(id)) {
      try {
        const adminClient = createAdminClient();
        const updates: any = { updated_at: new Date().toISOString() };
        if (body.data) updates.data = body.data;
        if (body.status) updates.status = body.status;
        if (body.teknisi) updates.teknisi = body.teknisi;

        const { data: updatedReport, error } = await adminClient
          .from('reports')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (!error && updatedReport) {
          db.updateReportData(id, body.data || {}, body.status);
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
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy');

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
