import { NextResponse } from 'next/server';
import { db } from '@/lib/store/mock-db';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    let report: any = null;

    const hasSupabaseUrl =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      (!!process.env.SUPABASE_SERVICE_ROLE_KEY &&
        !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy')) ||
      (!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('dummy'));

    let adminClient: any = null;
    if (hasSupabaseUrl && hasServiceKey) {
      adminClient = createAdminClient();
    }

    if (adminClient && isUuid(id)) {
      try {
        const { data: supaReport, error } = await adminClient
          .from('reports')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && supaReport) {
          report = supaReport;
        }
      } catch (err) {
        console.error('Supabase get report in reopen error:', err);
      }
    }

    if (!report) {
      report = db.getReportById(id);
    }

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

    const nowIso = new Date().toISOString();

    if (adminClient && isUuid(id)) {
      try {
        const { data: updatedReport } = await adminClient
          .from('reports')
          .update({
            status: 'foto_lengkap',
            finalized_at: null,
            updated_at: nowIso,
          })
          .eq('id', id)
          .select()
          .single();

        if (updatedReport) {
          report = updatedReport;
        } else {
          report.status = 'foto_lengkap';
          report.finalized_at = null;
          report.updated_at = nowIso;
        }
      } catch (err) {
        console.error('Supabase update reopen error:', err);
        report.status = 'foto_lengkap';
        report.finalized_at = null;
        report.updated_at = nowIso;
      }
    } else {
      report.status = 'foto_lengkap';
      report.finalized_at = null;
      report.updated_at = nowIso;
    }

    const mockRep = db.getReportById(id);
    if (mockRep) {
      mockRep.status = 'foto_lengkap';
      mockRep.finalized_at = undefined;
      mockRep.updated_at = nowIso;
    }

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
