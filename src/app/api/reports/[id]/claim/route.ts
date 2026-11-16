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
  const body = await request.json();
  const { action, userName } = body;

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
      const { data: supaReport } = await adminClient
        .from('reports')
        .select('*')
        .eq('id', id)
        .single();
      if (supaReport) report = supaReport;
    } catch (err) {
      console.error('Supabase get report in claim error:', err);
    }
  }

  if (!report) {
    report = db.getReportById(id);
  }

  if (!report) {
    return NextResponse.json({ success: false, error: 'Laporan tidak ditemukan' }, { status: 404 });
  }

  const claimedBy = action === 'claim' ? (userName || 'user-lapangan-1') : null;
  const claimedAt = action === 'claim' ? new Date().toISOString() : null;

  if (adminClient && isUuid(id)) {
    try {
      await adminClient
        .from('reports')
        .update({
          claimed_by: claimedBy,
          claimed_at: claimedAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch (err) {
      console.error('Supabase update claim error:', err);
    }
  }

  const mockRep = db.getReportById(id);
  if (mockRep) {
    mockRep.claimed_by = claimedBy;
    mockRep.claimed_at = claimedAt;
  }

  return NextResponse.json({
    success: true,
    data: {
      claimed_by: claimedBy,
      claimed_at: claimedAt,
    },
  });
}
