import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { db } from '@/lib/store/mock-db';
import { UserRole } from '@/types/database';

export const dynamic = 'force-dynamic';

// 1. READ: Ambil daftar seluruh pengguna
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

// 2. CREATE: Buat akun pengguna baru
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

    if (pwd.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Kata sandi minimal 8 karakter' },
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
    const newUser = db.addUser(cleanNama, cleanEmail, role, pwd);
    return NextResponse.json({ success: true, data: newUser });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}

// 3. UPDATE: Perbarui profil, ganti kata sandi, atau toggle status aktif
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, nama, role, email, password, aktif, action } = body;

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

    // Skenario A: Ganti / Reset Kata Sandi
    if (action === 'reset_password' || (password && !nama && !role)) {
      if (!password || password.trim().length < 8) {
        return NextResponse.json(
          { success: false, error: 'Kata sandi baru minimal 8 karakter' },
          { status: 400 }
        );
      }

      if (hasSupabaseUrl && hasServiceKey) {
        try {
          const adminClient = createAdminClient();
          const { error: pwdErr } = await adminClient.auth.admin.updateUserById(id, {
            password: password.trim(),
          });

          if (pwdErr) {
            return NextResponse.json(
              { success: false, error: pwdErr.message },
              { status: 400 }
            );
          }

          return NextResponse.json({
            success: true,
            message: 'Kata sandi berhasil diperbarui',
          });
        } catch (err: any) {
          return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
          );
        }
      }

      // Mock update password
      db.updateUser(id, { password: password.trim() });
      return NextResponse.json({ success: true, message: 'Kata sandi berhasil diperbarui' });
    }

    // Skenario B: Edit Profil (Nama, Role, Email, atau Status Aktif)
    if (nama !== undefined || role !== undefined || email !== undefined || (aktif !== undefined && action !== 'toggle_active')) {
      if (hasSupabaseUrl && hasServiceKey) {
        try {
          const adminClient = createAdminClient();
          const profileUpdates: any = {};
          const authUpdates: any = { user_metadata: {} };

          if (nama) {
            profileUpdates.nama = nama.trim();
            authUpdates.user_metadata.nama = nama.trim();
          }
          if (role) {
            profileUpdates.role = role;
            authUpdates.user_metadata.role = role;
          }
          if (email) {
            profileUpdates.email = email.trim().toLowerCase();
            authUpdates.email = email.trim().toLowerCase();
          }
          if (aktif !== undefined) {
            profileUpdates.aktif = aktif;
          }
          if (password && password.trim().length >= 8) {
            authUpdates.password = password.trim();
          }

          // Update profiles
          const { error: profErr } = await adminClient
            .from('profiles')
            .update(profileUpdates)
            .eq('id', id);

          if (profErr) {
            console.error('Update profile error:', profErr);
          }

          // Update auth user
          if (Object.keys(authUpdates.user_metadata).length > 0 || authUpdates.email || authUpdates.password) {
            await adminClient.auth.admin.updateUserById(id, authUpdates);
          }

          return NextResponse.json({
            success: true,
            data: { id, ...profileUpdates },
          });
        } catch (err: any) {
          return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
          );
        }
      }

      // Mock update user
      const updated = db.updateUser(id, {
        ...(nama && { nama: nama.trim() }),
        ...(role && { role }),
        ...(email && { email: email.trim().toLowerCase() }),
        ...(aktif !== undefined && { aktif }),
        ...(password && { password: password.trim() }),
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // Skenario C: Toggle Status Aktif / Nonaktif
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
            { success: false, error: 'Profil pengguna tidak ditemukan' },
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

// 4. DELETE: Hapus akun pengguna secara permanen
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get('id');

    let id = idFromQuery;
    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // Body mungkin kosong
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID user wajib diberikan untuk menghapus akun' },
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

        // Hapus dari auth.users (akan otomatis cascade ke tabel profiles jika foreign key on delete cascade)
        const { error: deleteAuthErr } = await adminClient.auth.admin.deleteUser(id);
        if (deleteAuthErr) {
          console.error('Supabase delete user error:', deleteAuthErr);
        }

        // Pastikan juga terhapus dari tabel profiles
        await adminClient.from('profiles').delete().eq('id', id);

        return NextResponse.json({
          success: true,
          message: 'Akun pengguna berhasil dihapus secara permanen',
        });
      } catch (err: any) {
        console.error('Delete user error:', err);
        return NextResponse.json(
          { success: false, error: err.message || 'Gagal menghapus akun pengguna' },
          { status: 500 }
        );
      }
    }

    // Fallback Mock DB
    const deleted = db.deleteUser(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Pengguna tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Akun pengguna berhasil dihapus',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
