'use client';

import { useState, useEffect } from 'react';
import { SupervisorSidebar } from '@/components/layout/supervisor-sidebar';
import { SupervisorHeader } from '@/components/layout/supervisor-header';

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('supervisor');
  const [userName, setUserName] = useState<string>('Budi Santoso');

  useEffect(() => {
    const roleMatch = document.cookie.match(/omov_role=([^;]+)/);
    const nameMatch = document.cookie.match(/omov_name=([^;]+)/);
    if (roleMatch) setUserRole(roleMatch[1]);
    if (nameMatch) setUserName(decodeURIComponent(nameMatch[1]));
  }, []);

  return (
    <div className="min-h-screen bg-bg-subtle text-text flex">
      <SupervisorSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        userRole={userRole}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-[240px]">
        <SupervisorHeader 
          userName={userName}
          userRole={userRole}
          onOpenSidebar={() => setSidebarOpen(true)} 
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
        <footer className="py-4 px-6 text-center text-xs text-text-muted border-t border-border mt-auto bg-white/50">
          &copy; 2026 Mons Digital Studio
        </footer>
      </div>
    </div>
  );
}

