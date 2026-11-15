'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FileCheck2, 
  LayoutDashboard, 
  FileText, 
  Users, 
  Database, 
  Settings,
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const MENU_ITEMS = [
  { href: '/supervisor', label: 'Beranda', icon: LayoutDashboard },
  { href: '/supervisor/laporan', label: 'Laporan', icon: FileText },
  { href: '/supervisor/pengguna', label: 'Pengguna', icon: Users },
  { href: '/supervisor/master', label: 'Master Data', icon: Database },
  { href: '/supervisor/pengaturan/drive', label: 'Google Drive', icon: Settings },
];

export function SupervisorSidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Element */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col w-[240px] bg-white border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-border">
          <Link href="/supervisor" className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-btn bg-primary-soft text-primary">
              <FileCheck2 className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div>
              <span className="font-semibold text-text text-base tracking-tight block">
                LAPORAN OMOV
              </span>
              <span className="text-[11px] text-text-muted font-normal block leading-none">
                Berita Acara BCA
              </span>
            </div>
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-text-muted hover:text-text rounded-md hover:bg-bg-subtle"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/supervisor' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-btn text-sm font-medium transition-colors",
                  isActive
                    ? "bg-bg-tint text-primary"
                    : "text-text-muted hover:bg-bg-subtle hover:text-text"
                )}
              >
                <Icon className={cn("w-4 h-4 stroke-[1.75]", isActive ? "text-primary" : "text-text-muted")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-border">
          <div className="text-xs text-text-muted">
            <span className="inline-block w-2 h-2 rounded-full bg-status-success-text mr-1.5"></span>
            Versi 1.0 (Produksi)
          </div>
        </div>
      </aside>
    </>
  );
}

