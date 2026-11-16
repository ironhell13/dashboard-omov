'use client';

import { LapanganHeader } from '@/components/layout/lapangan-header';
import { LapanganBottomNav } from '@/components/layout/lapangan-bottom-nav';

export default function LapanganLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-subtle text-text flex flex-col pb-20">
      <LapanganHeader userName="Ahmad Fauzi" />
      <main className="flex-1 w-full max-w-md mx-auto sm:max-w-xl p-4">
        {children}
      </main>
      <footer className="py-3 text-center text-[11px] text-text-muted">
        &copy; 2026 Mons Digital Studio
      </footer>
      <LapanganBottomNav />
    </div>
  );
}

