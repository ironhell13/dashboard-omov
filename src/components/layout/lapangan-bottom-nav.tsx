'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, CloudUpload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export function LapanganBottomNav() {
  const pathname = usePathname();
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    // Check queue count from localStorage or idb
    const updateCount = () => {
      try {
        const stored = localStorage.getItem('omov_offline_queue_count');
        setQueueCount(stored ? parseInt(stored, 10) : 0);
      } catch {
        setQueueCount(0);
      }
    };

    updateCount();
    window.addEventListener('storage', updateCount);
    const interval = setInterval(updateCount, 5000);

    return () => {
      window.removeEventListener('storage', updateCount);
      clearInterval(interval);
    };
  }, []);

  const isLokasi = pathname === '/lapangan' || (pathname.startsWith('/lapangan') && !pathname.startsWith('/lapangan/antrean'));
  const isAntrean = pathname.startsWith('/lapangan/antrean');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border flex items-center justify-around h-16 max-w-md mx-auto sm:max-w-none">
      {/* Tab Lokasi */}
      <Link
        href="/lapangan"
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-colors select-none",
          isLokasi ? "text-primary font-semibold" : "text-text-muted hover:text-text"
        )}
      >
        <div className={cn("p-1 rounded-btn transition-colors", isLokasi && "bg-bg-tint")}>
          <MapPin className="w-5 h-5 stroke-[1.75]" />
        </div>
        <span className="text-xs mt-0.5">Lokasi</span>
      </Link>

      {/* Tab Antrean */}
      <Link
        href="/lapangan/antrean"
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 transition-colors select-none relative",
          isAntrean ? "text-primary font-semibold" : "text-text-muted hover:text-text"
        )}
      >
        <div className={cn("p-1 rounded-btn transition-colors relative", isAntrean && "bg-bg-tint")}>
          <CloudUpload className="w-5 h-5 stroke-[1.75]" />
          {queueCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-status-warning-text text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {queueCount > 9 ? '9+' : queueCount}
            </span>
          )}
        </div>
        <span className="text-xs mt-0.5">Antrean</span>
      </Link>
    </nav>
  );
}

