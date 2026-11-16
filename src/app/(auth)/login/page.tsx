'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileCheck2, Lock, Mail, ArrowRight, HardHat } from 'lucide-react';

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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Email atau kata sandi salah. Silakan coba lagi.');
        return;
      }

      // Berhasil masuk, arahkan ke dashboard yang sesuai
      if (data.role === 'superadmin' || data.role === 'supervisor') {
        router.push('/supervisor');
      } else {
        router.push('/lapangan');
      }
      router.refresh();
    } catch {
      setErrorMessage('Terjadi kesalahan koneksi saat masuk. Silakan periksa kembali email dan password Anda.');
    } finally {
      setIsLoading(false);
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
        <p className="text-xs text-text-muted mb-5">
          Gunakan akun Superadmin atau Supervisor terdaftar Anda
        </p>

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
            <span>{isLoading ? 'Memeriksa Kredensial...' : 'Masuk'}</span>
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
