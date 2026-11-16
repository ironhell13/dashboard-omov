import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/store/mock-db';

export const dynamic = 'force-dynamic';

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
        const { data: superadmins, error } = await adminClient
          .from('profiles')
          .select('id')
          .eq('role', 'superadmin')
          .limit(1);

        if (!error && superadmins && superadmins.length > 0) {
          return NextResponse.json({ success: true, needsSetup: false });
        }
      } catch (err) {
        console.error('Supabase setup check error:', err);
      }
    }

    // Default true agar tombol setup selalu dapat diakses
    return NextResponse.json({ success: true, needsSetup: true });
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
    const { nama, email, password } = body;

    if (!nama || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Nama lengkap, email, dan kata sandi wajib diisi' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Kata sandi minimal 8 karakter' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNama = nama.trim();

    const hasSupabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('dummy');

    // 1. Jika Supabase Admin Client tersedia
    if (hasSupabaseUrl && hasServiceKey) {
      try {
        const adminClient = createAdminClient();

        // Cek apakah email sudah ada di auth.users
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existingAuthUser = listData?.users?.find(
          (u) => u.email?.toLowerCase() === cleanEmail
        );

        let userId = existingAuthUser?.id;

        if (existingAuthUser) {
          // Update password & metadata role jadi superadmin
          await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
            password,
            user_metadata: {
              nama: cleanNama,
              role: 'superadmin',
            },
          });
        } else {
          // Buat akun baru di auth.users dengan email_confirm: true
          const { data: authUser, error: authErr } =
            await adminClient.auth.admin.createUser({
              email: cleanEmail,
              password,
              email_confirm: true,
              user_metadata: {
                nama: cleanNama,
                role: 'superadmin',
              },
            });

          if (authErr) {
            return NextResponse.json(
              { success: false, error: authErr.message },
              { status: 400 }
            );
          }

          userId = authUser?.user?.id;
        }

        if (userId) {
          // Simpan ke tabel profiles
          const baseProfile = {
            id: userId,
            nama: cleanNama,
            role: 'superadmin',
            aktif: true,
          };

          const { error: profileErr } = await adminClient
            .from('profiles')
            .upsert({ ...baseProfile, email: cleanEmail });

          if (profileErr && profileErr.message.includes('email')) {
            await adminClient.from('profiles').upsert(baseProfile);
          }
        }

        const response = NextResponse.json({
          success: true,
          message: 'Akun Superadmin berhasil dibuat / diperbarui',
          role: 'superadmin',
          name: cleanNama,
        });

        response.cookies.set('omov_role', 'superadmin', { path: '/', maxAge: 86400, sameSite: 'lax' });
        response.cookies.set('omov_name', encodeURIComponent(cleanNama), { path: '/', maxAge: 86400, sameSite: 'lax' });

        return response;
      } catch (err: any) {
        console.error('Setup admin error:', err);
        return NextResponse.json(
          { success: false, error: err.message || 'Gagal membuat akun Superadmin' },
          { status: 500 }
        );
      }
    }

    // 2. Jika Supabase URL ada namun Service Role Key belum diset
    if (hasSupabaseUrl) {
      try {
        const supabase = await createClient();
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              nama: cleanNama,
              role: 'superadmin',
            },
          },
        });

        if (!signUpErr && signUpData?.user) {
          await supabase.from('profiles').upsert({
            id: signUpData.user.id,
            nama: cleanNama,
            role: 'superadmin',
            aktif: true,
          });
        }
      } catch (err) {
        console.error('Fallback signUp error:', err);
      }
    }

    // 3. Fallback: Simpan ke Mock DB
    db.addUser(cleanNama, cleanEmail, 'superadmin', password);

    const response = NextResponse.json({
      success: true,
      message: 'Akun Superadmin berhasil dibuat',
      role: 'superadmin',
      name: cleanNama,
    });

    response.cookies.set('omov_role', 'superadmin', { path: '/', maxAge: 86400, sameSite: 'lax' });
    response.cookies.set('omov_name', encodeURIComponent(cleanNama), { path: '/', maxAge: 86400, sameSite: 'lax' });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
