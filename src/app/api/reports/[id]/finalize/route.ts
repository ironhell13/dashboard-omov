import { NextResponse } from 'next/server';
import { db } from '@/lib/store/mock-db';
import { photoStore } from '@/lib/store/photo-store';
import { PHOTO_SLOTS } from '@/types/slot';
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
        console.error('Supabase get report in finalize error:', err);
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

    if (report.status === 'final' || report.status === 'terarsip') {
      return NextResponse.json({
        success: true,
        data: report,
        message: 'Laporan sudah berstatus final',
      });
    }

    // Validasi kelengkapan foto dan penolakan
    const rejectedSlots: string[] = [];

    if (adminClient && isUuid(id)) {
      try {
        const { data: dbPhotos } = await adminClient
          .from('report_photos')
          .select('slot_key, review')
          .eq('report_id', id);

        if (dbPhotos && dbPhotos.length > 0) {
          for (const p of dbPhotos) {
            if (p.review === 'ditolak') {
              const slot = PHOTO_SLOTS.find((s) => s.key === p.slot_key);
              rejectedSlots.push(slot?.label || p.slot_key);
            }
          }
        }
      } catch (err) {
        console.error('Check rejected photos error:', err);
      }
    } else {
      PHOTO_SLOTS.forEach((slot) => {
        const targetKey = slot.reuse_of ? slot.reuse_of : slot.key;
        const photo = photoStore.get(`${id}_${targetKey}`);
        if (photo?.review === 'ditolak') {
          rejectedSlots.push(slot.label);
        }
      });
    }

    if (rejectedSlots.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Masih ada ${rejectedSlots.length} foto yang ditolak (${rejectedSlots.slice(0, 3).join(', ')}...). Harap perbaiki sebelum finalisasi.`,
        },
        { status: 400 }
      );
    }

    // Update status laporan menjadi final
    const nowIso = new Date().toISOString();

    if (adminClient && isUuid(id)) {
      try {
        const { data: updatedReport, error: updateErr } = await adminClient
          .from('reports')
          .update({
            status: 'final',
            finalized_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', id)
          .select()
          .single();

        if (!updateErr && updatedReport) {
          report = updatedReport;
        } else {
          report.status = 'final';
          report.finalized_at = nowIso;
          report.updated_at = nowIso;
        }
      } catch (err) {
        console.error('Update report status in Supabase error:', err);
        report.status = 'final';
        report.finalized_at = nowIso;
        report.updated_at = nowIso;
      }
    } else {
      report.status = 'final';
      report.finalized_at = nowIso;
      report.updated_at = nowIso;
    }

    // Update juga di mock-db jika ada
    const mockRep = db.getReportById(id);
    if (mockRep) {
      mockRep.status = 'final';
      mockRep.finalized_at = nowIso;
      mockRep.updated_at = nowIso;
    }

    return NextResponse.json({
      success: true,
      data: report,
      message: 'Laporan berhasil ditandai Final dan dikunci.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
