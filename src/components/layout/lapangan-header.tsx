'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileCheck2, Wifi, WifiOff, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LapanganHeader({ userName }: { userName?: string } = {}) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white border-b border-border select-none">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-btn bg-white border border-border overflow-hidden p-0.5 shadow-subtle shrink-0">
          <img
            src="/logo.webp"
            alt="Logo OMOV"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <span className="font-semibold text-text text-sm tracking-tight block">
            OMOV
          </span>
          <span className="text-[10px] text-text-muted font-normal block leading-none">
            Tim Lapangan
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Connection Status Pill */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border",
            isOnline
              ? "bg-[#E3F6EC] text-[#17714A] border-transparent"
              : "bg-[#FFF3DC] text-[#8A5300] border-[#B9D4F3]"
          )}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3 stroke-[2]" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 stroke-[2]" />
              <span>Offline</span>
            </>
          )}
        </div>

        {/* Link Portal Supervisor */}
        <Link
          href="/supervisor"
          className="p-2 text-text-muted hover:text-primary rounded-btn active:bg-bg-subtle transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Masuk sebagai Supervisor"
          aria-label="Portal Supervisor"
        >
          <ShieldCheck className="w-4 h-4 stroke-[1.75]" />
        </Link>
      </div>
    </header>
  );
}

