'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  ShieldAlert,
  KeyRound,
  Shield,
  HardHat,
  Search,
  Filter,
  Pencil,
  Trash2,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Lock,
  UserCheck,
  UserX,
} from 'lucide-react';
import { UserAccount } from '@/lib/store/mock-db';
import { UserRole } from '@/types/database';

export default function PenggunaPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aktif' | 'nonaktif'>('all');

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPwdOpen, setIsResetPwdOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  // Create Form State
  const [createNama, setCreateNama] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<UserRole>('supervisor');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit Form State
  const [editNama, setEditNama] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('supervisor');
  const [editAktif, setEditAktif] = useState(true);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Reset Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState('');

  // Delete State
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchUsers = async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch('/api/users');
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
      }
    } catch (e: any) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Gagal memuat data pengguna' });
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showSuccess = (msg: string) => {
    setFeedback({ type: 'success', message: msg });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // 1. CREATE USER
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!createNama.trim() || !createEmail.trim()) {
      setCreateError('Nama dan email wajib diisi');
      return;
    }

    if (createPassword.trim().length < 8) {
      setCreateError('Kata sandi awal minimal 8 karakter');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: createNama.trim(),
          email: createEmail.trim(),
          password: createPassword.trim(),
          role: createRole,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsCreateOpen(false);
        setCreateNama('');
        setCreateEmail('');
        setCreatePassword('');
        setCreateRole('supervisor');
        fetchUsers();
        showSuccess('Akun pengguna baru berhasil ditambahkan');
      } else {
        setCreateError(json.error || 'Gagal menambahkan akun');
      }
    } catch (e: any) {
      setCreateError(e.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // 2. OPEN EDIT MODAL
  const openEditModal = (user: UserAccount) => {
    setSelectedUser(user);
    setEditNama(user.nama);
    setEditRole(user.role);
    setEditAktif(user.aktif);
    setEditError('');
    setIsEditOpen(true);
  };

  // SUBMIT EDIT USER
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setEditError('');

    if (!editNama.trim()) {
      setEditError('Nama lengkap tidak boleh kosong');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          nama: editNama.trim(),
          role: editRole,
          aktif: editAktif,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsEditOpen(false);
        setSelectedUser(null);
        fetchUsers();
        showSuccess(`Data profil ${editNama.trim()} berhasil diperbarui`);
      } else {
        setEditError(json.error || 'Gagal memperbarui profil pengguna');
      }
    } catch (e: any) {
      setEditError(e.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // 3. OPEN RESET PASSWORD MODAL
  const openResetPasswordModal = (user: UserAccount) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setIsResetPwdOpen(true);
  };

  // SUBMIT RESET PASSWORD
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setResetError('');

    if (newPassword.length < 8) {
      setResetError('Kata sandi baru minimal 8 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Konfirmasi kata sandi tidak cocok');
      return;
    }

    setIsSubmittingReset(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          action: 'reset_password',
          password: newPassword,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsResetPwdOpen(false);
        setSelectedUser(null);
        showSuccess(`Kata sandi untuk ${selectedUser.nama} berhasil diubah`);
      } else {
        setResetError(json.error || 'Gagal mengubah kata sandi');
      }
    } catch (e: any) {
      setResetError(e.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // 4. TOGGLE STATUS AKTIF
  const handleToggleActive = async (user: UserAccount) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, action: 'toggle_active' }),
      });
      const json = await res.json();
      if (json.success) {
        fetchUsers();
        showSuccess(`Status akun ${user.nama} diubah menjadi ${!user.aktif ? 'Aktif' : 'Nonaktif'}`);
      }
    } catch (e) {
      console.error(e);
      setFeedback({ type: 'error', message: 'Gagal memperbarui status akun' });
    }
  };

  // 5. OPEN DELETE MODAL
  const openDeleteModal = (user: UserAccount) => {
    setSelectedUser(user);
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  // SUBMIT DELETE USER
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmittingDelete(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(selectedUser.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setIsDeleteOpen(false);
        const deletedName = selectedUser.nama;
        setSelectedUser(null);
        fetchUsers();
        showSuccess(`Akun ${deletedName} berhasil dihapus permanen`);
      } else {
        setDeleteError(json.error || 'Gagal menghapus akun pengguna');
      }
    } catch (e: any) {
      setDeleteError(e.message || 'Terjadi kesalahan sistem saat menghapus akun');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Filter & Search Logic
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'aktif' && u.aktif) ||
        (statusFilter === 'nonaktif' && !u.aktif);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Manajemen Pengguna
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Kelola hak akses, perbarui profil, ganti kata sandi, dan hapus akun sistem OMOV
          </p>
        </div>

        <button
          onClick={() => {
            setCreateError('');
            setIsCreateOpen(true);
          }}
          className="btn-primary gap-1.5 text-xs font-semibold shadow-subtle shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Akun Baru</span>
        </button>
      </div>

      {/* Alert Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-card text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-[#E3F6EC] text-[#17714A] border-[#A8E5C4]'
              : 'bg-[#FDE8E8] text-[#B02A2A] border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Info Card Role Superadmin */}
      <div className="p-4 bg-bg-tint border border-[#B9D4F3] rounded-card text-xs text-text flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-primary block mb-0.5">
            Kontrol Penuh Superadmin (CRUD Akun)
          </span>
          Sebagai Superadmin, Anda dapat membuat akun baru, mengubah nama dan peran pengguna, mengatur ulang kata sandi staf secara instan, serta menghapus akun yang tidak lagi bertugas.
        </div>
      </div>

      {/* Filter & Pencarian Bar */}
      <div className="bg-white p-4 rounded-card border border-border shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama atau email..."
            className="form-input pl-9 text-xs h-9 w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Filter className="w-3.5 h-3.5" />
            <span>Peran:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="form-input text-xs h-9 py-1 px-2.5 w-auto"
            >
              <option value="all">Semua Peran</option>
              <option value="superadmin">Superadmin</option>
              <option value="supervisor">Supervisor</option>
              <option value="lapangan">Tim Lapangan</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="form-input text-xs h-9 py-1 px-2.5 w-auto"
            >
              <option value="all">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </div>

          <button
            onClick={fetchUsers}
            title="Muat Ulang Data"
            className="btn-secondary h-9 px-2.5 text-xs inline-flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabel Manajemen Pengguna */}
      <div className="app-card overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-subtle text-text-muted text-xs font-medium border-b border-border">
              <tr>
                <th className="px-5 py-3.5">Nama Petugas</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Peran Akses</th>
                <th className="px-5 py-3.5">Status Akun</th>
                <th className="px-5 py-3.5">Dibuat</th>
                <th className="px-5 py-3.5 text-right">Aksi Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoadingList ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-text-muted text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    <span>Memuat data pengguna...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-text-muted text-xs">
                    Tidak ada akun yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-bg-subtle transition-colors">
                    <td className="px-5 py-4 font-semibold text-text">{u.nama}</td>
                    <td className="px-5 py-4 text-text-muted text-xs font-mono">{u.email}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === 'superadmin'
                            ? 'bg-[#FFF3DC] text-[#8A5300] border border-amber-200'
                            : u.role === 'supervisor'
                            ? 'bg-[#DCEBFF] text-primary border border-blue-200'
                            : 'bg-bg-subtle text-text-muted border border-border'
                        }`}
                      >
                        {u.role === 'superadmin' ? (
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                        ) : u.role === 'supervisor' ? (
                          <Shield className="w-3 h-3 text-primary" />
                        ) : (
                          <HardHat className="w-3 h-3 text-slate-500" />
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
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(u)}
                          className="btn-secondary h-8 px-2.5 text-xs inline-flex items-center gap-1"
                          title="Edit Profil & Peran"
                        >
                          <Pencil className="w-3.5 h-3.5 text-text-muted" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        {/* Reset Password Button */}
                        <button
                          onClick={() => openResetPasswordModal(u)}
                          className="btn-secondary h-8 px-2.5 text-xs inline-flex items-center gap-1"
                          title="Ganti / Reset Kata Sandi"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span className="hidden sm:inline">Password</span>
                        </button>

                        {/* Toggle Status Button */}
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`h-8 px-2.5 text-xs font-medium rounded-btn border transition-colors inline-flex items-center gap-1 ${
                            u.aktif
                              ? 'bg-white hover:bg-red-50 text-red-600 border-red-200'
                              : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                          title={u.aktif ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                        >
                          {u.aktif ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Matikan</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Aktifkan</span>
                            </>
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => openDeleteModal(u)}
                          className="h-8 px-2.5 text-xs rounded-btn text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors inline-flex items-center"
                          title="Hapus Akun Permanen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: TAMBAH PENGGUNA BARU (CREATE)                    */}
      {/* ========================================================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-card border border-border shadow-card p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold text-text">Tambah Pengguna Baru</h2>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-text-muted hover:bg-bg-subtle rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-text-muted mb-4">
              Akun akan langsung aktif tanpa memerlukan konfirmasi email
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-input bg-status-danger-bg text-status-danger-text text-xs border border-red-200">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={createNama}
                  onChange={(e) => setCreateNama(e.target.value)}
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
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Kata Sandi Awal (Minimal 8 Karakter)
                </label>
                <input
                  type="password"
                  required
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Peran Akses
                </label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as UserRole)}
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
                  onClick={() => setIsCreateOpen(false)}
                  className="btn-secondary h-9 px-4 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="btn-primary h-9 px-4 text-xs font-semibold"
                >
                  {isSubmittingCreate ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT PENGGUNA (UPDATE PROFIL & ROLE)              */}
      {/* ========================================================= */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-card border border-border shadow-card p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold text-text">Edit Data Pengguna</h2>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 text-text-muted hover:bg-bg-subtle rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-text-muted mb-4">
              Ubah informasi profil, peran akses, dan status keaktifan akun.
            </p>

            {editError && (
              <div className="mb-4 p-3 rounded-input bg-status-danger-bg text-status-danger-text text-xs border border-red-200">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Email (ID Pengguna)
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedUser.email}
                  className="form-input bg-bg-subtle text-text-muted cursor-not-allowed font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Peran Akses
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="form-input"
                >
                  <option value="superadmin">Superadmin (Akses Penuh Semua Menu)</option>
                  <option value="supervisor">Supervisor (Laporan & Master Data)</option>
                  <option value="lapangan">Tim Lapangan (Akses Foto Saja)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  Status Akun
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="aktifRadio"
                      checked={editAktif}
                      onChange={() => setEditAktif(true)}
                      className="accent-primary"
                    />
                    <span>Aktif</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="aktifRadio"
                      checked={!editAktif}
                      onChange={() => setEditAktif(false)}
                      className="accent-red-600"
                    />
                    <span>Nonaktif</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn-secondary h-9 px-4 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="btn-primary h-9 px-4 text-xs font-semibold"
                >
                  {isSubmittingEdit ? 'Menyimpan...' : 'Perbarui Profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: GANTI / RESET KATA SANDI                         */}
      {/* ========================================================= */}
      {isResetPwdOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-card border border-border shadow-card p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-semibold text-text">Atur Ulang Kata Sandi</h2>
              </div>
              <button
                onClick={() => setIsResetPwdOpen(false)}
                className="p-1 text-text-muted hover:bg-bg-subtle rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-text-muted mb-4">
              Tetapkan kata sandi baru untuk akun <strong className="text-text">{selectedUser.nama}</strong> ({selectedUser.email}).
            </p>

            {resetError && (
              <div className="mb-4 p-3 rounded-input bg-status-danger-bg text-status-danger-text text-xs border border-red-200">
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Kata Sandi Baru (Minimal 8 Karakter)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsResetPwdOpen(false)}
                  className="btn-secondary h-9 px-4 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="btn-primary h-9 px-4 text-xs font-semibold bg-amber-600 hover:bg-amber-700 border-amber-600"
                >
                  {isSubmittingReset ? 'Memproses...' : 'Simpan Kata Sandi Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: KONFIRMASI HAPUS PENGGUNA (DELETE)               */}
      {/* ========================================================= */}
      {isDeleteOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-card border border-border shadow-card p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-text">Hapus Akun Pengguna?</h2>
                <p className="text-xs text-text-muted">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-text mb-4 leading-relaxed bg-bg-subtle p-3 rounded-btn border border-border">
              Anda akan menghapus akun <strong className="text-text">{selectedUser.nama}</strong> ({selectedUser.email}) dengan peran <strong className="capitalize">{selectedUser.role}</strong> secara permanen dari basis data.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 rounded-input bg-status-danger-bg text-status-danger-text text-xs border border-red-200">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isSubmittingDelete}
                className="btn-secondary h-9 px-4 text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isSubmittingDelete}
                className="h-9 px-4 rounded-btn text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                {isSubmittingDelete ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
