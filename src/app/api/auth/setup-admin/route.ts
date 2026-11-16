import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { db } from '@/lib/store/mock-db';

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
        return NextResponse.json({ success: true, needsSetup: true });
      } catch (err) {
        console.error('Supabase setup check error:', err);
      }
    }

    // Fallback: cek mock DB
    const mockSuper = db.getUsers().find((u) => u.role === 'superadmin' && u.aktif);
    return NextResponse.json({ success: true, needsSetup: !mockSuper });
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

    if (hasSupabaseUrl && hasServiceKey) {
      try {
        const adminClient = createAdminClient();

        // 1. Cek apakah sudah ada superadmin terdaftar
        const { data: existingSuper } = await adminClient
          .from('profiles')
          .select('id')
          .eq('role', 'superadmin')
          .limit(1);

        if (existingSuper && existingSuper.length > 0) {
          return NextResponse.json(
            { success: false, error: 'Superadmin sudah terdaftar di sistem. Silakan masuk menggunakan form login.' },
            { status: 403 }
          );
        }

        // 2. Buat user di auth.users dengan email_confirm: true (tanpa verifikasi email)
        const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
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

        if (authUser?.user) {
          // 3. Simpan ke tabel profiles
          const baseProfile = {
            id: authUser.user.id,
            nama: cleanNama,
            role: 'superadmin',
            aktif: true,
          };

          const { error: profileErr } = await adminClient
            .from('profiles')
            .upsert({ ...baseProfile, email: cleanEmail });

          if (profileErr && profileErr.message.includes('email')) {
            // Jika kolom email belum ada di profiles
            await adminClient.from('profiles').upsert(baseProfile);
          }
        }

        const response = NextResponse.json({
          success: true,
          message: 'Akun Superadmin berhasil dibuat',
          role: 'superadmin',
          name: cleanNama,
        });

        response.cookies.set('omov_role', 'superadmin', { path: '/', maxAge: 86400, sameSite: 'lax' });
        response.cookies.set('omov_name', encodeURIComponent(cleanNama), { path: '/', maxAge: 86400, sameSite: 'lax' });

        return response;
      } catch (err: any) {
        console.error('Setup admin error:', err);
        return NextResponse.json(
          { success: false, error: err.message || 'Gagal membuat superadmin' },
          { status: 500 }
        );
      }
    }

    // Fallback: Tambah ke Mock DB
    const existing = db.getUsers().find((u) => u.email.toLowerCase() === cleanEmail);
    if (!existing) {
      db.addUser(cleanNama, cleanEmail, 'superadmin');
    }

    const response = NextResponse.json({
      success: true,
      message: 'Akun Superadmin lokal berhasil dibuat',
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
