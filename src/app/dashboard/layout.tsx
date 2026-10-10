'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import AuthGuard from '@/components/auth/AuthGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The drawer closes itself on navigation — Sidebar wires each mobile nav link
  // to onClose — so there's no route effect to keep in sync here.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-ivory">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
          <main
            // Marks the real scroller so an open Modal can freeze it — the
            // shell is overflow-hidden, so <body> is not what scrolls here.
            // `relative` makes this the containing block for stray absolute
            // children (every `sr-only` file input). Without it they anchor to
            // the viewport at their spot deep in the list, stretch the document,
            // and the wheel scrolls the whole shell up off a blank page.
            data-scroll-container
            className="relative flex-1 overflow-y-auto thin-scrollbar px-4 sm:px-6 lg:px-8 py-6 lg:py-8"
          >
            <div className="max-w-350 mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
