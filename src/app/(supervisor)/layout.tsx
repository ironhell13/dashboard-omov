'use client';

import { useState } from 'react';
import { SupervisorSidebar } from '@/components/layout/supervisor-sidebar';
import { SupervisorHeader } from '@/components/layout/supervisor-header';

export default function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-subtle text-text flex">
      <SupervisorSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-[240px]">
        <SupervisorHeader 
          userName="Budi Santoso"
          onOpenSidebar={() => setSidebarOpen(true)} 
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

