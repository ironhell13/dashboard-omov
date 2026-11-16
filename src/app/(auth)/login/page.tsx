'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileCheck2, Lock, Mail, ArrowRight, ShieldCheck, HardHat } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      // Mock / fallback login logic for dev/test when Supabase keys are dummy
      let role = 'supervisor';
      let name = 'Budi Santoso';

      if (email.toLowerCase().includes('admin') || email.toLowerCase().includes('super')) {
        role = 'superadmin';
        name = 'Super Administrator';
      } else if (email.toLowerCase().includes('lapangan')) {
        role = 'lapangan';
        name = 'Ahmad Fauzi';
      }

      // Simpan cookie role untuk middleware
      document.cookie = `omov_role=${role}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `omov_name=${encodeURIComponent(name)}; path=/; max-age=86400; SameSite=Lax`;

      // Redirect sesuai role
      if (role === 'superadmin' || role === 'supervisor') {
        router.push('/supervisor');
      } else {
        router.push('/lapangan');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan saat masuk. Silakan periksa kembali email dan password Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (role: 'supervisor' | 'lapangan') => {
    const name = role === 'supervisor' ? 'Budi Santoso' : 'Ahmad Fauzi';
    document.cookie = `omov_role=${role}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `omov_name=${encodeURIComponent(name)}; path=/; max-age=86400; SameSite=Lax`;

    if (role === 'supervisor') {
      router.push('/supervisor');
    } else {
      router.push('/lapangan');
    }
  };

  return (
    <div className="min-h-screen bg-bg-subtle flex flex-col justify-center items-center px-4 py-8">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center shadow-subtle mb-3">
          <FileCheck2 className="w-8 h-8 stroke-[1.75]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text">
          LAPORAN OMOV
        </h1>
        <p className="text-sm text-text-muted mt-1 max-w-sm">
          Aplikasi Pembuat Berita Acara Instalasi / Trade In Mesin ATM BCA
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-[400px] bg-white rounded-card border border-border shadow-card p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-text mb-1">
          Masuk ke Akun
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Gunakan akun Superadmin atau Supervisor Anda
        </p>

        <div className="text-[11px] text-text-muted mb-4 bg-bg-subtle p-2.5 rounded-btn border border-border">
          <span className="font-semibold text-text block mb-0.5">Akun Demo Cepat:</span>
          <div className="flex flex-col gap-0.5">
            <span>&bull; <strong>admin@omov.com</strong> (Superadmin - Semua Menu)</span>
            <span>&bull; <strong>supervisor@omov.com</strong> (Supervisor - Tanpa Menu Pengguna/Drive)</span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-input bg-status-danger-bg text-status-danger-text text-xs border border-red-200">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
                className="form-input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5" htmlFor="password">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input pl-10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary gap-2 mt-2"
          >
            <span>{isLoading ? 'Memproses...' : 'Masuk'}</span>
            <ArrowRight className="w-4 h-4 stroke-[1.75]" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-border">
          <p className="text-xs font-medium text-text-muted text-center mb-2.5">
            Khusus Tim Lapangan (Tanpa Login)
          </p>
          <button
            type="button"
            onClick={() => router.push('/lapangan')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-btn text-xs font-semibold bg-bg-tint text-primary hover:bg-[#DCEBFF] border border-[#B9D4F3] transition-colors"
          >
            <HardHat className="w-4 h-4 stroke-[1.75]" />
            <span>Buka Dashboard Tim Lapangan Langsung</span>
          </button>
        </div>
      </div>

      {/* Footer Notice */}
      <p className="text-center text-xs text-text-muted mt-8">
        &copy; 2026 Mons Digital Studio
      </p>
    </div>
  );
}

