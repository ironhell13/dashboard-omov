import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/store/mock-db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email dan kata sandi wajib diisi' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Coba autentikasi via Supabase jika konfigurasi tersedia
    const hasSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy');
    const hasAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('dummy');

    if (hasSupabaseUrl && hasAnonKey) {
      try {
        const supabase = await createClient();
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (authError || !authData?.user) {
          return NextResponse.json(
            { success: false, error: 'Email atau kata sandi salah. Silakan periksa kembali.' },
            { status: 401 }
          );
        }

        // Ambil data profil pengguna
        let { data: profile } = await supabase
          .from('profiles')
          .select('id, nama, role, aktif')
          .eq('id', authData.user.id)
          .maybeSingle();

        // Jika user ada di auth.users namun profil belum terbentuk, auto-buat profil
        if (!profile) {
          const defaultRole = authData.user.user_metadata?.role || 'superadmin';
          const defaultName = authData.user.user_metadata?.nama || cleanEmail.split('@')[0];

          const { data: newProfile, error: insertErr } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              nama: defaultName,
              role: defaultRole,
              aktif: true,
            })
            .select()
            .single();

          if (!insertErr && newProfile) {
            profile = newProfile;
          }
        }

        if (profile && profile.aktif === false) {
          await supabase.auth.signOut();
          return NextResponse.json(
            { success: false, error: 'Akun Anda telah dinonaktifkan oleh Administrator.' },
            { status: 403 }
          );
        }

        const role = profile?.role || authData.user.user_metadata?.role || 'supervisor';
        const name = profile?.nama || authData.user.user_metadata?.nama || cleanEmail.split('@')[0];

        const response = NextResponse.json({
          success: true,
          role,
          name,
        });

        response.cookies.set('omov_role', role, { path: '/', maxAge: 86400, sameSite: 'lax' });
        response.cookies.set('omov_name', encodeURIComponent(name), { path: '/', maxAge: 86400, sameSite: 'lax' });

        return response;
      } catch (err: any) {
        // Jika koneksi Supabase gagal
        console.error('Supabase auth error:', err);
      }
    }

    // 2. Fallback untuk Mode Lokal / Mock DB: Wajib password valid
    // Password standar untuk akun bawaan lokal:
    // admin@omov.com -> admin123
    // supervisor@omov.com -> supervisor123
    const mockUsers = db.getUsers();
    const user = mockUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Akun tidak terdaftar. Periksa kembali email Anda.' },
        { status: 401 }
      );
    }

    if (!user.aktif) {
      return NextResponse.json(
        { success: false, error: 'Akun Anda telah dinonaktifkan.' },
        { status: 403 }
      );
    }

    // Verifikasi password mock
    const validPassword =
      user.role === 'superadmin' ? 'admin123' : 'supervisor123';

    if (password !== validPassword && password !== 'Admin123!' && password !== 'Supervisor123!') {
      return NextResponse.json(
        { success: false, error: 'Kata sandi salah. Silakan coba lagi.' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      role: user.role,
      name: user.nama,
    });

    response.cookies.set('omov_role', user.role, { path: '/', maxAge: 86400, sameSite: 'lax' });
    response.cookies.set('omov_name', encodeURIComponent(user.nama), { path: '/', maxAge: 86400, sameSite: 'lax' });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}
