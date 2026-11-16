'use client';

import { Menu, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  userName?: string;
  userRole?: string;
  onOpenSidebar: () => void;
}

export function SupervisorHeader({ 
  userName = 'Supervisor', 
  userRole = 'supervisor',
  onOpenSidebar 
}: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    // Clear cookie/session and redirect to login
    document.cookie = 'omov_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'omov_name=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
    router.refresh();
  };

  const isSuperadmin = userRole === 'superadmin';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 lg:px-8 bg-white border-b border-border">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 text-text-muted hover:text-text rounded-btn hover:bg-bg-subtle"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5 stroke-[1.75]" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* User Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-bg-tint text-primary flex items-center justify-center font-semibold text-xs border border-border">
            <User className="w-4 h-4 stroke-[1.75]" />
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-sm font-medium text-text leading-tight">
              {userName}
            </span>
            <span className={`block text-[11px] font-semibold leading-none ${isSuperadmin ? 'text-amber-600' : 'text-primary'}`}>
              {isSuperadmin ? 'Superadmin' : 'Supervisor'}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-status-danger-text hover:bg-status-danger-bg rounded-btn transition-colors border border-transparent hover:border-red-200"
          title="Keluar dari akun"
        >
          <LogOut className="w-3.5 h-3.5 stroke-[1.75]" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}

