import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { db } from '@/lib/store/mock-db';
import { UserRole } from '@/types/database';

export async function GET() {
  try {
    const hasSupabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy');

    if (hasSupabaseUrl && hasServiceKey) {
      try {
        const adminClient = createAdminClient();
        const [{ data: profiles, error: profErr }, { data: authData }] = await Promise.all([
          adminClient.from('profiles').select('*').order('created_at', { ascending: false }),
          adminClient.auth.admin.listUsers(),
        ]);

        if (!profErr && profiles) {
          const authUsers = authData?.users || [];
          const formatted = profiles.map((p) => {
            const authUser = authUsers.find((u) => u.id === p.id);
            return {
              id: p.id,
              nama: p.nama,
              email: p.email || authUser?.email || '-',
              role: p.role as UserRole,
              aktif: p.aktif,
              createdAt: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '-',
            };
          });

          return NextResponse.json({ success: true, data: formatted });
        }
      } catch (err) {
        console.error('Supabase get users error:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: db.getUsers(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, email, password, role } = body;

    if (!nama || !email || !role) {
      return NextResponse.json(
        { success: false, error: 'Nama, email, dan peran wajib diisi' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNama = nama.trim();
    const pwd = password?.trim() || 'Omov123!';

    const hasSupabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy');

    if (hasSupabaseUrl && hasServiceKey) {
      try {
        const adminClient = createAdminClient();

        // Buat user di auth.users Supabase
        const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
          email: cleanEmail,
          password: pwd,
          email_confirm: true,
          user_metadata: {
            nama: cleanNama,
            role,
          },
        });

        if (authErr) {
          return NextResponse.json(
            { success: false, error: authErr.message },
            { status: 400 }
          );
        }

        if (authData?.user) {
          const profilePayload = {
            id: authData.user.id,
            nama: cleanNama,
            role,
            aktif: true,
          };

          const { error: profileErr } = await adminClient
            .from('profiles')
            .upsert({ ...profilePayload, email: cleanEmail });

          if (profileErr && profileErr.message.includes('email')) {
            await adminClient.from('profiles').upsert(profilePayload);
          }

          return NextResponse.json({
            success: true,
            data: {
              id: authData.user.id,
              nama: cleanNama,
              email: cleanEmail,
              role,
              aktif: true,
              createdAt: new Date().toISOString().split('T')[0],
            },
          });
        }
      } catch (err: any) {
        console.error('Supabase create user error:', err);
        return NextResponse.json(
          { success: false, error: err.message },
          { status: 500 }
        );
      }
    }

    // Fallback Mock DB
    const newUser = db.addUser(cleanNama, cleanEmail, role);
    return NextResponse.json({ success: true, data: newUser });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID user wajib diberikan' },
        { status: 400 }
      );
    }

    const hasSupabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy');

    if (hasSupabaseUrl && hasServiceKey) {
      try {
        const adminClient = createAdminClient();
        const { data: profile, error: fetchErr } = await adminClient
          .from('profiles')
          .select('id, aktif')
          .eq('id', id)
          .single();

        if (fetchErr || !profile) {
          return NextResponse.json(
            { success: false, error: 'Profil tidak ditemukan' },
            { status: 404 }
          );
        }

        const nextAktif = !profile.aktif;
        const { error: updateErr } = await adminClient
          .from('profiles')
          .update({ aktif: nextAktif })
          .eq('id', id);

        if (updateErr) {
          return NextResponse.json(
            { success: false, error: updateErr.message },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          data: { id, aktif: nextAktif },
        });
      } catch (err: any) {
        console.error('Supabase toggle user active error:', err);
      }
    }

    const user = db.toggleUserActive(id);
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
