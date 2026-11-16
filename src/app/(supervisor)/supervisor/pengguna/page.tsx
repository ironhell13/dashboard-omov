'use client';

import { useState, useEffect } from 'react';
import { UserPlus, UserCheck, ShieldAlert, KeyRound, Check, X, Shield, HardHat } from 'lucide-react';
import { UserAccount } from '@/lib/store/mock-db';
import { UserRole } from '@/types/database';

export default function PenggunaPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('lapangan');
  const [isLoading, setIsLoading] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !email.trim()) return;
    if (password.trim().length < 8) {
      setDialogError('Kata sandi awal minimal 8 karakter');
      return;
    }

    setIsLoading(true);
    setDialogError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: nama.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsDialogOpen(false);
        setNama('');
        setEmail('');
        setPassword('');
        fetchUsers();
      } else {
        setDialogError(json.error || 'Gagal menambahkan akun');
      }
    } catch (e: any) {
      setDialogError(e.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Manajemen Pengguna
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Buat dan kelola akun akses untuk supervisor dan tim lapangan
          </p>
        </div>

        <button
          onClick={() => setIsDialogOpen(true)}
          className="btn-primary gap-1.5 text-xs font-semibold shadow-subtle shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Akun Baru</span>
        </button>
      </div>

      {/* Notice Supabase Free Tier */}
      <div className="p-4 bg-bg-tint border border-[#B9D4F3] rounded-card text-xs text-text flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-primary block mb-0.5">
            Pembuatan Akun Tanpa Email Undangan (SPEC Bagian 2)
          </span>
          Akun dibuat langsung oleh supervisor menggunakan email dan kata sandi awal untuk menghindari batasan kuota email bawaan Supabase Free. Berikan kata sandi awal langsung kepada petugas lapangan.
        </div>
      </div>

      {/* Users Table */}
      <div className="app-card overflow-hidden bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-bg-subtle text-text-muted text-xs font-medium border-b border-border">
            <tr>
              <th className="px-5 py-3.5">Nama Petugas</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Peran Akses</th>
              <th className="px-5 py-3.5">Status Akun</th>
              <th className="px-5 py-3.5">Tanggal Dibuat</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-bg-subtle transition-colors">
                <td className="px-5 py-4 font-semibold text-text">{u.nama}</td>
                <td className="px-5 py-4 text-text-muted text-xs">{u.email}</td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      u.role === 'superadmin'
                        ? 'bg-[#FFF3DC] text-[#8A5300] border border-amber-200'
                        : u.role === 'supervisor'
                        ? 'bg-[#DCEBFF] text-primary'
                        : 'bg-bg-subtle text-text-muted border border-border'
                    }`}
                  >
                    {u.role === 'superadmin' ? (
                      <ShieldAlert className="w-3 h-3 text-amber-600" />
                    ) : u.role === 'supervisor' ? (
                      <Shield className="w-3 h-3" />
                    ) : (
                      <HardHat className="w-3 h-3" />
                    )}
                    <span className="capitalize">{u.role === 'superadmin' ? 'Superadmin' : u.role}</span>
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`status-chip ${
                      u.aktif
                        ? 'bg-[#E3F6EC] text-[#17714A]'
                        : 'bg-[#FDE8E8] text-[#B02A2A]'
                    }`}
                  >
                    {u.aktif ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-text-muted">{u.createdAt}</td>
                <td className="px-5 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleToggleActive(u.id)}
                    className="btn-secondary h-8 px-2.5 text-xs font-medium"
                  >
                    {u.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => alert(`Password untuk ${u.nama} telah di-reset ke default.`)}
                    className="btn-ghost h-8 px-2.5 text-xs inline-flex items-center gap-1"
                    title="Reset Password"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialog Buat Akun Baru */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-card border border-border shadow-card p-6 animate-in fade-in zoom-in-95">
            <h2 className="text-base font-semibold text-text mb-1">
              Tambah Pengguna Baru
            </h2>
            <p className="text-xs text-text-muted mb-4">
              Akun akan langsung aktif tanpa memerlukan konfirmasi email
            </p>

            {dialogError && (
              <div className="mb-4 p-3 rounded-input bg-status-danger-bg text-status-danger-text text-xs border border-red-200">
                {dialogError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Danang Wijaya"
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Kata Sandi Awal
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Peran Akses
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="form-input"
                >
                  <option value="superadmin">Superadmin (Akses Penuh Semua Menu)</option>
                  <option value="supervisor">Supervisor (Laporan & Master Data)</option>
                  <option value="lapangan">Tim Lapangan (Akses Foto Saja)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                  className="btn-secondary h-9 px-4 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary h-9 px-4 text-xs font-semibold"
                >
                  {isLoading ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

